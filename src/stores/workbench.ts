import { defineStore } from 'pinia'

import { fetchWorkbenchSummary } from '@/api/workbench'
import type { WorkbenchSummary } from '@/types/api'

/**
 * 工作台 store（REQ-HOME）：一次性拉取 /workbench/summary 渲染五段式首页
 * （快讯 + KPI + 趋势 + 三栏 + Agent 入口）。
 */

// 空工作台占位：首屏未返回/接口失败时避免模板空引用；错误已由 http 拦截统一 toast。
const emptyWorkbench: WorkbenchSummary = {
  kpis: { todayQuestions: 0, weekReviews: 0, kbUsagePercent: 0, pendingTasks: 0 },
  activityTrend: [],
  kbHealth: { totalDocs: 0, parsedDocs: 0, failedDocs: 0 },
  hotQuestions: [],
  recentTasks: [],
}

interface WorkbenchState {
  summary: WorkbenchSummary
  loading: boolean
}

export const useWorkbenchStore = defineStore('workbench', {
  state: (): WorkbenchState => ({
    summary: emptyWorkbench,
    loading: false,
  }),
  actions: {
    async fetchSummary(): Promise<void> {
      this.loading = true
      try {
        this.summary = await fetchWorkbenchSummary()
      } catch {
        // 错误已由 http 拦截统一提示；保持空态，不回退假数据。
      } finally {
        this.loading = false
      }
    },
  },
})
