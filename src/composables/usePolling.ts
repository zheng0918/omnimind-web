import { onUnmounted, ref } from 'vue'

/**
 * 轮询封装（interfaceContract.md §0.7）：用于列表式累积数据——文档解析进度、
 * 审查风险条目。维护 `since` 游标做增量拉取，命中终态自动停止，组件卸载清定时器。
 *
 * @param opts.fetchFn   每次轮询调用的请求函数，入参为上一轮的 since 游标。
 * @param opts.interval  轮询间隔，默认 2000ms（与契约一致）。
 * @param opts.getSince  从返回值提取下一轮 since 游标。
 * @param opts.isTerminal 判定是否到达终态（如 status=DONE），命中后停止轮询。
 * @param opts.onData    每轮数据回调。
 */
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
