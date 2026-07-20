---
name: AMMAN Mineral Recommendation Study
document_type: McKinsey-style Business Case / Recommendation Report
colors:
  primary: '#E9F40B'
  secondary: '#C7BDBA'
  white: '#FFFFFF'
  dark-grey: '#403836'
  black: '#000000'
  surface: '#FFFFFF'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#F7F5F4'
  surface-container: '#F0EDEC'
  on-surface: '#403836'
  on-surface-variant: '#6B6562'
  outline: '#B8B0AD'
  outline-variant: '#D9D3D0'
  primary-container: '#F4FDD6'
typography:
  headline:
    fontFamily: Work Sans
    weights: [400, 500, 600, 700]
    usage: h1, h2, h3, h4, .card h4, .step h4
  body:
    fontFamily: Inter
    weights: [300, 400, 500, 600, 700]
    usage: p, table, labels, lists (default weight 300 Light)
  cover-title:
    fontSize: 42px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.01em
  section-title:
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
  section-title-compact:
    fontSize: 20px
    fontWeight: 600
  body-base:
    fontSize: 14px
    fontWeight: 300
    lineHeight: 22px
  lead-text:
    fontSize: 15px
    fontWeight: 300
    lineHeight: 23px
  eyebrow-label:
    fontSize: 11px
    fontWeight: 700
    letterSpacing: 0.09em
    textTransform: uppercase
page:
  size: A4
  unit_class: .sheet
  dimensions: 210mm x 297mm
  print_break: page-break-after always, last child auto
  section_padding: 36px 48px
  cover_padding: 80px 56px
spacing:
  unit: 8px
  divider_margin: 20px (compact) / 24-28px (standard)
  grid_gap: 16px
rounded:
  card: 8px
  badge: 4px
  pill: full
