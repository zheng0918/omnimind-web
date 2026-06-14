<template>
  <section class="panel">
    <div class="panel-head">
      <h3>评分点对照</h3>
      <button class="micro-btn" type="button" @click="$emit('check')">
        <RefreshCw />
        校验
      </button>
    </div>
    <div class="scoring-progress">
      <div class="bar">
        <i :style="{ width: `${donePercent}%` }" />
      </div>
      <span class="num">{{ donePercent }}%</span>
    </div>
    <div class="scoring-list">
      <button
        v-for="point in points"
        :key="point.pointId"
        class="scoring-item"
        :class="point.responseStatus.toLowerCase()"
        type="button"
      >
        <span class="num">{{ point.weight }}</span>
        <span class="meta-block">
          <span class="title">{{ point.pointText }}</span>
          <span class="meta">weight {{ point.weight }}</span>
        </span>
        <span class="badge">{{ statusLabel(point.responseStatus) }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { computed } from 'vue'

import type { ScorePoint, ScoreResponseStatus } from '@/types/api'

const props = defineProps<{
  points: ScorePoint[]
}>()

defineEmits<{
  check: []
}>()

const donePercent = computed(() => {
  if (props.points.length === 0) return 0
  const done = props.points.filter((point) => point.responseStatus === 'DONE').length
  return Math.round((done / props.points.length) * 100)
})

function statusLabel(status: ScoreResponseStatus): string {
  const labels: Record<ScoreResponseStatus, string> = {
    UNANSWERED: '未响应',
    PARTIAL: '部分',
    DONE: '完成',
  }
  return labels[status]
}
</script>
