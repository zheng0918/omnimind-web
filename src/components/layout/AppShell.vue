<template>
  <div class="app">
    <SidebarNav />
    <main class="main">
      <TopHeader />
      <section class="view active">
        <slot />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import SidebarNav from './SidebarNav.vue'
import TopHeader from './TopHeader.vue'
</script>
