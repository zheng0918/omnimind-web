<template>
  <KbList />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

import KbList from './list.vue'
import { useKbStore } from '@/stores/kb'

const route = useRoute()
const kbStore = useKbStore()

onMounted(() => {
  const kbId = String(route.params.kbId ?? '')
  if (kbId) void kbStore.fetchDocuments(kbId)
})
</script>
