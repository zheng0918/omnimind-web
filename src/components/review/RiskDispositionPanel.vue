<template>
  <!--
    审查右栏「AI 建议」（对齐原型 index-v2.html §审查三栏-右 .sugg-card）：
    徽标 + 标题 + 说明 + 原文引用 + AI 建议修改文本(可编辑) + 相似历史案例 + 处置动作。
    数据来自真实 ReviewRisk；处置经 dispose 事件回传父级提交后端。
  -->
  <section class="panel">
    <div class="panel-head">
      <h3><Sparkles class="ph-icon" /> AI 建议<template v-if="risk"> · 当前 {{ tag }}</template></h3>
      <span class="meta">{{ risk ? `置信 ${formatConfidence(risk.confidence)}` : '-' }}</span>
    </div>

    <div v-if="risk" class="sugg-card">
      <span class="sugg-badge" :class="risk.severity.toLowerCase()">
        {{ tag }} · {{ severityLabel[risk.severity] }}
      </span>
      <div class="sugg-title">{{ risk.title }}</div>
      <div class="sugg-desc">{{ risk.description }}</div>

      <div class="sugg-section">
        <div class="sugg-section-title">▸ 原文引用</div>
        <div class="sugg-quote">{{ risk.originalText || '未在文档中检测到对应内容' }}</div>
      </div>

      <div class="sugg-section">
        <div class="sugg-section-title">▸ AI 建议修改后文本（可编辑）</div>
        <textarea v-model="editedText" class="sugg-code sugg-code-edit" rows="5" />
      </div>

      <div v-if="risk.relatedCases.length" class="sugg-section">
        <div class="sugg-section-title">▸ 相似历史案例</div>
        <div v-for="(item, idx) in risk.relatedCases" :key="idx" class="sugg-related">
          <Link2 />
          <span>{{ item }}</span>
        </div>
      </div>

      <div class="sugg-section">
        <div class="sugg-section-title">▸ 忽略原因（忽略时必填）</div>
        <input v-model="ignoreReason" class="ignore-input" placeholder="例如：与本项目不适用" type="text" />
      </div>

      <div class="sugg-actions">
        <button class="btn primary" type="button" @click="handleDispose('ACCEPTED')">接受建议</button>
        <button class="btn" type="button" @click="handleDispose('EDITED')">保存修改</button>
        <button class="btn" type="button" @click="handleDispose('IGNORED')">忽略</button>
      </div>

      <div class="sugg-source">
        <FileText />
        <span>来源：P.{{ risk.sourcePage }} · 段落 {{ risk.sourceParaId || '—' }}</span>
      </div>
    </div>

    <EmptyState v-else title="未选择风险" description="选择左侧风险条目后查看原文、AI 建议和处置动作。" />
  </section>
</template>

<script setup lang="ts">
import { FileText, Link2, Sparkles } from 'lucide-vue-next'
import { ref, watch } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import { severityLabel } from '@/constants/enums'
import type { ReviewRisk, RiskDisposition } from '@/types/api'
import { formatConfidence } from '@/utils/format'

const props = defineProps<{
  risk: ReviewRisk | null
  // 风险编号（如 H1），与左栏列表共用，由父级生成。
  tag: string
}>()

const emit = defineEmits<{
  dispose: [disposition: RiskDisposition, ignoreReason: string | null, userEditedText: string | null]
}>()

const editedText = ref('')
const ignoreReason = ref('')

// 切换风险时重置编辑区为该条 AI 建议文本、清空忽略原因。
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

<style scoped>
.sugg-code-edit {
  display: block;
  width: 100%;
  resize: vertical;
  outline: none;
}

.sugg-code-edit:focus {
  border-color: var(--success);
}

.ignore-input {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  background: var(--bg-soft);
  color: var(--text-1);
  font-size: 13px;
}

.ignore-input:focus {
  border-color: var(--primary);
}

.sugg-source {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  color: var(--text-2);
  font-size: 12px;
}

.sugg-source svg {
  width: 14px;
  height: 14px;
}
</style>
