<template>
  <article class="msg-row" :class="{ me: message.role === 'user', ai: message.role === 'assistant' }">
    <div class="msg-avatar">
      {{ message.role === 'user' ? '我' : 'AI' }}
    </div>
    <div class="msg-bubble">
      <!-- AI 抬头：与原型一致「OmniMind · 时间 · 已检索 N 个片段」 -->
      <div v-if="message.role === 'assistant'" class="head">
        OmniMind · {{ timeLabel }}<template v-if="message.citations.length"> · 已检索 {{ message.citations.length }} 个文档片段</template>
      </div>

      <div v-if="message.role === 'assistant' && !message.streaming" class="msg-actions">
        <button type="button" aria-label="复制" @click="copyContent">
          <Copy />
        </button>
        <button type="button" aria-label="点赞" :class="{ on: message.feedback === 'up' }" @click="$emit('feedback', message.messageId, 'up')">
          <ThumbsUp />
        </button>
        <button type="button" aria-label="点踩" :class="{ on: message.feedback === 'down' }" @click="$emit('feedback', message.messageId, 'down')">
          <ThumbsDown />
        </button>
      </div>

      <!-- 用户消息直出纯文本；AI 消息走 markdown 渲染 -->
      <div v-if="message.role === 'user'" class="msg-text">{{ message.content }}</div>
      <div v-else-if="message.content" class="msg-content" v-html="htmlContent" />

      <div v-if="message.streaming" class="streaming-cursor">
        正在生成<span class="dots">…</span>
      </div>

      <!-- 流式失败时在气泡内提示，避免空白让用户误以为「没返回数据」 -->
      <div v-if="message.error" class="msg-error">
        <TriangleAlert />
        {{ message.error }}
      </div>

      <details v-if="message.citations.length" class="citations" open>
        <summary>原文出处 · {{ message.citations.length }} 篇引用</summary>
        <div class="citation-list">
          <CitationPopover
            v-for="(citation, citationIndex) in message.citations"
            :key="`${message.messageId}-${citation.docId}-${citation.paragraphId}`"
            :citation="citation"
            :index="citationIndex + 1"
            @open="$emit('openCitation', $event)"
          />
        </div>
      </details>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Copy, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-vue-next'
import { computed } from 'vue'

import CitationPopover from '@/components/chat/CitationPopover.vue'
import type { ChatMessage, Citation } from '@/types/api'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  message: ChatMessage
}>()

defineEmits<{
  openCitation: [citation: Citation]
  feedback: [messageId: string, feedback: 'up' | 'down']
}>()

const htmlContent = computed(() => renderMarkdown(props.message.content))

const timeLabel = computed(() => {
  const d = new Date(props.message.createdAt)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

async function copyContent(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.message.content)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>
