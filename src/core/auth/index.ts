import { betterAuth } from 'better-auth';

import { getAllConfigs } from '@/shared/models/config';

import { getAuthOptions } from './config';

let cachedAuth: ReturnType<typeof betterAuth> | null = null;
let cacheTimestamp = 0;
const AUTH_CACHE_TTL = 60_000;

export async function getAuth() {
  const now = Date.now();
  if (cachedAuth && now - cacheTimestamp < AUTH_CACHE_TTL) {
    return cachedAuth;
  }

  const configs = await getAllConfigs();
  const authOptions = await getAuthOptions(configs);
  cachedAuth = betterAuth(authOptions);
  cacheTimestamp = now;

  return cachedAuth;
}
