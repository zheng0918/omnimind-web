<template>
  <section
    class="upload-zone"
    :class="{ disabled, 'has-file': selectedName }"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <input
      ref="fileInput"
      class="sr-only"
      :disabled="disabled"
      type="file"
      accept=".pdf,.docx,.xlsx"
      @change="handleChange"
    />
    <span class="label-tag">{{ label }}</span>
    <UploadCloud class="icon" />
    <div class="title">
      {{ selectedName || '点击上传或拖拽文件到此处' }}
    </div>
    <div class="sub">
      {{ statusText }}
    </div>
    <div v-if="percent > 0" class="upload-progress">
      <i :style="{ width: `${percent}%` }" />
    </div>
    <button class="upload-hit" type="button" :disabled="disabled" @click="fileInput?.click()" />
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { UploadCloud } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import { uploadDocument } from '@/api/document'
import type { UploadDocumentResult } from '@/types/api'
import { formatBytes } from '@/utils/format'

const props = defineProps<{
  kbId: string
  label: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  uploaded: [result: UploadDocumentResult]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedName = ref('')
const percent = ref(0)
const maxSize = 50 * 1024 * 1024
const allowedExt = ['pdf', 'docx', 'xlsx']

const statusText = computed(() => {
  if (props.disabled) return '当前角色无操作权限，请联系管理员'
  if (percent.value > 0 && percent.value < 100) return `上传中 ${percent.value}%`
  if (selectedName.value) return '已入队解析 · 每 2s 自动刷新状态'
  return '支持 PDF / DOCX / XLSX · 单文件 ≤ 50 MB'
})

function validate(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!allowedExt.includes(ext)) {
    ElMessage.warning('上传失败：格式不支持，请上传 PDF / DOCX / XLSX')
    return false
  }
  if (file.size <= 0) {
    ElMessage.warning('上传失败：文件内容为空')
    return false
  }
  if (file.size > maxSize) {
    ElMessage.warning(`上传失败：文件大小 ${formatBytes(file.size)} 超过 50MB 上限`)
    return false
  }
  return true
}

async function upload(file: File): Promise<void> {
  if (!props.kbId || !validate(file)) return
  selectedName.value = file.name
  percent.value = 1
  try {
    const result = await uploadDocument(props.kbId, file, (value) => {
      percent.value = value
    })
    percent.value = 100
    // 仅在拿到真实 documentId 后才视为成功并回填，避免后端返回异常结构时
    // 上传区显示「已上传」、但「开始审查/编写」仍提示「请先上传」的撕裂状态。
    if (!result?.documentId) {
      throw new Error('上传返回缺少 documentId')
    }
    emit('uploaded', result)
  } catch (error) {
    // 上传失败（如同名文件被后端按业务错误拒绝）时复位上传区，让状态如实反映「未上传」。
    selectedName.value = ''
    percent.value = 0
    // http 拦截已对后端业务错误统一 toast；此处仅兜底无 message 的本地异常。
    if (error instanceof Error && error.message === '上传返回缺少 documentId') {
      ElMessage.error('上传失败：服务返回异常，请重试')
    }
  }
}

function handleChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void upload(file)
  input.value = ''
}

function handleDrop(event: DragEvent): void {
  if (props.disabled) return
  const file = event.dataTransfer?.files[0]
  if (file) void upload(file)
}

// 供父组件（如知识库管理页顶部「上传文档」按钮）外部唤起文件选择框。
defineExpose({ open: () => fileInput.value?.click() })
</script>
