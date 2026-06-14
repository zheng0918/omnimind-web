<template>
  <RouterView v-slot="{ Component, route }">
    <component :is="Component" v-if="route.meta.public" />
    <AppShell v-else>
      <component :is="Component" />
    </AppShell>
  </RouterView>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
</script>
