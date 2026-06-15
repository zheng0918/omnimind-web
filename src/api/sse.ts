import { createTraceId } from '@/utils/trace'

/**
 * 原生 EventSource 的薄封装，统一 SSE 连接的鉴权、traceId、事件分发与重连策略。
 * 对接契约见 interfaceContract.md §0.8：一期事件集为 token/citation/progress/done/error，
 * Java 原样透传 Python 的事件名与 data（camelCase），前端按到达顺序消费。
 */

// 一期约定的 SSE 事件名（reasoning/image/chart/tool_call 等为预留，一期不发）。
export type SseEventName = 'token' | 'citation' | 'progress' | 'done' | 'error'

export interface SseEventPayload {
  event: SseEventName
  data: string
}

export interface SseHandle {
  abort: () => void
}

interface CreateSseOptions {
  token?: string
  params?: Record<string, string | number | boolean | null | undefined>
  onEvent: (payload: SseEventPayload) => void
  onError?: (message: string) => void
  onDone?: () => void
}

/**
 * 拼接 SSE URL。EventSource 不能自定义请求头，故 JWT 与 traceId 走查询参数；
 * 空值参数会被过滤掉，避免污染后端解析。
 */
function buildSseUrl(path: string, token: string | undefined, params: CreateSseOptions['params']) {
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin
  const url = new URL(path, base)

  if (token) url.searchParams.set('token', token)
  url.searchParams.set('traceId', createTraceId())

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

export function createSSE(path: string, options: CreateSseOptions): SseHandle {
  const url = buildSseUrl(path, options.token, options.params)
  const source = new EventSource(url)
  let reconnectCount = 0

  // done/error 为终态事件：收到即主动关闭连接（一期取消机制 = 前端关闭 EventSource）。
  const handleMessage = (eventName: SseEventName) => (event: MessageEvent<string>) => {
    options.onEvent({ event: eventName, data: event.data })
    if (eventName === 'done') {
      source.close()
      options.onDone?.()
    }
    if (eventName === 'error') {
      source.close()
    }
  }

  ;(['token', 'citation', 'progress', 'done', 'error'] as SseEventName[]).forEach((eventName) => {
    source.addEventListener(eventName, handleMessage(eventName))
  })

  // 网络抖动时浏览器会自动重连；累计超过 3 次仍失败才判定断线并上报错误态。
  source.onerror = () => {
    reconnectCount += 1
    if (reconnectCount > 3) {
      source.close()
      options.onError?.('网络已断开，请检查网络后重试')
    }
  }

  return {
    abort: () => source.close(),
  }
}
