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
    // 注意：lucide 图标本身是函数式组件（函数）。若直接写 `icon: Inbox`，
    // Vue 会把「函数型默认值」当作工厂函数调用，触发
    // "Cannot destructure property 'slots' of 'undefined'"。
    // 必须用工厂写法返回组件本身。
    icon: () => Inbox,
  },
)
</script>
