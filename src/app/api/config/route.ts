import { NextResponse } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getPublicConfigs } from '@/shared/models/config';

async function handleConfigs() {
  try {
    const configs = await getPublicConfigs();
    const resp = respData(configs);
    const response = new NextResponse(resp.body, {
      status: resp.status,
      headers: resp.headers,
    });
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    );
    return response;
  } catch (e: any) {
    console.log('get configs failed', e);
    return respErr(e.message);
  }
}

export async function GET() {
  return handleConfigs();
}

export async function POST() {
  return handleConfigs();
}
