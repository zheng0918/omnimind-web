import { API_PATHS } from '@/constants/api'
import type { DocumentItem, ParseStatusResult, UploadDocumentResult } from '@/types/api'

import { request } from './http'

export function listDocuments(kbId: string): Promise<DocumentItem[]> {
  return request<DocumentItem[]>({
    method: 'GET',
    url: API_PATHS.kb.documents(kbId),
  })
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
