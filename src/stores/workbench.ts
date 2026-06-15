import { defineStore } from 'pinia'

import { fetchWorkbenchSummary } from '@/api/workbench'
import type { WorkbenchSummary } from '@/types/api'

import { seedWorkbench } from './pocSeed'

/**
 * 工作台 store（REQ-HOME）：一次性拉取 /workbench/summary 渲染五段式首页
 * （快讯 + KPI + 趋势 + 三栏 + Agent 入口）。失败时回退 seed 兜底展示。
 */
interface WorkbenchState {
  summary: WorkbenchSummary
  loading: boolean
}

export const useWorkbenchStore = defineStore('workbench', {
  state: (): WorkbenchState => ({
    summary: seedWorkbench,
    loading: false,
  }),
  actions: {
    async fetchSummary(): Promise<void> {
      this.loading = true
      try {
        this.summary = await fetchWorkbenchSummary()
      } catch {
        this.summary = seedWorkbench
      } finally {
        this.loading = false
      }
    },
  },
})
