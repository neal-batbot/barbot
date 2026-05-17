---
id: DD-005
title: Cursor Design System Integration
status: VALIDATED
created: 2026-05-06
last-updated: 2026-05-16
domain: frontend
---

# DD-005: Cursor Design System Integration

**Status:** Implemented  
**Date:** 2026-05-06  
**Author:** Claude (AI Assistant)

## Context

The BarBot frontend has been updated to use the Cursor design system, which provides a warm ivory software studio aesthetic. This design system emphasizes:

- Warm, off-white backgrounds with subtle shadows
- Precise typography with custom letter-spacing
- Functional, minimal component styling
- Technical sophistication through refined details

## Design System Overview

### Theme: Light (Warm Ivory Software Studio)

The Cursor design language evokes a functional, precise studio environment, blending the tactile feel of physical tools with clean, digital interfaces.

## Token Mapping Strategy

We use a **mapping layer** approach to preserve compatibility with existing shadcn-based components while adopting Cursor design tokens.

### Color Tokens

#### Cursor Design System Colors (Primary)

```css
--color-canvas-parchment: #f7f7f4 /* Warm off-white background */
  --color-inkwell: #262510 /* Primary text, strong contrast */
  --color-muted-stone: #7a7974 /* Secondary text, borders */
  --color-deep-shadow: #141414 /* Deepest text variant */
  --color-pebble-gray: #e6e5e0 /* Hover states, elevated surfaces */
  --color-onyx-outline: #f54e00 /* Primary action color (orange) */
  --color-chartreuse-alert: #4ade80 /* Success/positive indicators */
  --color-goldenrod-accent: #c08532 /* Accent for specific actions */
  --color-forest-green-action: #34785c /* Secondary action color */
  --color-highlight-beige: #cdcdc9 /* Subtle nested backgrounds */;
```

#### Shadcn Semantic Token Mapping

```css
--background → var(--color-canvas-parchment)
--foreground → var(--color-inkwell)
--muted → var(--color-pebble-gray)
--muted-foreground → var(--color-muted-stone)
--border → var(--color-muted-stone)
--primary → var(--color-onyx-outline)
--primary-foreground → var(--color-canvas-parchment)
```

This mapping ensures existing components continue to work while adopting Cursor's visual language.

### Typography

#### Font Stack

- **Primary UI (CursorGothic)**: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  - Used for: Headings, navigation, prominent UI text
  - Fallback: system-ui (custom font not hosted)
- **Body Text (Lato)**: Loaded via next/font/google
  - Weights: 400, 700
  - Used for: Body copy, buttons, labels
  - Letter-spacing: 0.06px
- **Monospace (berkeleyMono)**: `'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
  - Used for: Code snippets, technical content
  - Fallback: Geist Mono (already loaded)

#### Typography Scale

```css
--text-caption: 10px (line-height: 1.1, tracking: 0.06px) --text-body-lg: 14px
  (line-height: 1.43, tracking: 0.08px) --text-heading-sm: 22px
  (line-height: 1.25, tracking: -0.08px) --text-heading: 26px
  (line-height: 1.2, tracking: -0.35px) --text-heading-lg: 36px
  (line-height: 1.1, tracking: -0.45px) --text-display: 72px
  (line-height: 1, tracking: -2.16px);
```

**Utility Classes:**

- `.text-cursor-caption`
- `.text-cursor-body-lg`
- `.text-cursor-heading-sm`
- `.text-cursor-heading`
- `.text-cursor-heading-lg`
- `.text-cursor-display`

### Spacing Scale

Cursor uses a precise spacing scale for consistent rhythm:

```css
--spacing-4: 4px --spacing-5: 5px --spacing-6: 6px --spacing-8: 8px
  /* Element gap (default) */ --spacing-10: 10px --spacing-11: 11px
  --spacing-12: 12px /* Card padding */ --spacing-13: 13px --spacing-15: 15px
  --spacing-16: 16px --spacing-18: 18px --spacing-20: 20px --spacing-22: 22px
  --spacing-28: 28px --spacing-43: 43px /* Section gap */ --spacing-67: 67px;
```

**Key Spacing Rules:**

- Element gap: 8px (between related UI elements)
- Section gap: 43px (between major page sections)
- Card padding: 12px

### Shadows

Cursor uses multi-layered shadows for depth:

```css
--shadow-cursor-xl:
  rgba(0, 0, 0, 0.14) 0px 28px 70px 0px, rgba(0, 0, 0, 0.1) 0px 14px 32px 0px,
  oklab(0.263084 -0.00230259 0.0124794 / 0.1) 0px 0px 0px 1px
    --shadow-cursor-xl-2: rgba(0, 0, 0, 0.25) 0px 25px 50px -12px,
  rgba(0, 0, 0, 0.15) 0px 12px 24px -8px,
  oklab(0.263084 -0.00230259 0.0124794 / 0.1) 0px 0px 0px 0.5px
    --shadow-cursor-subtle: oklab(0.263084 -0.00230259 0.0124794 / 0.1) 0px 0px
    0px 1px,
  rgba(0, 0, 0, 0.28) 0px 18px 36px -18px;
