// The places that can be picked on the map
export interface MapLocation {
  id: string
  // Button text, e.g. "Bangkok, Thailand"
  label: string
  // City name and ISO country code as OpenWeatherMap returns them
  name: string
  countryCode: string
  // Country name for display, e.g. "Thailand"
  country: string
  // IANA time zone, for showing the city's local clock
  timeZone: string
  lat: number
  lon: number
}

export const MAP_LOCATIONS: MapLocation[] = [
  {
    id: 'bangkok',
    label: 'Bangkok, Thailand',
    name: 'Bangkok',
    countryCode: 'TH',
    country: 'Thailand',
    timeZone: 'Asia/Bangkok',
    lat: 13.7563,
    lon: 100.5018,
  },
  {
    id: 'singapore',
    label: 'Singapore',
    name: 'Singapore',
    countryCode: 'SG',
    country: 'Singapore',
    timeZone: 'Asia/Singapore',
    lat: 1.3521,
    lon: 103.8198,
  },
]

// OpenWeatherMap search text, e.g. "Bangkok,TH"
export function locationQuery(location: MapLocation) {
  return `${location.name},${location.countryCode}`
}
