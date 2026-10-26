import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MAP_LOCATIONS } from '../data/locations'
import TopBar from './TopBar'

const [bangkok, singapore] = MAP_LOCATIONS

function setup(props: Partial<ComponentProps<typeof TopBar>> = {}) {
  const onSelect = vi.fn()
  const onUnitsChange = vi.fn()
  render(
    <TopBar
      cities={[
        { location: bangkok!, temp: 32.4 },
        { location: singapore!, temp: 30.1 },
      ]}
      selectedId="bangkok"
      units="metric"
      compact={false}
      onSelect={onSelect}
      onUnitsChange={onUnitsChange}
      {...props}
    />,
  )
  return { onSelect, onUnitsChange }
}

function cityGroup() {
  return within(screen.getByRole('group', { name: 'City' }))
}

function unitsGroup() {
  return within(screen.getByRole('group', { name: 'Temperature units' }))
}

describe('TopBar', () => {
  it('shows the "SEA Weather" brand as the page heading', () => {
    setup()

    expect(
      screen.getByRole('heading', { level: 1, name: 'SEA Weather' }),
    ).toBeInTheDocument()
  })

  it('keeps the brand name for screen readers in the compact phone bar', () => {
    setup({ compact: true })

    expect(
      screen.getByRole('heading', { level: 1, name: 'SEA Weather' }),
    ).toBeInTheDocument()
    expect(screen.getByText('SEA Weather')).toHaveClass('visually-hidden')
  })

  it('offers Bangkok and Singapore, named by the city alone', () => {
    setup()

    const buttons = cityGroup().getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toEqual([
      'Bangkok32°',
      'Singapore30°',
    ])
    expect(cityGroup().getByRole('button', { name: 'Bangkok' })).toBeInTheDocument()
    expect(
      cityGroup().getByRole('button', { name: 'Singapore' }),
    ).toBeInTheDocument()
  })

  it('marks the selected city as pressed', () => {
    setup({ selectedId: 'singapore' })

    expect(cityGroup().getByRole('button', { name: 'Singapore' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(cityGroup().getByRole('button', { name: 'Bangkok' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('calls onSelect with the city id', async () => {
    const { onSelect } = setup()

    await userEvent.click(cityGroup().getByRole('button', { name: 'Singapore' }))

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('singapore')
  })

  it('leaves out a temperature that has not loaded yet', () => {
    setup({
      cities: [
        { location: bangkok!, temp: 32.4 },
        { location: singapore!, temp: null },
      ],
    })

    expect(cityGroup().getByRole('button', { name: 'Singapore' })).toHaveTextContent(
      /^Singapore$/,
    )
  })

  it('shows the city temperatures in the chosen units', () => {
    setup({ units: 'imperial' })

    expect(cityGroup().getByRole('button', { name: 'Bangkok' })).toHaveTextContent(
      'Bangkok90°',
    )
  })

  it('has a °C/°F toggle that shows the current units', () => {
    setup()

    expect(unitsGroup().getByRole('button', { name: '°C' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(unitsGroup().getByRole('button', { name: '°F' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('calls onUnitsChange when a unit is picked', async () => {
    const { onUnitsChange } = setup()

    await userEvent.click(unitsGroup().getByRole('button', { name: '°F' }))

    expect(onUnitsChange).toHaveBeenCalledExactlyOnceWith('imperial')
  })
})
