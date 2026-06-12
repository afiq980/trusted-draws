# Trusted Draws Style Guide

This style guide captures the visual language and page structure implied by the pasted mobile UI image. It is intended for future AI agents building new pages in the `trusted-draws` app.

## 1. Design Intent

- Clean, modern, mobile-first dashboard style
- White and very light surfaces with soft pastel accent panels
- Rounded cards and pill-shaped containers
- Friendly, approachable data presentation
- Clear call-to-action buttons and compact status blocks

## 2. Color Palette

Use a soft, neutral background with gentle pastel cards and a strong dark action color.

- `--color-bg`: `#F6F7FB` (very light cool gray)
- `--color-surface`: `#FFFFFF` (white card surface)
- `--color-primary`: `#111827` (dark navy/charcoal for headings and buttons)
- `--color-secondary`: `#334155` (muted dark slate for body text)
- `--color-muted`: `#64748B` (soft gray for helper text)
- `--color-accent-green`: `#22C55E` (positive actions and success states)
- `--color-accent-peach`: `#F8B56A` (warm highlight and progress accents)
- `--color-accent-lavender`: `#C8C7FF` (secondary card backgrounds)
- `--color-accent-mint`: `#D9F7E9` (calm green panel background)
- `--color-border`: `#E2E8F0` (very light border)
- `--color-shadow`: `rgba(15, 23, 42, 0.08)`

## 3. Typography

Use a simple sans-serif typographic scale with strong hierarchy.

- Base font size: `16px`
- Font family: system sans-serif stack such as `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

### Headings

- `h1` / hero heading: `2.5rem` / `40px`, `700`
- `h2`: `1.75rem` / `28px`, `700`
- `h3`: `1.25rem` / `20px`, `600`
- `h4`: `1rem` / `16px`, `600`

### Body text

- Primary body: `1rem` / `16px`, `400`
- Secondary body: `0.875rem` / `14px`, `400`
- Accent / small text: `0.75rem` / `12px`, `500`

### Text color usage

- Headings: `--color-primary`
- Body text: `--color-secondary`
- Secondary text: `--color-muted`
- Positive status: `--color-accent-green`
- Warning/important accent: `--color-accent-peach`

## 4. Layout and Spacing

The UI should feel spacious and layered.

- Mobile first container width: max `480px`
- Page padding: `24px` on mobile, `32px` on tablet
- Card padding: `20px` or `24px`
- Standard gap: `16px`
- Larger gap: `24px`
- Border radius: `24px` for cards, `9999px` for pills/buttons

### Card styling

- Background: `--color-surface`
- Border radius: `24px`
- Box shadow: `0 18px 42px var(--color-shadow)` or lighter for small cards
- Border: `1px solid var(--color-border)` when needed

### Section spacing

- Section margin-top: `32px`
- Card group gap: `16px`
- List item spacing: `18px`

## 5. Components and Patterns

### 5.1 Page Header / Greeting Block

- Large greeting heading and date/metadata below
- Optional avatar shown in a rounded profile circle
- Use a simple subtitle and soft icon badges if needed

### 5.2 Action Cards Grid

- Display 2x2 cards in a compact grid for quick actions or metrics
- Each card should have:
  - a small round icon or status badge in the top-left
  - a label title
  - a subtext or value if needed
- Card background colors should be subtle pastel fills such as mint, peach, lavender, or light green.

### 5.3 Metric/Status Cards

- Use a small card with clear label and value
- Keep the layout vertical with the value prominent and caption smaller
- Example: time card, attendance card, overtime card

### 5.4 Primary CTA Button

- Background: `--color-primary`
- Text: `#FFFFFF`
- Padding: `14px 20px`
- Border radius: `9999px`
- Font weight: `600`

### 5.5 Secondary Button

- Background: `#FFFFFF` or `rgba(15, 23, 42, 0.04)`
- Text: `--color-primary`
- Border: `1px solid var(--color-border)`
- Use for less prominent actions

### 5.6 Lists and Activity Feed

- Use vertical lists with clear titles and timestamps/secondary text
- Each item should have enough breathing room and subtle separators or spacing
- Inline badges can indicate status or points (+150 pt)

### 5.7 Profile / Summary Card

- Use a wide summary card with a circular avatar and user name
- Display role details and an action button or badge inside the same panel
- Keep the profile card background softly tinted or with a subtle shadow

### 5.8 Bottom Navigation

- Use an icon-only nav row with 4 items
- Indicate active item with a filled indicator or stronger color
- Keep nav on light surface with no heavy borders

## 6. UI States and Feedback

- Success text: `--color-accent-green`
- Info text: `--color-primary`
- Neutral badges: `--color-muted` on `--color-surface`
- Disabled button: `background: #E2E8F0`, `color: #94A3B8`
- Error/warning: use a warm orange accent and stronger text color

## 7. Visual Design Rules for New Pages

When building new pages for Trusted Draws, follow these rules:

1. Keep the interface light and calm. Prefer white cards on a soft gray page background.
2. Use rounded containers and consistent corner radius across cards and buttons.
3. Limit the palette to the neutral base plus two accent colors.
4. Apply a strong primary action button and a softer secondary action for less important flows.
5. Use iconography sparingly, only to reinforce key actions or statuses.
6. Use a single-column mobile layout first; if a dashboard needs more density, group related cards in 2-column card stacks.
7. Keep text hierarchy clear: bold large headings, medium section headings, and readable 16px body copy.

## 8. Suggested CSS Token Naming

Use these tokens to make new pages consistent:

- `--page-bg`
- `--surface-bg`
- `--surface-border`
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--action-primary`
- `--action-accent`
- `--success`
- `--warning`
- `--shadow-default`
- `--radius-card`
- `--radius-pill`
- `--spacing-sm`
- `--spacing-md`
- `--spacing-lg`

## 9. Implementation Guidance for AI Agents

When generating new pages or components:

- Build pages using clear sections: header, summary cards, detail cards, actions, and footer/nav.
- Prefer card-based layouts for both draw details and admin controls.
- Use the same rounded corner and pastel accent approach from the sample mobile screen.
- Keep interactive controls large and touch-friendly on mobile.
- Always include accessible labels for buttons and form fields.

---

This guide should be the reference whenever new UI pages are created for the `trusted-draws` app.
