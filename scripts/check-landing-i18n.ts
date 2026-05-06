import fs from 'node:fs';
import path from 'node:path';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function loadJson(filePath: string): JsonValue {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectPaths(value: JsonValue, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectPaths(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => {
      const next = prefix ? `${prefix}.${key}` : key;
      return [next, ...collectPaths(child, next)];
    });
  }
  return [];
}

function normalizeArrayPaths(paths: string[]): string[] {
  return paths.map((p) => p.replace(/\[\d+\]/g, '[*]')).sort();
}

function main() {
  const root = process.cwd();
  const enPath = path.join(root, 'src/config/locale/messages/en/landing.json');
  const zhPath = path.join(root, 'src/config/locale/messages/zh/landing.json');

  const en = loadJson(enPath);
  const zh = loadJson(zhPath);

  const enPaths = new Set(normalizeArrayPaths(collectPaths(en)));
  const zhPaths = new Set(normalizeArrayPaths(collectPaths(zh)));

  const missingInZh = [...enPaths].filter((p) => !zhPaths.has(p));
  const missingInEn = [...zhPaths].filter((p) => !enPaths.has(p));

  if (missingInZh.length === 0 && missingInEn.length === 0) {
    console.log('landing i18n structure check passed');
    return;
  }

  if (missingInZh.length > 0) {
    console.error('missing in zh:', missingInZh.slice(0, 100));
  }
  if (missingInEn.length > 0) {
    console.error('missing in en:', missingInEn.slice(0, 100));
  }
  process.exit(1);
}

main();