```

**Usage:**

- `--shadow-cursor-xl`: Elevated content cards
- `--shadow-cursor-xl-2`: Prominent floating elements
- `--shadow-cursor-subtle`: Subtle separation

### Border Radius

```css
--radius-cursor-md: 4px /* General elements (buttons, cards) */
  --radius-cursor-prominent: 8px /* Visually distinct components */
  --radius-cursor-cards: 4px /* Standard cards */ --radius-cursor-buttons: 4px
  /* Buttons */;
```

**Special case:** Elevated Content Cards use 10px radius per Cursor spec.

## Component Patterns

### Button Variants

#### Primary Filled Button

```tsx
<Button variant="default">Primary Action</Button>
```

- Background: Inkwell (#262510)
- Text: Canvas Parchment (#f7f7f4)
- Padding: 17.5px all sides
- Border radius: 4px

#### Outlined Accent Button

```tsx
<Button variant="outline">Secondary Action</Button>
```

- Background: Transparent
- Border: 1px Onyx Outline (#f54e00)
- Text: Onyx Outline (#f54e00)
- Padding: 17.5px all sides
- Border radius: 4px

#### Ghost Action Button

```tsx
<Button variant="ghost" size="ghost">
  Tertiary Action
</Button>
```

- Background: Transparent
- Text: Inkwell (#262510)
- Padding: 6px horizontal, 2px vertical
- Border radius: 4px

### Card Variants

#### Elevated Content Card

```tsx
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

- Background: Pebble Gray (#e6e5e0)
- Border radius: 10px
- Shadow: `--shadow-cursor-xl` (multi-layered)
- Use for: Primary content containers, feature cards

#### Flat Background Card

```tsx
<Card variant="flat">
  <CardContent>Subtle content grouping</CardContent>
</Card>
```

- Background: Canvas Parchment (#f7f7f4)
- Border radius: 4px
- Shadow: None
- Padding: 0px vertical, 7.5px horizontal
- Use for: Subtle content grouping without strong visual separation

### Input Fields

```tsx
<Input placeholder="Enter text..." />
```

- Background: Transparent
- Border: 1px Muted Stone (#7a7974)
- Text: Inkwell (#262510)
- Border radius: 0px (sharp corners per Cursor spec)
- Padding: 8px horizontal, 6px vertical
- Focus: Border changes to Onyx Outline (#f54e00)

## Layout Guidelines

### Page Structure

- Max width: 1300px
- Section gap: 43px (use `--section-gap`)
- Element gap: 8px (use `--element-gap`)

### Content Density

Cursor uses a **compact** density:

- Tight spacing between related elements (8px)
- Generous spacing between sections (43px)
- Minimal padding on inputs and ghost buttons

## Dark Mode Compatibility

Dark mode tokens are preserved from the original shadcn theme to maintain compatibility. The Cursor design system is primarily light-themed, but dark mode continues to work with the original oklch color values.

## Migration Checklist

When updating components to use Cursor design:

- [ ] Replace color references with Cursor tokens (or use mapped shadcn tokens)
- [ ] Update border-radius to 4px (or 8px for prominent elements)
- [ ] Apply Cursor shadows (`--shadow-cursor-xl`, `--shadow-cursor-subtle`)
- [ ] Use Cursor spacing scale (`--spacing-8`, `--spacing-43`)
- [ ] Apply typography classes (`.text-cursor-heading`, etc.)
- [ ] Update button variants (default, outline, ghost)
- [ ] Update card variants (elevated, flat)
- [ ] Ensure input fields use transparent background with Muted Stone border

## Custom Font Integration (Future Enhancement)

Currently using fallback fonts:

- CursorGothic → system-ui
- berkeleyMono → Geist Mono

To integrate custom fonts:

1. **Obtain font files** (CursorGothic.woff2, berkeleyMono.woff2)
2. **Add to public/fonts/**
3. **Update theme.css** with @font-face declarations:
   ```css
   @font-face {
     font-family: 'CursorGothic';
     src: url('/fonts/CursorGothic.woff2') format('woff2');
     font-weight: 400;
     font-display: swap;
   }
   ```
4. **Update font variables** in theme.css:
   ```css
   --font-cursorgothic: 'CursorGothic', system-ui, sans-serif;
   ```

## Files Modified

1. `src/config/style/theme.css` - Added Cursor tokens, mapped to shadcn
2. `src/config/style/global.css` - Updated body styles, added typography utilities
3. `src/app/layout.tsx` - Added Lato font loading
4. `src/shared/components/ui/button.tsx` - Updated button variants
5. `src/shared/components/ui/card.tsx` - Added elevated/flat variants
6. `src/shared/components/ui/input.tsx` - Updated input styles

## References

- Original Cursor design spec: Provided by user
- Tailwind v4 documentation: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com/

## Notes

- The mapping layer approach ensures backward compatibility
- Existing components continue to work without modification
- New components should use Cursor variants explicitly
- Dark mode is preserved but not optimized for Cursor aesthetic
