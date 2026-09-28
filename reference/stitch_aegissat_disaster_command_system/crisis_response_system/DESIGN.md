---
name: Crisis Response System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3f4850'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#6b38d4'
  on-tertiary: '#ffffff'
  tertiary-container: '#8455ef'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  tabular-data:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system delivers an operational, mission-critical workspace tailored for emergency managers, GIS geospatial analysts, and disaster response incident commanders. Operating under split-second decision constraints, users require an environment devoid of ornamental ambiguity. The visual identity is anchored in crisp institutional legibility, technical precision, and decisive situational awareness.

The design movement combines **Corporate/Modern Technical** with high-density **Mission-Control Utility**:
- **High Information Architecture Density:** Clean modular grids with strict vertical and horizontal alignments, prioritizing maximum screen real estate for dynamic GIS maps, spectral imagery analytics, and triage telemetry.
- **Unambiguous Severity Signaling:** Monochromatic and calm slate foundation paired with immediate, high-visibility semantic status signifiers (Critical, Warning, Resolved, and AI-Synthesized).
- **Tabular Rigor:** Structured geospatial coordinates, confidence ratings, and time-stamped telemetry rendered with tabular figures to avoid layout jitter during real-time data streaming.

## Colors

The palette balances prolonged cognitive comfort during multi-hour operational shifts with rapid signal recognition across satellite layers and alert queues.

### Foundations & Canvas
- **Command Header & Primary Nav:** `#0f172a` (Deep Slate Slate-900) anchoring the global command layer, with `#1e293b` (Slate-800) for nested global toolbars and active states.
- **Canvas Base:** `#f8fafc` (Slate-50) for outer canvas; `#f1f5f9` (Slate-100) for structural background panels and GIS control docks.
- **Surface Panels:** Pure `#ffffff` for alert cards, imagery inspector panes, and modal telemetry.
- **Structural Outlines:** `#e2e8f0` (Slate-200) for card borders and table dividers; `#cbd5e1` (Slate-300) for interactive form field outlines and panel splitters.

### Operational Semantics & Analytical Indices
- **Primary Operational Accent (Satellite & Analytical Blue):** `#0284c7` (Sky-600) for primary command triggers, active imagery basemap toggles, and vector overlays; `#3b82f6` (Blue-500) for secondary selection states.
- **AI Inference & Spectral Band:** `#8b5cf6` (Purple-500) dedicated to automated model predictions, polygon masks, anomaly segmentations, and SAR/NDVI index indicators.
- **Critical Severity / Active Breach:** `#dc2626` (Red-600) and `#ef4444` (Red-500) reserved exclusively for high-risk triage, structural failure detection, and evacuation orders.
- **Warning / Emerging Threat:** `#f97316` (Orange-500) for threshold alerts, sensor anomalies, and pending verifications.
- **Safe / Containment Resolved:** `#10b981` (Emerald-500) for verified safe sectors, stable structures, and cleared assets.

## Typography

Typography relies uniformly on **Inter** across all display tiers to maximize neutral clarity, glyph distinction, and universal rendering consistency.

### Tabular Formatting Rule
For all geospatial coordinates (latitude/longitude), bounding boxes, timestamp counters, sensor readings, and AI probability metrics, the CSS property `font-feature-settings: "tnum" 1` is strictly mandated. This ensures fixed character widths across dynamic streams, preventing visual displacement when values fluctuate.

### Micro-Hierarchy Standards
- **Labels & Overlays:** `label-sm` is rendered in uppercase with positive letter spacing (`0.03em`) for imagery classification chips, sensor type badges, and card headers.
- **Body & Inspector Streams:** `body-md` (13px) acts as the workhorse for real-time incident reports and coordinate logs, providing optimal density without sacrificing legibility.

## Layout & Spacing

The system implements a **Data-Dense Responsive Grid** tailored for analytical side-panels, high-resolution geospatial viewports, and multi-tier monitoring consoles.

### Spatial Framework
- **Operational Density:** The baseline spacing unit is 4px. Component internal padding centers on `space-xs` (4px), `space-sm` (8px), and `space-md` (12px), yielding compact HUDs and maximum visible map area.
- **Master Screen Division (Desktop):**
  - **Global Command Bar:** Fixed 48px height (`#0f172a`).
  - **Collapsible Tactical Rail:** 64px collapsed, 260px expanded.
  - **GIS Map Viewport:** Fluid flex-fill canvas with floating control overlays.
  - **Incident & Inspector Drawer:** 380px fixed-width right panel with independent scrolling.
