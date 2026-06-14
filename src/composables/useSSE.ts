import { onUnmounted, ref } from 'vue'

import { createSSE, type SseEventName, type SseHandle } from '@/api/sse'

export function useSSE<E extends SseEventName>(opts: {
  url: () => string
  token?: () => string
  params?: Record<string, string | number | boolean | null | undefined>
  events: E[]
  onEvent: (event: E, payload: string) => void
  onFirstToken?: (ms: number) => void
  onError?: (message: string) => void
}) {
  const status = ref<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle')
  let handle: SseHandle | null = null
  let openedAt = 0
  let firstTokenFired = false

  function open(): void {
    close()
    status.value = 'connecting'
    openedAt = performance.now()
    firstTokenFired = false
    handle = createSSE(opts.url(), {
      token: opts.token?.(),
      params: opts.params,
      onEvent: ({ event, data }) => {
        status.value = 'open'
        if (event === 'token' && !firstTokenFired) {
          firstTokenFired = true
          opts.onFirstToken?.(Math.round(performance.now() - openedAt))
        }
        if (opts.events.includes(event as E)) {
          opts.onEvent(event as E, data)
        }
      },
      onError: (message) => {
        status.value = 'error'
        opts.onError?.(message)
      },
      onDone: () => {
        status.value = 'closed'
      },
    })
  }

  function close(): void {
    handle?.abort()
    handle = null
    status.value = 'closed'
  }

  onUnmounted(close)

  return { status, open, close }
}
