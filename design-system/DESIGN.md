---
name: Lex Condominial
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dadf'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f9'
  surface-container: '#ebeef3'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#e0e3e8'
  on-surface: '#181c20'
  on-surface-variant: '#43474c'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f6'
  outline: '#74777d'
  outline-variant: '#c4c6cd'
  surface-tint: '#4d6076'
  primary: '#091e31'
  on-primary: '#ffffff'
  primary-container: '#203347'
  on-primary-container: '#889bb3'
  inverse-primary: '#b5c8e2'
  secondary: '#815500'
  on-secondary: '#ffffff'
  secondary-container: '#ffb22c'
  on-secondary-container: '#6c4700'
  tertiary: '#021f34'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b344a'
  on-tertiary-container: '#849cb7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d1e4fe'
  primary-fixed-dim: '#b5c8e2'
  on-primary-fixed: '#081d30'
  on-primary-fixed-variant: '#36485d'
  secondary-fixed: '#ffddb2'
  secondary-fixed-dim: '#ffb94c'
  on-secondary-fixed: '#291800'
  on-secondary-fixed-variant: '#624000'
  tertiary-fixed: '#cee5ff'
  tertiary-fixed-dim: '#b0c9e5'
  on-tertiary-fixed: '#011d32'
  on-tertiary-fixed-variant: '#314960'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#e0e3e8'
  surface-canvas: '#F8F9FA'
  surface-card: '#FFFFFF'
  surface-subtle: '#EDF1F5'
  border-subtle: '#DDE3EA'
  border-strong: '#B8C4D1'
  status-settled: '#1D7C4D'
  status-pending: '#D98200'
  status-critical: '#B3261E'
  gold-subtle: '#FDF6EA'
typography:
  headline-xl:
    fontFamily: Domine
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Domine
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Domine
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Domine
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Open Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Open Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Open Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Open Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Open Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Open Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is tailored for an institutional, mission-critical SaaS platform managing extrajudicial condominium debt collections, legal mediation, payment agreements, and delinquency analytics. The aesthetic projects uncompromising legal certainty, fiduciary rigor, procedural clarity, and corporate efficiency.

The visual style blends **Corporate / Modern** precision with **Editorial Legal Elegance**. It avoids casual playfulness or startup-style neon gradients in favor of deep navy backgrounds, tailored architectural structure, crisp graphite borders, and muted amber accents that denote authority and auditability. The interface balances high-density analytical dashboards with dignified typography suited for official notifications, debt recovery timelines, and judicial readiness reports.

## Colors

The palette establishes an authoritative, juridical presence rooted in deep Prussian navy, balanced by warm amber highlights that signal financial actions and legal notices without causing visual panic.

- **Primary (`#203347`)**: Deep corporate navy representing legal solemnity, governance, and institutional security. Applied to primary CTAs, main sidebars, major headers, and executive summaries.
- **Secondary (`#EAA015`)**: Dignified ochre gold. Reserved for key actions, agreement validations, negotiation milestone indicators, and active status callouts. Never used for large background areas.
- **Tertiary (`#4A627A`)**: Slate steel blue. Bridges data visualization categories, sub-navigation tabs, and secondary metadata.
- **Neutral (`#212529`)**: Deep carbon graphite. Provides high-contrast, fatigue-free readability across financial tables, dispute records, and legal clauses.
- **Semantic / Named Colors**:
  - `status-settled` (`#1D7C4D`): Confirmed payment, signed agreement, cleared slip.
  - `status-pending` (`#D98200`): In-flight negotiation, pending debtor signature.
  - `status-critical` (`#B3261E`): Legal escalation, protest filed, pre-judicial barrier breached.
  - `surface-canvas` (`#F8F9FA`) and `surface-card` (`#FFFFFF`): Subtle architectural warmth replacing sterile blues.

## Typography

The type system pairs **Domine** (an authoritative, sturdy transitional serif) for display contexts with **Open Sans** (a clean, neutral humanist sans-serif) for high-density transactional data, tables, and administrative workflows.

- **Domine** brings traditional legal credibility, mimicking legal filings, titles, and court transcripts. It is applied selectively to document titles, legal summary dashboards, and report titles.
- **Open Sans** ensures optimal optical clarity when scanning parcel values, interest calculations (juros e multas), debtor lists, and audit trails.
- Numerical data within ledgers and tables should employ tabular numerals (`font-variant-numeric: tabular-nums`) to preserve column alignment across currency and document numbers.

