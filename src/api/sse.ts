import { createTraceId } from '@/utils/trace'

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
