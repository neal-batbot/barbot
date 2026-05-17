import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  createIdGenerator,
  generateId,
  streamText,
  UIMessage,
} from 'ai';

import { PERMISSIONS } from '@/core/rbac';
import {
  buildStaticProviderFailoverChain,
  CLAUDE_PROXY,
  inferChatProvider,
  KIMI_CODING,
  ZHIPU_CODING,
} from '@/config/chat-providers';
import {
  captureExceptionToSentry,
  recordApiMetric,
} from '@/shared/lib/monitoring';
import {
  getRateLimitStore,
  withRateLimitFailureMode,
} from '@/shared/lib/rate-limit-store';
import {
  BillingEventSource,
  BillingEventStatus,
  upsertBillingEvent,
} from '@/shared/models/billing-event';
import { findChatById } from '@/shared/models/chat';
// Allow longer response time for AI
import {
  ChatMessageStatus,
  createChatMessage,
  getChatMessages,
  NewChatMessage,
} from '@/shared/models/chat_message';
import { getAllConfigs } from '@/shared/models/config';
import {
  createUsageLogIdempotent,
  getUserUsageSince,
} from '@/shared/models/usage-log';
import { getUserInfo } from '@/shared/models/user';
import {
  calculateUsageCost,
  withPricingMetadata,
} from '@/shared/services/model-pricing';
import {
  isModelSupplyDecision,
  markProviderChannelFailure,
  markProviderChannelSuccess,
  ProviderAttempt,
  ProviderUnavailableError,
  resolveChatModelSupply,
  type BillingPolicy,
} from '@/shared/services/model-supply';
import { hasPermission } from '@/shared/services/rbac';

// Force dynamic to ensure streaming works properly
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

function getRateLimitConfig(configs: any) {
  const ipWindowMs = Number(
    process.env.RATE_LIMIT_IP_WINDOW_MS ||
      configs.rate_limit_ip_window_ms ||
      60_000
  );
  const ipMax = Number(
    process.env.RATE_LIMIT_IP_MAX || configs.rate_limit_ip_max || 60
  );
  const userWindowMs = Number(
    process.env.RATE_LIMIT_USER_WINDOW_MS ||
      configs.rate_limit_user_window_ms ||
      60_000
  );
  const userMax = Number(
    process.env.RATE_LIMIT_USER_MAX || configs.rate_limit_user_max || 40
  );
  const dailyUserMax = Number(
    process.env.RATE_LIMIT_DAILY_USER_MAX ||
      configs.rate_limit_daily_user_max ||
      800
  );
  return { ipWindowMs, ipMax, userWindowMs, userMax, dailyUserMax };
}

