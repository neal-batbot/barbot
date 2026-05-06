## Context

The Cursor design system has been partially implemented with tokens in `theme.css` and component updates to Button, Card, and Input. However, the visual impact is minimal because:

1. **Layout constraints**: The landing layout uses `max-w-6xl` which creates a narrow column instead of Cursor's full-width immersive design
2. **Branding mismatch**: Vector logo is still used instead of Harvey branding
3. **Incomplete application**: Many components and sections don't fully leverage Cursor's visual language (shadows, spacing, typography scale)
4. **Terminal skin override**: The `.terminal-skin` class was forcing dark mode (now removed, but layout still needs work)

**Current State:**
- Cursor tokens defined in `theme.css` ✅
- Light theme default set ✅
- Button/Card/Input components updated ✅
- Layout still constrained ❌
- Branding outdated ❌
- Visual hierarchy weak ❌

**Constraints:**
- Must maintain existing functionality (no breaking changes)
- Must work with Next.js 16 + Tailwind v4
- Must preserve dark mode support (even if not optimized)
- Logo assets available at `/Users/neal/Downloads/媒体宣传/logo/harvey`

## Goals / Non-Goals

**Goals:**
- Create visually dramatic, full-width layouts that match Cursor's reference design
- Replace all Vector branding with Harvey logo across the application
- Apply Cursor design tokens consistently across all visible components
- Improve visual hierarchy with proper typography scale and spacing
- Maintain responsive design (mobile, tablet, desktop)

**Non-Goals:**
- Redesigning the information architecture or content structure
- Changing functionality or user flows
- Optimizing dark mode (preserve it, but focus on light theme)
- Custom font hosting (continue using fallback fonts)
- Backend or API changes

## Decisions

### Decision 1: Full-Width Layout Strategy

**Chosen Approach:** Remove `max-w-6xl` from landing layout, use viewport-width containers with responsive padding

**Rationale:**
- Cursor's design emphasizes immersive, edge-to-edge layouts
- Modern web design trend favors full-width over constrained columns
- Allows hero images and feature sections to have more visual impact
- Responsive padding (px-4 sm:px-8 lg:px-16) maintains readability on all devices

**Alternatives Considered:**
- Keep max-width but increase to 1300px (Cursor's page-max-width) → Still feels constrained
- Use full-width only for hero, constrained for content → Inconsistent visual rhythm

**Implementation:**
- Update `src/themes/default/layouts/landing.tsx`: Remove `max-w-6xl`, add responsive padding
- Update hero section to use full viewport width
- Ensure text content has readable line lengths via nested containers where needed

### Decision 2: Logo Replacement Strategy

**Chosen Approach:** Copy Harvey logo assets to `public/` and update all logo references

**Rationale:**
- Centralized logo management in public directory
- Next.js Image optimization for logo files
- Easy to update across all components via path change

**Assets to Copy:**
- `icon.svg` → `public/logo/harvey-icon.svg` (for header/footer)
- `icon-128.png` → `public/logo/harvey-icon-128.png` (for favicon)
- `icon.png` → `public/logo/harvey-icon.png` (for og:image)

**Files to Update:**
- `src/shared/blocks/common/brand-logo.tsx` - Update logo path
- `src/app/layout.tsx` - Update favicon link
- `public/favicon.ico` - Replace with Harvey icon

### Decision 3: Component Visual Enhancement

**Chosen Approach:** Apply Cursor shadows, spacing, and typography more aggressively

**Specific Changes:**
- **Cards**: Use `elevated` variant by default for feature cards (Pebble Gray bg + multi-layer shadow)
- **Buttons**: Remove inline className overrides (like `px-4 text-sm`) that conflict with Cursor padding
- **Typography**: Apply `.text-cursor-heading` classes to all h1/h2/h3 elements
- **Spacing**: Use `--spacing-43` (43px) for section gaps, `--spacing-8` (8px) for element gaps
- **Shadows**: Apply `--shadow-cursor-xl` to elevated cards, `--shadow-cursor-subtle` to inputs on focus

**Rationale:**
- Cursor's visual impact comes from precise spacing and multi-layered shadows
- Current implementation has tokens but doesn't use them boldly enough
- Typography scale creates clear hierarchy

### Decision 4: Hero Section Redesign

**Chosen Approach:** Full-width hero with centered content, larger typography, prominent CTAs

**Changes:**
- Remove `max-w-5xl` constraint on hero content
- Increase heading size to use `text-cursor-display` (72px) on desktop
- Apply `--spacing-43` vertical spacing between elements
- Use Button `variant="default"` (Inkwell bg) for primary CTA
- Use Button `variant="outline"` (Onyx Outline border) for secondary CTA
- Full-width background image with gradient overlay

**Rationale:**
- Hero is the first impression - needs maximum visual impact
- Cursor's design uses large, bold typography for hero sections
- Full-width creates immersive experience

## Risks / Trade-offs

### Risk 1: Full-width layout may reduce readability on ultra-wide screens
**Mitigation:** Use nested containers with max-width for text-heavy content (e.g., `max-w-4xl mx-auto` for paragraphs)

### Risk 2: Logo replacement may break if paths are hardcoded elsewhere
**Mitigation:** Search entire codebase for "Vector" and logo references before implementation

### Risk 3: Removing inline className overrides may break existing component styling
**Mitigation:** Test all button instances after removing overrides, add back only if necessary with Cursor-compatible values

### Risk 4: Aggressive shadows may impact performance on low-end devices
**Mitigation:** Cursor's shadows use CSS box-shadow which is GPU-accelerated; performance impact should be minimal

### Trade-off: Dark mode not optimized
**Accepted:** Focus on light theme (Cursor's primary aesthetic). Dark mode tokens preserved but not enhanced.

### Trade-off: No custom fonts
**Accepted:** Continue using fallback fonts (system-ui, Lato, Geist Mono) instead of CursorGothic/berkeleyMono. Custom font hosting can be added later.

## Migration Plan

**Deployment Steps:**
1. Copy Harvey logo assets to `public/logo/`
2. Update logo references in components
3. Update layout constraints (remove max-width)
4. Apply Cursor visual enhancements to components
5. Test on multiple screen sizes (mobile, tablet, desktop, ultra-wide)
6. Deploy to staging for visual QA
7. Deploy to production

**Rollback Strategy:**
- All changes are visual/frontend only
- No database migrations or API changes
- Rollback via git revert if visual issues discovered
- No data loss risk

**Testing:**
- Visual regression testing on key pages (landing, docs, dashboard)
- Cross-browser testing (Chrome, Firefox, Safari)
- Responsive testing (320px to 2560px viewport widths)
- Accessibility testing (color contrast, keyboard navigation)

## Open Questions

None - design is ready for implementation.
