<template>
  <!--
    编写模式三栏面板：左大纲树（章节状态）/ 中 TipTap 编辑器（流式正文）/ 右评分点对照。
    数据来自 write store（POC 下由 seed 提供，联调时切换为 /write/tasks/* 的 SSE 流）。
  -->
  <div class="workspace-progress">
    <span>编写进度</span>
    <div class="progress-track">
      <i :style="{ width: writeStore.completionPercent + '%' }" />
    </div>
    <b>{{ writeStore.completionPercent }}%</b>
    <span class="progress-meta">已生成 {{ writeStore.doneSectionCount }}/{{ writeStore.outline.length }} 章 · 响应率 {{ writeStore.responseRate }}%</span>
  </div>

  <div class="write-grid">
    <OutlineTree
      :outline="writeStore.outline"
      :active-section-id="writeStore.activeSectionId"
      @select="writeStore.setActiveSection"
    />

    <section class="panel write-editor-panel">
      <div class="panel-head">
        <h3>{{ activeTitle }}</h3>
        <span class="meta">{{ savedLabel }}</span>
      </div>
      <TipTapEditor
        v-if="writeStore.activeSection"
        v-model="content"
        :saved-at="writeStore.activeSection.savedAt"
        @save="handleSave"
      />
      <EmptyState v-else title="请选择左侧章节" description="点击大纲中的章节以查看或编辑正文。" />
    </section>

    <ScorePointList :points="writeStore.scorePoints" @check="writeStore.checkResponse" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import TipTapEditor from '@/components/editor/TipTapEditor.vue'
import OutlineTree from '@/components/write/OutlineTree.vue'
import ScorePointList from '@/components/write/ScorePointList.vue'
import { useWriteStore } from '@/stores/write'
import { formatTimeLabel } from '@/utils/format'

const writeStore = useWriteStore()
const content = ref(writeStore.activeSection?.contentMd ?? '')

const activeTitle = computed(
  () => writeStore.outline.find((node) => node.sectionId === writeStore.activeSectionId)?.title ?? '章节正文',
)

// 自动保存时间标签：真实取章节 savedAt，未保存时显示占位短横线。
const savedLabel = computed(() => {
  const savedAt = writeStore.activeSection?.savedAt
  return savedAt ? `已保存 · ${formatTimeLabel(savedAt)}` : '尚未保存'
})

// 切换章节时把编辑器内容同步为该章节的 markdown。
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
