import { defineStore } from 'pinia'

import { listDocuments } from '@/api/document'
import { listKb } from '@/api/kb'
import type { DocumentItem, KnowledgeBase, ParseStatusResult } from '@/types/api'

import { seedDocuments, seedKbs } from './pocSeed'

/**
 * 知识库 store（REQ-KB）：库列表、当前库、文档列表与解析进度。
 * 接口失败时回退 seed，保证 POC 演示页面不空白。
 */
interface KbState {
  currentKbId: string
  kbList: KnowledgeBase[]
  documents: DocumentItem[]
  parseStatusMap: Record<string, ParseStatusResult>
  loading: boolean
}

export const useKbStore = defineStore('kb', {
  state: (): KbState => ({
    currentKbId: seedKbs[0]?.kbId ?? '',
    kbList: seedKbs,
    documents: seedDocuments,
    parseStatusMap: {},
    loading: false,
  }),
  getters: {
    currentKb: (state) => state.kbList.find((item) => item.kbId === state.currentKbId) ?? null,
    parsedCount: (state) => state.documents.filter((item) => item.parseStatus === 'PARSED').length,
  },
  actions: {
    async fetchList(): Promise<void> {
      this.loading = true
      try {
        const list = await listKb()
        this.kbList = list
        if (!this.currentKbId && list[0]) this.currentKbId = list[0].kbId
      } catch {
        this.kbList = seedKbs
      } finally {
        this.loading = false
      }
    },
    async fetchDocuments(kbId?: string): Promise<void> {
      const targetKbId = kbId ?? this.currentKbId
      if (!targetKbId) return
      this.currentKbId = targetKbId
      this.loading = true
      try {
        this.documents = await listDocuments(targetKbId)
      } catch {
        this.documents = seedDocuments.filter((item) => item.kbId === targetKbId)
      } finally {
        this.loading = false
      }
    },
  },
})
