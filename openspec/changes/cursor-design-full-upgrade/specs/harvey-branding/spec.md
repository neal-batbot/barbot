## ADDED Requirements

### Requirement: Harvey logo displayed in header
The application header SHALL display the Harvey logo instead of the Vector logo.

#### Scenario: Header shows Harvey logo on desktop
- **WHEN** user views the header on desktop viewport
- **THEN** the Harvey logo is displayed in the top-left corner

#### Scenario: Header shows Harvey logo on mobile
- **WHEN** user views the header on mobile viewport
- **THEN** the Harvey logo is displayed with appropriate sizing for mobile

### Requirement: Harvey logo displayed in footer
The application footer SHALL display the Harvey logo.

#### Scenario: Footer shows Harvey logo
- **WHEN** user scrolls to the footer
- **THEN** the Harvey logo is displayed in the footer

### Requirement: Harvey favicon in browser tab
The browser tab SHALL display the Harvey icon as the favicon.

#### Scenario: Browser tab shows Harvey favicon
- **WHEN** user opens the application in a browser
- **THEN** the browser tab displays the Harvey icon (128x128px)

### Requirement: Harvey logo in Open Graph metadata
The Open Graph metadata SHALL use the Harvey logo for social media previews.

#### Scenario: Social media preview shows Harvey logo
- **WHEN** the application URL is shared on social media
- **THEN** the preview card displays the Harvey logo

### Requirement: Logo assets stored in public directory
Harvey logo assets SHALL be stored in the `public/logo/` directory for centralized management.

#### Scenario: Logo files are accessible
- **WHEN** the application loads
- **THEN** logo files are served from `/logo/harvey-icon.svg`, `/logo/harvey-icon-128.png`, and `/logo/harvey-icon.png`

### Requirement: Logo is optimized with Next.js Image
The logo SHALL be rendered using Next.js Image component for optimization.

#### Scenario: Logo loads with optimization
- **WHEN** user views a page with the Harvey logo
- **THEN** the logo is rendered via Next.js Image with appropriate width, height, and loading attributes
