import crypto from 'crypto';

import {
  ALLOWED_BRIDGE_AUDIENCES,
  VSCODE_AUDIENCE,
  WEB_UI_AUDIENCE,
} from '@/shared/lib/auth-bridge-constants';

export { WEB_UI_AUDIENCE, VSCODE_AUDIENCE };

const ALLOWED_AUDIENCES = new Set(ALLOWED_BRIDGE_AUDIENCES);

function base64UrlEncode(input: Buffer | string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input: string) {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

export function isAllowedBridgeAudience(audience: string | null | undefined) {
  return !!audience && ALLOWED_AUDIENCES.has(audience);
}

export function resolveBridgeAudience(
  audience: string | null | undefined
): string | null {
  if (!audience) {
    return null;
  }
  const trimmed = audience.trim();
  return isAllowedBridgeAudience(trimmed) ? trimmed : null;
}

export function signBridgeJwt(
  payload: Record<string, unknown>,
  secret: string
) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest();
  return `${data}.${base64UrlEncode(signature)}`;
}

export function verifyBridgeJwt(
  token: string,
  secret: string
): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest();

  const actualSignature = base64UrlDecode(encodedSignature);
  if (
    actualSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload).toString('utf-8'));
  } catch {
    return null;
  }
}
