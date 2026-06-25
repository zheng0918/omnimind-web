import { API_PATHS } from '@/constants/api'
import type { DocumentItem, PageResult, ParseStatusResult, UploadDocumentResult } from '@/types/api'

import { http, request } from './http'

// 后端返回 PageResult{list,...}，解包出文档数组。
export async function listDocuments(kbId: string): Promise<DocumentItem[]> {
  const page = await request<PageResult<DocumentItem>>({
    method: 'GET',
    url: API_PATHS.kb.documents(kbId),
  })
  return page.list
}

export function uploadDocument(
  kbId: string,
  file: File,
  onUploadProgress?: (percent: number) => void,
): Promise<UploadDocumentResult> {
  const data = new FormData()
  data.append('file', file)

  return request<UploadDocumentResult>({
    method: 'POST',
    url: API_PATHS.kb.documents(kbId),
    data,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (event) => {
      if (!event.total) return
      onUploadProgress?.(Math.round((event.loaded / event.total) * 100))
    },
  })
}

export function getParseStatus(docId: string): Promise<ParseStatusResult> {
  return request<ParseStatusResult>({
    method: 'GET',
    url: API_PATHS.document.parseStatus(docId),
  })
}

export function reparseDocument(docId: string): Promise<ParseStatusResult> {
  return request<ParseStatusResult>({
    method: 'POST',
    url: API_PATHS.document.reparse(docId),
  })
}

export function deleteDocument(docId: string): Promise<void> {
  return request<void>({
    method: 'DELETE',
    url: API_PATHS.document.remove(docId),
  })
}

/**
 * 同源拉取文档二进制原文（供 PDF.js 渲染）。
 * 不复用 request()：它按 ApiResponse 强制解包，二进制流无 code 字段会误入错误分支。
 * 直发导出的 http 实例（仍带 JWT/trace 拦截）；失败由调用方 try/catch 兜底为预览错误态。
 */
export async function fetchDocumentContent(docId: string): Promise<ArrayBuffer> {
  const res = await http.request<ArrayBuffer>({
    method: 'GET',
    url: API_PATHS.document.download(docId),
    responseType: 'arraybuffer',
  })
  return res.data
}
