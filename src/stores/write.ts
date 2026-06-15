import { defineStore } from 'pinia'

import type { SseHandle } from '@/api/sse'
import { saveSection, submitWriteToReview, triggerResponseCheck } from '@/api/write'
import { useReviewStore } from '@/stores/review'
import type { OutlineNode, ScorePoint, WriteSection, WriteTask } from '@/types/api'

import { seedOutline, seedScorePoints, seedSections, seedWriteTask } from './pocSeed'

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
  lockState: {
    editingUserId: string | null
    lockExpireAt: string | null
  }
}

const activeStreams: Record<string, SseHandle> = {}

export const useWriteStore = defineStore('write', {
  state: (): WriteState => ({
    currentTaskId: seedWriteTask.taskId,
    task: seedWriteTask,
    outline: seedOutline,
    sections: seedSections,
    activeSectionId: 'sec-1',
    scorePoints: seedScorePoints,
    lockState: {
      editingUserId: null,
      lockExpireAt: null,
    },
  }),
  getters: {
    activeSection: (state) => state.sections[state.activeSectionId] ?? null,
    /** 已完成章节数（已生成 / 用户已编辑视为完成）。 */
    doneSectionCount: (state) =>
      state.outline.filter((node) => node.status === 'DONE' || node.status === 'USER_EDITED').length,
    /** 是否有章节仍在流式生成中——用于切换 Tab 时判断「任务进行中」。 */
    isGenerating: (state) => state.outline.some((node) => node.status === 'GENERATING'),
    /** 初稿完成度（百分比）：优先取任务进度，回退按章节完成比例估算。 */
    completionPercent: (state) => {
      if (state.task?.completionPercent != null) return state.task.completionPercent
      if (!state.outline.length) return 0
      const done = state.outline.filter(
        (node) => node.status === 'DONE' || node.status === 'USER_EDITED',
      ).length
      return Math.round((done / state.outline.length) * 100)
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
    },
    upsertSection(section: WriteSection): void {
      this.sections[section.sectionId] = section
    },
    stopSectionStream(sectionId: string): void {
      activeStreams[sectionId]?.abort()
      delete activeStreams[sectionId]
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
    },
    async checkResponse(): Promise<void> {
      if (!this.currentTaskId) return
      const result = await triggerResponseCheck(this.currentTaskId)
      this.scorePoints = result.scorePoints
    },
    /**
     * 一键送审（REQ-LINK）：要求初稿完成度 ≥ 80%，调用 submit-review 由 Java 编排
     * 将初稿落为新 document 并自动建审查任务，随后把"待审文档"信息回填到审查侧。
     * @returns 是否成功送审（完成度不足或接口失败时返回 false）。
     */
    async submitReview(): Promise<boolean> {
      if (!this.currentTaskId || !this.canSubmitReview) return false
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