export async function POST(req: Request) {
  const requestId = generateId().toLowerCase();
  const startedAt = Date.now();
  let statusCode = 200;
  let provider = 'unknown';
  let userId = '';
  try {
    const {
      chatId,
      message,
      model,
      webSearch,
      reasoning,
      provider: requestProvider,
      rating,
    }: {
      chatId: string;
      message: UIMessage;
      model: string;
      webSearch: boolean;
      reasoning?: boolean;
      provider?: string;
      rating?: string;
    } = await req.json();

    if (!chatId || !model) {
      throw new Error('invalid params');
    }

    if (!message || !message.parts || message.parts.length === 0) {
      throw new Error('invalid message');
    }

    // check user sign
    const user = await getUserInfo();
    if (!user) {
      statusCode = 401;
      return new Response('Unauthorized', { status: 401 });
    }
    userId = user.id;

    const allowed = await hasPermission(user.id, PERMISSIONS.CHAT_MODEL_USE);
    if (!allowed) {
      statusCode = 403;
      return new Response('Forbidden', { status: 403 });
    }

    // check chat
    const chat = await findChatById(chatId);
    if (!chat) {
      throw new Error('chat not found');
    }

    if (chat.userId !== user?.id) {
      throw new Error('no permission to access this chat');
    }

    const configs = await getAllConfigs();
    const ip = getClientIp(req);
    const limitConfig = getRateLimitConfig(configs);
    const now = Date.now();
    const dayKey = new Date(now).toISOString().slice(0, 10);
    const rateLimitStore = getRateLimitStore();
    const ipLimit = await withRateLimitFailureMode(
      () =>
        rateLimitStore.consumeWindow({
          scope: 'ip',
          key: ip,
          nowMs: now,
          windowMs: limitConfig.ipWindowMs,
          max: limitConfig.ipMax,
        }),
      {
        allowed: true,
        remaining: limitConfig.ipMax,
        retryAfterSec: Math.ceil(limitConfig.ipWindowMs / 1000),
        degraded: true,
      }
    );
    if (!ipLimit.allowed) {
      statusCode = 429;
      return Response.json(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP.',
          retryAfter: ipLimit.retryAfterSec,
          quotaRemaining: 0,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(ipLimit.retryAfterSec),
            'X-Request-Id': requestId,
          },
        }
      );
    }
    const userLimit = await withRateLimitFailureMode(
      () =>
        rateLimitStore.consumeWindow({
          scope: 'user',
          key: user.id,
          nowMs: now,
          windowMs: limitConfig.userWindowMs,
          max: limitConfig.userMax,
        }),
      {
        allowed: true,
        remaining: limitConfig.userMax,
        retryAfterSec: Math.ceil(limitConfig.userWindowMs / 1000),
        degraded: true,
      }
    );
    if (!userLimit.allowed) {
      statusCode = 429;
      return Response.json(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this user.',
          retryAfter: userLimit.retryAfterSec,
          quotaRemaining: 0,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(userLimit.retryAfterSec),
            'X-Request-Id': requestId,
          },
        }
      );
    }
    const dailyLimit = await withRateLimitFailureMode(
      () =>
        rateLimitStore.consumeDaily({
          scope: 'user',
          key: user.id,
          dayKey,
          max: limitConfig.dailyUserMax,
        }),
      {
        allowed: true,
        remaining: limitConfig.dailyUserMax,
        degraded: true,
      }
    );
    if (!dailyLimit.allowed) {
      statusCode = 429;
      return Response.json(
        {
          code: 'DAILY_QUOTA_EXCEEDED',
          message: 'Daily request quota exceeded.',
          retryAfter: 86_400,
          quotaRemaining: 0,
        },
        {
          status: 429,
          headers: { 'Retry-After': '86400', 'X-Request-Id': requestId },
        }
      );
    }

    const currentTime = new Date();

    provider = requestProvider || inferChatProvider(model);

    const nowDate = new Date();
    const dayStart = new Date(
      Date.UTC(
        nowDate.getUTCFullYear(),
        nowDate.getUTCMonth(),
        nowDate.getUTCDate(),
        0,
        0,
        0
      )
    );
    const maxDailyTokens = Number(
      process.env.COST_GUARD_DAILY_TOKENS_MAX ||
        configs.cost_guard_daily_tokens_max ||
        0
    );
    const maxDailyCost = Number(
      process.env.COST_GUARD_DAILY_COST_MAX ||
        configs.cost_guard_daily_cost_max ||
        0
    );
    const maxDailyModelTokens = Number(
      process.env.COST_GUARD_DAILY_MODEL_TOKENS_MAX ||
        configs.cost_guard_daily_model_tokens_max ||
        0
    );
    if (maxDailyTokens > 0 || maxDailyCost > 0 || maxDailyModelTokens > 0) {
      const [dailyUsage, modelDailyUsage] = await Promise.all([
        getUserUsageSince({
          userId: user.id,
          startDate: dayStart,
          endDate: nowDate,
        }),
        maxDailyModelTokens > 0
          ? getUserUsageSince({
              userId: user.id,
              startDate: dayStart,
              endDate: nowDate,
              model,
            })
          : Promise.resolve({ totalTokens: 0, totalCost: 0, totalRequests: 0 }),
      ]);

      const tokenExceeded =
        maxDailyTokens > 0 && dailyUsage.totalTokens >= maxDailyTokens;
      const costExceeded =
        maxDailyCost > 0 && dailyUsage.totalCost >= maxDailyCost;
      const modelExceeded =
        maxDailyModelTokens > 0 &&
        modelDailyUsage.totalTokens >= maxDailyModelTokens;

      if (tokenExceeded || costExceeded || modelExceeded) {
        statusCode = 429;
        return Response.json(
          {
            code: 'COST_GUARD_EXCEEDED',
            message:
              'Daily usage limit reached. Please retry later or upgrade your plan.',
            retryAfter: 86_400,
            quotaRemaining: 0,
            usage: {
              dailyTokens: dailyUsage.totalTokens,
              dailyCost: dailyUsage.totalCost,
              modelDailyTokens: modelDailyUsage.totalTokens,
            },
            upgradeUrl: '/pricing',
          },
          {
            status: 429,
            headers: { 'Retry-After': '86400', 'X-Request-Id': requestId },
          }
        );
      }
    }

    const supply = await resolveChatModelSupply({
      userId: user.id,
      requestedModel: model,
      requestedProvider: requestProvider,
      productCode: 'chat',
    });
    if (!isModelSupplyDecision(supply)) {
      const deniedStatus = supply.code === 'PROVIDER_UNAVAILABLE' ? 503 : 402;
      statusCode = deniedStatus;
      return Response.json(
        {
          code: supply.code,
          message: supply.message || 'Model access denied.',
          upgradeUrl: supply.upgradeUrl || '/pricing',
          quotaRemaining: supply.billingPolicy.remainingTokens,
        },
        { status: deniedStatus, headers: { 'X-Request-Id': requestId } }
      );
    }

    const effectiveModel = supply.selectedModel;
    provider = supply.selectedProvider;

    const metadata = {
      model: effectiveModel,
      requestedModel: model,
      webSearch,
      reasoning,
      provider,
      requestedProvider: requestProvider || inferChatProvider(model),
      billingPolicy: supply.billingPolicy,
    };

    // save user message to database
    const userMessage: NewChatMessage = {
      id: generateId().toLowerCase(),
      chatId,
      userId: user?.id,
      status: ChatMessageStatus.CREATED,
      createdAt: currentTime,
      updatedAt: currentTime,
      role: 'user',
      parts: JSON.stringify(message.parts),
      metadata: JSON.stringify(metadata),
      model: effectiveModel,
      provider: provider,
    };
    await createChatMessage(userMessage);

    // Route to different providers
    if (provider === 'dify') {
      const response = await handleDifyChat({
        chatId,
        chat,
        message,
        user,
        configs,
        currentTime,
        model: effectiveModel,
        rating,
        requestedModel: model,
        billingPolicy: supply.billingPolicy,
        requestId,
      });
      statusCode = response.status || 200;
      return response;
    }

    if (provider === 'openai') {
      const response = await handleOpenAIChat({
        chatId,
        message,
        user,
        configs,
        currentTime,
        model: effectiveModel,
        reasoning,
        requestedModel: model,
        billingPolicy: supply.billingPolicy,
        requestId,
        channelId: supply.selectedChannelId,
      });
      statusCode = response.status || 200;
      return response;
    }

    if (provider === 'mock') {
      const response = await handleMockChat({
        chatId,
        message,
        user,
        currentTime,
        model: effectiveModel,
        requestedModel: model,
        billingPolicy: supply.billingPolicy,
        requestId,
        channelId: supply.selectedChannelId,
      });
      statusCode = response.status || 200;
      return response;
    }

    if (
      provider === 'kimi' ||
      provider === 'claude-proxy' ||
      provider === 'zhipu'
    ) {
      const response = await handleStaticModelsWithFailover({
        chatId,
        message,
        user,
        configs,
        currentTime,
        model: effectiveModel,
        reasoning,
        initialProvider: provider,
        fallbackChain: supply.fallbackChain,
        requestedModel: model,
        billingPolicy: supply.billingPolicy,
        requestId,
      });
      statusCode = response.status || 200;
      return response;
    }

    if (provider === 'anthropic') {
      const response = await handleAnthropicChat({
        chatId,
        message,
        user,
        configs,
        currentTime,
        model: effectiveModel,
        reasoning,
        requestedModel: model,
        billingPolicy: supply.billingPolicy,
        requestId,
        channelId: supply.selectedChannelId,
      });
      statusCode = response.status || 200;
      return response;
    }

    // OpenRouter (default)
    const response = await handleOpenRouterChat({
      chatId,
      message,
      user,
      configs,
      currentTime,
      model: effectiveModel,
      reasoning,
      requestedModel: model,
      billingPolicy: supply.billingPolicy,
      requestId,
      channelId: supply.selectedChannelId,
    });
    statusCode = response.status || 200;
    return response;
  } catch (e: any) {
    statusCode = e instanceof ProviderUnavailableError ? e.status : 500;
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'chat.failed',
        requestId,
        route: '/api/chat',
        errorCode: e?.code || 'CHAT_INTERNAL_ERROR',
        message: e?.message || 'unknown error',
        latencyMs: Date.now() - startedAt,
      })
    );
    await captureExceptionToSentry(e, {
      route: '/api/chat',
      requestId,
      userId,
      provider,
      errorCode: e?.code || 'CHAT_INTERNAL_ERROR',
    });
    if (e instanceof ProviderUnavailableError) {
      return Response.json(
        { code: e.code, message: e.message },
        { status: e.status }
      );
    }
    return new Response(e.message, { status: 500 });
  } finally {
    await recordApiMetric({
      route: '/api/chat',
      status: statusCode,
      latencyMs: Date.now() - startedAt,
      requestId,
      userId,
      provider,
    });
  }
}

