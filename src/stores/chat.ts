import { defineStore } from 'pinia'

import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  openChatStream,
  submitFeedback,
} from '@/api/chat'
import type { SseHandle } from '@/api/sse'
import type { ChatMessage, ChatMode, ChatSession, Citation } from '@/types/api'

import { useUserStore } from './user'

/**
 * 问答 store（REQ-CHAT）：多会话、消息流与流式态。
 * 回答经 SSE 流式拼接（token 增量 / citation 引用 / done 收尾），引用写入右侧引用区。
 */

// 模块级 SSE 句柄：新提问前先关闭上一条流，避免并发串流。
let activeStream: SseHandle | null = null

interface ChatState {
  sessions: ChatSession[]
  currentSessionId: string
  messages: Record<string, ChatMessage[]>
  isStreaming: boolean
  firstTokenMs: number | null
  streamError: string
  creatingSession: boolean
}

/** 从首条提问派生会话标题：截断到 20 字，去除多余空白与首部 @文档 提及。 */
function deriveTitle(query: string): string {
  const text = query.replace(/\s+/g, ' ').trim()
  return text.length > 20 ? `${text.slice(0, 20)}…` : text
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
    sessions: [],
    currentSessionId: '',
    messages: {},
    isStreaming: false,
    firstTokenMs: null,
    streamError: '',
    creatingSession: false,
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
        // 错误已由 http 拦截统一提示；保持空列表，不回退假数据。
      }
    },
    async createNewSession(scope: string[], mode: ChatMode): Promise<void> {
      if (this.creatingSession) return
      this.creatingSession = true
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
        // 错误已由 http 拦截统一提示；不再伪造本地会话，失败即不创建。
      } finally {
        this.creatingSession = false
      }
    },
    setCurrentSession(sessionId: string): void {
      this.currentSessionId = sessionId
      // 首次进入会话时按需拉取历史消息（WEB-06）。
      if (this.messages[sessionId] === undefined) void this.loadSession(sessionId)
    },
    /** 拉取会话详情与历史消息（WEB-06，契约 §1.4）。 */
    async loadSession(sessionId: string): Promise<void> {
      try {
        const { session, messages } = await getSession(sessionId)
        this.messages[sessionId] = messages
        // 后端未持久化标题时，用首条用户消息兜底，避免历史列表整列「未命名会话」。
        if (!session.title) {
          const firstUser = messages.find((message) => message.role === 'user')
          if (firstUser) session.title = deriveTitle(firstUser.content)
        }
        const idx = this.sessions.findIndex((item) => item.sessionId === sessionId)
        if (idx >= 0) this.sessions[idx] = session
      } catch {
        this.messages[sessionId] = this.messages[sessionId] ?? []
      }
    },
    /** 删除会话（WEB-06）：成功后从列表移除并切换当前会话。 */
    async removeSession(sessionId: string): Promise<boolean> {
      try {
        await deleteSession(sessionId)
      } catch {
        return false
      }
      this.sessions = this.sessions.filter((item) => item.sessionId !== sessionId)
      delete this.messages[sessionId]
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = this.sessions[0]?.sessionId ?? ''
      }
      return true
    },
    /** 提交/取消消息反馈（WEB-06）：feedback=null 表示取消（契约 §1.4）。 */
    async setFeedback(messageId: string, feedback: 'up' | 'down' | null): Promise<void> {
      const list = this.messages[this.currentSessionId] ?? []
      const target = list.find((message) => message.messageId === messageId)
      // 再次点击同一反馈视为取消。
      const next = target?.feedback === feedback ? null : feedback
      try {
        await submitFeedback(messageId, next)
        if (target) target.feedback = next
      } catch {
        // 反馈失败不阻断对话，保留原值。
      }
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
      // 后端新建会话 title 为 null，列表/Tab 全显示「未命名会话」。首次提问即用问题文本兜底命名。
      const session = this.sessions.find((item) => item.sessionId === sessionId)
      if (session && !session.title) session.title = deriveTitle(query)
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
            // 把错误写进助手消息本体，否则气泡留空、用户以为「AI 没返回数据」。
            target.error = payload.message
            target.streaming = false
            this.isStreaming = false
          }
        },
        onError: (message) => {
          this.streamError = message
          // 连接级失败同样要落到气泡，并解除流式态，避免一直显示「正在生成」。
          const list = this.messages[sessionId] ?? []
          const target = list.find((item) => item.messageId === assistantId)
          if (target) {
            target.error = message
            target.streaming = false
          }
          this.isStreaming = false
        },
        // 兜底收尾：流被异常关闭却没收到 done/error 终态时触发（见 sse.ts）。
        // 正常 done 已在 onEvent 里把 streaming 置 false，这里因 streaming 已 false 而跳过，不会重复处理。
        onDone: () => {
          const list = this.messages[sessionId] ?? []
          const target = list.find((item) => item.messageId === assistantId)
          if (target?.streaming) {
            target.streaming = false
            // 没有任何正文也没报错，说明是异常中断，给出可重试提示，避免留空白气泡。
            if (!target.content && !target.error) target.error = '生成意外结束，请重试'
          }
          this.isStreaming = false
        },
      })
    },
    abortStream(): void {
      activeStream?.abort()
      activeStream = null
      this.isStreaming = false
      // 关键：abort 只断连接，不会再有 done 事件到达；必须主动清掉流式气泡的 streaming 标记，
      // 否则气泡会一直停在「正在生成」。清理所有会话里残留的流式态以防切换会话的边界情况。
      Object.values(this.messages).forEach((list) =>
        list.forEach((message) => {
          if (message.streaming) message.streaming = false
        }),
      )
    },
  },
})
