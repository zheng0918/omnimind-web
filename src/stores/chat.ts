import { defineStore } from 'pinia'

import { createSession, listSessions, openChatStream } from '@/api/chat'
import type { SseHandle } from '@/api/sse'
import type { ChatMessage, ChatMode, ChatSession, Citation } from '@/types/api'

import { seedMessages, seedSessions } from './pocSeed'
import { useUserStore } from './user'

let activeStream: SseHandle | null = null

interface ChatState {
  sessions: ChatSession[]
  currentSessionId: string
  messages: Record<string, ChatMessage[]>
  isStreaming: boolean
  firstTokenMs: number | null
  streamError: string
}

function safeParse<T>(payload: string, fallback: T): T {
  try {
    return JSON.parse(payload) as T
  } catch {
    return fallback
  }
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    sessions: seedSessions,
    currentSessionId: seedSessions[0]?.sessionId ?? '',
    messages: seedMessages,
    isStreaming: false,
    firstTokenMs: null,
    streamError: '',
  }),
  getters: {
    currentMessages: (state) => state.messages[state.currentSessionId] ?? [],
    currentSession: (state) =>
      state.sessions.find((session) => session.sessionId === state.currentSessionId) ?? null,
  },
  actions: {
    async fetchSessions(q?: string): Promise<void> {
      try {
        const sessions = await listSessions(q)
        this.sessions = sessions
        if (!this.currentSessionId && sessions[0]) this.currentSessionId = sessions[0].sessionId
      } catch {
        this.sessions = seedSessions
      }
    },
    async createNewSession(scope: string[], mode: ChatMode): Promise<void> {
      try {
        const result = await createSession({ scope, mode })
        const session: ChatSession = {
          sessionId: result.sessionId,
          title: result.title,
          scope,
          mode,
          messageCount: 0,
          updatedAt: new Date().toISOString(),
        }
        this.sessions.unshift(session)
        this.currentSessionId = session.sessionId
        this.messages[session.sessionId] = []
      } catch {
        const sessionId = `local-${Date.now()}`
        this.sessions.unshift({
          sessionId,
          title: '新对话',
          scope,
          mode,
          messageCount: 0,
          updatedAt: new Date().toISOString(),
        })
        this.currentSessionId = sessionId
        this.messages[sessionId] = []
      }
    },
    setCurrentSession(sessionId: string): void {
      this.currentSessionId = sessionId
    },
    startStream(query: string, mode: ChatMode, docRefs?: string): void {
      if (!this.currentSessionId || this.isStreaming) return
      const sessionId = this.currentSessionId
      const startedAt = performance.now()
      const assistantId = `assistant-${Date.now()}`
      const userMessage: ChatMessage = {
        messageId: `user-${Date.now()}`,
        role: 'user',
        content: query,
        citations: [],
        createdAt: new Date().toISOString(),
      }
      const assistantMessage: ChatMessage = {
        messageId: assistantId,
        role: 'assistant',
        content: '',
        citations: [],
        createdAt: new Date().toISOString(),
        streaming: true,
      }

      this.messages[sessionId] = [...(this.messages[sessionId] ?? []), userMessage, assistantMessage]
      this.isStreaming = true
      this.firstTokenMs = null
      this.streamError = ''

      const userStore = useUserStore()
      activeStream = openChatStream(sessionId, {
        token: userStore.token,
        query,
        mode,
        docRefs,
        onEvent: ({ event, data }) => {
          const list = this.messages[sessionId] ?? []
          const target = list.find((message) => message.messageId === assistantId)
          if (!target) return

          if (event === 'token') {
            if (this.firstTokenMs === null) this.firstTokenMs = Math.round(performance.now() - startedAt)
            const payload = safeParse<{ text: string }>(data, { text: data })
            target.content += payload.text
          }

          if (event === 'citation') {
            const payload = safeParse<{ citations: Citation[] }>(data, { citations: [] })
            target.citations = payload.citations
          }

          if (event === 'done') {
            const payload = safeParse<{ messageId?: string }>(data, {})
            target.messageId = payload.messageId ?? target.messageId
            target.streaming = false
            this.isStreaming = false
          }

          if (event === 'error') {
            const payload = safeParse<{ message: string }>(data, { message: 'AI 暂时无响应，请重试' })
            this.streamError = payload.message
            target.streaming = false
            this.isStreaming = false
          }
        },
        onError: (message) => {
          this.streamError = message
          this.isStreaming = false
        },
      })
    },
    abortStream(): void {
      activeStream?.abort()
      activeStream = null
      this.isStreaming = false
    },
  },
})
