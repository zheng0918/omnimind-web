import { defineStore } from 'pinia'

import { disposeRisk, pollRisks } from '@/api/review'
import type { ReviewRisk, ReviewTask, RiskDisposition } from '@/types/api'

import { seedReviewTask, seedRisks } from './pocSeed'

/**
 * 审查 store（REQ-REV）：增量风险条目（按 severity 分组）、处置进度与轮询。
 * 风险条目走轮询增量（since=lastId，2s，status=DONE 停），处置逐条提交。
 * POC 下以 seed 初始化，联调时由接口替换。
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
}

export const useReviewStore = defineStore('review', {
  state: (): ReviewState => ({
    currentTaskId: seedReviewTask.taskId,
    task: seedReviewTask,
    risks: seedRisks,
    lastId: seedRisks[seedRisks.length - 1]?.riskId ?? '',
    activeRiskId: seedRisks[0]?.riskId ?? '',
    polling: false,
    fromWriteDraft: null,
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
    /** 接收来自编写模式的一键送审结果：切换当前审查任务为新建的复核任务。 */
    acceptWriteDraft(draftDocId: string, reviewTaskId: string): void {
      this.fromWriteDraft = draftDocId
      this.currentTaskId = reviewTaskId
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
  },
})
