import { describe, expect, it } from 'vitest'
import { describeAqi } from './airQuality'

describe('describeAqi', () => {
  it.each([
    [1, 'Good', 'Air quality is good. Enjoy outdoor activities.'],
    [2, 'Fair', 'Air quality is acceptable for most people.'],
    [
      3,
      'Moderate',
      'Sensitive groups should reduce prolonged outdoor exertion.',
    ],
    [4, 'Poor', 'Reduce prolonged or heavy outdoor exertion.'],
    [5, 'Very Poor', 'Avoid outdoor activities and keep windows closed.'],
  ] as const)('describes level %i as %s', (aqi, label, advice) => {
    expect(describeAqi(aqi)).toEqual({ label, advice })
  })
})
