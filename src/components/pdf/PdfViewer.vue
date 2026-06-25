<template>
  <!--
    审查原文阅读器（设计 spec §2.3）：基于 PDF.js 官方 PDFViewer 的纯展示组件，零业务请求。
    src 传入 ArrayBuffer/URL 即渲染；defineExpose(goToPage) 供外部风险条目定位联动。
  -->
  <section class="pdf-viewer">
    <div class="pdf-toolbar">
      <button
        type="button"
        class="icon-btn"
        :class="{ active: showThumbs }"
        aria-label="切换缩略图侧栏"
        :disabled="pdf.status.value !== 'loaded'"
        @click="showThumbs = !showThumbs"
      >
        <PanelLeft />
      </button>
      <span class="pdf-title" :title="title">{{ title || '原文预览' }}</span>

      <div class="pdf-group pdf-pager">
        <button type="button" class="icon-btn" aria-label="上一页" :disabled="!ready" @click="pdf.goToPage(pdf.page.value - 1)">
          <ChevronLeft />
        </button>
        <input
          class="page-input"
          type="number"
          :value="pdf.page.value"
          :min="1"
          :max="pdf.pageCount.value"
          aria-label="跳转到页"
          :disabled="!ready"
          @change="onPageInput"
        >
        <span class="page-total">/ {{ pdf.pageCount.value || '-' }}</span>
        <button type="button" class="icon-btn" aria-label="下一页" :disabled="!ready" @click="pdf.goToPage(pdf.page.value + 1)">
          <ChevronRight />
        </button>
      </div>

      <div class="pdf-group">
        <button type="button" class="icon-btn" aria-label="缩小" :disabled="!ready" @click="pdf.zoomOut()">
          <ZoomOut />
        </button>
        <button type="button" class="icon-btn" aria-label="适应宽度" :disabled="!ready" @click="pdf.fitWidth()">
          <Maximize2 />
        </button>
        <button type="button" class="icon-btn" aria-label="放大" :disabled="!ready" @click="pdf.zoomIn()">
          <ZoomIn />
        </button>
      </div>

      <div class="pdf-group pdf-search">
        <Search class="search-icon" />
        <input
          v-model="searchQuery"
          class="search-input"
          type="search"
          placeholder="搜索全文"
          aria-label="搜索全文"
          :disabled="!ready"
          @keyup.enter="pdf.find(searchQuery)"
        >
        <span v-if="pdf.findTotal.value > 0" class="search-count">{{ pdf.findCurrent.value }}/{{ pdf.findTotal.value }}</span>
        <button type="button" class="icon-btn" aria-label="上一处" :disabled="!ready" @click="pdf.findPrev()">
          <ChevronUp />
        </button>
        <button type="button" class="icon-btn" aria-label="下一处" :disabled="!ready" @click="pdf.findNext()">
          <ChevronDown />
        </button>
      </div>

      <div class="pdf-group">
        <button
          v-for="tool in editorTools"
          :key="tool.mode"
          type="button"
          class="icon-btn"
          :class="{ active: pdf.editorMode.value === tool.mode }"
          :aria-label="tool.label"
          :aria-pressed="pdf.editorMode.value === tool.mode"
          :disabled="!ready"
          @click="toggleEditor(tool.mode)"
        >
          <component :is="tool.icon" />
        </button>
        <button type="button" class="icon-btn" aria-label="导出带批注 PDF" :disabled="!ready" @click="pdf.exportWithAnnotations()">
          <Download />
        </button>
      </div>
    </div>

    <div class="pdf-body">
      <PdfThumbnailSidebar
        v-show="showThumbs && ready"
        :pdf-document="pdf.pdfDocument.value"
        :current-page="pdf.page.value"
        @select="pdf.goToPage"
      />
      <div ref="containerRef" class="pdf-viewer-container">
        <div ref="viewerRef" class="pdfViewer" />

        <div v-if="pdf.status.value !== 'loaded'" class="pdf-state">
          <template v-if="pdf.status.value === 'empty'">
            <FileText class="state-icon" />
            <p>暂无可预览的原文</p>
          </template>
          <template v-else-if="pdf.status.value === 'loading'">
            <Loader2 class="state-icon spin" />
            <p>原文加载中…</p>
          </template>
          <template v-else>
            <FileWarning class="state-icon" />
            <p>{{ pdf.errorMsg.value || '原文加载失败' }}</p>
            <button type="button" class="retry-btn" @click="reload">重试</button>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  FileText,
  FileWarning,
  Highlighter,
  Loader2,
  Maximize2,
  PanelLeft,
  PenLine,
  Search,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next'
