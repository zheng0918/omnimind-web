import { API_PATHS } from '@/constants/api'
import type { ChatMessage, ChatMode, ChatSession, PageResult } from '@/types/api'

import { request } from './http'
import { createSSE, type SseHandle, type SseEventPayload } from './sse'

export interface CreateSessionParams {
  scope: string[]
  mode: ChatMode
}

export function createSession(params: CreateSessionParams): Promise<{ sessionId: string; title: string | null }> {
  return request<{ sessionId: string; title: string | null }>({
    method: 'POST',
    url: API_PATHS.chat.sessions,
    data: params,
  })
}

// 后端返回 PageResult{list,...}，解包出会话数组。
export async function listSessions(q?: string): Promise<ChatSession[]> {
  const page = await request<PageResult<ChatSession>>({
    method: 'GET',
    url: API_PATHS.chat.sessions,
    params: { q },
  })
  return page.list
}

export function getSession(sessionId: string): Promise<{ session: ChatSession; messages: ChatMessage[] }> {
  return request<{ session: ChatSession; messages: ChatMessage[] }>({
    method: 'GET',
    url: API_PATHS.chat.session(sessionId),
  })
}

export function deleteSession(sessionId: string): Promise<void> {
  return request<void>({
    method: 'DELETE',
    url: API_PATHS.chat.session(sessionId),
  })
}

export function openChatStream(
  sessionId: string,
  params: {
    query: string
    mode: ChatMode
    docRefs?: string
    token?: string
    onEvent: (payload: SseEventPayload) => void
    onError: (message: string) => void
    onDone?: () => void
  },
): SseHandle {
  return createSSE(API_PATHS.chat.stream(sessionId), {
    token: params.token,
    params: {
      query: params.query,
      mode: params.mode,
      docRefs: params.docRefs,
    },
    onEvent: params.onEvent,
    onError: params.onError,
    onDone: params.onDone,
  })
}

export function submitFeedback(messageId: string, feedback: 'up' | 'down' | null): Promise<void> {
  return request<void>({
    method: 'POST',
    url: API_PATHS.chat.feedback(messageId),
    data: { feedback },
  })
}
