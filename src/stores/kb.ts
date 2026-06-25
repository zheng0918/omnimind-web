import { defineStore } from 'pinia'

import { getParseStatus, listDocuments, reparseDocument } from '@/api/document'
import { createKb, listKb, type SaveKbParams } from '@/api/kb'
import type { DocumentItem, KnowledgeBase, ParseStatusResult } from '@/types/api'

// 模块级解析轮询句柄：每个文档至多一个定时器，避免重复轮询。
const parseTimers: Record<string, number> = {}

function isParseTerminal(status: string): boolean {
  return status === 'PARSED' || status === 'FAILED'
}

/**
 * 知识库 store（REQ-KB）：库列表、当前库、文档列表与解析进度。
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
    currentKbId: '',
    kbList: [],
    documents: [],
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
        // 错误已由 http 拦截统一提示；保持空列表，不回退假数据。
      } finally {
        this.loading = false
      }
    },
    /** 新建知识库（REQ-KB）：创建后刷新列表并切换到新库，驱动右侧文档区。 */
    async createKb(params: SaveKbParams): Promise<boolean> {
      try {
        const kb = await createKb(params)
        await this.fetchList()
        await this.fetchDocuments(kb.kbId)
        return true
      } catch {
        // 错误已由 http 拦截统一提示。
        return false
      }
    },
    async fetchDocuments(kbId?: string): Promise<void> {
      const targetKbId = kbId ?? this.currentKbId
      if (!targetKbId) return
      this.currentKbId = targetKbId
      this.loading = true
      try {
        this.documents = await listDocuments(targetKbId)
        // 列表里仍在解析中的文档，进入页面即继续轮询直至终态。
        this.documents
          .filter((doc) => !isParseTerminal(doc.parseStatus))
          .forEach((doc) => this.pollParseStatus(doc.documentId))
      } catch {
        // 错误已由 http 拦截统一提示；保持空列表，不回退假数据。
        this.documents = []
      } finally {
        this.loading = false
      }
    },
    /** 把解析进度写回对应文档行（WEB-04）。 */
    applyParseStatus(result: ParseStatusResult): void {
      this.parseStatusMap[result.documentId] = result
      const doc = this.documents.find((item) => item.documentId === result.documentId)
      if (doc) {
        doc.parseStatus = result.parseStatus
        if (result.pageCount != null) doc.pageCount = result.pageCount
        doc.errorMsg = result.errorMsg
      }
    },
    /** 2s 轮询单个文档解析状态，命中 PARSED/FAILED 终态自动停（契约 §2.3）。 */
    pollParseStatus(documentId: string): void {
      if (parseTimers[documentId] !== undefined) return
      const tick = async (): Promise<void> => {
        try {
          const result = await getParseStatus(documentId)
          this.applyParseStatus(result)
          if (isParseTerminal(result.parseStatus)) this.stopParsePolling(documentId)
        } catch {
          this.stopParsePolling(documentId)
        }
      }
      void tick()
      parseTimers[documentId] = window.setInterval(() => void tick(), 2000)
    },
    stopParsePolling(documentId: string): void {
      if (parseTimers[documentId] !== undefined) {
        window.clearInterval(parseTimers[documentId])
        delete parseTimers[documentId]
      }
    },
    /** 触发重新解析失败文档（WEB-04），随后恢复轮询。 */
    async reparse(documentId: string): Promise<boolean> {
      try {
        const result = await reparseDocument(documentId)
        this.applyParseStatus(result)
        this.pollParseStatus(documentId)
        return true
      } catch {
        return false
      }
    },
  },
})
