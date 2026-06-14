<template>
  <section class="editor-shell">
    <div class="editor-toolbar">
      <div class="group">
        <button type="button" aria-label="粗体" :class="{ on: editor?.isActive('bold') }" @click="run('toggleBold')">
          <Bold />
        </button>
        <button type="button" aria-label="斜体" :class="{ on: editor?.isActive('italic') }" @click="run('toggleItalic')">
          <Italic />
        </button>
        <button type="button" aria-label="代码" :class="{ on: editor?.isActive('code') }" @click="run('toggleCode')">
          <Code />
        </button>
      </div>
      <div class="group">
        <button type="button" aria-label="标题二" @click="setHeading(2)">
          H2
        </button>
        <button type="button" aria-label="标题三" @click="setHeading(3)">
          H3
        </button>
        <button type="button" aria-label="列表" @click="run('toggleBulletList')">
          <List />
        </button>
      </div>
      <button class="ai-btn" type="button">
        <Sparkles />
        AI 续写
      </button>
    </div>
    <EditorContent class="editor-canvas" :editor="editor" />
    <div class="editor-status">
      <span>{{ status }}</span>
      <span class="saved">已保存 · {{ savedAt || '--:--' }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { Bold, Code, Italic, List, Sparkles } from 'lucide-vue-next'
import { onBeforeUnmount, ref, watch } from 'vue'

import CodeBlock from '@tiptap/extension-code-block'
import Heading from '@tiptap/extension-heading'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps<{
  modelValue: string
  savedAt?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  save: [value: string]
}>()

const status = ref('编辑中')
let saveTimer: number | null = null

const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit, Heading.configure({ levels: [2, 3] }), CodeBlock],
  onUpdate: ({ editor: currentEditor }) => {
    const value = currentEditor.getHTML()
    emit('update:modelValue', value)
    status.value = '等待自动保存'
    if (saveTimer !== null) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      emit('save', value)
      status.value = '已自动保存'
    }, 2000)
  },
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value || editor.value.getHTML() === value) return
    editor.value.commands.setContent(value, false)
  },
)

function run(command: 'toggleBold' | 'toggleItalic' | 'toggleCode' | 'toggleBulletList'): void {
  editor.value?.chain().focus()[command]().run()
}

function setHeading(level: 2 | 3): void {
  editor.value?.chain().focus().toggleHeading({ level }).run()
}

onBeforeUnmount(() => {
  if (saveTimer !== null) window.clearTimeout(saveTimer)
  editor.value?.destroy()
})
</script>
