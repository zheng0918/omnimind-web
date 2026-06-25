<template>
  <!--
    审查模式三栏面板：左原文 PDF / 中风险列表(按 HIGH/MEDIUM/PASS) / 右详情+处置。
    数据来自 review store（/review/tasks/* 接口）。
  -->
  <div class="workspace-progress">
    <span>审查进度</span>
    <div class="progress-track">
      <i :style="{ width: progressPercent + '%' }" />
    </div>
    <b>{{ progressPercent }}%</b>
    <span class="progress-meta">已审 {{ reviewStore.task?.doneItems ?? 0 }}/{{ reviewStore.task?.totalItems ?? 0 }} 条</span>
    <span class="progress-actions">
      <button
        type="button"
        :disabled="!reviewStore.currentTaskId || exporting"
        @click="handleExport('docx')"
      >
        导出 Word
      </button>
      <button
        type="button"
        :disabled="!reviewStore.currentTaskId || exporting"
        @click="handleExport('pdf')"
      >
        导出 PDF
      </button>
    </span>
  </div>

  <!-- 来自编写模式的一键送审落稿提示（REQ-LINK） -->
  <div v-if="reviewStore.fromWriteDraft" class="banner banner-link">
    <Send />
    <span>本次待审文档<b>来自编写模式初稿</b>（{{ reviewStore.fromWriteDraft }}），请选择审查清单后开始复核。</span>
  </div>

  <div class="review-workspace">
    <!-- 左：风险摘要（统计 + 类型筛选 + 风险列表） -->
    <RiskList
      :risks="reviewStore.risks"
      :active-id="reviewStore.activeRiskId"
      :tag-map="tagMap"
      @select="reviewStore.setActiveRisk"
    />

    <!-- 中：原文比对（Tab1 原文 PDF 定位 / Tab2 文本条款对比） -->
    <section class="panel">
      <div class="panel-head">
        <h3><Eye class="ph-icon" /> 原文比对</h3>
        <span class="meta">
          <template v-if="reviewStore.activeRisk">
            当前 {{ tagMap[reviewStore.activeRisk.riskId] }} · P.{{ reviewStore.activeRisk.sourcePage }}
          </template>
          <template v-else>PDF.js · 风险定位</template>
        </span>
      </div>
      <div class="diff-tabs">
        <div class="diff-tab" :class="{ on: diffTab === 'pdf' }" @click="diffTab = 'pdf'">
          原文定位
        </div>
        <div class="diff-tab" :class="{ on: diffTab === 'text' }" @click="diffTab = 'text'">
          条款对比
        </div>
      </div>

      <!-- Tab1：真实 PDF 原文，选中风险后跳页 + 高亮原文片段 -->
      <div v-show="diffTab === 'pdf'" class="diff-pane">
        <PdfViewer
          ref="pdfRef"
          :src="reviewStore.originalPdf"
          :initial-page="reviewStore.activeRisk?.sourcePage || 1"
          title="待审文档原文"
        />
      </div>

      <!-- Tab2：AI 建议 ↔ 待审原文 文本对比（模板逐条对比待后端补充） -->
      <div v-show="diffTab === 'text'" class="diff-pane">
        <template v-if="reviewStore.activeRisk">
          <p class="diff-note">
            <AlertTriangle />
            标准模板逐条对比数据后端暂未提供，当前以「AI 建议条款 ↔ 待审原文」呈现。
          </p>
          <div class="diff-body">
            <div class="diff-col">
              <h4>AI 建议条款</h4>
              <div class="clause add">
                <span class="clause-no">建议</span>
                {{ reviewStore.activeRisk.suggestedText || '本条目无需修改' }}
              </div>
            </div>
            <div class="diff-col">
              <h4>待审文档原文</h4>
              <div v-if="reviewStore.activeRisk.originalText" class="clause warn">
                <span class="clause-no">P.{{ reviewStore.activeRisk.sourcePage }}</span>
                {{ reviewStore.activeRisk.originalText }}
              </div>
              <div v-else class="clause del">
                <span class="clause-no">—</span>
                缺失：{{ reviewStore.activeRisk.title }}
              </div>
            </div>
          </div>
        </template>
        <EmptyState
          v-else
          title="未选择条款"
          description="选择左侧风险条目，查看其条款对比与差异高亮。"
        />
      </div>
    </section>

    <!-- 右：AI 建议（原文引用 + 建议修改 + 相似历史案例 + 处置） -->
    <RiskDispositionPanel
      :risk="reviewStore.activeRisk"
      :tag="reviewStore.activeRisk ? tagMap[reviewStore.activeRisk.riskId] ?? '' : ''"
      @dispose="handleDispose"
    />
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, Eye, Send } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import PdfViewer from '@/components/pdf/PdfViewer.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import RiskDispositionPanel from '@/components/review/RiskDispositionPanel.vue'
import RiskList from '@/components/review/RiskList.vue'
import { useReviewStore } from '@/stores/review'
import type { RiskDisposition, Severity } from '@/types/api'

const reviewStore = useReviewStore()

// 中栏 Tab：原文定位（PDF）/ 条款对比（文本）。默认 PDF 定位。
const diffTab = ref<'pdf' | 'text'>('pdf')

// 原文阅读器引用：风险条目联动时跳页并高亮其原文片段。
const pdfRef = ref<InstanceType<typeof PdfViewer>>()

// 定位当前风险：优先用后端 bbox 在来源页画精确高亮框；无 bbox 时降级为按原文片段全文检索高亮。
function locateActiveRisk(): void {
  const risk = reviewStore.activeRisk
  if (!risk) return
  if (risk.bbox && risk.bbox.length >= 4 && risk.sourcePage) {
    pdfRef.value?.highlightRect(risk.sourcePage, risk.bbox)
    return
  }
  pdfRef.value?.clearHighlight()
  if (risk.sourcePage) pdfRef.value?.goToPage(risk.sourcePage)
  const snippet = (risk.originalText ?? '').replace(/\s+/g, ' ').trim().slice(0, 24)
  if (snippet.length >= 4) pdfRef.value?.find(snippet)
}

// 风险编号映射（H1/M2/P3…）：按全量列表顺序、分严重度递增，列表与右栏共用。
const tagMap = computed<Record<string, string>>(() => {
  const prefix: Record<Severity, string> = { HIGH: 'H', MEDIUM: 'M', PASS: 'P' }
  const counters: Record<Severity, number> = { HIGH: 0, MEDIUM: 0, PASS: 0 }
  const map: Record<string, string> = {}
  for (const risk of reviewStore.risks) {
    map[risk.riskId] = `${prefix[risk.severity]}${(counters[risk.severity] += 1)}`
  }
  return map
})

// 导出进行中标记：防止重复点击（导出为同步生成 + 落桶，需等待）。
const exporting = ref(false)

async function handleExport(format: 'docx' | 'pdf'): Promise<void> {
  if (exporting.value) return
  exporting.value = true
  try {
    await reviewStore.exportReport(format)
  } finally {
    exporting.value = false
  }
}

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


// 进入审查任务详情即拉起增量轮询（WEB-02）并加载被审原文；status=DONE/FAILED 或异常自动停。
onMounted(() => {
  if (reviewStore.currentTaskId) {
    reviewStore.startPolling()
    void reviewStore.loadOriginalDoc()
  }
})

// 面板常驻（v-show 切换），新建/切换任务不重触发 onMounted，故监听任务变更补加载原文。
watch(
  () => reviewStore.currentTaskId,
  (id) => {
    if (id) void reviewStore.loadOriginalDoc()
  },
)

// 选中风险或切回 PDF Tab 时，在原文中定位高亮（PDF 未就绪时 goToPage/find 自动跳过）。
watch(
  () => reviewStore.activeRiskId,
  () => {
    if (diffTab.value === 'pdf') void nextTick(locateActiveRisk)
  },
)
watch(diffTab, (tab) => {
  if (tab === 'pdf') void nextTick(locateActiveRisk)
})

// 组件卸载（如切到其它一级菜单）时停止增量轮询，避免后台空转。
onBeforeUnmount(() => {
  reviewStore.stopPolling()
})
</script>

<style scoped>
.progress-actions {
  margin-left: auto;
  display: inline-flex;
  gap: 8px;
}
.progress-actions button {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  background: #fff;
  color: #374151;
  cursor: pointer;
}
.progress-actions button:hover:not(:disabled) {
  border-color: var(--el-color-primary, #409eff);
  color: var(--el-color-primary, #409eff);
}
.progress-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
