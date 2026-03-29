import { and, count, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { device } from '@/config/db/schema';

export type Device = typeof device.$inferSelect;
export type NewDevice = typeof device.$inferInsert;

export async function getDevices({
  userId,
  productCode,
  status,
}: {
  userId?: string;
  productCode?: string;
  status?: string;
}): Promise<Device[]> {
  return db()
    .select()
    .from(device)
    .where(
      and(
        userId ? eq(device.userId, userId) : undefined,
        productCode ? eq(device.productCode, productCode) : undefined,
        status ? eq(device.status, status) : undefined
      )
    )
    .orderBy(device.activatedAt);
}

export async function countActiveDevices(userId: string, productCode: string): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(device)
    .where(
      and(
        eq(device.userId, userId),
        eq(device.productCode, productCode),
        eq(device.status, 'active')
      )
    );
  return result?.count ?? 0;
}

export async function findDevice(
  userId: string,
  productCode: string,
  deviceId: string
): Promise<Device | undefined> {
  const [result] = await db()
    .select()
    .from(device)
    .where(
      and(
        eq(device.userId, userId),
        eq(device.productCode, productCode),
        eq(device.deviceId, deviceId)
      )
    );
  return result;
}

export async function upsertDevice(data: {
  userId: string;
  productCode: string;
  deviceId: string;
  platform?: string;
}): Promise<Device> {
  const [result] = await db()
    .insert(device)
    .values({
      ...data,
      status: 'active',
      activatedAt: new Date(),
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [device.userId, device.productCode, device.deviceId],
      set: {
        status: 'active',
        lastSeenAt: new Date(),
      },
    })
    .returning();
  return result;
}

export async function updateDeviceHeartbeat(
  userId: string,
  productCode: string,
  deviceId: string
): Promise<void> {
  await db()
    .update(device)
    .set({ lastSeenAt: new Date() })
    .where(
      and(
        eq(device.userId, userId),
        eq(device.productCode, productCode),
        eq(device.deviceId, deviceId)
      )
    );
}

export async function deactivateDevice(id: string): Promise<void> {
  await db().update(device).set({ status: 'deactivated' }).where(eq(device.id, id));
}
