import { defineStore } from 'pinia'

import type { SseHandle } from '@/api/sse'
import { saveSection, triggerResponseCheck } from '@/api/write'
import type { OutlineNode, ScorePoint, WriteSection, WriteTask } from '@/types/api'

import { seedOutline, seedScorePoints, seedSections, seedWriteTask } from './pocSeed'

interface WriteState {
  currentTaskId: string
  task: WriteTask | null
  outline: OutlineNode[]
  sections: Record<string, WriteSection>
  activeSectionId: string
  scorePoints: ScorePoint[]
  lockState: {
    editingUserId: string | null
    lockExpireAt: string | null
  }
}

const activeStreams: Record<string, SseHandle> = {}

export const useWriteStore = defineStore('write', {
  state: (): WriteState => ({
    currentTaskId: seedWriteTask.taskId,
    task: seedWriteTask,
    outline: seedOutline,
    sections: seedSections,
    activeSectionId: 'sec-1',
    scorePoints: seedScorePoints,
    lockState: {
      editingUserId: null,
      lockExpireAt: null,
    },
  }),
  getters: {
    activeSection: (state) => state.sections[state.activeSectionId] ?? null,
  },
  actions: {
    setActiveSection(sectionId: string): void {
      this.activeSectionId = sectionId
    },
    upsertSection(section: WriteSection): void {
      this.sections[section.sectionId] = section
    },
    stopSectionStream(sectionId: string): void {
      activeStreams[sectionId]?.abort()
      delete activeStreams[sectionId]
    },
    async saveSection(sectionId: string, contentMd: string): Promise<void> {
      if (!this.currentTaskId) return
      await saveSection(this.currentTaskId, sectionId, contentMd)
      const section = this.sections[sectionId]
      if (section) {
        section.contentMd = contentMd
        section.status = 'USER_EDITED'
        section.savedAt = new Date().toISOString()
      }
    },
    async checkResponse(): Promise<void> {
      if (!this.currentTaskId) return
      const result = await triggerResponseCheck(this.currentTaskId)
      this.scorePoints = result.scorePoints
    },
  },
})
