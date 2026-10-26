# UI redesign: full-screen map for Bangkok and Singapore

Owner of the plan: Leader (a23). Ask Leader (send_message to a23) before stepping outside your files.

## Goal
- The app shows ONLY Bangkok and Singapore (`src/locations.ts`, `MAP_LOCATIONS`).
- No search. Remove the search bar and recent searches entirely.
- The map fills the whole browser window. Everything else floats over it as translucent "glass" cards.
- Useful map tools: zoom, show both cities, center on selected city, base map switcher, weather overlays with legend, scale bar, fullscreen.
- Polished, modern look in light and dark mode, and it works on phones (from 360px wide).

## Layout (desktop >= 900px)
```
+------------------------------------------------------------------+
| [glass top bar: brand | Bangkok/Singapore | °C/°F]      [tools] |
| [glass side panel 400px wide, scrolls        ]          [ + ]   |
| [  city, local time, updated / refresh       ]          [ - ]   |
| [  hero temp, alert, stats, compare city     ]          [both]  |
| [  hourly strip, 5-day, air quality          ]          [layers]|
|                                       full-screen map  [fullscr]|
|                                              [legend] [scale]   |
+------------------------------------------------------------------+
```
- Phones (< 900px): the top bar spans the width at the top, the panel becomes a bottom sheet (collapsed / expanded), map tools sit on the right below the top bar.
- App root `.app` sets two CSS variables that map overlays must respect:
  - `--overlay-top`: px covered at the top on the right-hand side (desktop `0px`, phone ~`76px`).
  - `--overlay-bottom`: px covered at the bottom (desktop `0px`, phone = bottom sheet height).
  - Map tools: `top: calc(var(--overlay-top, 0px) + 16px); right: 16px`.
  - Bottom-right items (legend, scale, Leaflet attribution): offset by `var(--overlay-bottom, 0px)`.

## File ownership (edit ONLY your own files)
| Who | Files |
|---|---|
| Leader | `src/index.css` (design tokens), `src/units.ts`, `src/locations.ts`, this doc |
| Worker2 (a24) | `src/App.tsx`, `src/App.css`, `src/App.test.tsx`, `src/api.ts`, `src/types.ts`, new `src/useCityWeather.ts`, new `src/components/TopBar.*`, new `src/components/CityPanel.*`, existing `WeatherCard`, `HourlyForecast`, `DailyOutlook`, `AirQuality`, `WeatherAlert` (+ their .css/.test), `src/forecast.ts`, `src/alerts.ts`, `src/airQuality.ts`, `src/time.ts`, `src/test/*`, `index.html`. Deletes `SearchBar.*`, `RecentSearches.*`, `src/App.recentSearches.test.tsx` |
| Worker1 (a25) | everything in `src/components/map/` EXCEPT `baseLayers.ts` and `weatherLayers.ts` (import them, don't edit). Deletes `src/components/LocationMap.tsx/.css/.test.tsx` |
| Worker3 (a26) | `src/components/map/baseLayers.ts`, `src/components/map/weatherLayers.ts` (values only: keep every exported name and type) |

## Shared contracts (do not change without asking Leader)
- `src/units.ts`: `type Units = 'metric' | 'imperial'`, `temperature()`, `formatTemp()`, `formatTempShort()`, `formatWind()`. The API is always called with `units=metric`; conversion happens only for display.
- `src/locations.ts`: `MapLocation` has `id, label, name, countryCode, country, timeZone (IANA), lat, lon`.
- `src/components/map/WeatherMap.tsx` default export, props:
  ```ts
  interface MapCity { location: MapLocation; weather: WeatherData | null }
  interface MapPadding { top: number; right: number; bottom: number; left: number }
  interface WeatherMapProps {
    cities: MapCity[]
    selectedId: string
    units: Units
    onSelect: (id: string) => void
    padding: MapPadding   // px of the map hidden behind the floating UI
  }
  ```
  `MapCity`, `MapPadding` and `WeatherMapProps` are exported from that file.
- Design tokens are in `src/index.css`: `--glass`, `--glass-strong`, `--glass-border`, `--blur`, `--surface`, `--surface-muted`, `--text`, `--text-h`, `--text-muted`, `--border`, `--accent`, `--accent-soft`, `--accent-text`, `--rain`, `--error`, `--error-bg`, `--shadow`, `--shadow-sm`, `--radius-lg|--radius|--radius-sm`, `--gap`, plus the `.glass` and `.visually-hidden` classes. Use them; don't hard-code colours that already have a token.

## Rules
- Do NOT add npm dependencies. Use inline SVG for icons.
- Do NOT start the dev server (Leader runs it once for integration).
- Do NOT run git commands that change state.
- Keep the existing code style: function components, default exports, short comments explaining why, nested CSS, accessible markup (labels, aria-pressed, focus-visible outlines).
- Before reporting done, run and pass: `npx vitest run <your test files>`, `npx tsc -b`, `npx oxlint`. If another worker's in-progress file breaks `tsc`, say so in your result instead of editing their file.
