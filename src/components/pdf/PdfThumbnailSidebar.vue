<template>
  <!--
    缩略图侧栏（设计 spec §2.4）：官方组件未导出 PDFThumbnailViewer，故用 pdfjs 公共 API
    自渲染。每页一个轻量 canvas，IntersectionObserver 懒渲染，仅绘制进入视口的页。
  -->
  <aside class="pdf-thumbs" aria-label="页面缩略图">
    <button
      v-for="n in pageCount"
      :key="n"
      :ref="(el) => setItemRef(el, n)"
      type="button"
      class="thumb-item"
      :class="{ active: n === currentPage }"
      :aria-label="`第 ${n} 页`"
      :aria-current="n === currentPage ? 'page' : undefined"
      @click="emit('select', n)"
    >
      <canvas :ref="(el) => setCanvasRef(el, n)" class="thumb-canvas" />
      <span class="thumb-no">{{ n }}</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  pdfDocument: PDFDocumentProxy | null
  currentPage: number
}>()

const emit = defineEmits<{ select: [page: number] }>()

const THUMB_WIDTH = 120

const pageCount = ref(0)
const canvasMap = new Map<number, HTMLCanvasElement>()
const rendered = new Set<number>()
let observer: IntersectionObserver | null = null

function setCanvasRef(el: unknown, n: number): void {
  if (el instanceof HTMLCanvasElement) canvasMap.set(n, el)
  else canvasMap.delete(n)
}
function setItemRef(el: unknown, n: number): void {
  if (el instanceof HTMLElement) {
    el.dataset.page = String(n)
    observer?.observe(el)
  }
}

async function renderThumb(n: number): Promise<void> {
  const doc = props.pdfDocument
  const canvas = canvasMap.get(n)
  if (!doc || !canvas || rendered.has(n)) return
  rendered.add(n)
  try {
    const pdfPage = await doc.getPage(n)
    const base = pdfPage.getViewport({ scale: 1 })
    const viewport = pdfPage.getViewport({ scale: THUMB_WIDTH / base.width })
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await pdfPage.render({ canvasContext: ctx, viewport }).promise
  } catch {
    rendered.delete(n) // 渲染失败允许下次进入视口重试
  }
}

function setupObserver(): void {
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const n = Number((entry.target as HTMLElement).dataset.page)
        if (n) void renderThumb(n)
      }
    },
    { root: null, rootMargin: '200px' },
  )
}

// 文档变化：重置已渲染状态并按新页数重建缩略图列表。
watch(
  () => props.pdfDocument,
  async (doc) => {
    rendered.clear()
    canvasMap.clear()
    pageCount.value = doc?.numPages ?? 0
    setupObserver()
    await nextTick() // 等 v-for 生成 DOM 后由 setItemRef 注册观察
  },
  { immediate: true },
)

// 当前页变化：高亮项滚入视口，便于跟随主视图翻页。
watch(
  () => props.currentPage,
  (n) => {
    const el = document.querySelector<HTMLElement>(`.pdf-thumbs .thumb-item[data-page="${n}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  },
)

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<style scoped lang="scss">
.pdf-thumbs {
  width: 148px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-soft);
  border-right: 1px solid var(--border);
}

.thumb-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: var(--card);
  cursor: pointer;
}

.thumb-item:hover {
  border-color: var(--border-strong);
}

.thumb-item.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.thumb-canvas {
  width: 100%;
  height: auto;
  display: block;
  background: #fff;
}

.thumb-no {
  font-size: 11px;
  color: var(--text-2);
}
</style>
