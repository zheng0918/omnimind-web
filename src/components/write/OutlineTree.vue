<template>
  <section class="panel">
    <div class="panel-head">
      <h3>大纲树</h3>
      <span class="meta">{{ outline.length }} 节</span>
    </div>
    <div class="outline-list">
      <button
        v-for="node in outline"
        :key="node.nodeId"
        class="outline-node"
        :class="{ active: node.sectionId === activeSectionId }"
        type="button"
        @click="$emit('select', node.sectionId)"
      >
        <FileText />
        <span>
          <b>{{ node.title }}</b>
          <small>{{ statusLabel(node.status) }}</small>
        </span>
        <i :class="node.status.toLowerCase()" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { FileText } from 'lucide-vue-next'

import type { OutlineNode, WriteSectionStatus } from '@/types/api'

defineProps<{
  outline: OutlineNode[]
  activeSectionId: string
}>()

defineEmits<{
  select: [sectionId: string]
}>()

function statusLabel(status: WriteSectionStatus): string {
  const labels: Record<WriteSectionStatus, string> = {
    PENDING: '待生成',
    GENERATING: '生成中',
    DONE: '已生成',
    USER_EDITED: '已编辑',
    FAILED: '生成失败',
  }
  return labels[status]
}
</script>
