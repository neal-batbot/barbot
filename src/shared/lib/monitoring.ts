type AlertMetricEvent = {
  route: string;
  status: number;
  latencyMs: number;
  requestId?: string;
  userId?: string;
  provider?: string;
};

type RouteWindow = {
  events: Array<{ ts: number; status: number; latencyMs: number }>;
  lastAlertAt: number;
};

const routeWindows = new Map<string, RouteWindow>();

function parseSentryDsn(dsn: string) {
  const url = new URL(dsn);
  const publicKey = url.username;
  const projectId = url.pathname.split('/').filter(Boolean).pop();
  if (!publicKey || !projectId) return null;
  return {
    origin: `${url.protocol}//${url.host}`,
    publicKey,
    projectId,
  };
}

async function sendSentryEvent(payload: Record<string, any>) {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  try {
    const parsed = parseSentryDsn(dsn);
    if (!parsed) return;
    const endpoint = `${parsed.origin}/api/${parsed.projectId}/store/?sentry_version=7&sentry_key=${parsed.publicKey}`;
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // best effort
  }
}

async function dispatchAlert(title: string, details: Record<string, any>) {
  const alertPayload = {
    level: 'error',
    event: 'alert.threshold.exceeded',
    title,
    details,
    timestamp: new Date().toISOString(),
  };
  console.error(JSON.stringify(alertPayload));

  await sendSentryEvent({
    message: title,
    level: 'error',
    platform: 'javascript',
    tags: {
      route: details.route || 'unknown',
      alertType: details.type || 'threshold',
    },
    extra: details,
    timestamp: Math.floor(Date.now() / 1000),
  });

  const webhook = process.env.ALERT_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload),
      });
    } catch {
      // best effort
    }
  }
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

export async function recordApiMetric(event: AlertMetricEvent) {
  const now = Date.now();
  const windowMs = Number(process.env.ALERT_WINDOW_MS || 300_000); // 5 min
  const minRequests = Number(process.env.ALERT_MIN_REQUESTS || 30);
  const errorRateThreshold = Number(process.env.ALERT_ERROR_RATE_THRESHOLD || 0.05);
  const p95LatencyThreshold = Number(process.env.ALERT_P95_LATENCY_MS || 2000);
  const cooldownMs = Number(process.env.ALERT_COOLDOWN_MS || 300_000);

  const current = routeWindows.get(event.route) || { events: [], lastAlertAt: 0 };
  current.events.push({ ts: now, status: event.status, latencyMs: event.latencyMs });
  current.events = current.events.filter((item) => now - item.ts <= windowMs);
  routeWindows.set(event.route, current);

  if (current.events.length < minRequests) return;

  const errors = current.events.filter((item) => item.status >= 500).length;
  const errorRate = errors / current.events.length;
  const p95 = percentile(
    current.events.map((item) => item.latencyMs),
    95
  );

  if (now - current.lastAlertAt < cooldownMs) return;

  if (errorRate >= errorRateThreshold) {
    current.lastAlertAt = now;
    routeWindows.set(event.route, current);
    await dispatchAlert('API error rate threshold exceeded', {
      type: 'error_rate',
      route: event.route,
      errorRate,
      threshold: errorRateThreshold,
      sampleSize: current.events.length,
      requestId: event.requestId,
      userId: event.userId,
      provider: event.provider,
    });
    return;
  }

  if (p95 >= p95LatencyThreshold) {
    current.lastAlertAt = now;
    routeWindows.set(event.route, current);
    await dispatchAlert('API p95 latency threshold exceeded', {
      type: 'p95_latency',
      route: event.route,
      p95LatencyMs: p95,
      threshold: p95LatencyThreshold,
      sampleSize: current.events.length,
      requestId: event.requestId,
      userId: event.userId,
      provider: event.provider,
    });
  }
}

export async function captureExceptionToSentry(
  error: unknown,
  context: { route: string; requestId?: string; userId?: string; provider?: string; errorCode?: string }
) {
  const err = error instanceof Error ? error : new Error(String(error));
  await sendSentryEvent({
    message: err.message,
    level: 'error',
    platform: 'javascript',
    exception: {
      values: [
        {
          type: err.name || 'Error',
          value: err.message,
          stacktrace: err.stack
            ? {
                frames: err.stack.split('\n').map((line) => ({ filename: line.trim() })),
              }
            : undefined,
        },
      ],
    },
    tags: {
      route: context.route,
      provider: context.provider || 'unknown',
      errorCode: context.errorCode || 'UNSPECIFIED',
    },
    extra: context,
    timestamp: Math.floor(Date.now() / 1000),
  });
}