async function getValidatedMessages(chatId: string) {
  const previousMessages = await getChatMessages({
    chatId,
    status: ChatMessageStatus.CREATED,
    page: 1,
    limit: 10,
  });

  if (!previousMessages.length) {
    return [];
  }

  return previousMessages.reverse().map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts ? JSON.parse(message.parts) : [],
  })) as UIMessage[];
}

async function saveAssistantMessage({
  chatId,
  userId,
  currentTime,
  model,
  provider,
  parts,
  metadata,
}: {
  chatId: string;
  userId: string;
  currentTime: Date;
  model: string;
  provider: string;
  parts: any[];
  metadata?: Record<string, unknown>;
}) {
  const assistantMessage: NewChatMessage = {
    id: generateId().toLowerCase(),
    chatId,
    userId,
    status: ChatMessageStatus.CREATED,
    createdAt: currentTime,
    updatedAt: currentTime,
    model: model,
    provider: provider,
    parts: JSON.stringify(parts),
    role: 'assistant',
    metadata: metadata ? JSON.stringify(metadata) : undefined,
  };
  await createChatMessage(assistantMessage);
}

async function handleMockChat({
  chatId,
  message,
  user,
  currentTime,
  model,
  requestedModel,
  billingPolicy,
  requestId,
  channelId,
}: {
  chatId: string;
  message: UIMessage;
  user: any;
  currentTime: Date;
  model: string;
  requestedModel: string;
  billingPolicy: BillingPolicy;
  requestId: string;
  channelId?: string;
}) {
  const userText = extractTextFromParts(message.parts);
  const responseText = `Mock ${model} response: ${userText || 'ok'}`;
  const parts = [{ type: 'text', text: responseText }];

  await saveAssistantMessage({
    chatId,
    userId: user?.id,
    currentTime,
    model,
    provider: 'mock',
    parts,
    metadata: {
      requested_model: requestedModel,
      actual_model: model,
      actual_provider: 'mock',
      channel_id: channelId,
    },
  });
  await recordServerChatUsage({
    userId: user?.id,
    requestId,
    requestedModel,
    actualModel: model,
    actualProvider: 'mock',
    channelId,
    parts,
    billingPolicy,
    tokensOverride:
      estimateTokensFromParts(message.parts) + estimateTokensFromParts(parts),
  });
  await markProviderChannelSuccess(channelId);

  return new Response(responseText, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Model-Supply-Provider': 'mock',
      'X-Model-Supply-Model': model,
      'X-Request-Id': requestId,
    },
  });
}

