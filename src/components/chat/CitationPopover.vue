<template>
  <button class="citation" type="button" @click="$emit('open', citation)">
    <span class="idx">[{{ index }}]</span>
    <span class="name">{{ citation.docName }}</span>
    <span class="page">P.{{ citation.page }}</span>
    <span class="score">{{ formatConfidence(citation.confidence) }}</span>
  </button>
</template>

<script setup lang="ts">
import type { Citation } from '@/types/api'
import { formatConfidence } from '@/utils/format'

defineProps<{
  citation: Citation
  index: number
}>()

defineEmits<{
  open: [citation: Citation]
}>()
</script>
