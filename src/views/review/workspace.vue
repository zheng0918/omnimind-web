<template>
  <PageHeader compact title="审查工作台" description="已审 85/120 条 · 预计剩余 4 分 12 秒">
    <template #actions>
      <button class="btn" type="button" @click="reviewStore.startPolling">
        <RefreshCw />
        增量刷新
      </button>
      <button class="btn primary" type="button">
        <Download />
        导出报告
      </button>
    </template>
  </PageHeader>

  <div class="workspace-progress">
    <span>审查进度</span>
    <div class="progress-track">
      <i :style="{ width: progressPercent + '%' }" />
    </div>
    <b>{{ progressPercent }}%</b>
  </div>

  <div class="review-workspace">
    <section class="panel">
      <div class="panel-head">
        <h3>原文 PDF</h3>
        <span class="meta">PDF.js</span>
      </div>
      <PdfViewer />
    </section>

    <RiskList
      :risks="reviewStore.risks"
      :active-id="reviewStore.activeRiskId"
      @select="reviewStore.setActiveRisk"
    />

    <RiskDispositionPanel :risk="reviewStore.activeRisk" @dispose="handleDispose" />
  </div>
</template>

<script setup lang="ts">
import { Download, RefreshCw } from 'lucide-vue-next'
import { computed, onBeforeUnmount } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import PdfViewer from '@/components/pdf/PdfViewer.vue'
import RiskDispositionPanel from '@/components/review/RiskDispositionPanel.vue'
import RiskList from '@/components/review/RiskList.vue'
import { useReviewStore } from '@/stores/review'
import type { RiskDisposition } from '@/types/api'

const reviewStore = useReviewStore()

const progressPercent = computed(() => {
  if (!reviewStore.task?.totalItems) return 0
  return Math.round((reviewStore.task.doneItems / reviewStore.task.totalItems) * 100)
})

function handleDispose(
  disposition: RiskDisposition,
  ignoreReason: string | null,
  userEditedText: string | null,
): void {
  if (!reviewStore.activeRisk) return
  void reviewStore.dispose(reviewStore.activeRisk.riskId, disposition, ignoreReason, userEditedText)
}

onBeforeUnmount(() => {
  reviewStore.stopPolling()
})
</script>
