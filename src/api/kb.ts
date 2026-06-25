import { API_PATHS } from '@/constants/api'
import type { KbMember, KnowledgeBase, PageResult } from '@/types/api'

import { request } from './http'

export interface SaveKbParams {
  name: string
  description: string
  members: KbMember[]
}

// 后端列表统一返回 PageResult{list,total,...}，这里解包出数组供 store 直接消费。
export async function listKb(): Promise<KnowledgeBase[]> {
  const page = await request<PageResult<KnowledgeBase>>({
    method: 'GET',
    url: API_PATHS.kb.list,
  })
  return page.list
}

export function getKb(kbId: string): Promise<KnowledgeBase> {
  return request<KnowledgeBase>({
    method: 'GET',
    url: API_PATHS.kb.detail(kbId),
  })
}

export function createKb(params: SaveKbParams): Promise<KnowledgeBase> {
  return request<KnowledgeBase>({
    method: 'POST',
    url: API_PATHS.kb.list,
    data: params,
  })
}

export function updateKb(kbId: string, params: SaveKbParams): Promise<KnowledgeBase> {
  return request<KnowledgeBase>({
    method: 'PUT',
    url: API_PATHS.kb.detail(kbId),
    data: params,
  })
}

export function deleteKb(kbId: string): Promise<void> {
  return request<void>({
    method: 'DELETE',
    url: API_PATHS.kb.detail(kbId),
  })
}
