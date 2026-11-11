import { describe, expect, test } from 'bun:test'
import { formatRelativeTime } from '../../app/utils/formatRelativeTime'
import { sanitizeFilename } from '../../app/utils/downloadBlob'
import { collaborationColor } from '../../app/utils/collaborationIdentity'

const now = Date.parse('2026-11-11T03:00:00Z')

describe('page presentation', () => {
  test('handles missing dates and relative timestamps without invalid labels', () => {
    expect(formatRelativeTime(null, now)).toBe('Unknown')
    expect(formatRelativeTime('invalid', now)).toBe('Unknown')
    expect(formatRelativeTime('2026-11-11T02:59:45Z', now)).toBe('Just now')
    expect(formatRelativeTime('2026-11-11T02:58:00Z', now)).toBe('2 minutes ago')
    expect(formatRelativeTime('2026-11-12T03:00:00Z', now)).toBe('tomorrow')
  })

  test('keeps a collaborator color stable across renders and connections', () => {
    const color = collaborationColor('owner@example.com')
    expect(color).toMatch(/^#[a-f0-9]{6}$/)
    expect(collaborationColor('owner@example.com')).toBe(color)
    expect(collaborationColor('')).toMatch(/^#[a-f0-9]{6}$/)
  })

  test('exports safe filenames while retaining Unicode page titles', () => {
    expect(sanitizeFilename('../My:page.md')).toBe('.._My_page.md')
    expect(sanitizeFilename('Catatan 📖.md')).toBe('Catatan 📖.md')
    expect(sanitizeFilename('line\nbreak.md')).toBe('line_break.md')
  })
})
