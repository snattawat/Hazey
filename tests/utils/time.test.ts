import { describe, expect, it } from 'vitest'
import {
  BANGKOK_TZ,
  OBSERVED_AT,
  SINGAPORE_TZ,
  bangkok,
} from '../support/fixtures'
import {
  formatClock,
  formatHour,
  formatLongDate,
  formatTimeOfDay,
  formatUpdated,
} from '../../src/utils/time'

const MINUTE = 60_000

describe('time', () => {
  it('formats an hour in the city time, from the API offset', () => {
    // 05:30 UTC
    expect(formatHour(OBSERVED_AT, BANGKOK_TZ)).toBe('12 PM')
    expect(formatHour(OBSERVED_AT, SINGAPORE_TZ)).toBe('1 PM')
  })

  it('formats sunrise and sunset with minutes', () => {
    expect(formatTimeOfDay(bangkok.sys.sunrise, BANGKOK_TZ)).toBe('6:12 AM')
    expect(formatTimeOfDay(bangkok.sys.sunset, BANGKOK_TZ)).toBe('5:57 PM')
  })

  it('formats the live clock and date in an IANA time zone', () => {
    const ms = OBSERVED_AT * 1000

    expect(formatClock(ms, 'Asia/Bangkok')).toBe('12:30 PM')
    expect(formatClock(ms, 'Asia/Singapore')).toBe('1:30 PM')
    expect(formatLongDate(ms, 'Asia/Bangkok')).toBe('Wednesday, Oct 21')
  })

  it('uses the city date, not the UTC date', () => {
    // 20 Oct 20:00 UTC is already 21 Oct in Singapore (UTC+8)
    const ms = Date.UTC(2026, 9, 20, 20)

    expect(formatLongDate(ms, 'Asia/Singapore')).toBe('Wednesday, Oct 21')
    expect(formatLongDate(ms, 'UTC')).toBe('Tuesday, Oct 20')
  })

  it.each([
    [0, 'Updated just now'],
    [59_000, 'Updated just now'],
    [MINUTE, 'Updated 1 min ago'],
    [12 * MINUTE + 30_000, 'Updated 12 min ago'],
    [59 * MINUTE, 'Updated 59 min ago'],
    [125 * MINUTE, 'Updated 2 h ago'],
  ])('says %i ms ago is "%s"', (ago, text) => {
    const now = OBSERVED_AT * 1000
    expect(formatUpdated(now - ago, now)).toBe(text)
  })

  it('treats an update "in the future" (a clock read earlier) as just now', () => {
    expect(formatUpdated(10_000, 0)).toBe('Updated just now')
  })
})
