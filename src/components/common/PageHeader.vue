<template>
  <header class="page-title-row" :class="{ compact }">
    <div>
      <h1 class="page-title">
        {{ title }}
        <small v-if="description">{{ description }}</small>
      </h1>
    </div>
    <div v-if="$slots.actions" class="page-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  compact?: boolean
}>()
</script>