const normalizeBaseUrl = (url?: string, suffix?: string) => {
  if (!url) return undefined;
  const trimmed = url.replace(/\/+$/, '');
  if (!suffix) {
    return trimmed;
  }
  return trimmed.endsWith(suffix) ? trimmed : `${trimmed}${suffix}`;
};

type StreamTextResult = ReturnType<typeof streamText>;

function extractTextFromParts(parts: any[] | undefined): string {
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => {
      if (part?.type === 'text') return part.text || '';
      if (typeof part?.text === 'string') return part.text;
      return '';
    })
    .join('\n');
}

function estimateTokensFromParts(parts: any[] | undefined): number {
  const text = extractTextFromParts(parts);
  return Math.max(1, Math.ceil(text.length / 4));
}

async function recordServerChatUsage({
  userId,
  requestId,
  requestedModel,
  actualModel,
  actualProvider,
  channelId,
  fallbackReason,
  parts,
  billingPolicy,
  tokensOverride,
}: {
  userId: string;
  requestId: string;
  requestedModel: string;
  actualModel: string;
  actualProvider: string;
  channelId?: string;
  fallbackReason?: string;
  parts: any[];
  billingPolicy: BillingPolicy;
  tokensOverride?: number;
}) {
  const tokens =
    tokensOverride && tokensOverride > 0
      ? tokensOverride
      : estimateTokensFromParts(parts);
  const cost = calculateUsageCost({
    model: actualModel,
    tokens,
  });
  const amount = cost.pricing
    ? (Number(cost.amount) * billingPolicy.costMultiplier).toFixed(8)
    : '0.00000000';
  const metadata = withPricingMetadata(
    {
      requested_model: requestedModel,
      actual_model: actualModel,
      actual_provider: actualProvider,
      channel_id: channelId,
      fallback_reason: fallbackReason,
      usage_type: billingPolicy.usageType,
      plan_period: billingPolicy.period,
      cost_multiplier: billingPolicy.costMultiplier,
    },
    cost
  );

  await createUsageLogIdempotent({
    userId,
    appId: 'web',
    product: 'chat',
    model: actualModel,
    provider: actualProvider,
    type: 'chat',
    tokens: cost.billableTokens,
    cost: amount,
    source: BillingEventSource.SERVER,
    requestId,
    status: 'success',
    metadata: JSON.stringify(metadata),
    createdAt: new Date(),
  });

  await upsertBillingEvent({
    userId,
    appId: 'web',
    requestId,
    source: BillingEventSource.SERVER,
    product: 'chat',
    model: actualModel,
    provider: actualProvider,
    billableTokens: cost.billableTokens,
    unitPrice: cost.unitPrice,
    amount,
    period: billingPolicy.period,
    status: BillingEventStatus.BILLABLE,
    metadata: JSON.stringify(metadata),
  });
}

/** 探测上游是否已正常产出（利用 fullStream 的 tee，不破坏后续 toUIMessageStreamResponse） */
async function probeStaticStreamOk(result: StreamTextResult): Promise<boolean> {
  try {
    for await (const part of result.fullStream) {
      if (part.type === 'error') {
        return false;
      }
      if (part.type === 'abort') {
        return false;
      }
      if (part.type === 'finish' && part.finishReason === 'error') {
        return false;
      }
      if (part.type === 'text-delta' || part.type === 'reasoning-delta') {
        return true;
      }
    }
    return true;
  } catch {
    return false;
  }
}

