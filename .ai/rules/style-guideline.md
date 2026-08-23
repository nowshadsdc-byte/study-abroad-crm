---
description: "Mandatory visual and interaction standards for Confidence Global Bd CRM frontend work."
globs:
  - "resources/js/**"
  - "resources/css/**"
  - "resources/views/**"
---

# Confidence Global Bd CRM Style Guideline

Apply these requirements to every new or modified frontend surface. Preserve existing implementation patterns where they do not conflict with this guide.

## Design Direction

- Product: Confidence Global Bd CRM.
- Primary page type: data-dense, operational admin dashboard.
- Tone: professional, calm, education-focused, and growth-oriented.
- Support both light and dark themes.
- Use an emerald-to-teal diagonal gradient for primary branded treatments.
- Prefer compact operational layouts over marketing-style sections.

## Typography

- Use `Geist, system-ui, sans-serif` for sans-serif UI text and `Geist Mono, ui-monospace, monospace` for monospaced content when the fonts are available.
- Enable `cv02`, `cv03`, `cv04`, and `cv11` font features.
- Use weights: regular `400`, medium `500`, semibold `600`, and bold `700`.
- Page titles: `text-xl sm:text-2xl`, semibold.
- Card titles: `text-base`, semibold.
- KPI values: `text-2xl`, semibold.
- Body text: `text-sm`, regular. Labels: `text-sm`, medium.
- Secondary text: `text-xs`, regular. Micro text: `text-[11px]`, regular. Badge text: `text-[10px]`, medium.
- Use `tracking-tight` for headings and `tracking-wider` for uppercase section labels.

## Color Tokens

Use semantic Tailwind/CSS tokens instead of hard-coded component colors wherever possible.

| Token | Light | Dark |
| --- | --- | --- |
| Background | `oklch(0.985 0.004 165)` | `oklch(0.16 0.012 170)` |
| Foreground | `oklch(0.18 0.02 170)` | `oklch(0.97 0.005 165)` |
| Card | `oklch(1 0 0)` | `oklch(0.21 0.015 170)` |
| Primary | `oklch(0.55 0.13 162)` | `oklch(0.7 0.14 162)` |
| Primary foreground | `oklch(0.99 0.01 165)` | `oklch(0.16 0.012 170)` |
| Secondary | `oklch(0.96 0.012 165)` | `oklch(0.27 0.015 170)` |
| Muted | `oklch(0.96 0.008 165)` | `oklch(0.27 0.015 170)` |
| Muted foreground | `oklch(0.52 0.02 170)` | `oklch(0.72 0.02 170)` |
| Accent | `oklch(0.95 0.03 162)` | `oklch(0.27 0.03 170)` |
| Destructive | `oklch(0.58 0.22 25)` | `oklch(0.68 0.2 25)` |
| Border | `oklch(0.91 0.01 165)` | `oklch(1 0 0 / 10%)` |

- Light brand gradient: `linear-gradient(135deg, oklch(0.55 0.13 162) 0%, oklch(0.5 0.12 180) 100%)`.
- Dark brand gradient: `linear-gradient(135deg, oklch(0.4 0.13 162) 0%, oklch(0.35 0.12 180) 100%)`.
- Semantic accents: success emerald `#10b981`, information sky `#0ea5e9`, warning amber `#f59e0b`, secondary violet `#8b5cf6`, danger rose `#f43f5e`, and neutral slate `#64748b`.
- Emerald is the principal interactive and positive-status color. Use violet only for a secondary analytical series or finance accent. Reserve amber for outstanding or warning states and rose for overdue, error, and destructive states.

## Layout And Spacing

- Desktop sidebar: `256px`, collapsible to `72px`. Top bar: `64px`. Keep both sticky when they are present.
- Main padding: `16px` on mobile and `24px` from the small breakpoint. Section gap: `24px`.
- Breakpoints: `sm` `640px`, `md` `768px`, `lg` `1024px`.
- KPI grid: one column on mobile, two on small screens, and four on large screens.
- Chart rows: one column through tablet, then three columns on large screens; the wide chart spans two columns.
- Base spacing unit: `4px`. Use `8px` for compact control gaps, `12px` for lists and labels, `16px` for card grids and mobile padding, and `24px` for page sections and desktop padding.

## Components

- Cards use the card token, a `1px` border token, `12px` radius, subtle `shadow-sm`, and `24px` default padding. KPI cards use `16px` padding and elevate to `shadow-md` on hover.
- Buttons are `36px` high with `6px` radius. Primary buttons use primary and primary foreground tokens. Primary CTAs use the brand gradient and reduce to `90%` opacity on hover.
- Icon buttons are `36px` by `36px`. Use `lucide-react` icons, `18px` standard and `16px` small. Header icon containers are `44px` square with `12px` radius and the brand gradient.
- Navigation items use `8px` radius and `12px` horizontal by `8px` vertical padding. Active items use solid primary, white foreground, and a subtle shadow. Inactive hover uses accent background and accent foreground.
- Use icons in controls and metric cards. Use familiar icon-only controls with accessible labels and tooltips where the icon is not self-evident.

## Data Visualization

- Charts are `240px` to `260px` high.
- Use low-contrast, dashed horizontal emerald-neutral gridlines.
- Axis labels are `11px` to `12px` and use muted foreground.
- Tooltips use `12px` text, `8px` radius, and a `1px` border.
- Bars have `6px 6px 0 0` radius. Area chart strokes are `2px`.

## Interaction And Accessibility

- Use subtle transitions for color, opacity, shadow, and icons.
- All interactive elements require a visible `3px` primary ring at `50%` opacity on keyboard focus.
- Scrollable lists have a maximum height of `320px` and a thin `6px` scrollbar.
- Keep light-theme surfaces white or near-white, separated by thin borders and restrained shadows.
- Ensure controls, labels, and values fit without overlap at mobile and desktop widths.