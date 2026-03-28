/**
 * scripts/docs-lint.ts
 * Validates knowledge base structure, links, quality scores, and AGENTS.md size.
 * Run: npx tsx scripts/docs-lint.ts
 * Exit 0 = pass, Exit 1 = errors found
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

let errors = 0;
let warnings = 0;

function pass(msg: string) { console.log(`  [PASS] ${msg}`); }
function warn(msg: string) { console.warn(`  [WARN] ${msg}`); warnings++; }
function fail(msg: string) { console.error(`  [FAIL] ${msg}`); errors++; }

// --- Check 1: Required directories exist ---
console.log('\ndocs-lint: Checking structure...');
const requiredDirs = [
  'docs/design-docs', 'docs/exec-plans', 'docs/exec-plans/active',
  'docs/exec-plans/completed', 'docs/guides', 'docs/references',
  'docs/generated', 'docs/lessons-learned',
];
for (const dir of requiredDirs) {
  if (fs.existsSync(path.join(ROOT, dir))) {
    pass(`Directory exists: ${dir}`);
  } else {
    fail(`Missing directory: ${dir}`);
  }
}

// --- Check 2: AGENTS.md size ---
console.log('\ndocs-lint: Checking AGENTS.md size...');
const agentsPath = path.join(ROOT, 'AGENTS.md');
if (fs.existsSync(agentsPath)) {
  const lines = fs.readFileSync(agentsPath, 'utf-8').split('\n').length;
  if (lines <= 120) {
    pass(`AGENTS.md: ${lines} lines (limit: 120)`);
  } else {
    fail(`AGENTS.md: ${lines} lines — exceeds 120-line limit. Move detail to docs/`);
  }
} else {
  fail('AGENTS.md not found');
}

// --- Check 3: All INDEX.md files exist ---
console.log('\ndocs-lint: Checking INDEX.md files...');
const indexFiles = [
  'docs/INDEX.md', 'docs/design-docs/INDEX.md', 'docs/exec-plans/INDEX.md',
  'docs/guides/INDEX.md', 'docs/references/INDEX.md', 'docs/generated/INDEX.md',
  'docs/lessons-learned/INDEX.md',
];
for (const f of indexFiles) {
  if (fs.existsSync(path.join(ROOT, f))) {
    pass(`Index exists: ${f}`);
  } else {
    fail(`Missing index: ${f}`);
  }
}

// --- Check 4: Internal links ---
console.log('\ndocs-lint: Checking internal links...');
function checkLinksInFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const dir = path.dirname(filePath);
  // Match [text](relative/path.md) — skip http:// URLs and anchors-only
  const linkRegex = /\[([^\]]+)\]\(([^)#]+\.(?:md|txt))[^)]*\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(content)) !== null) {
    const linkPath = match[2];
    if (linkPath.startsWith('http')) continue;
    const resolved = path.resolve(dir, linkPath);
    if (!fs.existsSync(resolved)) {
      fail(`Broken link in ${path.relative(ROOT, filePath)}: ${linkPath}`);
    }
  }
}

function walkMd(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMd(full);
    } else if (entry.name.endsWith('.md')) {
      checkLinksInFile(full);
    }
  }
}

walkMd(DOCS);
// Also check root-level docs
for (const f of ['AGENTS.md', 'CLAUDE.md', 'ARCHITECTURE.md']) {
  const fp = path.join(ROOT, f);
  if (fs.existsSync(fp)) checkLinksInFile(fp);
}

// --- Check 5: Frontmatter on design-docs and lessons-learned ---
console.log('\ndocs-lint: Checking frontmatter...');
function checkFrontmatter(dir: string, requiredFields: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md') || file === 'INDEX.md') continue;
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.startsWith('---')) {
      fail(`Missing frontmatter in: docs/${path.relative(DOCS, filePath)}`);
      continue;
    }
    for (const field of requiredFields) {
      if (!content.includes(`${field}:`)) {
        fail(`Missing frontmatter field '${field}' in: ${path.relative(ROOT, filePath)}`);
      }
    }
  }
}

checkFrontmatter(path.join(DOCS, 'design-docs'), ['id', 'title', 'status', 'last-updated']);
checkFrontmatter(path.join(DOCS, 'lessons-learned'), ['id', 'title', 'date', 'severity']);

// --- Check 6: Generated schema freshness ---
console.log('\ndocs-lint: Checking generated schema freshness...');
const schemaSource = path.join(ROOT, 'src/config/db/schema.postgres.ts');
const schemaGenerated = path.join(ROOT, 'docs/generated/db-schema.md');
if (fs.existsSync(schemaSource) && fs.existsSync(schemaGenerated)) {
  const sourceMtime = fs.statSync(schemaSource).mtimeMs;
  const genMtime = fs.statSync(schemaGenerated).mtimeMs;
  if (genMtime < sourceMtime) {
    warn('docs/generated/db-schema.md is older than schema.postgres.ts — run pnpm docs:gen-schema');
  } else {
    pass('db-schema.md is up to date');
  }
} else if (!fs.existsSync(schemaGenerated)) {
  warn('docs/generated/db-schema.md does not exist — run pnpm docs:gen-schema');
}

// --- Quality Score Calculation ---
console.log('\ndocs-lint: Computing quality scores...');

function scoreSection(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  if (files.length === 0) return 100;
  let total = 0;
  for (const file of files) {
    if (file === 'INDEX.md') continue;
    const fp = path.join(dir, file);
    const content = fs.readFileSync(fp, 'utf-8');
    let score = 100;
    if (!content.includes('last-updated:') && !content.includes('Last updated:')) score -= 20;
    if (!content.includes('## See Also') && !content.includes('## Related') && content.length > 500) score -= 10;
    const lineCount = content.split('\n').length;
    if (lineCount > 500 && !content.includes('## ')) score -= 10;
    total += score;
  }
  const nonIndexFiles = files.filter(f => f !== 'INDEX.md');
  return nonIndexFiles.length > 0 ? Math.round(total / nonIndexFiles.length) : 100;
}

const sections = [
  { name: 'design-docs', dir: path.join(DOCS, 'design-docs') },
  { name: 'exec-plans', dir: path.join(DOCS, 'exec-plans') },
  { name: 'guides', dir: path.join(DOCS, 'guides') },
  { name: 'references', dir: path.join(DOCS, 'references') },
  { name: 'lessons-learned', dir: path.join(DOCS, 'lessons-learned') },
];

const scores: Record<string, number> = {};
for (const s of sections) {
  scores[s.name] = scoreSection(s.dir);
}
const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / sections.length);
scores['OVERALL'] = overall;

console.log('\nQuality Scores:');
for (const [name, score] of Object.entries(scores)) {
  const bar = score >= 80 ? '✓' : score >= 60 ? '△' : '✗';
  console.log(`  ${bar} ${name.padEnd(16)} ${score}/100`);
}

// Update scores in docs/INDEX.md
const indexPath = path.join(DOCS, 'INDEX.md');
if (fs.existsSync(indexPath)) {
  const now = new Date().toISOString().split('T')[0];
  let indexContent = fs.readFileSync(indexPath, 'utf-8');
  for (const [name, score] of Object.entries(scores)) {
    if (name === 'OVERALL') {
      indexContent = indexContent.replace(
        /(\*\*OVERALL\*\* \|[^|]+\|[^|]+\|) — /,
        `$1 ${score}/100 `
      );
    } else {
      indexContent = indexContent.replace(
        new RegExp(`(\\| ${name} \\|[^|]+\\|) — (\\|) —`),
        `$1 ${score}/100 $2 ${now}`
      );
    }
  }
  fs.writeFileSync(indexPath, indexContent);
}

// --- Summary ---
console.log(`\ndocs-lint: ${errors} error(s), ${warnings} warning(s).`);
if (errors > 0) {
  console.error('docs-lint: FAILED');
  process.exit(1);
} else {
  console.log('docs-lint: PASSED');
  process.exit(0);
}
