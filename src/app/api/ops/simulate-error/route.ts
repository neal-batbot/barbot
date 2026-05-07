import { captureExceptionToSentry } from '@/shared/lib/monitoring';

export async function POST(req: Request) {
  const opsToken = process.env.OPS_SIMULATE_TOKEN || '';
  const requestToken = req.headers.get('x-ops-token') || '';

  if (!opsToken || requestToken !== opsToken) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  const requestId = `ops-${Date.now()}`;
  const simulated = new Error('Synthetic 5xx for alert pipeline verification');

  await captureExceptionToSentry(simulated, {
    route: '/api/ops/simulate-error',
    requestId,
    provider: 'internal',
    errorCode: 'SYNTHETIC_5XX',
  });

  console.error(
    JSON.stringify({
      level: 'error',
      event: 'ops.synthetic_5xx',
      route: '/api/ops/simulate-error',
      requestId,
      errorCode: 'SYNTHETIC_5XX',
    })
  );

  return Response.json(
    {
      code: 'SYNTHETIC_5XX',
      message: 'Synthetic 5xx emitted for monitoring verification.',
      requestId,
    },
    { status: 500 }
  );
}
