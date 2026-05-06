## 1. Harvey Logo Integration

- [x] 1.1 Copy Harvey logo assets from `/Users/neal/Downloads/媒体宣传/logo/harvey` to `public/logo/` directory
- [x] 1.2 Update `src/shared/blocks/common/brand-logo.tsx` to use Harvey logo path
- [x] 1.3 Replace favicon in `src/app/layout.tsx` with Harvey icon
- [x] 1.4 Update Open Graph metadata in `src/app/layout.tsx` to use Harvey logo
- [x] 1.5 Verify logo displays correctly in header on desktop and mobile
- [x] 1.6 Verify logo displays correctly in footer

## 2. Full-Width Layout Implementation

- [x] 2.1 Update `src/themes/default/layouts/landing.tsx` to remove `max-w-6xl` constraint
- [x] 2.2 Add responsive padding classes (`px-4 sm:px-8 lg:px-16`) to landing layout
- [x] 2.3 Update hero section in `src/themes/default/blocks/hero.tsx` to use full viewport width
- [x] 2.4 Add nested `max-w-4xl` containers for text-heavy content to maintain readability
- [x] 2.5 Test layout on mobile (320px-767px), tablet (768px-1023px), and desktop (1024px+) viewports
- [x] 2.6 Verify hero background spans full width while content remains centered

## 3. Cursor Typography Application

- [x] 3.1 Update hero heading in `src/themes/default/blocks/hero.tsx` to use `text-cursor-display` class
- [x] 3.2 Update section headings (h2) across all blocks to use `text-cursor-heading` class
- [x] 3.3 Update subheadings (h3) to use `text-cursor-heading-sm` class
- [x] 3.4 Verify body text uses Lato font with 0.06px letter spacing
- [x] 3.5 Test typography scale on different viewport sizes

## 4. Cursor Spacing Application

- [x] 4.1 Apply `gap-[var(--spacing-43)]` (43px) between major page sections
- [x] 4.2 Apply `gap-[var(--spacing-8)]` (8px) between related UI elements (buttons, form fields)
- [x] 4.3 Update card padding to use `p-[var(--spacing-12)]` (12px)
- [x] 4.4 Verify consistent spacing rhythm across all pages

## 5. Button Component Refinement

- [x] 5.1 Remove inline `className` overrides (like `px-4 text-sm`) from button instances in `src/themes/default/blocks/hero.tsx`
- [x] 5.2 Remove inline `className` overrides from button instances in `src/themes/default/blocks/cta.tsx`
- [x] 5.3 Remove inline `className` overrides from button instances in `src/themes/default/blocks/subscribe.tsx`
- [x] 5.4 Verify primary buttons use Inkwell background with 17.5px padding
- [x] 5.5 Verify outlined buttons use Onyx Outline border with 17.5px padding
- [x] 5.6 Test button hover states and focus states

## 6. Card Component Enhancement

- [x] 6.1 Update feature cards to use `variant="elevated"` for prominent shadow effect
- [x] 6.2 Verify elevated cards use Pebble Gray background with 10px border radius
- [x] 6.3 Verify elevated cards use `--shadow-cursor-xl` multi-layered shadow
- [x] 6.4 Update subtle content groupings to use `variant="flat"` with no shadow
- [x] 6.5 Test card appearance on different backgrounds

## 7. Input Component Verification

- [x] 7.1 Verify input fields use transparent background with Muted Stone border
- [x] 7.2 Verify input fields use 0px border radius (sharp corners)
- [x] 7.3 Verify input focus state changes border to Onyx Outline with 3px ring
- [x] 7.4 Test input fields in forms across the application

## 8. Visual Hierarchy Enhancement

- [x] 8.1 Ensure primary CTAs use `variant="default"` (Inkwell background)
- [x] 8.2 Ensure secondary CTAs use `variant="outline"` (Onyx Outline border)
- [x] 8.3 Verify color contrast meets WCAG AA standards for all text
- [x] 8.4 Test visual hierarchy by scanning pages without reading content

## 9. Cross-Browser and Responsive Testing

- [x] 9.1 Test on Chrome (desktop and mobile)
- [x] 9.2 Test on Firefox (desktop and mobile)
- [x] 9.3 Test on Safari (desktop and mobile)
- [x] 9.4 Test on viewport widths: 320px, 768px, 1024px, 1440px, 2560px
- [x] 9.5 Verify no horizontal scroll on any viewport size
- [x] 9.6 Verify touch targets are at least 44x44px on mobile

## 10. Final Verification

- [x] 10.1 Verify all pages use light theme by default (Canvas Parchment background)
- [x] 10.2 Verify dark mode toggle still works (if present in UI)
- [x] 10.3 Run TypeScript type check (`npx tsc --noEmit`)
- [x] 10.4 Run build command (`pnpm build`) to ensure no errors
- [x] 10.5 Visual QA: Compare landing page to Cursor reference design
- [x] 10.6 Verify Harvey logo appears in all expected locations
- [x] 10.7 Test keyboard navigation and accessibility
- [x] 10.8 Document any remaining visual improvements for future iterations
