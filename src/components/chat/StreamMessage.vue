<template>
  <article class="msg-row" :class="{ me: message.role === 'user', ai: message.role === 'assistant' }">
    <div class="msg-avatar">
      {{ message.role === 'user' ? '我' : 'AI' }}
    </div>
    <div class="msg-bubble">
      <div class="msg-content" v-html="htmlContent" />
      <div v-if="message.streaming" class="streaming-cursor">
        正在生成
      </div>
      <div v-if="message.citations.length" class="msg-citations">
        <CitationPopover
          v-for="(citation, citationIndex) in message.citations"
          :key="`${message.messageId}-${citation.docId}-${citation.paragraphId}`"
          :citation="citation"
          :index="citationIndex + 1"
          @open="$emit('openCitation', $event)"
        />
      </div>
      <div v-if="message.role === 'assistant' && !message.streaming" class="msg-actions">
        <button type="button" aria-label="复制">
          <Copy />
        </button>
        <button type="button" aria-label="点赞" @click="$emit('feedback', message.messageId, 'up')">
          <ThumbsUp />
        </button>
        <button type="button" aria-label="点踩" @click="$emit('feedback', message.messageId, 'down')">
          <ThumbsDown />
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { Copy, ThumbsDown, ThumbsUp } from 'lucide-vue-next'
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
</script>