import { computed, ref, watch, type Component } from 'vue'

import PdfThumbnailSidebar from '@/components/pdf/PdfThumbnailSidebar.vue'
import { usePdfViewer, type PdfEditorMode } from '@/composables/usePdfViewer'

const props = withDefaults(
  defineProps<{
    src: ArrayBuffer | string | null
    title?: string
    initialPage?: number
  }>(),
  { title: '', initialPage: 1 },
)

const containerRef = ref<HTMLDivElement>()
const viewerRef = ref<HTMLDivElement>()
const pdf = usePdfViewer(containerRef, viewerRef)

const searchQuery = ref('')
const showThumbs = ref(false)

const ready = computed(() => pdf.status.value === 'loaded')

const editorTools: Array<{ mode: Exclude<PdfEditorMode, 'none'>; label: string; icon: Component }> = [
  { mode: 'highlight', label: '高亮批注', icon: Highlighter },
  { mode: 'ink', label: '墨迹批注', icon: PenLine },
  { mode: 'freetext', label: '文字批注', icon: Type },
]

function onPageInput(e: Event): void {
  const n = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(n)) pdf.goToPage(n)
}

// 再次点击当前批注工具则退出编辑（回到 none）。
function toggleEditor(mode: PdfEditorMode): void {
  pdf.setEditorMode(pdf.editorMode.value === mode ? 'none' : mode)
}

function reload(): void {
  if (props.src) void load(props.src)
}

async function load(src: ArrayBuffer | string): Promise<void> {
  await pdf.load(src)
  if (pdf.status.value === 'loaded' && props.initialPage > 1) pdf.goToPage(props.initialPage)
}

watch(
  () => props.src,
  (src) => {
    if (src) void load(src)
    else pdf.destroy()
  },
  { immediate: true },
)

// 审查中栏「原文定位」联动：goToPage 翻页；highlightRect 按 bbox 画精确高亮框；
// find 为无 bbox 时按原文片段全文检索的降级高亮；clearHighlight 清除框。
defineExpose({
  goToPage: pdf.goToPage,
  find: pdf.find,
  highlightRect: pdf.highlightRect,
  clearHighlight: pdf.clearHighlight,
})
</script>

<style scoped lang="scss">
.pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--card);
}

.pdf-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
}

.pdf-title {
  max-width: 180px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pdf-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pdf-group .icon-btn {
  min-width: 28px;
  height: 28px;
}

.pdf-group .icon-btn.active {
  background: var(--primary-soft);
  color: var(--primary);
}

.pdf-group .icon-btn :deep(svg) {
  width: 15px;
  height: 15px;
}

.page-input {
  width: 44px;
  height: 26px;
  text-align: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-1);
}

.page-total {
  font-size: 12px;
  color: var(--text-2);
}

.pdf-search {
  position: relative;
}

.pdf-search .search-icon {
  width: 14px;
  height: 14px;
  color: var(--text-3);
}

.search-input {
  width: 120px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.search-count {
  font-size: 11px;
  color: var(--text-2);
  min-width: 32px;
  text-align: center;
}

.pdf-body {
  flex: 1;
  min-height: 0;
  display: flex;
}

/* 官方 viewer 要求容器为定位元素 + 可滚动；.pdfViewer 内部页相对容器绝对铺排。 */
.pdf-viewer-container {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--bg-tint);
}

.pdf-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-2);
  background: var(--bg-tint);
}

.state-icon {
  width: 36px;
  height: 36px;
  color: var(--text-3);
}

.state-icon.spin {
  animation: pdf-spin 1s linear infinite;
}

@keyframes pdf-spin {
  to {
    transform: rotate(360deg);
  }
}

.retry-btn {
  padding: 4px 14px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--card);
  color: var(--text-1);
  cursor: pointer;
}

.retry-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
