export interface UsagePricingInput {
  model?: string | null;
  tokens?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cachedInputTokens?: number | null;
}

export interface ModelTokenPricing {
  model: string;
  inputPerMillion: number;
  cachedInputPerMillion: number | null;
  outputPerMillion: number;
  source: string;
}

export interface UsageCostResult {
  amount: string;
  unitPrice: string;
  billableTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  pricing: ModelTokenPricing | null;
}

const OPENAI_API_PRICING_SOURCE = 'openai-api-pricing-2026-05-04';

const OPENAI_PRICES: ModelTokenPricing[] = [
  {
    model: 'gpt-5.5',
    inputPerMillion: 5,
    cachedInputPerMillion: 0.5,
    outputPerMillion: 30,
    source: OPENAI_API_PRICING_SOURCE,
  },
  {
    model: 'gpt-5.4-mini',
    inputPerMillion: 0.75,
    cachedInputPerMillion: 0.075,
    outputPerMillion: 4.5,
    source: OPENAI_API_PRICING_SOURCE,
  },
  {
    model: 'gpt-5.4',
    inputPerMillion: 2.5,
    cachedInputPerMillion: 0.25,
    outputPerMillion: 15,
    source: OPENAI_API_PRICING_SOURCE,
  },
  {
    model: 'gpt-5.3-codex',
    inputPerMillion: 1.75,
    cachedInputPerMillion: 0.175,
    outputPerMillion: 14,
    source: OPENAI_API_PRICING_SOURCE,
  },
  {
    model: 'gpt-5.2-codex',
    inputPerMillion: 1.75,
    cachedInputPerMillion: 0.175,
    outputPerMillion: 14,
    source: OPENAI_API_PRICING_SOURCE,
  },
  {
    model: 'gpt-5.2',
    inputPerMillion: 1.75,
    cachedInputPerMillion: 0.175,
    outputPerMillion: 14,
    source: OPENAI_API_PRICING_SOURCE,
  },
  {
    model: 'gpt-5.1',
    inputPerMillion: 1.25,
    cachedInputPerMillion: 0.125,
    outputPerMillion: 10,
    source: OPENAI_API_PRICING_SOURCE,
  },
  {
    model: 'gpt-5',
    inputPerMillion: 1.25,
    cachedInputPerMillion: 0.125,
    outputPerMillion: 10,
    source: OPENAI_API_PRICING_SOURCE,
  },
];

function normalizeModel(model?: string | null): string {
  return (model ?? '').trim().toLowerCase();
}

function clampTokenCount(value?: number | null): number {
  if (!Number.isFinite(value ?? 0)) return 0;
  return Math.max(0, Math.floor(value ?? 0));
}

export function resolveModelTokenPricing(model?: string | null): ModelTokenPricing | null {
  const normalized = normalizeModel(model);
  if (!normalized) return null;

  const exact = OPENAI_PRICES.find((price) => normalized === price.model);
  if (exact) return exact;

  const versionedAlias = OPENAI_PRICES.find(
    (price) =>
      normalized.startsWith(`${price.model}-`) ||
      normalized.startsWith(`${price.model}.`) ||
      normalized.startsWith(`${price.model}_`)
  );
  if (versionedAlias) return versionedAlias;

  if (normalized.includes('codex') && normalized.startsWith('gpt-5.3')) {
    return OPENAI_PRICES.find((price) => price.model === 'gpt-5.3-codex') ?? null;
  }

  if (normalized.startsWith('gpt-5.4')) {
    return OPENAI_PRICES.find((price) => price.model === 'gpt-5.4') ?? null;
  }

  if (normalized.startsWith('gpt-5.2')) {
    return OPENAI_PRICES.find((price) => price.model === 'gpt-5.2') ?? null;
  }

  if (normalized.startsWith('gpt-5.1')) {
    return OPENAI_PRICES.find((price) => price.model === 'gpt-5.1') ?? null;
  }

  if (normalized.startsWith('gpt-5')) {
    return OPENAI_PRICES.find((price) => price.model === 'gpt-5') ?? null;
  }

  return null;
}

export function calculateUsageCost(input: UsagePricingInput): UsageCostResult {
  const totalTokens = clampTokenCount(input.tokens);
  const outputTokens = clampTokenCount(input.outputTokens);
  const cachedInputTokens = clampTokenCount(input.cachedInputTokens);
  const explicitInputTokens = input.inputTokens;
  const inputTokens =
    explicitInputTokens === undefined || explicitInputTokens === null
      ? Math.max(totalTokens - outputTokens, 0)
      : clampTokenCount(explicitInputTokens);
  const billableTokens = Math.max(totalTokens, inputTokens + outputTokens);
  const pricing = resolveModelTokenPricing(input.model);

  if (!pricing) {
    return {
      amount: '0.00000000',
      unitPrice: '0',
      billableTokens,
      inputTokens,
      outputTokens,
      cachedInputTokens,
      pricing: null,
    };
  }

  const cachedRate = pricing.cachedInputPerMillion ?? pricing.inputPerMillion;
  const nonCachedInputTokens = Math.max(inputTokens - cachedInputTokens, 0);
  const amount =
    (nonCachedInputTokens * pricing.inputPerMillion +
      cachedInputTokens * cachedRate +
      outputTokens * pricing.outputPerMillion) /
    1_000_000;
  const unitPrice = billableTokens > 0 ? amount / billableTokens : 0;

  return {
    amount: amount.toFixed(8),
    unitPrice: unitPrice.toFixed(12),
    billableTokens,
    inputTokens,
    outputTokens,
    cachedInputTokens,
    pricing,
  };
}

export function withPricingMetadata(
  metadata: Record<string, unknown> | undefined,
  cost: UsageCostResult
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    token_breakdown: {
      input_tokens: cost.inputTokens,
      output_tokens: cost.outputTokens,
      cached_input_tokens: cost.cachedInputTokens,
    },
    pricing: cost.pricing
      ? {
          source: cost.pricing.source,
          model: cost.pricing.model,
          input_per_million: cost.pricing.inputPerMillion,
          cached_input_per_million: cost.pricing.cachedInputPerMillion,
          output_per_million: cost.pricing.outputPerMillion,
        }
      : {
          source: 'unknown',
          model: null,
        },
  };
}
