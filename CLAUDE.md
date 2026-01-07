# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShipAny Template Two is a Next.js 16 SaaS boilerplate for building AI-powered applications. It features a modular architecture with multi-provider AI integration (Dify, OpenRouter, Replicate), authentication via Better Auth, database management with Drizzle ORM, and full internationalization support.

**Tech Stack:**
- Next.js 16.0.7 with App Router and Turbopack
- React 19.2.1 with TypeScript 5
- Tailwind CSS v4 with Radix UI components
- Drizzle ORM with PostgreSQL
- Better Auth for authentication
- next-intl for i18n (English/Chinese)

**Package Manager:** pnpm 10.24.0

## Development Commands

```bash
# Development
pnpm dev              # Start dev server with Turbopack
pnpm build            # Production build
pnpm build:fast       # Build with increased memory (4GB)
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting

# Database Operations
pnpm db:generate      # Generate Drizzle schema from migrations
pnpm db:migrate       # Run database migrations
pnpm db:push          # Push schema changes to database
pnpm db:studio        # Open Drizzle Studio (database GUI)

# Authentication
pnpm auth:generate    # Generate Better Auth configuration

# RBAC (Role-Based Access Control)
pnpm rbac:init        # Initialize RBAC system
pnpm rbac:assign      # Assign roles to users

# Cloudflare Deployment
pnpm cf:preview       # Preview on Cloudflare
pnpm cf:deploy        # Deploy to Cloudflare
pnpm cf:upload        # Upload to Cloudflare
pnpm cf:typegen       # Generate Cloudflare types
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Set required environment variables:
   - `DATABASE_URL` - PostgreSQL connection string (format: `postgresql://user:password@host:port/db`)
   - `AUTH_SECRET` - Generate with: `openssl rand -base64 32` (or use [Better Auth docs](https://www.better-auth.com/docs/installation))
3. Run `pnpm install` to install dependencies
4. Run `pnpm db:generate && pnpm db:migrate` to set up database
5. Run `pnpm dev` to start development server

## Specialized Agents

This project uses 4 specialized Claude Code agents to handle different aspects of development, ensuring consistent code quality and preventing repeated mistakes.

### Available Agents

#### 1. **dify-integration** 🔴
**Purpose**: Expert for Dify API integration, conversation ID management, SSE streaming, and multi-bot configuration.

**When to Use**:
- Debugging Dify API errors (404, streaming issues, connection problems)
- Implementing new Dify-powered features
- Managing conversation ID lifecycle
- Configuring multi-bot API keys
- Running diagnostic scripts
- Validating Dify configuration

**Key Capabilities**:
- Contains all 5 critical Dify rules from CLAUDE.md
- Lists all 4 diagnostic scripts with usage
- Covers 5 error patterns with solutions
- Includes complete code examples (correct/incorrect)
- Debug → Fix → Verify → Document workflow

**Examples**:
```
"TI ChatBot returns 404 error"
"Add new Dify bot with rating support"
"Conversation ID not persisting"
"SSE streaming is slow/janky"
```

**File**: `.claude/agents/dify-integration.md`

---

#### 2. **fullstack-developer** 🔵
**Purpose**: Full-stack developer for Next.js features, covering database schema, API routes, React components, and internationalization.

**When to Use**:
- Adding new features end-to-end (database → API → UI)
- Creating database models and migrations
- Implementing API routes
- Building React components
- Adding i18n translations
- Optimizing performance
- Refactoring code

**Key Capabilities**:
- Complete development workflow (schema → migration → API → UI → i18n)
- Drizzle ORM patterns and examples
- Next.js API route conventions
- React component best practices
- Performance optimization patterns
- i18n integration guide
- Development checklist

**Examples**:
```
"Add user preferences feature with database, API, and UI"
"Create admin dashboard with RBAC"
"Add new AI-powered feature with Replicate"
"Optimize component performance"
```

**File**: `.claude/agents/fullstack-developer.md`

---

#### 3. **documentation-guardian** 🟢
**Purpose**: Guardian of project documentation and code quality. Ensures development follows CLAUDE.md rules, reviews code for compliance, and updates documentation with new patterns and lessons learned.

**When to Use**:
- Starting a new task (to identify relevant rules)
- After code is written (to review compliance)
- When discovering new patterns or issues
- To maintain CLAUDE.md knowledge base
- To prevent repeated mistakes

**Key Capabilities**:
- Pre-development task analysis (identifies applicable rules)
- Post-development code review (checks compliance)
- CLAUDE.md maintenance (when/how to update)
- 4 documentation templates (rules, lessons, patterns, pitfalls)
- Documentation quality standards

**Examples**:
```
"Review this code for compliance with project standards"
"Document the error we just fixed"
"What rules apply to this Dify integration task?"
"Update CLAUDE.md with this new pattern we discovered"
```

**File**: `.claude/agents/documentation-guardian.md`

---

#### 4. **quality-assurance** 🟣
**Purpose**: Quality assurance specialist for testing and validation. Runs automated tests, manual browser testing, performance audits, and iterates until all quality standards are met.

**When to Use**:
- Code needs testing before deployment
- Features need validation
- Performance issues suspected
- Security review needed
- Browser compatibility testing required
- Iterative testing until quality met

**Key Capabilities**:
- 4-phase testing flow (automated → browser → performance → security)
- Iteration loop (test → fix → retest → pass)
- Comprehensive QA checklists
- Test report template
- Quality standards (must-pass criteria)
- Lighthouse audit (target > 90)

**Examples**:
```
"Test this new feature thoroughly"
"Verify the Dify integration works end-to-end"
"Run performance audit on the chat component"
"Check for security vulnerabilities in this API route"
```

**File**: `.claude/agents/quality-assurance.md`

---

### Agent Workflow

For complex tasks, agents work together in a coordinated workflow:

```
User Task
   ↓
[documentation-guardian] - Analyze task, identify rules
   ↓
[fullstack-developer or dify-integration] - Execute development
   ↓
[documentation-guardian] - Review code, update documentation
   ↓
[quality-assurance] - Test, validate, iterate
   ↓
✅ Complete (tested, documented, quality-assured)
```

**Example: Adding a New Feature**
```
1. User: "Add user preferences feature"

2. [documentation-guardian]
   - Analyzes requirements
   - Lists relevant rules from CLAUDE.md
   - Identifies patterns to follow

3. [fullstack-developer]
   - Creates Drizzle schema
   - Generates migrations
   - Implements API routes
   - Builds React components
   - Adds i18n translations

4. [documentation-guardian]
   - Reviews code compliance
   - Updates CLAUDE.md with new patterns

5. [quality-assurance]
   - Runs automated tests
   - Tests in browser
   - Runs Lighthouse audit
   - Checks security
   - Iterates until all pass

Result: ✅ Complete, tested, documented feature
```

---

### Quick Reference

| Task Type | Use Agent | Color |
|-----------|-----------|-------|
| Dify API errors, 404, SSE issues | `dify-integration` | 🔴 Red |
| Add new features (DB+API+UI) | `fullstack-developer` | 🔵 Blue |
| Review code, update docs | `documentation-guardian` | 🟢 Green |
| Test features, performance audit | `quality-assurance` | 🟣 Purple |
| Understand codebase structure | `project-navigator` | (existing) |
| General code review | `code-reviewr` | (existing) |

---

### Agent Files Location

All agent configurations are stored in:
```
.claude/agents/
├── code-reviewr.md (existing)
├── project-navigator.md (existing)
├── dify-integration.md (18KB)
├── fullstack-developer.md (19KB)
├── documentation-guardian.md (15KB)
└── quality-assurance.md (16KB)
```

---

### Benefits

1. **Reduced Errors**: Specialized knowledge prevents common mistakes
2. **Faster Development**: Agents know patterns and work autonomously
3. **Consistent Code**: All agents follow project conventions
4. **Better Context**: Each agent has deep knowledge of its domain
5. **Improved Diagnostics**: Agents know which scripts to run
6. **Knowledge Accumulation**: documentation-guardian maintains CLAUDE.md
7. **Quality Assurance**: QA agent ensures high standards

---

## Architecture

### Directory Structure

```
src/
├── app/[locale]/           # Internationalized routes
│   ├── (landing)/          # Landing page and feature routes
│   │   ├── (ai)/          # AI-powered features
│   │   │   ├── ai-image-generator/
│   │   │   ├── ai-music-generator/
│   │   │   └── ai-video-generator/
│   │   ├── settings/       # User settings pages
│   │   └── api/           # API routes
│   │       └── dify/      # Dify AI integration
├── core/                   # Core business logic
│   ├── auth/              # Better Auth configuration
│   ├── db/                # Database singleton connection
│   ├── i18n/              # Locale detection
│   └── theme/             # Theme configuration
├── config/                # Configuration files
│   ├── locale/            # Translation files (en/zh)
│   │   └── messages/      # Feature-specific translations
│   └── style/             # CSS variables & theme system
├── shared/                # Shared modules
│   ├── blocks/            # Reusable UI blocks
│   │   ├── chat/         # Chat-related components
│   │   └── common/       # Common UI blocks
│   ├── components/        # Generic React components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── models/            # Database schemas & models
│   ├── services/          # External service integrations
│   └── types/             # TypeScript type definitions
└── themes/                # Theme-specific components
```

### Key Architectural Patterns

**1. Modular Feature Organization**
- Features are organized under `src/app/[locale]/(landing)/` as route groups
- Each major feature (AI generators, settings, etc.) has its own directory
- Shared UI blocks live in `src/shared/blocks/` for reusability

**2. Configuration-Driven Design**
- Dynamic configuration loaded from database via `src/config/app.config.ts`
- Environment variables for sensitive data
- Feature flags supported through config system

**3. Multi-Provider AI Integration**
- Primary provider: Dify (custom SSE streaming implementation at `src/app/api/dify/chat/route.ts`)
- Alternative providers: OpenRouter, Replicate (via AI SDK)
- Provider selection handled at UI level with switching capability
- See `TUTORIAL_DIFY_INTEGRATION.md` for detailed Dify implementation

**4. Database Layer**
- **ORM**: Drizzle with type-safe queries
- **Connection**: Singleton pattern in `src/core/db/index.ts`
- **Supports**: Traditional servers and Cloudflare Workers
- **Migrations**: File-based with `pnpm db:generate && pnpm db:migrate`

**5. Internationalization (i18n)**
- **Library**: next-intl
- **Locales**: English (en) and Chinese (zh)
- **Structure**: `src/config/locale/messages/{locale}/{feature}.json`
- **Usage**: All user-facing text must be translated; use `t()` hook in components

**6. Authentication Flow**
- **Provider**: Better Auth
- **Configuration**: `src/core/auth/index.ts`
- **Dynamic**: Auth config loaded from database
- **RBAC**: Role-based access control supported via `pnpm rbac:*` commands

### Data Flow for Dify Chat

```
User Input (DifyFollowUp component)
    ↓
POST /api/dify/chat (API route)
    ↓
Dify API (with streaming)
    ↓
SSE Stream parsed by useDifyChat hook
    ↓
React state updates (batched with requestAnimationFrame)
    ↓
UI updates (DifyMessages component)
```

**Key Implementation Files:**
- Hook: `src/shared/hooks/chat/use-dify-chat.ts` (or similar location)
- API: `src/app/[locale]/(landing)/api/dify/chat/route.ts`
- Components: `src/shared/blocks/chat/`

## Code Style & Conventions

**Import Order** (enforced by `.prettierrc.json`):
1. React/Next.js imports
2. Third-party libraries
3. Internal imports (grouped by relative path)
4. Type imports
5. CSS imports

**Component Patterns:**
- Use functional components with hooks
- Wrap performance-sensitive components in `React.memo`
- Use `useCallback` for event handlers passed to children
- Use `useRef` for values that shouldn't trigger re-renders (e.g., streaming buffers)

**State Management:**
- React Context for global state
- Custom hooks for feature-specific logic
- Server state via React Query/SWR (if needed)

**TypeScript:**
- Strict mode enabled
- Path alias: `@/*` → `./src/*`
- Always define interfaces for component props and API responses

## Important Implementation Details

### Dify Chat Streaming Optimization

The Dify chat implementation bypasses the AI SDK for better performance:
- **Direct SSE handling**: Native ReadableStream API
- **Batched UI updates**: Uses `requestAnimationFrame` to prevent excessive re-renders
- **Workflow progress tracking**: Displays real-time workflow node execution
- **Error handling**: Graceful fallbacks for AbortError and network issues

**Critical performance pattern:**
```typescript
// Use ref to avoid re-renders during streaming
const contentBufferRef = useRef<string>('');

// Schedule updates to batch UI changes
const scheduleUpdate = useCallback(() => {
  if (rafIdRef.current === null) {
    rafIdRef.current = requestAnimationFrame(() => {
      setMessages(prev => [...prev, { content: contentBufferRef.current }]);
      rafIdRef.current = null;
    });
  }
}, []);
```

### Database Schema Management

- Schemas defined in `src/shared/models/`
- Always run `pnpm db:generate` after schema changes
- Use `pnpm db:push` for development (direct schema update)
- Use `pnpm db:migrate` for production (migration-based)

### Adding New Features

1. **Create route**: Add feature directory under `src/app/[locale]/(landing)/`
2. **Add translations**: Create JSON files in `src/config/locale/messages/en/` and `zh/`
3. **Create components**: Build UI in `src/shared/blocks/` or `src/shared/components/`
4. **Database changes**: Modify models in `src/shared/models/`, then run migrations
5. **API routes**: Add under `src/app/[locale]/(landing)/api/` if needed

## Deployment

**Vercel (Recommended):**
- Connect GitHub repo to Vercel
- Set environment variables in Vercel dashboard
- Deploy automatically on push to main branch

**Cloudflare Workers:**
- Use `pnpm cf:deploy` to deploy
- Requires Cloudflare credentials in environment
- See `pnpm cf:*` commands for full workflow

## Troubleshooting

**Build issues:**
- Use `pnpm build:fast` for memory-intensive builds
- Check TypeScript errors: `pnpm lint`

**Database issues:**
- Verify `DATABASE_URL` is correct
- Run `pnpm db:studio` to inspect database
- Recreate with `pnpm db:push` if migrations fail

**Auth issues:**
- Regenerate `AUTH_SECRET` if needed
- Run `pnpm auth:generate` after auth config changes

**Dify streaming issues:**
- Check browser Network tab for SSE events
- Verify Dify API credentials in database config
- See `TUTORIAL_DIFY_INTEGRATION.md` for debugging tips

## Dify Integration Rules & Conventions

### ⚠️ Critical Rules (MUST FOLLOW)

**1. conversation_id Management**
- **NEVER send empty string as conversation_id** to Dify API - this causes 404 errors
- Only include `conversation_id` in request body if it exists and is not empty:
  ```typescript
  const requestBody: Record<string, any> = {
    inputs, query, response_mode: 'streaming', user: user.id, files: [],
  };
  if (conversationId && conversationId.trim()) {
    requestBody.conversation_id = conversationId;
  }
  ```
- **ALWAYS handle 404 "Conversation Not Exists" errors**:
  - Clear invalid conversation_id from database automatically
  - Return user-friendly error message
  - Allow user to retry and create new conversation

**2. Multi-Bot Support**
- Bot-specific API keys are stored in database `config.dify_bots` field (JSON array)
- **ALWAYS determine bot API key from `chat.model` field**:
  ```typescript
  if (chat.model && chat.model.startsWith('dify/')) {
    const botId = chat.model.replace('dify/', '');
    const bots = JSON.parse(configs.dify_bots);
    const bot = bots.find((b: any) => b.id === botId);
    if (bot?.api_key) {
      difyApiKey = bot.api_key;
    }
  }
  ```
- Format: `chat.model = "dify/{botId}"` (e.g., `dify/ti-chatbot`, `dify/novosns`)
- Fallback to global `dify_api_key` if bot not found

**3. API Configuration**
- **dify_api_url is REQUIRED** - must be in database or environment variable
- Always provide fallback to environment variable:
  ```typescript
  const difyApiUrl = configs.dify_api_url || process.env.DIFY_API_URL;
  ```
- Verify configuration with scripts before deployment:
  - `scripts/verify-dify-config.ts` - Test API connections
  - `scripts/verify-dify-bots.ts` - Check bot configuration
  - `scripts/add-dify-url.ts` - Add missing dify_api_url to database

### Debugging Standards

**When to Add Debug Logging:**

**ALWAYS add debug logs for:**
1. API entry points (route handlers)
2. Critical decision points (bot selection, conversation_id logic)
3. External API calls (request/response details)
4. Error conditions (404, 500, etc.)

**Debug log format:**
```typescript
console.log('[DEBUG POST /api/dify/chat] Chat ID:', chatId);
console.log('[DEBUG POST /api/dify/chat] Chat Model:', chat.model);
console.log('[DEBUG POST /api/dify/chat] Conversation ID:', conversationId || '(empty)');
console.log('[DEBUG POST /api/dify/chat] Using bot:', botConfig?.title || 'default');
console.log('[DEBUG POST /api/dify/chat] API Key:', difyApiKey.substring(0, 15) + '...');
```

**Using Sub-Agents for Problem Diagnosis:**

When facing complex issues:
1. Use Explore agents to investigate codebase
2. Check server logs at `/tmp/claude/tasks/{task_id}.output`
3. Analyze error patterns from multiple sources
4. Create reproduction scenarios

### Error Handling Patterns

**404 Conversation Not Found (Dify API):**
```typescript
if (difyResponse.status === 404 && conversationId) {
  // Clear invalid conversation_id
  await updateChat(chatId, {
    metadata: JSON.stringify({
      ...chatMetadata,
      dify_conversation_id: undefined,
    }),
  });
  // Return user-friendly error
  return new Response(
    JSON.stringify({
      error: 'conversation_not_found',
      message: 'Conversation expired. New conversation will be created on retry.',
    }),
    { status: 404 }
  );
}
```

**Rating Parameter Handling:**
- Only send `rating` in `inputs` if bot has `has_rating: true`
- Check bot config before including rating:
  ```typescript
  const inputs: Record<string, any> = {};
  if (rating) {
    inputs.rating = rating;
  } else if (botConfig?.has_rating && botConfig?.ratings?.length > 0) {
    inputs.rating = botConfig.default_rating || botConfig.ratings[0];
  }
  // If bot doesn't have rating feature, don't send it at all
  ```

### Configuration Management

**Dify Bots Configuration Format:**
```json
[
  {
    "id": "ti-chatbot",
    "title": "TI ChatBot Assistant",
    "api_key": "app-xxx",
    "has_rating": true,
    "ratings": ["Catalog工业", "Automotive汽车"],
    "default_rating": "Catalog工业"
  },
  {
    "id": "novosns",
    "title": "Novosns Assistant",
    "api_key": "app-xxx",
    "has_rating": false
  }
]
```

**Configuration Priority:**
1. Database config table (highest priority)
2. Environment variables (fallback)
3. Default values (last resort)

**Validation Scripts:**
- **Before deployment**: Run `scripts/verify-dify-config.ts`
- **After bot changes**: Run `scripts/verify-dify-bots.ts`
- **When adding bots**: Use scripts to insert/update database
- **Clearing issues**: Run `scripts/clear-all-conversation-ids.ts`

### Common Pitfalls (DO NOT DO)

❌ **DON'T**: Send empty string as conversation_id
✅ **DO**: Conditionally include conversation_id only if it exists

❌ **DON'T**: Use global dify_api_key for all bots
✅ **DO**: Select bot-specific API key based on chat.model

❌ **DON'T**: Ignore 404 errors from Dify API
✅ **DO**: Clear invalid conversation_id and allow retry

❌ **DON'T**: Hardcode API URLs or keys
✅ **DO**: Use configuration from database with environment variable fallback

❌ **DON'T**: Assume conversation_id is always valid
✅ **DO**: Handle expired/invalid conversation_id gracefully

### Testing Dify Integration

**Manual Testing Checklist:**
1. ✅ New chat creates without conversation_id
2. ✅ First message successfully creates conversation
3. ✅ Conversation ID is saved to database
4. ✅ Subsequent messages use saved conversation_id
5. ✅ Expired conversation_id triggers automatic clear
6. ✅ Multiple bots can be used independently
7. ✅ Rating parameter only sent when bot requires it

**Automated Testing:**
- Use `scripts/verify-dify-config.ts` for connection testing
- Test with both `has_rating: true` and `has_rating: false` bots
- Verify 404 error handling by using invalid conversation_id

## Additional Resources

- **Official Docs**: https://www.shipany.ai/zh/docs
- **Architecture Summary**: https://github.com/boomer1678/shipany-template/issues/1
- **Dify Integration Tutorial**: See `TUTORIAL_DIFY_INTEGRATION.md` in this repo
- **Update Log**: https://github.com/boomer1678/shipany-template/issues/3

## Problem Diagnosis & Resolution

### General Debugging Workflow

When encountering bugs or errors:

**Step 1: Gather Information**
1. Check server logs (background bash tasks at `/tmp/claude/tasks/{id}.output`)
2. Check browser console and Network tab
3. Read relevant code files to understand flow
4. Check database state if applicable

**Step 2: Use Explore Agents**
- Launch Explore agents to investigate codebase
- Focus on specific areas (API routes, components, data flow)
- Trace the entire request/response cycle
- Identify all potential failure points

**Step 3: Create Reproduction**
- Document exact steps to reproduce
- Identify error triggers (specific inputs, timing, state)
- Test in isolation if possible

**Step 4: Form Hypothesis**
- Based on evidence, form hypothesis
- Check related code for similar patterns
- Verify assumptions with targeted tests

**Step 5: Implement Fix**
- Create focused fix for root cause
- Add defensive logging
- Test thoroughly
- Update documentation

### Diagnostic Scripts Available

**Dify Configuration Scripts:**
- `scripts/verify-dify-config.ts` - Test Dify API connections for all bots
- `scripts/verify-dify-bots.ts` - Check bot configuration in database
- `scripts/add-dify-url.ts` - Add missing dify_api_url to database
- `scripts/clear-all-conversation-ids.ts` - Clear expired conversation IDs
- `scripts/update-dify-bots.ts` - Update bot configuration

**Usage:**
```bash
# Verify configuration
npx tsx scripts/verify-dify-config.ts

# Check bot config
npx tsx scripts/verify-dify-bots.ts

# Clear all conversation IDs
npx tsx scripts/clear-all-conversation-ids.ts
```

### Common Error Patterns

**Pattern 1: API Returns 404**
- **Symptoms**: Request succeeds but returns "not found" error
- **Diagnosis**: Check if ID/reference has expired or is incorrect
- **Solution**: Clear invalid reference and retry, add 404 handling
- **Prevention**: Always validate references before use, add fallback logic

**Pattern 2: Configuration Missing**
- **Symptoms**: Features fail silently or with generic errors
- **Diagnosis**: Check database config table and environment variables
- **Solution**: Add missing config with proper fallback chain
- **Prevention**: Create validation scripts, document required configs

**Pattern 3: Wrong API Key/Endpoint**
- **Symptoms**: Authentication errors or wrong responses
- **Diagnosis**: Add debug logging to show actual API calls
- **Solution**: Match API key to correct bot/service
- **Prevention**: Use configuration-driven API key selection

**Pattern 4: State Inconsistency**
- **Symptoms**: Behavior differs between dev/prod or different users
- **Diagnosis**: Check database state vs expected state
- **Solution**: Clear invalid state, add validation
- **Prevention**: Add state validation on critical operations

### Documentation Maintenance

**When to Update CLAUDE.md:**
1. After fixing any significant bug - add to "Common Pitfalls"
2. When discovering new patterns - add to "Implementation Details"
3. When adding new scripts - document in "Diagnostic Scripts"
4. When establishing new conventions - add to "Rules & Conventions"

**Format for New Rules:**
```markdown
### Rule Name
**Problem**: What went wrong
**Solution**: How to fix/prevent
**Example**: Code example showing correct pattern
❌ **DON'T**: What not to do
✅ **DO**: What to do instead
```

## Claude Code Learning Record

This section tracks lessons learned from mistakes to prevent recurrence.

### Lesson 1: Empty conversation_id Causes 404
- **Date**: 2026-01-07
- **Issue**: Dify API returned 404 when sending empty conversation_id
- **Root Cause**: Code always sent `conversation_id: ''` even for new chats
- **Fix**: Only include conversation_id if it exists and is not empty
- **Rule Added**: "conversation_id Management" in Dify Integration Rules

### Lesson 2: Missing API Configuration Fallback
- **Date**: 2026-01-07
- **Issue**: dify_api_url was empty in database causing API failures
- **Root Cause**: Code only checked database, no environment variable fallback
- **Fix**: Added `|| process.env.DIFY_API_URL` fallback
- **Rule Added**: "API Configuration" in Dify Integration Rules

### Lesson 3: No 404 Error Recovery
- **Date**: 2026-01-07
- **Issue**: Expired conversation_id caused permanent 404 errors
- **Root Cause**: No automatic recovery mechanism for invalid conversation_ids
- **Fix**: Added 404 error handling to clear invalid IDs
- **Rule Added**: "Error Handling Patterns" in Dify Integration Rules

### Lesson 4: Using Global API Key for All Bots
- **Date**: 2026-01-07
- **Issue**: All bots used same API key instead of bot-specific keys
- **Root Cause**: Didn't select API key based on chat.model
- **Fix**: Added bot lookup logic to use correct API key
- **Rule Added**: "Multi-Bot Support" in Dify Integration Rules

### Lesson 5: Insufficient Debug Logging
- **Date**: 2026-01-07
- **Issue**: Difficult to diagnose issues without detailed logs
- **Root Cause**: Missing debug logs at critical decision points
- **Fix**: Added comprehensive debug logging format
- **Rule Added**: "Debugging Standards" in Dify Integration Rules

### Template for Future Lessons

```markdown
### Lesson N: [Title]
- **Date**: YYYY-MM-DD
- **Issue**: [What went wrong]
- **Root Cause**: [Why it happened]
- **Fix**: [How it was resolved]
- **Rule Added**: [Where in CLAUDE.md this is now documented]
```
