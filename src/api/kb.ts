import { API_PATHS } from '@/constants/api'
import type { KbMember, KnowledgeBase } from '@/types/api'

import { request } from './http'

export interface SaveKbParams {
  name: string
  description: string
  members: KbMember[]
}

export function listKb(): Promise<KnowledgeBase[]> {
  return request<KnowledgeBase[]>({
    method: 'GET',
    url: API_PATHS.kb.list,
  })
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