async function createAnthropicCompatibleStreamResult({
  chatId,
  model,
  apiKey,
  baseUrlInput,
  provider,
  anthropicVersion = '2023-06-01',
}: {
  chatId: string;
  model: string;
  apiKey: string | undefined;
  baseUrlInput: string | undefined;
  provider: string;
  anthropicVersion?: string;
}): Promise<{ result: StreamTextResult; validatedMessages: UIMessage[] }> {
  if (!apiKey) {
    throw new Error(`${provider} api key is not set`);
  }

  const anthropicBaseUrl = normalizeBaseUrl(baseUrlInput, '/v1');

  const anthropic = createAnthropic({
    apiKey,
    baseURL: anthropicBaseUrl ? anthropicBaseUrl : undefined,
    headers: {
      'anthropic-version': anthropicVersion,
    },
  });

  const validatedMessages = await getValidatedMessages(chatId);

  const modelMessages = await convertToModelMessages(validatedMessages);

  const result = streamText({
    model: anthropic.messages(model),
    messages: modelMessages,
    maxRetries: 0,
  });

  return { result, validatedMessages };
}

async function streamAnthropicCompatible({
  chatId,
  message,
  user,
  currentTime,
  model,
  reasoning,
  apiKey,
  baseUrlInput,
  provider,
  anthropicVersion = '2023-06-01',
  requestedModel,
  requestId,
  billingPolicy,
  channelId,
  fallbackReason,
}: {
  chatId: string;
  message: UIMessage;
  user: any;
  currentTime: Date;
  model: string;
  reasoning?: boolean;
  apiKey: string | undefined;
  baseUrlInput: string | undefined;
  provider: string;
  anthropicVersion?: string;
  requestedModel: string;
  requestId: string;
  billingPolicy: BillingPolicy;
  channelId?: string;
  fallbackReason?: string;
}) {
  const { result, validatedMessages } =
    await createAnthropicCompatibleStreamResult({
      chatId,
      model,
      apiKey,
      baseUrlInput,
      provider,
      anthropicVersion,
    });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: Boolean(reasoning),
    originalMessages: validatedMessages,
    generateMessageId: createIdGenerator({
      size: 16,
    }),
    onFinish: async ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        await saveAssistantMessage({
          chatId,
          userId: user?.id,
          currentTime,
          model,
          provider,
          parts: lastMessage.parts,
          metadata: {
            requested_model: requestedModel,
            actual_model: model,
            actual_provider: provider,
            channel_id: channelId,
            fallback_reason: fallbackReason,
          },
        });
        await recordServerChatUsage({
          userId: user?.id,
          requestId,
          requestedModel,
          actualModel: model,
          actualProvider: provider,
          channelId,
          fallbackReason,
          parts: lastMessage.parts,
          billingPolicy,
        });
        await markProviderChannelSuccess(channelId);
      }
    },
  });
}

async function createZhipuStreamResult({
  chatId,
  model,
  configs,
}: {
  chatId: string;
  model: string;
  configs: any;
}): Promise<{ result: StreamTextResult; validatedMessages: UIMessage[] }> {
  const zhipuApiKey =
    ZHIPU_CODING.apiKey || configs.zhipu_api_key || process.env.ZHIPU_API_KEY;
  if (!zhipuApiKey) {
    throw new Error('zhipu_api_key is not set');
  }

  const zhipuBaseUrl = normalizeBaseUrl(
    ZHIPU_CODING.baseUrl ||
      configs.zhipu_base_url ||
      process.env.ZHIPU_BASE_URL ||
      'https://open.bigmodel.cn/api/paas/v4',
    '/v4'
  );

  const zhipu = createOpenAI({
    apiKey: zhipuApiKey,
    baseURL: zhipuBaseUrl ? zhipuBaseUrl : undefined,
  });

  const validatedMessages = await getValidatedMessages(chatId);

  const modelMessages = await convertToModelMessages(validatedMessages);

  const result = streamText({
    model: zhipu.chat(model),
    messages: modelMessages,
    maxRetries: 0,
  });

  return { result, validatedMessages };
}

async function createStaticStreamResultForAttempt(
  attempt: ProviderAttempt,
  params: {
    chatId: string;
    user: any;
    configs: any;
    currentTime: Date;
  }
): Promise<{ result: StreamTextResult; validatedMessages: UIMessage[] }> {
  const { provider, model } = attempt;
  const { chatId, configs } = params;

  if (provider === 'kimi') {
    return createAnthropicCompatibleStreamResult({
      chatId,
      model,
      apiKey: attempt.apiKey || KIMI_CODING.apiKey,
      baseUrlInput: attempt.baseUrl || KIMI_CODING.baseUrl,
      provider: 'kimi',
    });
  }

  if (provider === 'claude-proxy') {
    const baseUrlInput =
      attempt.baseUrl?.trim() ||
      CLAUDE_PROXY.baseUrl?.trim() ||
      configs.anthropic_base_url ||
      process.env.ANTHROPIC_BASE_URL;
    if (!baseUrlInput?.trim()) {
      throw new Error(
        'Claude 中转未配置：请在 src/config/chat-providers.ts 设置 CLAUDE_PROXY.baseUrl，或在后台配置 anthropic_base_url'
      );
    }
    const anthropicVersion =
      configs.anthropic_version ||
      process.env.ANTHROPIC_VERSION ||
      '2023-06-01';
    return createAnthropicCompatibleStreamResult({
      chatId,
      model,
      apiKey: attempt.apiKey || CLAUDE_PROXY.apiKey,
      baseUrlInput,
      provider: 'claude-proxy',
      anthropicVersion,
    });
  }

  if (provider === 'zhipu') {
    return createZhipuStreamResult({ chatId, model, configs });
  }

  throw new Error(`unsupported static provider: ${provider}`);
}

