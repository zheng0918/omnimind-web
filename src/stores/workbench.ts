import { defineStore } from 'pinia'

import { fetchWorkbenchSummary } from '@/api/workbench'
import type { WorkbenchSummary } from '@/types/api'

import { seedWorkbench } from './pocSeed'

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
