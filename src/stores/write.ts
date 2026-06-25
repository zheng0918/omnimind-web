import { defineStore } from 'pinia'

import type { SseHandle } from '@/api/sse'
import {
  createWriteTask,
  type CreateWriteTaskParams,
  exportWriteTask,
  getWriteTask,
  openOutlineStream,
  openSectionStream,
  saveSection,
  submitWriteToReview,
  triggerResponseCheck,
} from '@/api/write'
import { useReviewStore } from '@/stores/review'
import { useUserStore } from '@/stores/user'
import type { OutlineNode, ScorePoint, WriteSection, WriteSectionStatus, WriteTask } from '@/types/api'

/**
 * 编写 store（REQ-WRT / REQ-LINK）：大纲、章节正文、评分点与一键送审。
 * 大纲/章节走 SSE 流式（章节最多 3 路并发），章节编辑节流自动保存。
 * lockState 为多人协作预留字段，一期不启用。
 */

interface WriteState {
  currentTaskId: string
  task: WriteTask | null
  outline: OutlineNode[]
  sections: Record<string, WriteSection>
  activeSectionId: string
  scorePoints: ScorePoint[]
  outlineLoading: boolean
  streamError: string
  lockState: {
    editingUserId: string | null
    lockExpireAt: string | null
  }
}

// 大纲流单连接；章节流按 sectionId 分键并发（契约 §1.6 最多 3 路）。
let outlineStream: SseHandle | null = null
const activeStreams: Record<string, SseHandle> = {}
// 章节生成的全局并发上限（契约 §1.6）与等待队列：超过 3 路的章节先入队，待空槽再启。
const MAX_CONCURRENT_SECTIONS = 3
const sectionQueue: string[] = []

/** 清空上一任务残留的章节流与排队（重建任务前调用，避免写入已失效的 section）。 */
function resetSectionStreams(): void {
  Object.values(activeStreams).forEach((stream) => stream.abort())
  Object.keys(activeStreams).forEach((key) => delete activeStreams[key])
  sectionQueue.length = 0
}

/** SSE token{node} 事件载荷（契约 §1.6：id 经 Java 透传为数字，前端统一转字符串）。 */
interface SseOutlineNode {
  nodeId: number | string
  parentId: number | string | null
  title: string
  orderIdx: number
  sectionId: number | string | null
}

function safeParse<T>(payload: string, fallback: T): T {
  try {
    return JSON.parse(payload) as T
  } catch {
    return fallback
  }
}