async function handleStaticModelsWithFailover({
  chatId,
  message,
  user,
  configs,
  currentTime,
  model,
  reasoning,
  initialProvider,
  fallbackChain,
  requestedModel,
  billingPolicy,
  requestId,
}: {
  chatId: string;
  message: UIMessage;
  user: any;
  configs: any;
  currentTime: Date;
  model: string;
  reasoning?: boolean;
  initialProvider: string;
  fallbackChain?: ProviderAttempt[];
  requestedModel: string;
  billingPolicy: BillingPolicy;
  requestId: string;
}) {
  const chain =
    fallbackChain && fallbackChain.length > 0
      ? fallbackChain
      : buildStaticProviderFailoverChain(initialProvider, model).map(
          (attempt, index) => ({
            ...attempt,
            channelId: `static:${attempt.provider}`,
            fallbackReason:
              index === 0 ? undefined : `fallback:${initialProvider}`,
          })
        );
  const failures: string[] = [];

  for (const attempt of chain) {
    try {
      const { result, validatedMessages } =
        await createStaticStreamResultForAttempt(attempt, {
          chatId,
          user,
          configs,
          currentTime,
        });
      const ok = await probeStaticStreamOk(result);
      if (!ok) {
        failures.push(`${attempt.provider}: 流式首包错误`);
        console.warn('[chat static-failover] probe failed:', attempt);
        await markProviderChannelFailure(attempt.channelId);
        continue;
      }

      return result.toUIMessageStreamResponse({
        sendSources: true,
        sendReasoning: Boolean(reasoning),
        originalMessages: validatedMessages,
        generateMessageId: createIdGenerator({
          size: 16,
        }),
        onFinish: async ({ messages }) => {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.role === 'assistant') {
            await saveAssistantMessage({
              chatId,
              userId: user?.id,
              currentTime,
              model: attempt.model,
              provider: attempt.provider,
              parts: lastMessage.parts,
              metadata: {
                requested_model: requestedModel,
                actual_model: attempt.model,
                actual_provider: attempt.provider,
                channel_id: attempt.channelId,
                fallback_reason: attempt.fallbackReason,
              },
            });
            await recordServerChatUsage({
              userId: user?.id,
              requestId,
              requestedModel,
              actualModel: attempt.model,
              actualProvider: attempt.provider,
              channelId: attempt.channelId,
              fallbackReason: attempt.fallbackReason,
              parts: lastMessage.parts,
              billingPolicy,
            });
            await markProviderChannelSuccess(attempt.channelId);
          }
        },
      });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      failures.push(`${attempt.provider}: ${msg}`);
      console.warn('[chat static-failover] attempt failed:', attempt, e);
      await markProviderChannelFailure(attempt.channelId);
    }
  }

  throw new ProviderUnavailableError(
    `静态模型通道均不可用：${failures.join('；')}`
  );
}

async function handleOpenRouterChat({
  chatId,
  message,
  user,
  configs,
  currentTime,
  model,
  reasoning,
  requestedModel,
  billingPolicy,
  requestId,
  channelId,
}: {
  chatId: string;
  message: UIMessage;
  user: any;
  configs: any;
  currentTime: Date;
  model: string;
  reasoning?: boolean;
  requestedModel: string;
  billingPolicy: BillingPolicy;
  requestId: string;
  channelId?: string;
}) {
  const openrouterApiKey = configs.openrouter_api_key;
  if (!openrouterApiKey) {
    throw new Error('openrouter_api_key is not set');
  }

  const openrouterBaseUrl = configs.openrouter_base_url;

  const openrouter = createOpenRouter({
    apiKey: openrouterApiKey,
    baseURL: openrouterBaseUrl ? openrouterBaseUrl : undefined,
  });

  const validatedMessages = await getValidatedMessages(chatId);

  const modelMessages = await convertToModelMessages(validatedMessages);

  const result = streamText({
    model: openrouter.chat(model as any),
    messages: modelMessages,
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: Boolean(reasoning),
    originalMessages: validatedMessages,
    generateMessageId: createIdGenerator({
      size: 16,
    }),
    onFinish: async ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        await saveAssistantMessage({
          chatId,
          userId: user?.id,
          currentTime,
          model,
          provider: 'openrouter',
          parts: lastMessage.parts,
          metadata: {
            requested_model: requestedModel,
            actual_model: model,
            actual_provider: 'openrouter',
            channel_id: channelId,
          },
        });
        await recordServerChatUsage({
          userId: user?.id,
          requestId,
          requestedModel,
          actualModel: model,
          actualProvider: 'openrouter',
          channelId,
          parts: lastMessage.parts,
          billingPolicy,
        });
        await markProviderChannelSuccess(channelId);
      }
    },
  });
}

