// Background map styles the viewer can switch between.
// All of them are Esri basemaps that work without an API key. (CARTO's free
// basemaps now stamp "API KEY REQUIRED" over every tile without a key.)
export type BaseLayerId = 'light' | 'dark' | 'streets' | 'satellite'

export interface BaseLayer {
  id: BaseLayerId
  label: string
  url: string
  attribution: string
  subdomains?: string
  // Deepest zoom the viewer can reach on this style
  maxZoom: number
  // Deepest zoom the server has tiles for. Past it, Leaflet scales up the
  // last tiles instead of requesting tiles that don't exist.
  maxNativeZoom?: number
  // Place-name labels served as a separate transparent layer, drawn above
  // the weather overlay so city names stay readable under rain or clouds
  labelsUrl?: string
}

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'
// Attribution text is each service's own copyrightText (…/MapServer?f=json)
const ESRI_CANVAS_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community'

export const BASE_LAYERS: BaseLayer[] = [
  {
    id: 'light',
    label: 'Light',
    url: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labelsUrl: `${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    attribution: ESRI_CANVAS_ATTRIBUTION,
    maxZoom: 18,
    maxNativeZoom: 16,
  },
  {
    id: 'dark',
    label: 'Dark',
    url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labelsUrl: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    attribution: ESRI_CANVAS_ATTRIBUTION,
    maxZoom: 18,
    maxNativeZoom: 16,
  },
  {
    id: 'streets',
    label: 'Streets',
    url: `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution:
      'Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, &copy; OpenStreetMap contributors, and the GIS User Community',
    maxZoom: 18,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
  },
]

// The style to start with: follows the viewer's light/dark preference
export function defaultBaseLayerId(): BaseLayerId {
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}
