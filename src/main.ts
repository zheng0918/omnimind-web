import 'element-plus/dist/index.css'
import 'pdfjs-dist/web/pdf_viewer.css'
import './styles/tokens.css'
import './styles/element-overrides.scss'
import './styles/global.scss'

import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { router } from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