async function handleOpenAIChat({
  chatId,
  message,
  user,
  configs,
  currentTime,
  model,
  reasoning,
  requestedModel,
  billingPolicy,
  requestId,
  channelId,
}: {
  chatId: string;
  message: UIMessage;
  user: any;
  configs: any;
  currentTime: Date;
  model: string;
  reasoning?: boolean;
  requestedModel: string;
  billingPolicy: BillingPolicy;
  requestId: string;
  channelId?: string;
}) {
  const openaiApiKey = configs.openai_api_key || process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('openai_api_key is not set');
  }

  const openaiBaseUrl = normalizeBaseUrl(
    configs.openai_base_url || process.env.OPENAI_BASE_URL,
    '/v1'
  );

  const openai = createOpenAI({
    apiKey: openaiApiKey,
    baseURL: openaiBaseUrl ? openaiBaseUrl : undefined,
  });

  const validatedMessages = await getValidatedMessages(chatId);

  const modelMessages = await convertToModelMessages(validatedMessages);

  const result = streamText({
    model: openai.chat(model),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: Boolean(reasoning),
    originalMessages: validatedMessages,
    generateMessageId: createIdGenerator({
      size: 16,
    }),
    onFinish: async ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        await saveAssistantMessage({
          chatId,
          userId: user?.id,
          currentTime,
          model,
          provider: 'openai',
          parts: lastMessage.parts,
          metadata: {
            requested_model: requestedModel,
            actual_model: model,
            actual_provider: 'openai',
            channel_id: channelId,
          },
        });
        await recordServerChatUsage({
          userId: user?.id,
          requestId,
          requestedModel,
          actualModel: model,
          actualProvider: 'openai',
          channelId,
          parts: lastMessage.parts,
          billingPolicy,
        });
        await markProviderChannelSuccess(channelId);
      }
    },
  });
}

async function handleAnthropicChat({
  chatId,
  message,
  user,
  configs,
  currentTime,
  model,
  reasoning,
  requestedModel,
  billingPolicy,
  requestId,
  channelId,
}: {
  chatId: string;
  message: UIMessage;
  user: any;
  configs: any;
  currentTime: Date;
  model: string;
  reasoning?: boolean;
  requestedModel: string;
  billingPolicy: BillingPolicy;
  requestId: string;
  channelId?: string;
}) {
  const anthropicApiKey =
    configs.anthropic_api_key || process.env.ANTHROPIC_API_KEY;
  const anthropicVersion =
    configs.anthropic_version || process.env.ANTHROPIC_VERSION || '2023-06-01';
  return streamAnthropicCompatible({
    chatId,
    message,
    user,
    currentTime,
    model,
    reasoning,
    apiKey: anthropicApiKey,
    baseUrlInput: configs.anthropic_base_url || process.env.ANTHROPIC_BASE_URL,
    provider: 'anthropic',
    anthropicVersion,
    requestedModel,
    billingPolicy,
    requestId,
    channelId,
  });
}

