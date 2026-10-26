type Aqi = 1 | 2 | 3 | 4 | 5

const LEVELS: Record<Aqi, { label: string; advice: string }> = {
  1: {
    label: 'Good',
    advice: 'Air quality is good. Enjoy outdoor activities.',
  },
  2: {
    label: 'Fair',
    advice: 'Air quality is acceptable for most people.',
  },
  3: {
    label: 'Moderate',
    advice: 'Sensitive groups should reduce prolonged outdoor exertion.',
  },
  4: {
    label: 'Poor',
    advice: 'Reduce prolonged or heavy outdoor exertion.',
  },
  5: {
    label: 'Very Poor',
    advice: 'Avoid outdoor activities and keep windows closed.',
  },
}

// Plain-language label and advice for an OpenWeatherMap air quality index
export function describeAqi(aqi: 1 | 2 | 3 | 4 | 5) {
  return LEVELS[aqi]
}
