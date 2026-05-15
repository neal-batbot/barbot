export type BarbotResponse<T> = {
  code?: number;
  message?: string;
  data?: T;
  error?: string | { message?: string };
};

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  image?: string | null;
  imageUrl?: string | null;
  createdAt?: string;
};

export type BridgeTokenResponse = {
  token: string;
  audience: string;
  product: string;
  expiresAt: string;
  sourceAudience: string | null;
  user: SessionUser;
};

export type DesktopSession = {
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: SessionUser;
};

export type EntitlementPayload = {
  allowed: boolean;
  product: string;
  plan: string;
  subscription_status: string | null;
  quota: {
    tokens: number | null;
    used_tokens?: number;
    remaining_tokens?: number;
    requests: number | null;
    remaining_credits: number;
  };
  features: Record<string, unknown>;
  period_start?: string;
  period_end?: string;
};

export type ProviderRelayChannel = {
  channelId?: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
};

export type ProviderConfigPayload = {
  available: boolean;
  allowed?: boolean;
  product: string;
  plan: string;
  message?: string;
  primary?: ProviderRelayChannel;
  fallbacks?: ProviderRelayChannel[];
  models?: string[];
  allowedModels?: string[];
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  modelName?: string;
};

export type DeviceRegistrationPayload = {
  activated: boolean;
  device_id: string;
  limit: number;
};

export type UsageRecord = {
  product: string;
  model?: string;
  provider?: string;
  type: 'chat' | 'image' | 'music' | 'video' | string;
  tokens?: number;
  cost?: number;
  request_id?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
};

export type BarbotPlatformSDKOptions = {
  baseUrl: string;
  apiKey?: string;
  fetcher?: typeof fetch;
};

type RequestOptions = {
  method: string;
  body?: unknown;
  requireApiKey?: boolean;
  bearerToken?: string;
  credentials?: RequestCredentials;
};

export class BarbotPlatformSDK {
  private readonly baseUrl: string;
  private apiKey?: string;
  private readonly fetcher: typeof fetch;

  constructor(options: BarbotPlatformSDKOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.fetcher = options.fetcher ?? fetch;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  async login(input: {
    email: string;
    password: string;
    deviceInfo?: string;
  }) {
    return this.desktopLogin(input);
  }

  async getSession() {
    return this.request<{
      authenticated: boolean;
      user: SessionUser | null;
    }>('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    });
  }

  async getBridgeToken(audience: string, bearerToken?: string) {
    return this.requestRaw<BridgeTokenResponse>(
      `/api/extension/token?aud=${encodeURIComponent(audience)}`,
      {
        method: 'GET',
        bearerToken,
        credentials: bearerToken ? 'omit' : 'include',
      }
    );
  }

  async getExtensionUserInfo(bridgeToken: string) {
    return this.request<{
      user: SessionUser;
      credits: { remainingCredits: number };
    }>('/api/extension/user-info', {
      method: 'GET',
      bearerToken: bridgeToken,
    });
  }

  async getExtensionEntitlement(bridgeToken: string, product?: string) {
    const query = product ? `?product=${encodeURIComponent(product)}` : '';
    return this.request<{
      user: SessionUser;
      entitlement: Record<string, unknown>;
    }>(`/api/extension/entitlement${query}`, {
      method: 'GET',
      bearerToken: bridgeToken,
    });
  }

  async desktopLogin(input: {
    email: string;
    password: string;
    deviceInfo?: string;
  }) {
    return this.requestRaw<DesktopSession>('/api/auth/desktop/login', {
      method: 'POST',
      body: input,
    });
  }

  async desktopRefresh(refreshToken: string) {
    return this.requestRaw<DesktopSession>('/api/auth/desktop/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  }

  async desktopExchange(input: { code: string; deviceInfo?: string }) {
    return this.requestRaw<DesktopSession>('/api/auth/desktop/exchange', {
      method: 'POST',
      body: input,
    });
  }

  async verifyDesktopToken(token: string) {
    return this.requestRaw<{ valid: boolean; user: SessionUser }>('/api/auth/verify', {
      method: 'GET',
      bearerToken: token,
    });
  }

  async checkEntitlement(product: string) {
    return this.request<EntitlementPayload>(
      `/api/v1/entitlement?product=${encodeURIComponent(product)}`,
      {
        method: 'GET',
        requireApiKey: true,
      }
    );
  }

  async getProviderConfig(product: string) {
    return this.request<ProviderConfigPayload>(
      `/api/v1/provider-config?product=${encodeURIComponent(product)}`,
      {
        method: 'GET',
        requireApiKey: true,
      }
    );
  }

  async registerDevice(input: {
    device_id: string;
    platform?: string;
    product_code: string;
  }) {
    return this.request<DeviceRegistrationPayload>('/api/v1/device/register', {
      method: 'POST',
      requireApiKey: true,
      body: input,
    });
  }

  async heartbeat(input: { device_id: string; product_code: string }) {
    return this.request<{ ok: boolean }>('/api/v1/device/heartbeat', {
      method: 'POST',
      requireApiKey: true,
      body: input,
    });
  }

  async reportUsage(record: UsageRecord) {
    return this.request<{ success: boolean; id: string }>('/api/v1/usage/report', {
      method: 'POST',
      requireApiKey: true,
      body: record,
    });
  }

  async reportUsageBatch(records: UsageRecord[]) {
    return this.request<{ success: boolean; count: number }>(
      '/api/v1/usage/report/batch',
      {
        method: 'POST',
        requireApiKey: true,
        body: { records },
      }
    );
  }

  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    const payload = await this.requestRaw<BarbotResponse<T>>(path, options);

    if (payload && typeof payload === 'object' && 'data' in payload) {
      if (typeof payload.code === 'number' && payload.code !== 0) {
        throw new Error(payload.message || 'Request failed');
      }
      return payload.data as T;
    }

    return payload as T;
  }

  private async requestRaw<T>(path: string, options: RequestOptions): Promise<T> {
    const headers: Record<string, string> = {};

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.bearerToken) {
      headers.Authorization = `Bearer ${options.bearerToken}`;
    } else if (options.requireApiKey) {
      if (!this.apiKey) {
        throw new Error('API key is required for this request');
      }
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: options.credentials,
    });

    const json = (await response.json().catch(() => null)) as
      | (BarbotResponse<T> & Record<string, unknown>)
      | null;

    if (!response.ok) {
      const message = this.extractErrorMessage(json) || `${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    if (!json) {
      throw new Error('Empty response');
    }

    return json as T;
  }

  private extractErrorMessage(input: Record<string, unknown> | null): string | null {
    if (!input) return null;
    if (typeof input.message === 'string' && input.message) return input.message;
    if (typeof input.error === 'string' && input.error) return input.error;
    if (
      input.error &&
      typeof input.error === 'object' &&
      'message' in input.error &&
      typeof input.error.message === 'string'
    ) {
      return input.error.message;
    }
    return null;
  }
}

export const BarbotAccountSDK = BarbotPlatformSDK;
