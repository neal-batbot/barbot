## Why

The current frontend implementation of the Cursor design system is incomplete and lacks visual impact. The page still uses constrained layouts (max-w-6xl), outdated branding (Vector logo instead of Harvey), and doesn't fully leverage the Cursor design language's warm ivory aesthetic. Users expect a modern, full-width, visually distinctive interface that matches the Cursor reference design.

## What Changes

- **Full-width layout**: Remove max-width constraints to allow content to span the entire viewport width, matching Cursor's immersive design approach
- **Harvey branding**: Replace all Vector logo instances with Harvey logo assets from `/Users/neal/Downloads/媒体宣传/logo/harvey`
- **Enhanced visual hierarchy**: Apply Cursor's typography scale, spacing tokens, and shadow system more aggressively across all components
- **Component refinement**: Update Button, Card, Input, and layout components to use Cursor's exact specifications (border radius, padding, shadows)
- **Landing page redesign**: Restructure hero section, feature cards, and CTA sections to match Cursor's visual density and spacing
- **Color application**: Ensure all UI elements use Cursor color tokens (Canvas Parchment background, Inkwell text, Onyx Outline accents)

## Capabilities

### New Capabilities
- `full-width-layout`: Full viewport width layouts without max-width constraints, responsive padding system
- `harvey-branding`: Harvey logo integration across header, footer, favicon, and metadata
- `cursor-visual-system`: Complete application of Cursor design tokens (colors, typography, spacing, shadows) to all UI components

### Modified Capabilities
<!-- No existing capabilities are being modified at the spec level -->

## Impact

**Affected Files:**
- `src/themes/default/layouts/landing.tsx` - Remove max-width constraint
- `src/themes/default/blocks/header.tsx` - Replace logo, adjust spacing
- `src/themes/default/blocks/footer.tsx` - Replace logo
- `src/themes/default/blocks/hero.tsx` - Apply full-width layout, enhanced typography
- `src/shared/components/ui/button.tsx` - Already updated, may need refinement
- `src/shared/components/ui/card.tsx` - Already updated, may need refinement
- `src/config/style/theme.css` - Already updated with Cursor tokens
- `public/` - Add Harvey logo assets (favicon, og-image)

**User-Facing Impact:**
- Visually dramatic upgrade with full-width immersive layouts
- Consistent Harvey branding across all touchpoints
- Improved visual hierarchy and readability with Cursor typography
- More polished, professional appearance matching modern design standards

**Technical Impact:**
- No breaking API changes
- No database schema changes
- Purely visual/frontend updates
- Backward compatible with existing functionality
