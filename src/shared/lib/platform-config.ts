import type { EntitlementResult, PlanName } from '@/shared/services/entitlement';

export type PlatformProduct = 'pi-web-ui' | 'fumadocs' | 'supabase-ssh';

export type PlatformFeature =
  | 'agent-chat'
  | 'fs-readonly'
  | 'ai-search'
  | 'mcp'
  | 'epub-export'
  | 'ssh-access';

export type PlatformAudience =
  | 'vector-web-ui'
  | 'vector-vscode'
  | 'fumadocs-web'
  | 'supabase-ssh-web'
  | 'supabase-ssh-ssh';

export interface PlatformAudienceConfig {
  name: PlatformAudience;
  product: PlatformProduct;
  ttlSeconds: number;
  requiredFeature?: PlatformFeature;
}

export interface PlatformProductConfig {
  id: PlatformProduct;
  audiences: readonly PlatformAudience[];
  defaultFeatures: readonly PlatformFeature[];
  planFeatures: Partial<Record<PlanName, readonly PlatformFeature[]>>;
}

export interface PlatformEntitlement {
  product: PlatformProduct;
  plan: PlanName;
  features: PlatformFeature[];
  allowedModels: string[];
  quota: {
    tokens: {
      included: number;
      used: number;
      remaining: number;
      overage: number;
      overageEnabled: boolean;
      overageAmount: number;
      unitPricePer1k: number;
    };
    credits: {
      remaining: number;
    };
  };
  periodStart: string;
  periodEnd: string;
  expiresAt: string;
}

export const PLATFORM_AUDIENCE_CONFIG: Record<
  PlatformAudience,
  PlatformAudienceConfig
> = {
  'vector-web-ui': {
    name: 'vector-web-ui',
    product: 'pi-web-ui',
    ttlSeconds: 30 * 24 * 60 * 60,
  },
  'vector-vscode': {
    name: 'vector-vscode',
    product: 'pi-web-ui',
    ttlSeconds: 30 * 24 * 60 * 60,
  },
  'fumadocs-web': {
    name: 'fumadocs-web',
    product: 'fumadocs',
    ttlSeconds: 30 * 24 * 60 * 60,
  },
  'supabase-ssh-web': {
    name: 'supabase-ssh-web',
    product: 'supabase-ssh',
    ttlSeconds: 30 * 24 * 60 * 60,
  },
  'supabase-ssh-ssh': {
    name: 'supabase-ssh-ssh',
    product: 'supabase-ssh',
    ttlSeconds: 10 * 60,
    requiredFeature: 'ssh-access',
  },
};

export const PLATFORM_PRODUCT_CONFIG: Record<
  PlatformProduct,
  PlatformProductConfig
> = {
  'pi-web-ui': {
    id: 'pi-web-ui',
    audiences: ['vector-web-ui', 'vector-vscode'],
    defaultFeatures: ['agent-chat', 'fs-readonly'],
    planFeatures: {},
  },
  fumadocs: {
    id: 'fumadocs',
    audiences: ['fumadocs-web'],
    defaultFeatures: [],
    planFeatures: {
      pro: ['ai-search', 'mcp', 'epub-export'],
      team: ['ai-search', 'mcp', 'epub-export'],
    },
  },
  'supabase-ssh': {
    id: 'supabase-ssh',
    audiences: ['supabase-ssh-web', 'supabase-ssh-ssh'],
    defaultFeatures: [],
    planFeatures: {
      pro: ['ssh-access'],
      team: ['ssh-access'],
    },
  },
};

export function getPlatformAudienceConfig(audience: PlatformAudience) {
  return PLATFORM_AUDIENCE_CONFIG[audience];
}

export function getPlatformProductConfig(product: PlatformProduct) {
  return PLATFORM_PRODUCT_CONFIG[product];
}

export function resolvePlatformProduct(
  input: string | null | undefined
): PlatformProduct | null {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  switch (normalized) {
    case 'pi-web-ui':
    case 'pi':
    case 'vector-web-ui':
    case 'vector-vscode':
      return 'pi-web-ui';
    case 'fumadocs':
    case 'fumadocs-web':
      return 'fumadocs';
    case 'supabase-ssh':
    case 'supabase-ssh-web':
    case 'supabase-ssh-ssh':
      return 'supabase-ssh';
    default:
      return null;
  }
}

export function resolveProductFromAudience(
  audience: PlatformAudience | null | undefined
): PlatformProduct | null {
  if (!audience) {
    return null;
  }
  return PLATFORM_AUDIENCE_CONFIG[audience]?.product ?? null;
}

export function resolvePlatformFeatures(
  product: PlatformProduct,
  plan: PlanName
): PlatformFeature[] {
  const config = PLATFORM_PRODUCT_CONFIG[product];
  const features = new Set<PlatformFeature>(config.defaultFeatures);
  for (const feature of config.planFeatures[plan] ?? []) {
    features.add(feature);
  }
  return Array.from(features);
}

export function hasPlatformFeature(
  entitlement: PlatformEntitlement,
  feature: PlatformFeature
) {
  return entitlement.features.includes(feature);
}

export function buildPlatformEntitlement(
  product: PlatformProduct,
  entitlement: EntitlementResult
): PlatformEntitlement {
  return {
    product,
    plan: entitlement.plan,
    features: resolvePlatformFeatures(product, entitlement.plan),
    allowedModels: entitlement.allowedModels,
    quota: {
      tokens: {
        included: entitlement.quotaTokens,
        used: entitlement.usedTokens,
        remaining: entitlement.remainingTokens,
        overage: entitlement.overageTokens,
        overageEnabled: entitlement.overageEnabled,
        overageAmount: entitlement.overageAmount,
        unitPricePer1k: entitlement.unitPricePer1k,
      },
      credits: {
        remaining: entitlement.remainingCredits,
      },
    },
    periodStart: entitlement.periodStart.toISOString(),
    periodEnd: entitlement.periodEnd.toISOString(),
    expiresAt: entitlement.periodEnd.toISOString(),
  };
}
