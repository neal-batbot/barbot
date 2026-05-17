import type { ChatModel } from '@/shared/types/chat';

export interface PlanModelView {
  plan: string;
  allowedModels: string[];
  autoModelEnabled?: boolean;
}

export interface BotModelView {
  id: string;
  title: string;
  has_rating?: boolean;
  ratings?: string[];
  default_rating?: string;
  trialOnly?: boolean;
}

export interface ChatModelMenuItem {
  id: string;
  name: string;
  description?: string;
  badge?: string;
  group?: string;
}

export interface UsageSupplyMetadata {
  requestedModel?: string;
  actualModel?: string;
  actualProvider?: string;
  selectedProvider?: string;
  selectedModel?: string;
  fallbackReason?: string;
  usageType?: string;
}

export function matchesModelRule(model: string, rule: string): boolean {
  if (rule === '*') return true;
  if (rule.endsWith('*')) return model.startsWith(rule.slice(0, -1));
  return model === rule;
}

export function isModelAllowedByRules(
  model: string,
  allowedModels: string[] = []
): boolean {
  return allowedModels.some((rule) => matchesModelRule(model, rule));
}

function formatDifyLabel(title: string): string {
  const trimmed = title.replace(/^Vector\s*/i, '').trim();
  return `Vector-${trimmed || 'Assistant'}`;
}

export function buildAllowedModelMenu({
  staticModels,
  difyBots,
  plan,
}: {
  staticModels: ChatModel[];
  difyBots: BotModelView[];
  plan: PlanModelView;
}): ChatModelMenuItem[] {
  const allowedModels = plan.allowedModels || [];
  const allowAll = isModelAllowedByRules('*', allowedModels);
  const autoEnabled =
    plan.autoModelEnabled !== false &&
    isModelAllowedByRules('auto', allowedModels);

  const autoItems: ChatModelMenuItem[] = autoEnabled
    ? [
        {
          id: 'auto',
          name: 'Auto',
          description: 'Best available model for your plan',
          badge: 'Default',
          group: 'Recommended',
        },
      ]
    : [];

  const difyItems: ChatModelMenuItem[] = difyBots
    .filter((bot) => {
      const modelName = `dify/${bot.id}`;
      return allowAll || isModelAllowedByRules(modelName, allowedModels);
    })
    .map((bot) => ({
      id: `dify/${bot.id}`,
      name: formatDifyLabel(bot.title),
      description: bot.ratings?.length
        ? 'Supports rating selection'
        : 'Standard chat',
      badge: bot.trialOnly ? 'Trial' : 'Custom',
      group: 'Assistants',
    }));

  const staticItems: ChatModelMenuItem[] = staticModels
    .filter(
      (model) => allowAll || isModelAllowedByRules(model.name, allowedModels)
    )
    .map((model) => ({
      id: model.name,
      name: model.title,
      description: `${model.provider} model`,
      badge: model.tier === 'pro' ? 'Pro' : undefined,
      group: model.tier === 'pro' ? 'Advanced Models' : 'Basic Models',
    }));

  return [...autoItems, ...difyItems, ...staticItems];
}

export function parseUsageSupplyMetadata(
  metadata: unknown
): UsageSupplyMetadata {
  let parsed: any = metadata;
  if (!parsed) return {};
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== 'object') return {};

  return {
    requestedModel: parsed.requestedModel ?? parsed.requested_model,
    actualModel: parsed.actualModel ?? parsed.actual_model,
    actualProvider: parsed.actualProvider ?? parsed.actual_provider,
    selectedProvider: parsed.selectedProvider ?? parsed.selected_provider,
    selectedModel: parsed.selectedModel ?? parsed.selected_model,
    fallbackReason: parsed.fallbackReason ?? parsed.fallback_reason,
    usageType: parsed.usageType ?? parsed.usage_type,
  };
}