async function handleDifyChat({
  chatId,
  chat,
  message,
  user,
  configs,
  currentTime,
  model,
  rating,
  requestedModel,
  billingPolicy,
  requestId,
}: {
  chatId: string;
  chat: any;
  message: UIMessage;
  user: any;
  configs: any;
  currentTime: Date;
  model: string;
  rating?: string;
  requestedModel: string;
  billingPolicy: BillingPolicy;
  requestId: string;
}) {
  const { streamDifyChatMessages, createDifyOpenAIStream } = await import(
    '@/extensions/ai/dify'
  );

  // Extract botId from model name (e.g., "dify/ti-chatbot" -> "ti-chatbot")
  const botId = model.replace('dify/', '');

  // Get Dify config - try bot-specific config first, then fall back to global
  let difyApiKey: string | undefined;
  let difyApiUrl: string | undefined;
  let botConfig: any = null;

  // Try to get bot-specific API key from dify_bots config
  if (configs.dify_bots) {
    try {
      const botsConfig = JSON.parse(configs.dify_bots);
      const bot = botsConfig.find((b: any) => b.id === botId);
      if (bot && bot.api_key) {
        difyApiKey = bot.api_key;
        botConfig = bot; // Save complete bot configuration
      }
    } catch (e) {
      console.warn('Failed to parse dify_bots config:', e);
    }
  }

  // Fall back to global dify_api_key if not found in bots config
  if (!difyApiKey) {
    difyApiKey = configs.dify_api_key || process.env.DIFY_API_KEY;
  }

  // Get API URL from config or env
  difyApiUrl = configs.dify_api_url || process.env.DIFY_API_URL;

  if (!difyApiKey || !difyApiUrl) {
    throw new Error('Dify API not configured');
  }

  const difyConfig = { apiKey: difyApiKey, apiUrl: difyApiUrl };

  // Get conversation_id from chat metadata
  const chatMetadata = chat.metadata ? JSON.parse(chat.metadata) : {};
  let conversationId = chatMetadata.dify_conversation_id || '';

  // Extract text from message parts
  const textParts = message.parts.filter((part: any) => part.type === 'text');
  const query = textParts.map((part: any) => part.text).join('\n');

  // Build inputs object - only include rating if bot supports it
  const inputs: Record<string, any> = {};

  // Only pass rating if bot has has_rating: true
  if (botConfig && botConfig.has_rating) {
    if (rating) {
      inputs.rating = rating;
    } else if (botConfig.default_rating) {
      inputs.rating = botConfig.default_rating;
    } else if (botConfig.ratings && botConfig.ratings.length > 0) {
      inputs.rating = botConfig.ratings[0];
    }
  }
  // If bot's has_rating is false, don't pass rating parameter at all

  // Call Dify API with dynamically built inputs
  // Handle case where conversation_id might not exist in Dify (404 error)
  let difyStream: ReadableStream;
  try {
    const requestBody: any = {
      inputs,
      query,
      response_mode: 'streaming',
      user: user.id,
      files: [],
    };

    // Only include conversation_id if it's not empty
    if (conversationId) {
      requestBody.conversation_id = conversationId;
    }

    difyStream = await streamDifyChatMessages(difyConfig, requestBody);
  } catch (err: any) {
    // If we get a 404 error about conversation not existing, retry without conversation_id
    const is404Error =
      err.status === 404 || (err.message && err.message.includes('404'));
    const errorMessage = err.message || '';
    const errorData = err.data || {};

    // Check if error is about conversation not existing
    const isConversationNotFound =
      errorData.code === 'not_found' ||
      (errorData.message &&
        errorData.message.includes('Conversation Not Exists')) ||
      errorMessage.includes('Conversation Not Exists') ||
      (errorMessage.includes('conversation') &&
        errorMessage.includes('Not Exists'));

    if (is404Error && isConversationNotFound && conversationId) {
      console.warn(
        `[Dify] Conversation ${conversationId} not found, retrying without conversation_id`
      );
      conversationId = ''; // Clear invalid conversation_id

      // Update chat metadata to remove invalid conversation_id
      const { updateChat } = await import('@/shared/models/chat');
      await updateChat(chatId, {
        metadata: JSON.stringify({
          ...chatMetadata,
          dify_conversation_id: '',
        }),
      });

      // Retry without conversation_id
      const requestBody: any = {
        inputs,
        query,
        response_mode: 'streaming',
        user: user.id,
        files: [],
      };
      difyStream = await streamDifyChatMessages(difyConfig, requestBody);
    } else {
      throw err;
    }
  }

  // Create OpenAI SSE formatted stream
  const { stream: readable } = createDifyOpenAIStream(difyStream, {
    showNodeEvents: true,
    onMessageEnd: async (state) => {
      // Save assistant message to database
      try {
        const assistantMessage: NewChatMessage = {
          id: generateId().toLowerCase(),
          chatId,
          userId: user?.id,
          status: ChatMessageStatus.CREATED,
          createdAt: currentTime,
          updatedAt: currentTime,
          model: model,
          provider: 'dify',
          parts: JSON.stringify([{ type: 'text', text: state.fullAnswer }]),
          role: 'assistant',
          metadata: JSON.stringify({
            requested_model: requestedModel,
            actual_model: model,
            actual_provider: 'dify',
            conversation_id: state.conversationId,
            message_id: state.messageId,
            task_id: state.taskId,
            dify_metadata: state.metadata || null,
          }),
        };
        await createChatMessage(assistantMessage);

        const usageTokens = Number(state?.metadata?.usage?.total_tokens || 0);
        const fallbackTokens = Math.max(
          1,
          Math.ceil((state.fullAnswer?.length || 0) / 4)
        );
        const finalTokens = usageTokens > 0 ? usageTokens : fallbackTokens;
        await recordServerChatUsage({
          userId: user?.id,
          requestId,
          requestedModel,
          actualModel: model,
          actualProvider: 'dify',
          channelId: model,
          parts: [{ type: 'text', text: state.fullAnswer }],
          billingPolicy,
          tokensOverride: finalTokens,
        });

        // Update chat metadata with conversation_id
        if (state.conversationId && state.conversationId !== conversationId) {
          const { updateChat } = await import('@/shared/models/chat');
          await updateChat(chatId, {
            metadata: JSON.stringify({
              ...chatMetadata,
              dify_conversation_id: state.conversationId,
            }),
          });
        }
      } catch (dbErr: any) {
        console.error('[Dify] DB save error:', dbErr);
      }
    },
    onError: (err) => {
      console.error('[Dify] Stream error:', err);
    },
  });

  // Return Response with SSE headers to prevent buffering
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
