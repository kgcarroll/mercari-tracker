"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { lineItems } from "@/lib/db/schema";

const itemSchema = z.object({
  product: z.string().trim().min(1, "Product is required"),
  store: z.string().trim().min(1, "Store is required"),
  cost: z.coerce.number().nonnegative(),
  salePrice: z.coerce.number().nonnegative(),
  shippingCost: z.coerce.number().nonnegative(),
  notes: z.string().trim().optional(),
  purchasedAt: z.string().optional(),
  listedAt: z.string().optional(),
  soldAt: z.string().optional(),
});

export type ItemInput = z.infer<typeof itemSchema>;

function money(value: number): string {
  return value.toFixed(2);
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toRow(input: ItemInput) {
  const soldAt =
    input.salePrice > 0
      ? emptyToNull(input.soldAt) ?? new Date().toISOString().slice(0, 10)
      : null;

  return {
    product: input.product,
    store: input.store,
    cost: money(input.cost),
    salePrice: money(input.salePrice),
    shippingCost: money(input.shippingCost),
    notes: emptyToNull(input.notes),
    purchasedAt: emptyToNull(input.purchasedAt),
    listedAt: emptyToNull(input.listedAt),
    soldAt,
    updatedAt: new Date(),
  };
}

export async function createItem(raw: ItemInput) {
  await requireAppUser();
  const input = itemSchema.parse(raw);
  const db = getDb();
  await db.insert(lineItems).values(toRow(input));
  revalidatePath("/");
}

export async function updateItem(id: string, raw: ItemInput) {
  await requireAppUser();
  const input = itemSchema.parse(raw);
  const db = getDb();
  await db.update(lineItems).set(toRow(input)).where(eq(lineItems.id, id));
  revalidatePath("/");
}

export async function deleteItem(id: string) {
  await requireAppUser();
  const db = getDb();
  await db.delete(lineItems).where(eq(lineItems.id, id));
  revalidatePath("/");
}
