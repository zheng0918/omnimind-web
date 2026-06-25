/// <reference types="vite/client" />

// pdfjs-dist 的 web 组件运行时打包在 web/pdf_viewer.mjs，但其同名 .d.ts
// 仅声明 PDFViewer，其余类（EventBus 等）的类型分散在 types/web/*。
// 这里把运行时入口映射到各自真实类型，使工具栏装配获得完整类型而非 any。
declare module 'pdfjs-dist/web/pdf_viewer.mjs' {
  export { PDFViewer } from 'pdfjs-dist/types/web/pdf_viewer'
  export { EventBus } from 'pdfjs-dist/types/web/event_utils'
  export { PDFLinkService } from 'pdfjs-dist/types/web/pdf_link_service'
  export { PDFFindController } from 'pdfjs-dist/types/web/pdf_find_controller'
  export { GenericL10n } from 'pdfjs-dist/types/web/genericl10n'
  export { DownloadManager } from 'pdfjs-dist/types/web/download_manager'
}
