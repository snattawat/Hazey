// OpenWeatherMap gives times as Unix seconds (UTC) plus the city's offset
// from UTC in seconds. Shifting by the offset and then formatting in UTC
// shows the city's local time, whatever timezone the viewer's computer is in.
function cityTime(dt: number, timezone: number) {
  return new Date((dt + timezone) * 1000)
}

// "3 PM"
export function formatHour(dt: number, timezone: number) {
  return cityTime(dt, timezone).toLocaleTimeString('en-US', {
    hour: 'numeric',
    timeZone: 'UTC',
  })
}

// "6:12 AM", e.g. for sunrise and sunset
export function formatTimeOfDay(dt: number, timezone: number) {
  return cityTime(dt, timezone).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

// "Wed"
export function formatWeekday(dt: number, timezone: number) {
  return cityTime(dt, timezone).toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  })
}

// "2026-10-21", the city's local calendar date (useful for grouping by day)
export function localDateKey(dt: number, timezone: number) {
  return cityTime(dt, timezone).toISOString().slice(0, 10)
}

// The live clock uses the city's IANA time zone rather than the API's
// offset, so it is right even before the weather has loaded.

// "12:30 PM" at `ms` (epoch milliseconds) in the given IANA time zone
export function formatClock(ms: number, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(ms)
}

// "Wednesday, Oct 21" at `ms` in the given IANA time zone
export function formatLongDate(ms: number, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(ms)
}

// "Updated just now" / "Updated 5 min ago" / "Updated 2 h ago"
export function formatUpdated(updatedMs: number, nowMs: number) {
  const minutes = Math.floor(Math.max(0, nowMs - updatedMs) / 60_000)
  if (minutes < 1) return 'Updated just now'
  if (minutes < 60) return `Updated ${minutes} min ago`
  return `Updated ${Math.floor(minutes / 60)} h ago`
}
