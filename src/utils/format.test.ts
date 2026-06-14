import { describe, expect, it } from 'vitest'

import { formatBytes, formatConfidence, formatPercent } from './format'

describe('format utils', () => {
  it('formats bytes with readable units', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB')
  })

  it('formats percentages and confidence values', () => {
    expect(formatPercent(68.4)).toBe('68%')
    expect(formatConfidence(0.923)).toBe('92%')
  })
})
