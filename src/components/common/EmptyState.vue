<template>
  <div class="empty-state">
    <component :is="icon" class="empty-icon" />
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    title: string
    description: string
    icon?: Component
  }>(),
  {
    icon: Inbox,
  },
)
</script>