- **Breakpoints:**
  - `Desktop Wide (>= 1440px)`: Full 3-pane layout (Navigation + Map Canvas + Analytical Sidebar).
  - `Desktop/Laptop (1024px - 1439px)`: Map canvas dominant, analytical sidebar collapsable via overlay drawer.
  - `Tablet (768px - 1023px)`: Stacked mode with tabbed map/analytics toggle.
  - `Mobile (< 768px)`: Unified incident triage feed; map relegated to interactive modal view.

## Elevation & Depth

Visual separation relies on **structural borders paired with low-intensity ambient shadows** rather than high-contrast drops. This maintains operational neutrality and prevents shadow muddying over high-contrast satellite overlays.

- **Level 0 (Base Canvas & Map Plane):** Flat, 0px offset. Backgrounds sit flush at `#f8fafc`.
- **Level 1 (Cards, Panel Compartments):** `#ffffff` background with a 1px solid `#e2e8f0` border. Shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Floating GIS Toolbars & Basemap Selectors):** Floating over satellite raster tiles. Background: `#ffffff` at 95% opacity with `backdrop-filter: blur(8px)`. Border: 1px solid `#cbd5e1`. Shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`.
- **Level 3 (Tactical Command Drawers & Context Modals):** Sits above tactical viewports. Shadow: `0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.06)`. 1px border using `#94a3b8`.

## Shapes

The geometric framework enforces an exact `roundedness: 1` standard across the interface. This provides compact, utilitarian contours that echo institutional control consoles.

- **Standard Base Radii (`rounded-sm` / 0.25rem - 4px):** Applied to buttons, input fields, tactical chips, coordinate badges, slider handles, and alert list items.
- **Card & Container Radii (`rounded-lg` / 0.5rem - 8px):** Applied to structural analytical cards, floating GIS control docks, and incident modals.
- **System Exception (0px):** Map boundary splitters, geospatial pixel inspector reticles, and cross-section comparison rulers maintain hard 0px corners to ensure scientific precision.

## Components

### Buttons & Tactical Triggers
- **Primary Operational:** Solid `#0284c7` background, `#ffffff` text, 4px border radius, 32px height for compact density. Hover: `#0369a1`. Active: `#075985`. Focus: 2px ring `#38bdf8` with 2px offset.
- **Emergency Action (Dispatch / Evacuate):** Solid `#dc2626` background, `#ffffff` text, font-weight 600. Hover: `#b91c1c`.
- **Secondary / Technical:** Crisp white fill, 1px border `#cbd5e1`, text `#1e293b`. Hover: `#f8fafc` background with border `#94a3b8`.
- **Icon-Only Map Actions:** 32x32px square buttons, 1px border `#e2e8f0`, dark slate icons (`#334155`), background `#ffffff`.

### Chips & Confidence Score Badges
- **Confidence Rating Chip:** 20px height, 4px radius, tabular figures. Background tint with 15% opacity of semantic hue, solid matching text:
  - *High Confidence (>= 90%):* Background `#ecfdf5`, text `#047857`, border 1px solid `#a7f3d0`.
  - *Moderate / Review (70-89%):* Background `#fff7ed`, text `#c2410c`, border 1px solid `#fed7aa`.
  - *Critical Anomaly:* Background `#fef2f2`, text `#b91c1c`, border 1px solid `#fecaca`.
- **AI Inference Filter Chips:** Background `#f5f3ff`, text `#6d28d9`, border 1px solid `#ddd6fe` with an active purple dot indicator (`#8b5cf6`).

### Input Fields & Filter Dropdowns
- **Height & Style:** 32px operational height, `#ffffff` surface, 1px border `#cbd5e1`, 4px radius. 
- **Typography:** 13px font size with placeholder `#94a3b8`.
- **Focus State:** 1px border `#0284c7`, outline 2px solid rgba(2, 132, 199, 0.2).

### Cards & Triage Queues
- **Incident Summary Card:** Clean `#ffffff` canvas, 1px border `#e2e8f0`, 8px radius. Left border accents denote priority via 4px border-left striping (Critical: `#dc2626`, Warning: `#f97316`, Resolved: `#10b981`).
- **Inner Padding:** Compact 12px (`space-md`).
- **Hover Interaction:** Border transitions to `#94a3b8` without elevation jump to prevent GIS view distraction.

### Specialized GIS & Disaster Components
- **Satellite Comparison Splitter:** Dual-layer divider with 2px solid `#ffffff` vertical line, centered 24px circular drag handle (`#0f172a` fill, `#ffffff` dual-arrow iconography), and subtle dark drop shadow for high contrast over infrared and optical basemaps.
- **Telemetry / Coordinate HUD:** Overlay container with 85% opacity `#0f172a` backdrop, `#f8fafc` monospaced tabular coordinates, and 4px radius.