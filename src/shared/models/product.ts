import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { product } from '@/config/db/schema';

export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;

export async function getProducts(): Promise<Product[]> {
  return db().select().from(product).orderBy(product.createdAt);
}

export async function getActiveProducts(): Promise<Product[]> {
  return db()
    .select()
    .from(product)
    .where(eq(product.isActive, true))
    .orderBy(product.createdAt);
}

export async function findProductByCode(code: string): Promise<Product | undefined> {
  const [result] = await db()
    .select()
    .from(product)
    .where(eq(product.code, code));
  return result;
}

export async function createProduct(data: NewProduct): Promise<Product> {
  const [result] = await db().insert(product).values(data).returning();
  return result;
}

export async function updateProduct(
  id: string,
  data: Partial<Pick<NewProduct, 'name' | 'description' | 'isActive'>>
): Promise<Product> {
  const [result] = await db()
    .update(product)
    .set(data)
    .where(eq(product.id, id))
    .returning();
  return result;
}
