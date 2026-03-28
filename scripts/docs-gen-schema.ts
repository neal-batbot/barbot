/**
 * scripts/docs-gen-schema.ts
 * Auto-generates docs/generated/db-schema.md from Drizzle schema.
 * Run: npx tsx scripts/docs-gen-schema.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_FILE = path.join(ROOT, 'src/config/db/schema.postgres.ts');
const OUTPUT_FILE = path.join(ROOT, 'docs/generated/db-schema.md');

// Parse pgTable declarations from TypeScript source
function parseTables(source: string): Array<{ name: string; columns: Array<{ name: string; type: string; required: boolean; notes: string }> }> {
  const tables: Array<{ name: string; columns: Array<{ name: string; type: string; required: boolean; notes: string }> }> = [];

  // Match: export const tableName = pgTable('table_name', { ... }
  const tableRegex = /export const (\w+) = pgTable\s*\(\s*['"](\w+)['"]\s*,\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(source)) !== null) {
    const varName = match[1];
    const tableName = match[2];
    const columnBlock = match[3];

    const columns: Array<{ name: string; type: string; required: boolean; notes: string }> = [];

    // Match column definitions: colName: type('col_name')...
    const colRegex = /(\w+):\s*(text|boolean|integer|timestamp|json|jsonb|serial|bigint|varchar|uuid)\s*\([^)]*\)([^,\n]*)/g;

    let colMatch: RegExpExecArray | null;
    while ((colMatch = colRegex.exec(columnBlock)) !== null) {
      const colName = colMatch[1];
      const colType = colMatch[2];
      const modifiers = colMatch[3];

      const required = modifiers.includes('.notNull()') || modifiers.includes('primaryKey()');
      const notes: string[] = [];
      if (modifiers.includes('primaryKey()')) notes.push('PK');
      if (modifiers.includes('.unique()')) notes.push('UNIQUE');
      if (modifiers.includes('.references(')) notes.push('FK');
      if (modifiers.includes('.defaultNow()')) notes.push('default: now()');

      columns.push({
        name: colName,
        type: colType,
        required,
        notes: notes.join(', '),
      });
    }

    if (columns.length > 0) {
      tables.push({ name: tableName, columns });
    }
  }

  return tables;
}

function generateMarkdown(tables: ReturnType<typeof parseTables>, schemaFile: string): string {
  const now = new Date().toISOString().split('T')[0];
  const relativeSchema = path.relative(ROOT, schemaFile);

  let md = `<!-- AUTO-GENERATED: Do not edit manually. Run: pnpm docs:gen-schema -->
# Database Schema Reference

Generated: ${now}
Source: \`${relativeSchema}\`

---

`;

  for (const table of tables) {
    md += `## ${table.name}\n\n`;
    md += `| Column | Type | Required | Notes |\n`;
    md += `|--------|------|----------|-------|\n`;
    for (const col of table.columns) {
      md += `| ${col.name} | ${col.type} | ${col.required ? 'YES' : 'no'} | ${col.notes} |\n`;
    }
    md += '\n';
  }

  md += `---\n\n## Table Summary\n\n`;
  md += `| Table | Columns |\n|-------|---------|\n`;
  for (const table of tables) {
    md += `| ${table.name} | ${table.columns.length} |\n`;
  }
  md += `\n_Total: ${tables.length} tables_\n`;

  return md;
}

// Main
const source = fs.readFileSync(SCHEMA_FILE, 'utf-8');
const tables = parseTables(source);

if (tables.length === 0) {
  console.error('docs-gen-schema: No tables found in schema file. Check regex patterns.');
  process.exit(1);
}

const markdown = generateMarkdown(tables, SCHEMA_FILE);
fs.writeFileSync(OUTPUT_FILE, markdown);

console.log(`docs-gen-schema: Generated ${OUTPUT_FILE} with ${tables.length} tables:`);
tables.forEach(t => console.log(`  - ${t.name} (${t.columns.length} columns)`));
