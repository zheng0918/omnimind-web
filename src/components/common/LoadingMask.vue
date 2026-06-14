<template>
  <div v-if="visible" class="loading-mask">
    <span class="loading-dot" />
    <span>{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    visible: boolean
    text?: string
  }>(),
  {
    text: '加载中',
  },
)
</script>
