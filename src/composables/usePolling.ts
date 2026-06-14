import { onUnmounted, ref } from 'vue'

export function usePolling<T>(opts: {
  fetchFn: (since?: string) => Promise<T>
  interval?: number
  getSince?: (payload: T) => string | undefined
  isTerminal?: (payload: T) => boolean
  onData: (payload: T) => void
}) {
  const polling = ref(false)
  let timer: number | null = null
  let since: string | undefined

  async function tick(): Promise<void> {
    const payload = await opts.fetchFn(since)
    since = opts.getSince?.(payload) ?? since
    opts.onData(payload)
    if (opts.isTerminal?.(payload)) stop()
  }

  function start(): void {
    if (timer !== null) return
    polling.value = true
    void tick()
    timer = window.setInterval(() => {
      void tick()
    }, opts.interval ?? 2000)
  }

  function stop(): void {
    if (timer !== null) window.clearInterval(timer)
    timer = null
    polling.value = false
  }

  onUnmounted(stop)

  return { polling, start, stop }
}
