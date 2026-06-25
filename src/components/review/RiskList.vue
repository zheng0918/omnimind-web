<template>
  <!--
    审查左栏「风险摘要」（对齐原型 index-v2.html §审查三栏-左）：
    高/中/通过统计卡 + 风险类型筛选 chips + 带编号的风险列表（含处置徽标）。
    数据全部来自真实 risks / summary；筛选为前端本地态。
  -->
  <section class="panel">
    <div class="panel-head">
      <h3><ShieldAlert class="ph-icon" /> 风险摘要</h3>
      <span class="meta">{{ risks.length }} 条 · {{ disposedCount }} 已处置</span>
    </div>

    <div class="risk-summary">
      <button class="risk-stat high" type="button" @click="toggleSeverity('HIGH')">
        <span class="num">{{ grouped.high.length }}</span>
        <span class="lbl">高风险</span>
      </button>
      <button class="risk-stat mid" type="button" @click="toggleSeverity('MEDIUM')">
        <span class="num">{{ grouped.medium.length }}</span>
        <span class="lbl">中风险</span>
      </button>
      <button class="risk-stat pass" type="button" @click="toggleSeverity('PASS')">
        <span class="num">{{ grouped.pass.length }}</span>
        <span class="lbl">通过项</span>
      </button>
    </div>

    <div class="risk-filters">
      <button
        v-for="item in filterOptions"
        :key="item.value"
        class="chip"
        :class="{ on: typeFilter === item.value }"
        type="button"
        @click="typeFilter = item.value"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="risk-list">
      <button
        v-for="risk in visibleRisks"
        :key="risk.riskId"
        class="risk-item"
        :class="[risk.severity.toLowerCase(), { active: risk.riskId === activeId }]"
        type="button"
        @click="$emit('select', risk.riskId)"
      >
        <span class="icon-tag">{{ tagMap[risk.riskId] }}</span>
        <span class="body">
          <span class="title">{{ risk.title }}</span>
          <span class="sub">P.{{ risk.sourcePage }} · {{ riskTypeLabel[risk.riskType] }} · 置信 {{ formatConfidence(risk.confidence) }}</span>
        </span>
        <TriangleAlert v-if="risk.severity === 'HIGH'" class="sev-icon" />
        <CircleAlert v-else-if="risk.severity === 'MEDIUM'" class="sev-icon" />
        <CircleCheck v-else class="sev-icon" />
        <span
          v-if="risk.disposition !== 'PENDING'"
          class="dispo"
          :class="dispoClass[risk.disposition]"
        >{{ dispositionLabel[risk.disposition] }}</span>
      </button>

      <p v-if="visibleRisks.length === 0" class="risk-empty">
        {{ risks.length ? '当前筛选无匹配风险' : '暂无风险条目，开始审查后逐条增量显示' }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { CircleAlert, CircleCheck, ShieldAlert, TriangleAlert } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import { dispositionLabel, riskTypeLabel } from '@/constants/enums'
import type { ReviewRisk, RiskDisposition, RiskType, Severity } from '@/types/api'
import { formatConfidence } from '@/utils/format'

const props = defineProps<{
  risks: ReviewRisk[]
  activeId: string
  // 风险编号映射（如 H1/M2/P3），由父级按全量列表稳定生成，列表与右栏共用。
  tagMap: Record<string, string>
}>()

defineEmits<{
  select: [riskId: string]
}>()

// 类型筛选（'all' 表示全部）；点统计卡可叠加按 severity 过滤。
const typeFilter = ref<RiskType | 'all'>('all')
const severityFilter = ref<Severity | null>(null)

const filterOptions: { value: RiskType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'missing', label: '缺失项' },
  { value: 'risk', label: '风险条款' },
  { value: 'suggestion', label: '修改建议' },
  { value: 'history', label: '历史漏项' },
]

const grouped = computed(() => ({
  high: props.risks.filter((risk) => risk.severity === 'HIGH'),
  medium: props.risks.filter((risk) => risk.severity === 'MEDIUM'),
  pass: props.risks.filter((risk) => risk.severity === 'PASS'),
}))

const disposedCount = computed(
  () => props.risks.filter((risk) => risk.disposition !== 'PENDING').length,
)

const visibleRisks = computed(() =>
  props.risks
    .filter((risk) => typeFilter.value === 'all' || risk.riskType === typeFilter.value)
    .filter((risk) => severityFilter.value === null || risk.severity === severityFilter.value),
)

// 点统计卡：再次点击同一严重度取消过滤。
function toggleSeverity(severity: Severity): void {
  severityFilter.value = severityFilter.value === severity ? null : severity
}

// 处置态 → 配色类名（接受=绿 / 编辑=蓝 / 忽略=灰删除线）。
const dispoClass: Record<RiskDisposition, string> = {
  PENDING: '',
  ACCEPTED: 'accept',
  EDITED: 'edit',
  IGNORED: 'ignore',
}
</script>

<style scoped>
.risk-empty {
  margin: 16px 12px;
  color: var(--text-3);
  font-size: 12px;
  text-align: center;
}
</style>
