<template>
  <!--
    审查模式三栏面板：左原文 PDF / 中风险列表(按 HIGH/MEDIUM/PASS) / 右详情+处置。
    数据来自 review store（POC 下由 seed 提供，联调时切换为 /review/tasks/* 接口）。
  -->
  <div class="workspace-progress">
    <span>审查进度</span>
    <div class="progress-track">
      <i :style="{ width: progressPercent + '%' }" />
    </div>
    <b>{{ progressPercent }}%</b>
    <span class="progress-meta">已审 {{ reviewStore.task?.doneItems ?? 0 }}/{{ reviewStore.task?.totalItems ?? 0 }} 条</span>
  </div>

  <!-- 来自编写模式的一键送审落稿提示（REQ-LINK） -->
  <div v-if="reviewStore.fromWriteDraft" class="banner banner-link">
    <Send />
    <span>本次待审文档<b>来自编写模式初稿</b>（{{ reviewStore.fromWriteDraft }}），请选择审查清单后开始复核。</span>
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
import { Send } from 'lucide-vue-next'
import { computed, onBeforeUnmount } from 'vue'

import PdfViewer from '@/components/pdf/PdfViewer.vue'
import RiskDispositionPanel from '@/components/review/RiskDispositionPanel.vue'
import RiskList from '@/components/review/RiskList.vue'
import { useReviewStore } from '@/stores/review'
import type { RiskDisposition } from '@/types/api'

const reviewStore = useReviewStore()

// 审查清单覆盖率 = 已比对条目 / 总条目。
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

// 组件卸载（如切到其它一级菜单）时停止增量轮询，避免后台空转。
onBeforeUnmount(() => {
  reviewStore.stopPolling()
})
</script>
