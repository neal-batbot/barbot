import type { ChatModel } from '@/shared/types/chat';

/**
 * 非 Dify 静态模型（与 Vector 助手并列展示）。
 * API 密钥写在此处；Claude 中转若未提供 Base URL，可改填本文件的 baseUrl，或在后台配置 anthropic_base_url。
 */
export const CLAUDE_PROXY = {
  /** Anthropic Messages API 兼容网关（通常以 /v1 结尾）；未填则回退数据库/环境变量 anthropic_base_url */
  baseUrl: '',
  apiKey: 'sk-6vMnJZxuhjkSWGiJPwZMq9QGmh0oa0SW7S0E0X4aDnt4CNWk',
} as const;

export const KIMI_CODING = {
  baseUrl: 'https://api.kimi.com/coding',
  apiKey:
    'sk-kimi-dxA0dvZr8bbXT6Eecd5V5fJBJ2SsFDa56pXtKGeRjF7xy1l1I2xINjEuU6Qdiguf',
} as const;

/** 智谱 GLM Coding 套餐：使用 Coding 端点，而非通用 paas/v4 */
export const ZHIPU_CODING = {
  baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
  apiKey:
    '3c5e83619ac84c8194bf2b86d89a3c98.B9cVGLK4nv9aHaAU',
} as const;

/** 静态三通道故障切换顺序（从用户当前选中的通道开始轮转） */
export const STATIC_PROVIDER_CHAIN = [
  'claude-proxy',
  'kimi',
  'zhipu',
] as const;

/** 切换到备用通道时使用的默认模型 id（与当前通道 API 兼容） */
export const DEFAULT_STATIC_MODEL_BY_PROVIDER: Record<string, string> = {
  'claude-proxy': 'claude-sonnet-4-6',
  kimi: 'kimi-k2.5',
  zhipu: 'glm-4-flash',
};

/** 构建 claude-proxy / kimi / zhipu 的尝试顺序：先试用户选中的模型，再依次换通道 */
export function buildStaticProviderFailoverChain(
  primaryProvider: string,
  primaryModel: string
): { provider: string; model: string }[] {
  const order = STATIC_PROVIDER_CHAIN as unknown as string[];
  const idx = order.indexOf(primaryProvider);
  if (idx < 0) {
    return [{ provider: primaryProvider, model: primaryModel }];
  }
  const rotated = [...order.slice(idx), ...order.slice(0, idx)];
  return rotated.map((p, i) => ({
    provider: p,
    model: i === 0 ? primaryModel : DEFAULT_STATIC_MODEL_BY_PROVIDER[p] ?? primaryModel,
  }));
}

/** 根据模型 id 推断 POST /api/chat 使用的 provider（客户端未传 provider 时） */
export function inferChatProvider(model: string): string {
  if (!model) return 'openrouter';
  if (model.startsWith('dify/')) return 'dify';
  if (model.startsWith('kimi-')) return 'kimi';
  if (model.startsWith('claude-')) return 'claude-proxy';
  if (model.startsWith('glm-')) return 'zhipu';
  return 'openrouter';
}

/** 替换原「通用套餐」模型：仅保留 Claude / Kimi / GLM（智谱 Coding） */
export const STATIC_CHAT_MODELS: ChatModel[] = [
  { title: 'Claude Sonnet 4.6', name: 'claude-sonnet-4-6', provider: 'claude-proxy' },
  {
    title: 'Claude Sonnet 4.5',
    name: 'claude-sonnet-4-5',
    provider: 'claude-proxy',
  },
  {
    title: 'Claude Sonnet 4.5 (20250929)',
    name: 'claude-sonnet-4-5-20250929',
    provider: 'claude-proxy',
  },
  { title: 'Claude Haiku 4.5', name: 'claude-haiku-4-5', provider: 'claude-proxy' },
  {
    title: 'Claude Haiku 4.5 (20251001)',
    name: 'claude-haiku-4-5-20251001',
    provider: 'claude-proxy',
  },
  { title: 'Claude Opus 4.5', name: 'claude-opus-4-5', provider: 'claude-proxy' },
  { title: 'Kimi K2.5 (Coding)', name: 'kimi-k2.5', provider: 'kimi' },
  { title: 'GLM-4.6', name: 'glm-4.6', provider: 'zhipu' },
  { title: 'GLM-4.5 Air', name: 'glm-4.5-air', provider: 'zhipu' },
  { title: 'GLM-4 Flash', name: 'glm-4-flash', provider: 'zhipu' },
];
