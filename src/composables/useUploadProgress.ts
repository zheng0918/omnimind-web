import { ref } from 'vue'

/**
 * 上传进度状态：配合 axios onUploadProgress 驱动进度条。
 * percent 钳制在 0–100，uploading 仅在 (0,100) 区间为 true（0 未开始 / 100 已完成）。
 */
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
