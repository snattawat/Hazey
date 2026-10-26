import type { ReactNode } from 'react'

// Inline SVG icons for the map tools (no icon dependency). Each is a 20x20
// stroked glyph that inherits currentColor.
interface IconProps {
  children: ReactNode
}

function Icon({ children }: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function PlusIcon() {
  return (
    <Icon>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Icon>
  )
}

export function MinusIcon() {
  return (
    <Icon>
      <line x1="5" y1="12" x2="19" y2="12" />
    </Icon>
  )
}

// Two pins: "show both cities"
export function BothIcon() {
  return (
    <Icon>
      <path d="M8 2a4 4 0 0 0-4 4c0 3 4 7 4 7s4-4 4-7a4 4 0 0 0-4-4Z" />
      <circle cx="8" cy="6" r="1.2" />
      <path d="M16 11a3 3 0 0 0-3 3c0 2.2 3 5 3 5s3-2.8 3-5a3 3 0 0 0-3-3Z" />
    </Icon>
  )
}

// Crosshair: "center on selected city"
export function TargetIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
    </Icon>
  )
}

// Stacked sheets: "map layers"
export function LayersIcon() {
  return (
    <Icon>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 12 10 5 10-5" />
      <path d="m2 17 10 5 10-5" />
    </Icon>
  )
}

export function FullscreenIcon() {
  return (
    <Icon>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </Icon>
  )
}

export function ExitFullscreenIcon() {
  return (
    <Icon>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </Icon>
  )
}
