## ADDED Requirements

### Requirement: Landing layout uses full viewport width
The landing page layout SHALL span the full viewport width without max-width constraints, allowing content to utilize the entire screen on all device sizes.

#### Scenario: Desktop viewport displays full-width layout
- **WHEN** user views the landing page on a desktop viewport (≥1024px)
- **THEN** the layout spans the full viewport width with responsive padding (px-16)

#### Scenario: Mobile viewport displays full-width layout
- **WHEN** user views the landing page on a mobile viewport (<768px)
- **THEN** the layout spans the full viewport width with responsive padding (px-4)

### Requirement: Content maintains readability with nested containers
Text-heavy content SHALL use nested containers with max-width constraints to maintain optimal line length for readability.

#### Scenario: Paragraph text has readable line length
- **WHEN** user views text content (paragraphs, descriptions)
- **THEN** text is contained within a max-width container (max-w-4xl) centered on the page

### Requirement: Hero section spans full viewport width
The hero section SHALL use full viewport width with centered content and no max-width constraints on the container.

#### Scenario: Hero background spans full width
- **WHEN** user views the hero section
- **THEN** the hero background and imagery span the full viewport width

#### Scenario: Hero content is centered
- **WHEN** user views the hero section
- **THEN** the hero text and CTAs are centered horizontally within the full-width container

### Requirement: Responsive padding scales with viewport size
The layout SHALL use responsive padding that scales appropriately across mobile, tablet, and desktop viewports.

#### Scenario: Mobile padding is compact
- **WHEN** viewport width is <640px
- **THEN** horizontal padding is 16px (px-4)

#### Scenario: Desktop padding is generous
- **WHEN** viewport width is ≥1024px
- **THEN** horizontal padding is 64px (px-16)
