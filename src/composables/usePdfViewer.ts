import {
  AnnotationEditorType,
  AnnotationMode,
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from 'pdfjs-dist'
import {
  DownloadManager,
  EventBus,
  GenericL10n,
  PDFFindController,
  PDFLinkService,
  PDFViewer,
} from 'pdfjs-dist/web/pdf_viewer.mjs'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { onUnmounted, ref, shallowRef, type Ref, type ShallowRef } from 'vue'

/**
 * 基于 PDF.js 官方 PDFViewer 的阅读器装配 composable（设计 spec §2.2）。
 * 负责连续渲染、翻页/缩放、文本搜索、批注编辑与导出、卸载清理；
 * 组件只持有容器引用并消费这里暴露的状态与方法，复杂逻辑不进组件。
 */

// 自托管 worker：Vite 把 worker 打成独立 chunk URL，避免 CDN 依赖。
GlobalWorkerOptions.workerSrc = workerUrl

export type PdfStatus = 'empty' | 'loading' | 'loaded' | 'error'
export type PdfEditorMode = 'none' | 'highlight' | 'ink' | 'freetext'

// 批注模式到 pdfjs 编辑器枚举的映射。
const EDITOR_TYPE: Record<PdfEditorMode, number> = {
  none: AnnotationEditorType.NONE,
  highlight: AnnotationEditorType.HIGHLIGHT,
  ink: AnnotationEditorType.INK,
  freetext: AnnotationEditorType.FREETEXT,
}

interface PageChangingEvent {
  pageNumber: number
}
interface FindMatchesEvent {
  matchesCount: { current: number; total: number }
}
interface PageRenderedEvent {
  pageNumber: number
}

// pdfjs 的 PDFPageView 子集：取页面 DOM 与当前缩放下的视口尺寸，用于定位高亮框。
interface PageViewLike {
  div?: HTMLElement
  viewport?: { width: number; height: number }
}

const HIGHLIGHT_CLASS = 'pdf-risk-highlight'

export interface UsePdfViewer {
  page: Ref<number>
  pageCount: Ref<number>
  status: Ref<PdfStatus>
  errorMsg: Ref<string>
  findCurrent: Ref<number>
  findTotal: Ref<number>
  editorMode: Ref<PdfEditorMode>
  pdfDocument: ShallowRef<PDFDocumentProxy | null>
  load: (src: ArrayBuffer | string) => Promise<void>
  goToPage: (n: number) => void
  zoomIn: () => void
  zoomOut: () => void
  fitWidth: () => void
  find: (query: string) => void
  findNext: () => void
  findPrev: () => void
  highlightRect: (page: number, rect: number[]) => void
  clearHighlight: () => void
  setEditorMode: (m: PdfEditorMode) => void
  exportWithAnnotations: () => Promise<void>
  destroy: () => void
}

export function usePdfViewer(
  containerRef: Ref<HTMLDivElement | undefined>,
  viewerRef: Ref<HTMLDivElement | undefined>,
): UsePdfViewer {
  const page = ref(1)
  const pageCount = ref(0)
  const status = ref<PdfStatus>('empty')
  const errorMsg = ref('')
  const findCurrent = ref(0)
  const findTotal = ref(0)
  const editorMode = ref<PdfEditorMode>('none')
  const pdfDocument = shallowRef<PDFDocumentProxy | null>(null)

  let viewer: PDFViewer | null = null
  let eventBus: EventBus | null = null
  let linkService: PDFLinkService | null = null
  let downloadManager: DownloadManager | null = null
  let loadingTask: PDFDocumentLoadingTask | null = null
  let lastQuery = ''
  // 待绘制的风险高亮：记录目标页与归一化包围盒，渲染/缩放后重定位。
  let pendingHighlight: { page: number; rect: number[] } | null = null

  function onPageChanging(e: PageChangingEvent): void {
    page.value = e.pageNumber
  }
  function onFindMatches(e: FindMatchesEvent): void {
    findCurrent.value = e.matchesCount.current
    findTotal.value = e.matchesCount.total
  }
  function onPagesInit(): void {
    if (viewer) viewer.currentScaleValue = 'page-width'
  }
  // 目标页渲染完成后补画高亮（跳页时该页常未渲染，goToPage 后需等 pagerendered）。
  function onPageRendered(e: PageRenderedEvent): void {
    if (pendingHighlight && e.pageNumber === pendingHighlight.page) drawHighlight()
  }
  // 缩放会改变视口尺寸，重绘以贴合新尺寸。
  function onScaleChanging(): void {
    if (pendingHighlight) drawHighlight()
  }

  function clearHighlightDom(): void {
    viewerRef.value?.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => el.remove())
  }

  function drawHighlight(): void {
    if (!viewer || !pendingHighlight) return
    const { page: n, rect } = pendingHighlight
    if (rect.length < 4) return
    const view = (
      viewer as unknown as { getPageView?: (i: number) => PageViewLike | undefined }
    ).getPageView?.(n - 1)
    const pageDiv = view?.div
    const viewport = view?.viewport
    if (!pageDiv || !viewport) return
    clearHighlightDom()
    const [x0, y0, x1, y1] = rect
    const box = document.createElement('div')
    box.className = HIGHLIGHT_CLASS
    box.style.left = `${x0 * viewport.width}px`
    box.style.top = `${y0 * viewport.height}px`
    box.style.width = `${Math.max(0, x1 - x0) * viewport.width}px`
    box.style.height = `${Math.max(0, y1 - y0) * viewport.height}px`
    // 页面 DOM（.page）本身已是定位元素，子框按其内坐标绝对定位。
    pageDiv.appendChild(box)
  }

  function highlightRect(targetPage: number, rect: number[]): void {
    pendingHighlight = { page: targetPage, rect }
    goToPage(targetPage)
    drawHighlight()
  }

  function clearHighlight(): void {
    pendingHighlight = null
    clearHighlightDom()
  }

  // 首次按需装配：组件挂载后容器尺寸就绪再创建，避免 0 高度渲染。
  function ensureViewer(): void {
    if (viewer || !containerRef.value || !viewerRef.value) return
    eventBus = new EventBus()
    linkService = new PDFLinkService({ eventBus })
    const findController = new PDFFindController({ eventBus, linkService })
    downloadManager = new DownloadManager()
    viewer = new PDFViewer({
      container: containerRef.value,
      viewer: viewerRef.value,
      eventBus,
      linkService,
      findController,
      downloadManager,
      l10n: new GenericL10n('en-US'),
      textLayerMode: 2,
      annotationMode: AnnotationMode.ENABLE_FORMS,
      annotationEditorMode: AnnotationEditorType.NONE,
    })
    linkService.setViewer(viewer)
    eventBus.on('pagechanging', onPageChanging)
    eventBus.on('updatefindmatchescount', onFindMatches)
    eventBus.on('pagesinit', onPagesInit)
    eventBus.on('pagerendered', onPageRendered)
    eventBus.on('scalechanging', onScaleChanging)
  }

  function releaseDocument(): void {
    if (viewer) viewer.setDocument(null as unknown as PDFDocumentProxy)
    if (linkService) linkService.setDocument(null as unknown as PDFDocumentProxy, null)
    if (pdfDocument.value) {
      void pdfDocument.value.destroy()
      pdfDocument.value = null
    }
    if (loadingTask) {
      void loadingTask.destroy()
      loadingTask = null
    }
  }

  async function load(src: ArrayBuffer | string): Promise<void> {
    status.value = 'loading'
    errorMsg.value = ''
    findCurrent.value = 0
    findTotal.value = 0
    lastQuery = ''
    try {
      ensureViewer()
      if (!viewer || !linkService) throw new Error('阅读器容器尚未就绪')
      releaseDocument()
      // ArrayBuffer 交给 pdfjs 后会被 detach，先拷贝以支持重载/重试。
      loadingTask =
        typeof src === 'string'
          ? getDocument(src)
          : getDocument({ data: new Uint8Array(src.slice(0)) })
      const doc = await loadingTask.promise
      pdfDocument.value = doc
      pageCount.value = doc.numPages
      viewer.setDocument(doc)
      linkService.setDocument(doc, null)
      status.value = 'loaded'
    } catch (err) {
      pdfDocument.value = null
      status.value = 'error'
      errorMsg.value = err instanceof Error ? err.message : '原文加载失败'
    }
  }

  function goToPage(n: number): void {
    if (!viewer || n < 1 || n > pageCount.value) return
    viewer.currentPageNumber = n
  }
  function zoomIn(): void {
    viewer?.increaseScale()
  }
  function zoomOut(): void {
    viewer?.decreaseScale()
  }
  function fitWidth(): void {
    if (viewer) viewer.currentScaleValue = 'page-width'
  }

  function find(query: string): void {
    if (!eventBus) return
    lastQuery = query.trim()
    if (!lastQuery) {
      findCurrent.value = 0
      findTotal.value = 0
    }
    eventBus.dispatch('find', {
      type: '',
      query: lastQuery,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: false,
      matchDiacritics: false,
    })
  }
  function findStep(findPrevious: boolean): void {
    if (!eventBus || !lastQuery) return
    eventBus.dispatch('find', {
      type: 'again',
      query: lastQuery,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious,
      matchDiacritics: false,
    })
  }
  function findNext(): void {
    findStep(false)
  }
  function findPrev(): void {
    findStep(true)
  }

  function setEditorMode(m: PdfEditorMode): void {
    if (!eventBus) return
    editorMode.value = m
    eventBus.dispatch('switchannotationeditormode', { mode: EDITOR_TYPE[m] })
  }

  async function exportWithAnnotations(): Promise<void> {
    const doc = pdfDocument.value
    if (!doc || !downloadManager) return
    const bytes = await doc.saveDocument()
    // 拷入独立 ArrayBuffer 作为 BlobPart：规避 pdfjs Uint8Array<ArrayBufferLike> 与 Blob 类型不兼容。
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    const blob = new Blob([buffer], { type: 'application/pdf' })
    downloadManager.download(blob, '', '批注版.pdf')
  }

  function destroy(): void {
    if (eventBus) {
      eventBus.off('pagechanging', onPageChanging)
      eventBus.off('updatefindmatchescount', onFindMatches)
      eventBus.off('pagesinit', onPagesInit)
      eventBus.off('pagerendered', onPageRendered)
      eventBus.off('scalechanging', onScaleChanging)
    }
    pendingHighlight = null
    releaseDocument()
    viewer = null
    eventBus = null
    linkService = null
    downloadManager = null
    status.value = 'empty'
    page.value = 1
    pageCount.value = 0
    editorMode.value = 'none'
  }

  onUnmounted(destroy)

  return {
    page,
    pageCount,
    status,
    errorMsg,
    findCurrent,
    findTotal,
    editorMode,
    pdfDocument,
    load,
    goToPage,
    zoomIn,
    zoomOut,
    fitWidth,
    find,
    findNext,
    findPrev,
    highlightRect,
    clearHighlight,
    setEditorMode,
    exportWithAnnotations,
    destroy,
  }
}