function toIdStr(value: number | string | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

export const useWriteStore = defineStore('write', {
  state: (): WriteState => ({
    currentTaskId: '',
    task: null,
    outline: [],
    sections: {},
    activeSectionId: '',
    scorePoints: [],
    outlineLoading: false,
    streamError: '',
    lockState: {
      editingUserId: null,
      lockExpireAt: null,
    },
  }),
  getters: {
    activeSection: (state) => state.sections[state.activeSectionId] ?? null,
    /** 仅叶子节点（含 sectionId）才是正文段落，章节标题节点不计入统计。 */
    sectionNodes: (state) => state.outline.filter((node) => Boolean(node.sectionId)),
    /** 已完成章节数（已生成 / 用户已编辑视为完成）。 */
    doneSectionCount(): number {
      return this.sectionNodes.filter(
        (node) => node.status === 'DONE' || node.status === 'USER_EDITED',
      ).length
    },
    /** 是否有章节仍在流式生成中——用于切换 Tab 时判断「任务进行中」。 */
    isGenerating(): boolean {
      return this.outlineLoading || this.sectionNodes.some((node) => node.status === 'GENERATING')
    },
    /** 初稿完成度（百分比）：优先取任务进度，回退按段落完成比例估算。 */
    completionPercent(): number {
      if (this.task?.completionPercent != null) return this.task.completionPercent
      const total = this.sectionNodes.length
      if (!total) return 0
      return Math.round((this.doneSectionCount / total) * 100)
    },
    /** 评分点响应率：已响应评分点 / 总评分点。 */
    responseRate: (state) => {
      if (!state.scorePoints.length) return 0
      const answered = state.scorePoints.filter((p) => p.responseStatus === 'DONE').length
      return Math.round((answered / state.scorePoints.length) * 100)
    },
    /** 一键送审是否可用：初稿完成度需 ≥ 80%（REQ-LINK / 错误码 6002）。 */
    canSubmitReview(): boolean {
      return this.completionPercent >= 80
    },
  },
  actions: {
    setActiveSection(sectionId: string): void {
      this.activeSectionId = sectionId
      // 选中的章节优先生成（插队），让用户当前查看的章节尽快出正文。
      this.startSectionStream(sectionId, { priority: true })
    },
    upsertSection(section: WriteSection): void {
      this.sections[section.sectionId] = section
    },
    _setNodeStatus(sectionId: string, status: WriteSectionStatus): void {
      const node = this.outline.find((n) => n.sectionId === sectionId)
      if (node) node.status = status
    },
    /**
     * 启动编写任务（REQ-WRT）：登记任务（EXTRACTING）后立即拉取大纲流，
     * 后台 prepare 产出评分点/大纲，前端按节点增量渲染。
     */
    async createTask(params: CreateWriteTaskParams): Promise<boolean> {
      try {
        const task = await createWriteTask(params)
        this.task = task
        this.currentTaskId = task.writeTaskId || task.taskId
        this.streamError = ''
        await this.loadOutline(this.currentTaskId)
        return true
      } catch {
        this.streamError = '编写任务创建失败，请稍后重试'
        return false
      }
    },
    /** 拉取大纲 SSE 流：progress* → token{node}* → done。 */
    loadOutline(taskId?: string): void {
      const id = taskId ?? this.currentTaskId
      if (!id) return
      this.currentTaskId = id
      this.outline = []
      this.sections = {}
      this.activeSectionId = ''
      this.outlineLoading = true
      this.streamError = ''
      outlineStream?.abort()
      resetSectionStreams()

      const userStore = useUserStore()
      outlineStream = openOutlineStream(id, {
        token: userStore.token,
        onEvent: ({ event, data }) => {
          if (event === 'token') {
            const payload = safeParse<{ node: SseOutlineNode | null }>(data, { node: null })
            if (!payload.node) return
            const sectionId = toIdStr(payload.node.sectionId)
            const node: OutlineNode = {
              nodeId: toIdStr(payload.node.nodeId),
              parentId: payload.node.parentId == null ? null : toIdStr(payload.node.parentId),
              title: payload.node.title,
              orderIdx: payload.node.orderIdx,
              sectionId,
              status: 'PENDING',
            }
            this.outline.push(node)
            if (sectionId) {
              this.sections[sectionId] = {
                sectionId,
                outlineNodeId: node.nodeId,
                contentMd: '',
                status: 'PENDING',
              }
            }
          }
          if (event === 'done') {
            this.outlineLoading = false
            if (!this.activeSectionId) {
              const firstLeaf = this.outline.find((n) => n.sectionId)
              if (firstLeaf) this.setActiveSection(firstLeaf.sectionId)
            }
            // 大纲就绪后自动按序生成全部章节（受 3 路并发限制），让「开始编写」真正产出
            // 整篇初稿，而非停在首章、逼用户逐个点开（否则完成度永远到不了送审门槛）。
            this.generateAllSections()
          }
          if (event === 'error') {
            const payload = safeParse<{ message: string }>(data, { message: '大纲生成失败' })
            this.streamError = payload.message
            this.outlineLoading = false
          }
        },
        onError: (message) => {
          this.streamError = message
          this.outlineLoading = false
        },
      })
    },
    /** 把全部待生成的正文段落排队生成（受 3 路并发限制），用于大纲就绪后自动出全篇。 */
    generateAllSections(): void {
      for (const node of this.outline) {
        if (node.sectionId) this.startSectionStream(node.sectionId)
      }
    },
    /**
     * 请求生成某章节正文：入队 + 受全局 3 路并发限制启动（契约 §1.6）。
     * 已在生成 / 已排队 / 已完成的章节会被跳过；priority=true 时插队优先生成。
     */
    startSectionStream(sectionId: string, options: { priority?: boolean } = {}): void {
      if (!this.currentTaskId || !sectionId) return
      if (activeStreams[sectionId] || sectionQueue.includes(sectionId)) return
      const section = this.sections[sectionId]
      // 仅未生成（PENDING）或失败（FAILED，允许重试）的章节才需要生成，避免覆盖已有正文。
      if (!section || (section.status !== 'PENDING' && section.status !== 'FAILED')) return
      if (options.priority) sectionQueue.unshift(sectionId)
      else sectionQueue.push(sectionId)
      this._pumpSectionQueue()
    },
    /** 有空闲并发槽则从队列取出章节启动，直至填满 3 路或队列清空。 */
    _pumpSectionQueue(): void {
      while (Object.keys(activeStreams).length < MAX_CONCURRENT_SECTIONS && sectionQueue.length) {
        const next = sectionQueue.shift()
        if (next) this._openSectionStream(next)
      }
    },
    /** 真正打开单章节正文 SSE 流：token*（增量 markdown）→ done{sectionId,status}。 */
    _openSectionStream(sectionId: string): void {
      const section = this.sections[sectionId]
      if (section) {
        section.contentMd = ''
        section.status = 'GENERATING'
      }
      this._setNodeStatus(sectionId, 'GENERATING')
      this.streamError = ''

      const userStore = useUserStore()
      activeStreams[sectionId] = openSectionStream(this.currentTaskId, sectionId, {
        token: userStore.token,
        onEvent: ({ event, data }) => {
          if (event === 'token') {
            const payload = safeParse<{ text: string }>(data, { text: data })
            const target = this.sections[sectionId]
            if (target) target.contentMd += payload.text
          }
          if (event === 'done') {
            const payload = safeParse<{ status?: string }>(data, {})
            const status = (payload.status as WriteSectionStatus) || 'DONE'
            const target = this.sections[sectionId]
            if (target) {
              target.status = status
              target.savedAt = new Date().toISOString()
            }
            this._setNodeStatus(sectionId, status)
            delete activeStreams[sectionId]
            this._pumpSectionQueue()
          }
          if (event === 'error') {
            const payload = safeParse<{ message: string }>(data, { message: '章节生成失败' })
            this.streamError = payload.message
            const target = this.sections[sectionId]
            if (target) target.status = 'FAILED'
            this._setNodeStatus(sectionId, 'FAILED')
            delete activeStreams[sectionId]
            this._pumpSectionQueue()
          }
        },
        onError: (message) => {
          this.streamError = message
          const target = this.sections[sectionId]
          if (target) target.status = 'FAILED'
          this._setNodeStatus(sectionId, 'FAILED')
          delete activeStreams[sectionId]
          this._pumpSectionQueue()
        },
      })
    },
    stopSectionStream(sectionId: string): void {
      activeStreams[sectionId]?.abort()
      delete activeStreams[sectionId]
      // 同时移出等待队列，避免被中止的章节稍后又被 pump 重新拉起。
      const queued = sectionQueue.indexOf(sectionId)
      if (queued !== -1) sectionQueue.splice(queued, 1)
      this._pumpSectionQueue()
    },
    async saveSection(sectionId: string, contentMd: string): Promise<void> {
      if (!this.currentTaskId) return
      await saveSection(this.currentTaskId, sectionId, contentMd)
      const section = this.sections[sectionId]
      if (section) {
        section.contentMd = contentMd
        section.status = 'USER_EDITED'
        section.savedAt = new Date().toISOString()
      }
      this._setNodeStatus(sectionId, 'USER_EDITED')
    },
    /** 拉取编写任务权威状态（完成度/评分点），用于送审前校准（WEB-05）。 */
    async refreshTask(): Promise<void> {
      if (!this.currentTaskId) return
      try {
        const status = await getWriteTask(this.currentTaskId)
        this.task = {
          taskId: status.taskId,
          writeTaskId: status.writeTaskId,
          status: status.status,
          completionPercent: status.completionPercent,
        }
        if (status.scorePoints) this.scorePoints = status.scorePoints
      } catch {
        // 刷新失败时保留现有本地估算，不阻断送审流程。
      }
    },
    async checkResponse(): Promise<void> {
      if (!this.currentTaskId) return
      const result = await triggerResponseCheck(this.currentTaskId)
      this.scorePoints = result.scorePoints
    },
    /** 导出初稿（docx/pdf）：取预签名 URL 后浏览器直接下载（契约 §1.6）。 */
    async exportDraft(format: 'docx' | 'pdf'): Promise<void> {
      if (!this.currentTaskId) return
      const { downloadUrl } = await exportWriteTask(this.currentTaskId, format)
      if (downloadUrl) window.open(downloadUrl, '_blank')
    },
    /**
     * 一键送审（REQ-LINK）：要求初稿完成度 ≥ 80%，调用 submit-review 由 Java 编排
     * 将初稿落为新 document 并自动建审查任务，随后把"待审文档"信息回填到审查侧。
     * @returns 是否成功送审（完成度不足或接口失败时返回 false）。
     */
    async submitReview(): Promise<boolean> {
      if (!this.currentTaskId) return false
      // 送审前用 Python 权威进度校准，避免本地估算误判完成度门控。
      await this.refreshTask()
      if (!this.canSubmitReview) return false
      try {
        const result = await submitWriteToReview(this.currentTaskId)
        // 把"来自编写模式"的初稿信息回填到审查 store，供审查面板提示。
        useReviewStore().acceptWriteDraft(result.draftDocId, result.reviewTaskId)
        return result.reviewTaskCreated
      } catch {
        return false
      }
    },
  },
})