## Layout & Spacing

The layout is built upon an 8pt architectural grid engineered for information density and structured governance dashboards.

- **Desktop (>= 1280px)**: A 12-column fluid grid system with `gutter-lg` (24px) and outer canvas margins of `margin-lg` (40px). The primary navigation is anchored in a fixed vertical side-rail (260px wide) clad in primary navy.
- **Tablet (768px - 1279px)**: An 8-column layout utilizing `gutter` (16px) and `margin-md` (24px). Analytical split-screens stack vertically into structured audit blocks.
- **Mobile (< 768px)**: A 4-column layout with `margin` (16px) and `gutter` (16px). High-density tables reflow into indexed accordions and progressive disclosure cards for collection agents in the field.

## Elevation & Depth

To sustain a serious, institutional tone, the design system minimizes theatrical drop shadows, relying primarily on **tonal containment, structured borders, and subtle ambient depth**:

- **Tier 0 (Base Canvas)**: Flat `#F8F9FA`. Serves as the backdrop for all content groupings.
- **Tier 1 (Cards, Workspaces, Records)**: `#FFFFFF` encased in a crisp border (`1px solid #DDE3EA`). Paired with a soft ambient shadow: `0 1px 3px rgba(32, 51, 71, 0.05)`.
- **Tier 2 (Dropdowns, Notification Flyouts, Popovers)**: `#FFFFFF` with `1px solid #B8C4D1` and shadow: `0 4px 12px rgba(32, 51, 71, 0.08)`.
- **Tier 3 (Modals & Settlement Agreements)**: Backed by a 40% opacity navy backdrop (`rgba(32, 51, 71, 0.40)` with `backdrop-filter: blur(2px)`). Modals carry `0 12px 32px rgba(32, 51, 71, 0.16)`.
- **Divider Lines**: Used intentionally across debt ledgers using `#EDF1F5` to maintain structural rhythm without visual clutter.

## Shapes

The interface implements a **Soft (Level 1)** geometric standard. Sharp geometric structures reinforced by subtle 4px corner radii evoke corporate discipline, contracts, printed slips, and physical legal binders.

- Standard inputs, buttons, and badges utilize `0.25rem` (4px).
- Modal containers, master cards, and structured tables utilize `rounded-lg` at `0.5rem` (8px).
- Pill shapes are strictly forbidden, as they undermine the formal, judicial tone demanded by legal reconciliation tools.

## Components

### Buttons
- **Primary**: Solid navy background (`#203347`), white text, 4px border radius, 40px height for desktop. Subtle hover state shifting to `#172534`.
- **Secondary (Action/Negotiation)**: Muted gold background (`#EAA015`), dark navy text (`#203347`), semi-bold. Used for primary recovery actions (e.g., "Emitir Termo de Acordo", "Gerar Boleto Avulso").
- **Outline / Neutral**: Transparent background, 1px border (`#B8C4D1`), text `#203347`. Focus states show a 2px offset ring in `#EAA015`.

### Input Fields & Controls
- Standard height of 40px with a 1px border in `#DDE3EA`, transitioning to `#203347` on focus. Error states trigger a 1px border in `#B3261E` with micro-copy in `body-sm`.
- Number formatting inputs (for principal debt, fine, interest, and lawyer honorariums) use right-aligned monospace tabular figures with a fixed `R$` prefix box.

### Data Tables & Ledgers
- Table headers sit on `#EDF1F5` with uppercase tracking in `label-sm` and color `#4A627A`.
- Alternate row backgrounds are disabled; rows are separated by single 1px borders in `#EDF1F5` with a hover highlight of `#F8F9FA`.

### Status Badges & Chips
- Status indicators feature muted tint fills with dark contrasting text:
  - **Extrajudicial Notice (Notificação)**: Tint `#FDF6EA`, text `#9C6000`, border `1px solid #EAA015`.
  - **Agreement Honored (Acordo Cumprido)**: Tint `#E9F6ED`, text `#135434`, border `1px solid #7ECB98`.
  - **In Execution (Ajuizado / Protestado)**: Tint `#FCEBEA`, text `#7A1510`, border `1px solid #E59895`.

### Collection Rule Timeline (Régua de Cobrança)
- A sequential, linear step-node component displaying the progression of recovery: from amicable communication (WhatsApp/E-mail) to formal extrajudicial notification, registry protest, and court escalation.
- Nodes are solid navy connected by 2px vertical or horizontal hairline dividers in `#B8C4D1`.