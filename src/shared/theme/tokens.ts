/**
 * Design tokens. Owner: Leo. Consumers import from here; no hardcoded values in screens.
 *
 * Name status:
 *  - LOCKED (2026-10-09): every key name in this file. Values may change, names will not
 *    without a heads-up to Iker (lint rule depends on them).
 *  - Colors: palette "B. Oxford Navy", approved by the CEO 2026-10-09. Source of truth for
 *    contrast is docs/design/tools/palettes.mjs; rerun it after any color change.
 */

// ---- Spacing (pt, 4pt base grid) ----
export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16, // default screen/card padding
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ---- Radii ----
export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

// ---- Touch targets ----
export const hit = {
  min: 44, // minimum tap target, pt (iOS HIG); use 48 on Android where space allows
  control: 52, // height of primary buttons and text fields
} as const;

// ---- Strokes (border widths) ----
export const stroke = {
  thin: 1, // default borders, dividers
  thick: 2, // focus and error borders
} as const;

// ---- Typography ----
// Sizes are base values at default system text size. Always render with allowFontScaling on;
// cap with `maxFontSizeMultiplier` so layouts survive the largest accessibility sizes.
export const fontFamily = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: fontWeight.bold },
  title: { fontSize: 24, lineHeight: 30, fontWeight: fontWeight.bold },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: fontWeight.semibold },
  body: { fontSize: 16, lineHeight: 24, fontWeight: fontWeight.regular },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: fontWeight.semibold },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.regular },
  label: { fontSize: 14, lineHeight: 20, fontWeight: fontWeight.medium },
  numeric: { fontSize: 28, lineHeight: 34, fontWeight: fontWeight.bold }, // reps, weights, timers
} as const;

export const fontScale = {
  maxMultiplier: 1.6, // body text; headings/numeric use maxMultiplierLarge
  maxMultiplierLarge: 1.3,
} as const;

// ---- Colors (Oxford Navy) ----
type ColorSet = {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string; // decorative dividers and card edges only (below 3:1 by design)
  borderStrong: string; // outline of interactive controls (fields): 3:1 on background and surface
  text: string;
  textSecondary: string; // AA on background and surface
  textOnPrimary: string;
  primary: string;
  primaryPressed: string;
  accent: string; // burgundy: highlights, streaks, small emphasis; not for body text
  success: string;
  warning: string;
  danger: string;
  overlay: string;
  focusRing: string;
};

export const colorsLight: ColorSet = {
  background: '#F7F4EC',
  surface: '#ECE8DC',
  surfaceRaised: '#FCFAF4',
  border: '#D2CCBA',
  borderStrong: '#827C6A',
  text: '#161B26',
  textSecondary: '#454C5C',
  textOnPrimary: '#F7F4EC',
  primary: '#1C2F55',
  primaryPressed: '#111E3A',
  accent: '#8C2F3C',
  success: '#2F6B3F',
  warning: '#8A5A12',
  danger: '#A12A2A',
  overlay: 'rgba(22, 27, 38, 0.5)',
  focusRing: '#1C2F55',
};

export const colorsDark: ColorSet = {
  background: '#0D1220',
  surface: '#161D31',
  surfaceRaised: '#1D2640',
  border: '#29324A',
  borderStrong: '#6B7692',
  text: '#F2EFE6',
  textSecondary: '#A6AEC2',
  textOnPrimary: '#0D1220',
  primary: '#9DB4E6',
  primaryPressed: '#BCCDF0',
  accent: '#D9808C',
  success: '#6FCF8A',
  warning: '#E8B94F',
  danger: '#F28B8B',
  overlay: 'rgba(0, 0, 0, 0.6)',
  focusRing: '#9DB4E6',
};

export const colors = { light: colorsLight, dark: colorsDark } as const;
export type ColorScheme = keyof typeof colors;
export type ColorToken = keyof ColorSet;

// ---- Shadows (light mode; in dark mode prefer surfaceRaised over shadow) ----
export const shadow = {
  none: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

// ---- Motion ----
// Honor the system "Reduce Motion" setting: swap movement for a `fast` fade.
export const duration = {
  instant: 100,
  fast: 150, // press feedback, haptic pairing
  base: 200, // most transitions
  slow: 320, // sheets, progress rings, celebrations
} as const;

export const easing = {
  standard: [0.2, 0, 0, 1], // cubic-bezier, ease-out leaning
  enter: [0, 0, 0, 1],
  exit: [0.3, 0, 1, 1],
} as const;

export const tokens = {
  space,
  radius,
  hit,
  stroke,
  fontFamily,
  fontWeight,
  type,
  fontScale,
  colors,
  shadow,
  duration,
  easing,
} as const;

export type Tokens = typeof tokens;
