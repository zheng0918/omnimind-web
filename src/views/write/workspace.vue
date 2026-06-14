<template>
  <PageHeader compact title="编写工作台" description="大纲已生成 · 章节并发流式生成中 · 浏览器最多 3 路 SSE">
    <template #actions>
      <button class="btn" type="button" @click="writeStore.checkResponse">
        <RefreshCw />
        响应度校验
      </button>
      <RouterLink class="btn primary" :to="ROUTE_PATHS.reviewWorkspace">
        <Send />
        一键送审
      </RouterLink>
    </template>
  </PageHeader>

  <div class="write-grid">
    <OutlineTree
      :outline="writeStore.outline"
      :active-section-id="writeStore.activeSectionId"
      @select="writeStore.setActiveSection"
    />

    <section class="panel write-editor-panel">
      <div class="panel-head">
        <h3>{{ activeTitle }}</h3>
        <span class="meta">已保存 · {{ writeStore.activeSection?.savedAt ? '10:48' : '--:--' }}</span>
      </div>
      <TipTapEditor
        v-if="writeStore.activeSection"
        v-model="content"
        :saved-at="writeStore.activeSection.savedAt"
        @save="handleSave"
      />
    </section>

    <ScorePointList :points="writeStore.scorePoints" @check="writeStore.checkResponse" />
  </div>
</template>

<script setup lang="ts">
import { RefreshCw, Send } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import TipTapEditor from '@/components/editor/TipTapEditor.vue'
import OutlineTree from '@/components/write/OutlineTree.vue'
import ScorePointList from '@/components/write/ScorePointList.vue'
import { ROUTE_PATHS } from '@/constants/routes'
import { useWriteStore } from '@/stores/write'

const writeStore = useWriteStore()
const content = ref(writeStore.activeSection?.contentMd ?? '')

const activeTitle = computed(
  () => writeStore.outline.find((node) => node.sectionId === writeStore.activeSectionId)?.title ?? '章节正文',
)

watch(
  () => writeStore.activeSectionId,
  () => {
    content.value = writeStore.activeSection?.contentMd ?? ''
  },
)

function handleSave(value: string): void {
  if (!writeStore.activeSectionId) return
  void writeStore.saveSection(writeStore.activeSectionId, value)
}
</script>
