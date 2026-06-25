import { defineStore } from 'pinia'

import { fetchDocumentContent } from '@/api/document'
import {
  createReviewTask,
  type CreateReviewTaskParams,
  disposeRisk,
  exportReviewTask,
  getReviewTask,
  pollRisks,
} from '@/api/review'
import type { ReviewRisk, ReviewTask, RiskDisposition } from '@/types/api'

/**
 * 审查 store（REQ-REV）：增量风险条目（按 severity 分组）、处置进度与轮询。
 * 风险条目走轮询增量（since=lastId，2s，status=DONE 停），处置逐条提交。
 */

// 模块级轮询句柄：保证同一时刻只有一个定时器在跑。
let pollingHandle: number | null = null

interface ReviewState {
  currentTaskId: string
  task: ReviewTask | null
  risks: ReviewRisk[]
  lastId: string
  activeRiskId: string
  polling: boolean
  /** 当待审文档来自编写模式一键送审时记录初稿 docId，用于面板提示；否则为 null。 */
  fromWriteDraft: string | null
  /** 被审文档 docId：原文预览与风险定位的数据源（创建任务时记，旧任务从详情兜底）。 */
  targetDocId: string
  /** 被审文档 PDF 二进制原文，交 PdfViewer 渲染；切任务/重置时清空避免串档。 */
  originalPdf: ArrayBuffer | null
  pdfLoading: boolean
}

export const useReviewStore = defineStore('review', {
  state: (): ReviewState => ({
    currentTaskId: '',
    task: null,
    risks: [],
    lastId: '',
    activeRiskId: '',
    polling: false,
    fromWriteDraft: null,
    targetDocId: '',
    originalPdf: null,
    pdfLoading: false,
  }),
  getters: {
    activeRisk: (state) => state.risks.find((risk) => risk.riskId === state.activeRiskId) ?? null,
    groupedRisks: (state) => ({
      high: state.risks.filter((risk) => risk.severity === 'HIGH'),
      medium: state.risks.filter((risk) => risk.severity === 'MEDIUM'),
      pass: state.risks.filter((risk) => risk.severity === 'PASS'),
    }),
  },
  actions: {
    setActiveRisk(riskId: string): void {
      this.activeRiskId = riskId
    },
    /**
     * 创建审查任务（WEB-03）：登记任务 → 重置增量游标与风险列表 → 启动轮询。
     * 成功返回 true；失败返回 false（保留上次数据，由调用方提示）。
     */
    async createReview(params: CreateReviewTaskParams): Promise<boolean> {
      this.stopPolling()
      try {
        const result = await createReviewTask(params)
        this.currentTaskId = result.taskId
        this.task = {
          taskId: result.taskId,
          reviewTaskId: result.reviewTaskId,
          status: result.status,
          totalItems: 0,
          doneItems: 0,
          summary: { high: 0, medium: 0, pass: 0 },
        }
        this.risks = []
        this.lastId = ''
        this.activeRiskId = ''
        // 切换被审文档：记录新 targetDocId 并清空上一份原文，避免预览串档。
        this.targetDocId = String(params.targetDocId)
        this.originalPdf = null
        this.startPolling()
        return true
      } catch {
        return false
      }
    },
    /**
     * 加载被审文档原文二进制供 PDF 预览（设计 spec §2.6）。
     * targetDocId 缺省时（从历史任务进入）先取任务详情兜底；失败置空交由面板提示。
     */
    async loadOriginalDoc(): Promise<void> {
      if (this.originalPdf || this.pdfLoading) return
      if (!this.targetDocId && this.currentTaskId) {
        try {
          const detail = await getReviewTask(this.currentTaskId)
          if (detail.targetDocId) this.targetDocId = String(detail.targetDocId)
        } catch {
          // 详情拉取失败不阻断，交由下方 targetDocId 判空跳过。
        }
      }
      if (!this.targetDocId) return
      this.pdfLoading = true
      try {
        this.originalPdf = await fetchDocumentContent(this.targetDocId)
      } catch {
        this.originalPdf = null
      } finally {
        this.pdfLoading = false
      }
    },
    /** 接收来自编写模式的一键送审结果：切换当前审查任务为新建的复核任务。 */
    acceptWriteDraft(draftDocId: string, reviewTaskId: string): void {
      this.fromWriteDraft = draftDocId
      this.currentTaskId = reviewTaskId
      // 初稿即被审文档：切任务时同步 targetDocId 并清空旧原文。
      this.targetDocId = draftDocId
      this.originalPdf = null
    },
    async loadIncrement(): Promise<void> {
      if (!this.currentTaskId) return
      try {
        const result = await pollRisks(this.currentTaskId, this.lastId)
        this.lastId = result.lastId
        this.task = {
          taskId: this.currentTaskId,
          reviewTaskId: this.currentTaskId,
          status: result.status,
          totalItems: result.totalItems,
          doneItems: result.doneItems,
          summary: result.summary,
        }
        const seen = new Set(this.risks.map((risk) => risk.riskId))
        this.risks = [...this.risks, ...result.risks.filter((risk) => !seen.has(risk.riskId))]
        if (result.status === 'DONE' || result.status === 'FAILED') this.stopPolling()
      } catch {
        this.stopPolling()
      }
    },
    startPolling(): void {
      if (pollingHandle !== null) return
      this.polling = true
      pollingHandle = window.setInterval(() => {
        void this.loadIncrement()
      }, 2000)
    },
    stopPolling(): void {
      if (pollingHandle !== null) {
        window.clearInterval(pollingHandle)
      }
      pollingHandle = null
      this.polling = false
    },
    async dispose(
      riskId: string,
      disposition: RiskDisposition,
      ignoreReason: string | null,
      userEditedText: string | null,
    ): Promise<void> {
      await disposeRisk(riskId, { disposition, ignoreReason, userEditedText })
      this.risks = this.risks.map((risk) =>
        risk.riskId === riskId ? { ...risk, disposition } : risk,
      )
    },
    /** 导出审查报告（docx/pdf）：取预签名 URL 后浏览器直接下载（契约 §1.5）。 */
    async exportReport(format: 'docx' | 'pdf'): Promise<void> {
      if (!this.currentTaskId) return
      const { downloadUrl } = await exportReviewTask(this.currentTaskId, format)
      if (downloadUrl) window.open(downloadUrl, '_blank')
    },
  },
})
