#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.development' });
loadEnv({ path: '.env', override: false });

const mode = process.argv[2] || 'dev:full';
const allowedModes = new Set(['dev', 'dev:server', 'dev:full']);
const piAgentDir =
  process.env.PI_AGENT_DIR || '../../pi-agent/packages/web-ui/example';
const packageMode =
  mode === 'dev:full' ? 'dev' : mode === 'dev:server' ? 'dev:bff' : mode;

if (!allowedModes.has(mode)) {
  console.error(`Unsupported native UI mode: ${mode}`);
  process.exit(1);
}

const env = {
  ...process.env,
  BARBOT_BASE_URL: process.env.BARBOT_BASE_URL || 'http://localhost:3000',
  NEXTOPENAI_API_KEY:
    process.env.NEXTOPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
  NEXTOPENAI_BASE_URL:
    process.env.NEXTOPENAI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://api.nextopenai.com/v1',
  NEXTOPENAI_MODELS:
    process.env.NEXTOPENAI_MODELS || process.env.OPENAI_MODEL || 'gpt-5.5',
  DIFY_BASE_URL:
    process.env.DIFY_BASE_URL ||
    process.env.DIFY_API_URL ||
    'http://156.224.28.114/v1',
  DIFY_API_KEY: process.env.DIFY_API_KEY || '',
  BARBOT_USAGE_TOKEN:
    process.env.BARBOT_USAGE_TOKEN ||
    process.env.BARBOT_API_KEY ||
    process.env.API_KEY ||
    '',
  BARBOT_USAGE_PRODUCT: process.env.BARBOT_USAGE_PRODUCT || 'pi-web-ui',
  BARBOT_USAGE_APP_ID: process.env.BARBOT_USAGE_APP_ID || 'pi-web-ui',
  BARBOT_USAGE_MODEL: process.env.BARBOT_USAGE_MODEL || 'mcuAgent_v2',
  BARBOT_USAGE_PROVIDER: process.env.BARBOT_USAGE_PROVIDER || 'dify',
};

const child = spawn(
  'pnpm',
  ['--dir', piAgentDir, packageMode],
  {
    stdio: 'inherit',
    env,
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
