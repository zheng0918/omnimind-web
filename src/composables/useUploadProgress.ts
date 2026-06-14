import { ref } from 'vue'

export function useUploadProgress() {
  const percent = ref(0)
  const uploading = ref(false)

  function reset(): void {
    percent.value = 0
    uploading.value = false
  }

  function setPercent(value: number): void {
    percent.value = Math.max(0, Math.min(value, 100))
    uploading.value = percent.value > 0 && percent.value < 100
  }

  return { percent, uploading, reset, setPercent }
}
