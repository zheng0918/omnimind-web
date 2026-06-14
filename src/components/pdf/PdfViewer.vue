<template>
  <section class="pdf-viewer">
    <div class="pdf-toolbar">
      <span>{{ title }}</span>
      <div>
        <button class="icon-btn" type="button" aria-label="上一页" @click="prevPage">
          <ChevronLeft />
        </button>
        <span class="page-indicator">{{ page }} / {{ pageCount }}</span>
        <button class="icon-btn" type="button" aria-label="下一页" @click="nextPage">
          <ChevronRight />
        </button>
      </div>
    </div>
    <div class="pdf-page">
      <div class="paper">
        <p class="doc-kicker">
          P.{{ page }}
        </p>
        <h3>投标文件原文预览</h3>
        <p>
          本区域封装 PDF.js 预览能力。POC 工程已保留自托管 worker 目录，实际后端返回文件 URL 后可直接渲染原文页码与定位段落。
        </p>
        <p class="hl">
          投标保证金承诺应载明金额、有效期、递交方式及违约处理。
        </p>
        <p>
          本段展示审查定位效果，右侧风险条目点击后可联动跳转页面和段落位置。
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { ref } from 'vue'

withDefaults(
  defineProps<{
    title?: string
    pageCount?: number
  }>(),
  {
    title: 'XX学校教学楼招标文件.pdf',
    pageCount: 180,
  },
)

const page = ref(12)

function prevPage(): void {
  page.value = Math.max(1, page.value - 1)
}

function nextPage(): void {
  page.value += 1
}
</script>
