## ADDED Requirements

### Requirement: All UI components use Cursor color tokens
All visible UI components SHALL use Cursor design system color tokens instead of hardcoded colors or generic semantic tokens.

#### Scenario: Background uses Canvas Parchment
- **WHEN** user views any page in light mode
- **THEN** the background color is Canvas Parchment (#f7f7f4)

#### Scenario: Text uses Inkwell
- **WHEN** user views text content
- **THEN** the primary text color is Inkwell (#262510)

#### Scenario: Buttons use Onyx Outline accent
- **WHEN** user views primary action buttons
- **THEN** the button uses Onyx Outline (#f54e00) for background or border

### Requirement: Typography uses Cursor scale
All headings and text SHALL use Cursor typography scale with appropriate font sizes, line heights, and letter spacing.

#### Scenario: Hero heading uses display scale
- **WHEN** user views the hero section heading
- **THEN** the heading uses 72px font size with -2.16px letter spacing (text-cursor-display)

#### Scenario: Section headings use heading scale
- **WHEN** user views section headings (h2)
- **THEN** the heading uses 26px font size with -0.35px letter spacing (text-cursor-heading)

#### Scenario: Body text uses Lato font
- **WHEN** user views body text
- **THEN** the text uses Lato font with 0.06px letter spacing

### Requirement: Spacing uses Cursor tokens
All spacing between elements SHALL use Cursor spacing tokens for consistent rhythm.

#### Scenario: Section gaps use 43px spacing
- **WHEN** user views multiple sections on a page
- **THEN** the vertical gap between sections is 43px (--spacing-43)

#### Scenario: Element gaps use 8px spacing
- **WHEN** user views related UI elements (buttons, form fields)
- **THEN** the gap between elements is 8px (--spacing-8)

### Requirement: Cards use multi-layered shadows
Card components SHALL use Cursor's multi-layered shadow system for depth.

#### Scenario: Elevated cards have prominent shadows
- **WHEN** user views feature cards or content cards
- **THEN** the cards use --shadow-cursor-xl (multi-layered shadow with 28px blur)

#### Scenario: Flat cards have no shadows
- **WHEN** user views subtle content groupings
- **THEN** the cards use no shadow (flat variant)

### Requirement: Buttons use Cursor specifications
Button components SHALL use Cursor's exact padding, border radius, and color specifications.

#### Scenario: Primary buttons have Inkwell background
- **WHEN** user views primary action buttons
- **THEN** the button has Inkwell (#262510) background, Canvas Parchment text, 4px border radius, and 17.5px padding

#### Scenario: Outlined buttons have Onyx Outline border
- **WHEN** user views secondary action buttons
- **THEN** the button has transparent background, Onyx Outline (#f54e00) border and text, 4px border radius, and 17.5px padding

#### Scenario: Ghost buttons have minimal padding
- **WHEN** user views tertiary action buttons
- **THEN** the button has transparent background, 6px horizontal padding, 2px vertical padding, and 4px border radius

### Requirement: Inputs use Cursor field styling
Input fields SHALL use Cursor's transparent background with Muted Stone borders.

#### Scenario: Input has transparent background
- **WHEN** user views an input field
- **THEN** the input has transparent background, Muted Stone (#7a7974) border, 0px border radius, and 8px horizontal padding

#### Scenario: Input focus uses Onyx Outline
- **WHEN** user focuses an input field
- **THEN** the border changes to Onyx Outline (#f54e00) with a 3px ring

### Requirement: Border radius uses Cursor values
All UI elements SHALL use Cursor border radius values (4px standard, 8px prominent, 10px for elevated cards).

#### Scenario: Standard elements use 4px radius
- **WHEN** user views buttons, inputs, or standard cards
- **THEN** the border radius is 4px

#### Scenario: Elevated cards use 10px radius
- **WHEN** user views elevated content cards
- **THEN** the border radius is 10px

### Requirement: Visual hierarchy is clear and consistent
The visual hierarchy SHALL be clear through consistent application of typography scale, spacing, and color contrast.

#### Scenario: Headings stand out from body text
- **WHEN** user scans a page
- **THEN** headings are visually distinct with larger font sizes, tighter letter spacing, and appropriate color contrast

#### Scenario: Primary actions are prominent
- **WHEN** user views a page with multiple CTAs
- **THEN** primary actions use high-contrast colors (Inkwell background) while secondary actions use outlined style
