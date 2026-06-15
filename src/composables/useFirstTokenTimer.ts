import { ref } from 'vue'

/**
 * 首 Token 计时器：start() 记录起点，mark() 在首个 token 到达时落点（只记一次）。
 * 用于问答/编写流式性能可观测，目标首 token ≤ 1.5s（frontendRequirements.md §3.5）。
 */
export function useFirstTokenTimer() {
  const durationMs = ref<number | null>(null)
  let startedAt = 0

  function start(): void {
    startedAt = performance.now()
    durationMs.value = null
  }

  function mark(): void {
    if (durationMs.value !== null || startedAt === 0) return
    durationMs.value = Math.round(performance.now() - startedAt)
  }

  return { start, mark, durationMs }
}
