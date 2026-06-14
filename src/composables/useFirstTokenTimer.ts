import { ref } from 'vue'

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
