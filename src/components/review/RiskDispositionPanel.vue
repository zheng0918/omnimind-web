<template>
  <section class="panel">
    <div class="panel-head">
      <h3>处置建议</h3>
      <span class="meta">{{ risk ? `P.${risk.sourcePage}` : '-' }}</span>
    </div>
    <div v-if="risk" class="risk-detail">
      <span class="sugg-badge" :class="risk.severity.toLowerCase()">{{ severityLabel[risk.severity] }}</span>
      <h2>{{ risk.title }}</h2>
      <p>{{ risk.description }}</p>

      <div class="diff-box">
        <h4>原文片段</h4>
        <p>{{ risk.originalText || '未在文档中检测到对应内容' }}</p>
      </div>
      <div class="diff-box suggested">
        <h4>修改建议</h4>
        <p>{{ risk.suggestedText || '当前条目无需修改' }}</p>
      </div>

      <label class="field-row">
        <span>编辑后的建议文本</span>
        <textarea v-model="editedText" rows="4" />
      </label>
      <label class="field-row">
        <span>忽略原因</span>
        <input v-model="ignoreReason" placeholder="忽略时必填" type="text" />
      </label>

      <div class="sugg-actions">
        <button class="btn primary" type="button" @click="handleDispose('ACCEPTED')">
          <Check />
          采纳建议
        </button>
        <button class="btn" type="button" @click="handleDispose('EDITED')">
          <Pencil />
          保存编辑
        </button>
        <button class="btn danger" type="button" @click="handleDispose('IGNORED')">
          <Ban />
          忽略
        </button>
      </div>
    </div>
    <EmptyState v-else title="未选择风险" description="选择左侧风险条目后查看原文、建议和处置动作。" />
  </section>
</template>

<script setup lang="ts">
import { Ban, Check, Pencil } from 'lucide-vue-next'
import { ref, watch } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import { severityLabel } from '@/constants/enums'
import type { ReviewRisk, RiskDisposition } from '@/types/api'

const props = defineProps<{
  risk: ReviewRisk | null
}>()

const emit = defineEmits<{
  dispose: [disposition: RiskDisposition, ignoreReason: string | null, userEditedText: string | null]
}>()

const editedText = ref('')
const ignoreReason = ref('')

watch(
  () => props.risk?.riskId,
  () => {
    editedText.value = props.risk?.suggestedText ?? ''
    ignoreReason.value = ''
  },
  { immediate: true },
)

function handleDispose(disposition: RiskDisposition): void {
  emit(
    'dispose',
    disposition,
    disposition === 'IGNORED' ? ignoreReason.value : null,
    disposition === 'EDITED' ? editedText.value : null,
  )
}
</script>
