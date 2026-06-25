import { createTraceId } from '@/utils/trace'

/**
 * 基于 fetch + ReadableStream 的 SSE 客户端，替代原生 EventSource。
 *
 * 为什么不用 EventSource：
 * 原生 EventSource 规范上只接受 (url, { withCredentials })，无法设置任何自定义请求头，
 * 这会逼着 JWT 走 query 参数——而 URL 里的 token 会泄漏进访问日志、浏览器历史与 Referer。
 * 改用 fetch 后即可像普通请求一样把鉴权放进 Authorization 头（@microsoft/fetch-event-source 同款思路）。
 *
 * 对接契约见 interfaceContract.md §0.8：一期事件集为 token/citation/progress/done/error，
 * Java 原样透传 Python 的事件名与 data（camelCase），前端按到达顺序消费。
 */

// 一期约定的 SSE 事件名（reasoning/image/chart/tool_call 等为预留，一期不发）。
export type SseEventName = 'token' | 'citation' | 'progress' | 'done' | 'error'

const KNOWN_EVENTS: readonly SseEventName[] = ['token', 'citation', 'progress', 'done', 'error']

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
 * 拼接 SSE URL。token 已改走请求头，故这里只拼业务查询参数；空值会被过滤掉，避免污染后端解析。
 * base 为空时回退到 window.location.origin —— 配合 Vite 代理走同源相对路径。
 */
function buildSseUrl(path: string, params: CreateSseOptions['params']) {
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin
  const url = new URL(path, base)

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

/**
 * 解析一个 SSE 事件块（以空行分隔）。多行 data 按规范用 \n 拼接；
 * 以 ':' 开头的行是注释/心跳，忽略。未识别的事件名返回 null（一期只消费 KNOWN_EVENTS）。
 */
function parseEventBlock(raw: string): SseEventPayload | null {
  let event = 'message'
  const dataLines: string[] = []

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (line === '' || line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''))
    }
  }

  if (!KNOWN_EVENTS.includes(event as SseEventName)) return null
  return { event: event as SseEventName, data: dataLines.join('\n') }
}

export function createSSE(path: string, options: CreateSseOptions): SseHandle {
  const controller = new AbortController()
  // 已主动关闭（abort 或收到 done/error 终态）后，不再上报错误、不再重连。
  let closed = false
  let reconnectCount = 0

  const finish = () => {
    closed = true
    controller.abort()
  }

  const connect = async (): Promise<void> => {
    const url = buildSseUrl(path, options.params)
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      'X-Trace-Id': createTraceId(),
      'X-Api-Version': 'v1',
    }
    if (options.token) headers.Authorization = `Bearer ${options.token}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
        // 关掉浏览器/中间层缓存，确保流式实时到达。
        cache: 'no-store',
      })

      if (!response.ok || !response.body) {
        throw new Error(`SSE HTTP ${response.status}`)
      }

      reconnectCount = 0
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // 按 SSE 规范以空行（\n\n）切分事件块；跨 chunk 的半个事件留在 buffer 里等下一片。
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        let boundary = buffer.indexOf('\n\n')
        while (boundary >= 0) {
          const block = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)

          const payload = parseEventBlock(block)
          if (payload) {
            options.onEvent(payload)
            // done/error 为终态：收到即关闭，不再读取与重连。
            if (payload.event === 'done') {
              finish()
              options.onDone?.()
              return
            }
            if (payload.event === 'error') {
              finish()
              return
            }
          }
          boundary = buffer.indexOf('\n\n')
        }
      }

      // 流自然结束（reader done）却没收到 done/error 终态：后端异常关闭/代理中断所致。
      // 终态事件会在上面 finish() 后 return，不会走到这里；故走到这里即「非正常收尾」，
      // 必须主动收尾通知上层，否则前端永远停在「正在生成」。
      if (!closed) {
        finish()
        options.onDone?.()
      }
    } catch (error) {
      // abort 触发的 AbortError 属正常关闭，不当作故障。
      if (closed || controller.signal.aborted) return

      reconnectCount += 1
      if (reconnectCount > 3) {
        finish()
        options.onError?.('网络已断开，请检查网络后重试')
        return
      }
      // 连接级失败才重试；终态事件已在上方 return，不会走到这里造成 token 重放。
      await connect()
    }
  }

  void connect()

  return {
    abort: () => finish(),
  }
}
