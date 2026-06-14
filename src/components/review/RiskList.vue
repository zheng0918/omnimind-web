<template>
  <section class="panel">
    <div class="panel-head">
      <h3>风险条目</h3>
      <span class="meta">每 2s 增量刷新</span>
    </div>
    <div class="risk-summary">
      <button class="risk-stat high" type="button">
        <span class="num">{{ grouped.high.length }}</span>
        <span class="lbl">高风险</span>
      </button>
      <button class="risk-stat mid" type="button">
        <span class="num">{{ grouped.medium.length }}</span>
        <span class="lbl">中风险</span>
      </button>
      <button class="risk-stat pass" type="button">
        <span class="num">{{ grouped.pass.length }}</span>
        <span class="lbl">通过</span>
      </button>
    </div>
    <div class="risk-list">
      <button
        v-for="risk in risks"
        :key="risk.riskId"
        class="risk-item"
        :class="[risk.severity.toLowerCase(), { active: risk.riskId === activeId }]"
        type="button"
        @click="$emit('select', risk.riskId)"
      >
        <span class="icon-tag">{{ severityShort(risk.severity) }}</span>
        <span class="body">
          <span class="title">{{ risk.title }}</span>
          <span class="sub">P.{{ risk.sourcePage }} · {{ formatConfidence(risk.confidence) }}</span>
        </span>
        <TriangleAlert v-if="risk.severity === 'HIGH'" class="sev-icon" />
        <CircleAlert v-else-if="risk.severity === 'MEDIUM'" class="sev-icon" />
        <CircleCheck v-else class="sev-icon" />
        <span v-if="risk.disposition !== 'PENDING'" class="dispo">{{ dispositionLabel[risk.disposition] }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-vue-next'
import { computed } from 'vue'

import { dispositionLabel } from '@/constants/enums'
import type { ReviewRisk, Severity } from '@/types/api'
import { formatConfidence } from '@/utils/format'

const props = defineProps<{
  risks: ReviewRisk[]
  activeId: string
}>()

defineEmits<{
  select: [riskId: string]
}>()

const grouped = computed(() => ({
  high: props.risks.filter((risk) => risk.severity === 'HIGH'),
  medium: props.risks.filter((risk) => risk.severity === 'MEDIUM'),
  pass: props.risks.filter((risk) => risk.severity === 'PASS'),
}))

function severityShort(severity: Severity): string {
  if (severity === 'HIGH') return 'H'
  if (severity === 'MEDIUM') return 'M'
  return 'P'
}
</script>