layout:
  presentation:
    pattern: Left sidebar navigation rail + full-viewport .slide sections
    example: app/html/1_sprint_1/1_presentation_showcase.html
    features:
      - Fixed left sidebar with numbered anchor links
      - Scroll-aware active link highlighting
      - Progress bar across top of page
      - Mobile-responsive with collapsible nav on narrow screens
      - White background (#FFFFFF), clean spacing, modern minimalist aesthetic
  report:
    pattern: Stack of individually printable A4 .sheet divs
    example: This design system (for business case / recommendation reports)
    features:
      - Each .sheet is 210mm x 297mm, flexbox column layout
      - Print-ready with page-break-after rules
      - No sidebar — full-width paginated reading
      - White background (#FFFFFF) with subtle warm-grey surface containers
  rule: >
    Use the presentation pattern (sidebar nav) for slide-deck style content:
    sprint updates, executive briefings, project status presentations.
    Use the report pattern (A4 sheets) for formal documents: business cases,
    recommendation studies, technical reports, white papers.
---

## Purpose

This design system defines the layout, typography, color, and component library for AMMAN Mineral internal recommendation studies and business cases. It follows a McKinsey-style narrative structure (Situation → Complication → Recommendation → Evidence → Roadmap) rendered as a print-ready, paginated A4 HTML report. Reuse this file whenever a new initiative brief needs to be converted into a formal business case document.

For presentation-style content (sprint updates, executive briefings), use the sidebar navigation layout pattern from `app/html/1_sprint_1/1_presentation_showcase.html` instead.

## Brand & Style

The aesthetic is **Modern Corporate Industrial**: a clean white-on-white foundation with a bright yellow-lime primary accent (`#E9F40B`) and warm grey-beige secondary (`#C7BDBA`), communicating precision, clarity, and modern industrial authority. The dark grey (`#403836`) grounds the design for headers, footers, and high-contrast elements. Every report is built as a stack of individually printable A4 sheets (`.sheet`), not a continuous scrolling page, so it reads correctly both on screen and when exported to PDF.

## Colors

**Primary** (`#E9F40B` / `--primary`) is the hero accent color. It is reserved for high-emphasis badges (the "GO" pyramid badge, step numbers, flow-diagram output boxes), section eyebrows, pillar numbers, and card labels. It should never be used as a full-cell table background, since it reduces legibility of data-dense tables. **Primary Container** (`#F4FDD6`, a soft tint of the primary) is available for subtle highlight backgrounds when the full primary would be too intense.

**Secondary** (`#C7BDBA`) is a warm grey-beige used for surface containers, subtle borders, and muted accents. It provides warmth without competing with the primary.

**Dark Grey** (`#403836`) is the dominant dark surface: used for the cover background, table headers, and system architecture diagram processing nodes. It replaces the old charcoal matte (`#231F20`).

**White** (`#FFFFFF`) is the page background — clean, modern, minimalist. Surface containers use subtle warm-grey tints derived from the secondary color:
- `surface-container-low`: `#F7F5F4`
- `surface-container`: `#F0EDEC`

**Black** (`#000000`) is used for primary text content, ensuring maximum readability on white backgrounds.

All table and card backgrounds stay neutral (`surface-container-low` or `paper-white`), keeping color usage restricted to labels, badges, and structural accents only, not data cells.

## Typography

**Work Sans** carries all headings (h1-h4), giving a grounded, technical character to titles and card headers. **Inter** carries all body copy, table content, and labels — at weight **300 (Light)** by default, chosen for its airy, modern legibility in long-form dense reporting. Inter weights 400-700 remain available for emphasis. Eyebrow labels (section category tags like "Executive Summary" or "Case Study") always render in Inter, uppercase, 11px, with wide letter-spacing (0.09em), sitting directly above the section's h2.

## Layout & Page Structure

Each report is a sequence of `.sheet` divs, one per A4 page, wrapped in a single `.page` container. A `.sheet` is always exactly 210mm x 297mm, using flexbox column layout so content stretches to fill the page and the footer (where present) pins to the bottom. Standard page types:

- **Cover page**: dark grey (`#403836`) background, white text, large title, subtitle, and a horizontal meta-row (Prepared For / Site / Date / Status). The primary color (`#E9F40B`) is used sparingly as an accent on cover elements.
- **Executive Summary page**: eyebrow + h2 recommendation statement, a `.pyramid-top` GO/recommendation box, a 3-column `.pillar-row`, and a supporting-evidence grid or opportunity widget row
- **Problem/Evidence page**: eyebrow + h2, a 3-column card grid for sub-topics, followed by a case-study or reference table
- **Foundation/Architecture page**: 2-column card grid for current-state assets, followed by a `.flow-diagram` showing system or process architecture
- **Approach page**: buy-vs-build table followed by a 3-column `.benefit-strip`
- **Roadmap page**: 2x2 `.step-grid` for phased implementation, each step with a KPI box; footer only appears on the final page of the report

### Presentation Layout (Alternative)

For slide-deck style HTML pages, use the sidebar navigation pattern:
- Fixed left sidebar (220px) with numbered anchor links to each slide
- Each slide is a full-viewport `.slide` section with `scroll-margin-top`
- Progress bar at the top of the page tracks scroll position
- Mobile-responsive with collapsible nav
- Reference implementation: `app/html/1_sprint_1/1_presentation_showcase.html`

## Components

### Pyramid Summary Box (`.pyramid-top`)
Dark grey (`#403836`) background, white text, containing a primary-yellow badge (e.g. "GO") beside a one-paragraph recommendation statement. Used exactly once per report, on the executive summary page, to state the top-line recommendation before any supporting detail.

### Pillar Row (`.pillar-row`)
Three-column grid of numbered rationale cards (01/02/03), light surface-container background, primary-yellow numerals. Used directly beneath the pyramid box to give the three strongest reasons supporting the recommendation.

### Opportunity / Benefit Strip (`.benefit-strip`)
Three-column grid of cards with a left accent border (use `#E9F40B`), an uppercase label, and a bolded quantitative figure followed by supporting text. Used for quantified value statements (production value at risk, cost avoided, compliance exposure). Always include a disclaimer line beneath this component if figures are illustrative estimates rather than audited data.

### Cards (`.card`, `.grid-2`, `.grid-3`)
Neutral bordered containers (outline: `#D9D3D0`) with an uppercase card-label, an h4 title, and body copy (Inter Light 300). Surface container background (`#F7F5F4`). Used for breaking down sub-topics (data sources, sensor types, current-state assets) into parallel, scannable units.

### Tables
Dark grey (`#403836`) header row, white header text, neutral alternating row backgrounds (`#FFFFFF` / `#F7F5F4`). Do not use `#E9F40B` as a full-cell background on data cells within recommendation or sourcing tables, since it competes with the header row for visual priority; reserve highlight styling for one-off callouts only, if used at all. Source/reference columns should always contain live hyperlinks when citing external case studies.

### System Architecture / Flow Diagram (`.flow-diagram`)
Horizontal flow showing inputs (left column of source boxes) → processing node (dark grey `#403836` box) → output node (primary-yellow `#E9F40B` box), connected by arrow glyphs. Used to show data or process flow, distinct from a business process map; label the section "System Architecture" when it depicts technical data flow, or "Process Map" when it depicts an operational/business workflow.

### Step Grid (`.step-grid`)
2x2 grid of implementation phases, each with a numbered badge (primary-yellow background), title, meta-tag (timeframe), a short bullet list of activities, and a KPI box at the bottom. Always closes with the KPI box, never leave a step without a measurable checkpoint.

### Footer
Dark grey (`#403836`) bar, white text. Appears once, only on the final page of the report, showing the report title on the left and version/date on the right.

## Content Writing Guidelines

- State the recommendation before the evidence (SCQ / pyramid principle), never build up to it
- Every case study or reference claim must carry a real, working source link, not a placeholder domain name
- Quantitative claims derived from public company guidance or external benchmarks (not internal AMMAN data) must be labeled illustrative and carry a validation disclaimer
- Avoid naming specific commercial vendors in closing recommendation language; list vendor categories instead unless the brief explicitly calls for named partners
- Each implementation phase must carry its own KPI, gated independently, following the "approve one step at a time" sequencing pattern
- Do not use the primary accent color (`#E9F40B`) as a full-cell background in data tables; reserve it for badges, numerals, and diagram nodes only

## CSS Variable Reference

```css
:root {
  /* ── Brand Colors ── */
  --color-primary:        #E9F40B;
  --color-secondary:      #C7BDBA;
  --color-white:          #FFFFFF;
  --color-dark-grey:      #403836;
  --color-black:          #000000;

  /* ── Surface Hierarchy ── */
  --surface:              #FFFFFF;
  --surface-container-lowest: #FFFFFF;
  --surface-container-low:    #F7F5F4;
  --surface-container:        #F0EDEC;

  /* ── On-Surface (Text) ── */
  --on-surface:           #403836;
  --on-surface-variant:   #6B6562;

  /* ── Outlines & Borders ── */
  --outline:              #B8B0AD;
  --outline-variant:      #D9D3D0;

  /* ── Primary Container (Subtle Tint) ── */
  --primary-container:    #F4FDD6;

  /* ── Typography ── */
  --font-headline: 'Work Sans', sans-serif;
  --font-body: 'Inter', sans-serif;
  --body-font-weight: 300;

  /* ── Spacing ── */
  --spacing-unit: 8px;

  /* ── Border Radius ── */
  --radius-card: 8px;
  --radius-badge: 4px;
  --radius-pill: 9999px;
}
```

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-07-14 | Design System Update | Migrated from olive-green/charcoal-matte/electric-lime palette to new Amman brand colors: primary `#E9F40B`, secondary `#C7BDBA`, dark-grey `#403836`, white `#FFFFFF` background. Changed body font to Inter Light (300). Added presentation vs. report layout rules and CSS variable reference. |
| 2026-06-29 | Initial Generation | Original McKinsey-style design system created |