"use server";

import { eq, inArray } from "drizzle-orm";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import { todayISODate } from "@/lib/dates";
import { getDb, withDbRetry } from "@/lib/db";
import { lineItems } from "@/lib/db/schema";
import { parsePlatform, VINTED_STORE } from "@/lib/platform";

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  product: z.string().trim().min(1, "Product is required"),
  store: z.string().trim().optional(),
  cost: z.coerce.number().nonnegative(),
  salePrice: z.coerce.number().nonnegative(),
  shippingCost: z.coerce.number().nonnegative(),
  notes: z.string().trim().optional(),
  purchasedAt: z.string().optional(),
  listedAt: z.string().optional(),
  soldAt: z.string().optional(),
  active: z.boolean().optional(),
  platform: z.enum(["mercari", "vinted"]).optional(),
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
      ? emptyToNull(input.soldAt) ?? todayISODate()
      : null;

  return {
    product: input.product,
    store:
      input.platform === "vinted"
        ? VINTED_STORE
        : (input.store?.trim() || "Hallmark"),
    cost: money(input.cost),
    salePrice: money(input.salePrice),
    shippingCost: money(input.shippingCost),
    notes: emptyToNull(input.notes),
    purchasedAt: emptyToNull(input.purchasedAt),
    listedAt: emptyToNull(input.listedAt),
    soldAt,
    platform: input.platform ?? "mercari",
    updatedAt: new Date(),
  };
}

async function assertCanActivate(
  db: ReturnType<typeof getDb>,
  bundledIntoId: string | null,
) {
  if (!bundledIntoId) return;
  const [parent] = await db
    .select()
    .from(lineItems)
    .where(eq(lineItems.id, bundledIntoId))
    .limit(1);
  if (!parent) return;
  if (Number(parent.salePrice) > 0) {
    throw new Error(
      "This lot is already in a sold bundle, so it stays out of rotation.",
    );
  }
  if (parent.active) {
    throw new Error(
      "Deactivate the bundle first if you want this lot back in rotation.",
    );
  }
}

function parseItem(raw: ItemInput) {
  const parsed = itemSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Check the fields.");
  }
  return parsed.data;
}

function isUniqueViolation(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "cause" in err
      ? (err.cause as { code?: string } | undefined)?.code
      : undefined;
  return code === "23505";
}

function saveErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/abort|timeout|fetch failed/i.test(message)) {
    return "Database timed out. Try again.";
  }
  return "Could not save. Try again.";
}

export async function createItem(
  raw: ItemInput,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  await requireAppUser();
  const input = parseItem(raw);
  const id = input.id ?? crypto.randomUUID();
  try {
    const db = getDb();
    await withDbRetry(() =>
      db.insert(lineItems).values({ id, ...toRow(input), active: true }),
    );
    return { ok: true, id };
  } catch (err) {
    unstable_rethrow(err);
    if (isUniqueViolation(err)) return { ok: true, id };
    console.error("createItem failed", err);
    return { ok: false, message: saveErrorMessage(err) };
  }
}

export async function updateItem(
  id: string,
  raw: ItemInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAppUser();
  const input = parseItem(raw);
  const active = input.active ?? true;
  const db = getDb();

  try {
    let current:
      | { active: boolean; bundledIntoId: string | null }
      | undefined;
    try {
      [current] = await withDbRetry(() =>
        db
          .select({
            active: lineItems.active,
            bundledIntoId: lineItems.bundledIntoId,
          })
          .from(lineItems)
          .where(eq(lineItems.id, id))
          .limit(1),
      );
    } catch (err) {
      unstable_rethrow(err);
      console.error("updateItem lookup failed", err);
    }

    if (active && current) {
      await assertCanActivate(db, current.bundledIntoId);
    }

    await withDbRetry(() =>
      db
        .update(lineItems)
        .set({
          ...toRow(input),
          active,
        })
        .where(eq(lineItems.id, id)),
    );

    if (current && current.active !== active) {
      await withDbRetry(() =>
        db
          .update(lineItems)
          .set({ active: !active, updatedAt: new Date() })
          .where(eq(lineItems.bundledIntoId, id)),
      );
    }

    return { ok: true };
  } catch (err) {
    unstable_rethrow(err);
    console.error("updateItem failed", err);
    return { ok: false, message: saveErrorMessage(err) };
  }
}

export async function deleteItem(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAppUser();
  try {
    const db = getDb();
    await db.batch([
      db
        .update(lineItems)
        .set({ bundledIntoId: null, updatedAt: new Date() })
        .where(eq(lineItems.bundledIntoId, id)),
      db.delete(lineItems).where(eq(lineItems.id, id)),
    ]);
    return { ok: true };
  } catch (err) {
    unstable_rethrow(err);
    console.error("deleteItem failed");
    return { ok: false, message: "Could not delete that lot." };
  }
}

export async function setItemsActive(
  ids: string[],
  active: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireAppUser();
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return { ok: true };

  try {
    const db = getDb();
    const id = uniqueIds[0];
    const whereIds =
      uniqueIds.length === 1 ? eq(lineItems.id, id) : inArray(lineItems.id, uniqueIds);
    const whereChildren =
      uniqueIds.length === 1
        ? eq(lineItems.bundledIntoId, id)
        : inArray(lineItems.bundledIntoId, uniqueIds);

    await db.batch([
      db.update(lineItems).set({ active, updatedAt: new Date() }).where(whereIds),
      db
        .update(lineItems)
        .set({ active: !active, updatedAt: new Date() })
        .where(whereChildren),
    ]);

    return { ok: true };
  } catch (err) {
    unstable_rethrow(err);
    console.error("setItemsActive failed");
    return { ok: false, message: "Could not update those lots." };
  }
}

export async function createBundleFromItems(
  sourceIds: string[],
  raw: ItemInput,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  await requireAppUser();

  try {
    const parsed = itemSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Check the bundle fields.",
      };
    }

    const uniqueIds = [...new Set(sourceIds)];
    if (uniqueIds.length < 2) {
      return { ok: false, message: "Pick at least two lots to bundle." };
    }

    const db = getDb();
    const sources = await db
      .select({ platform: lineItems.platform })
      .from(lineItems)
      .where(inArray(lineItems.id, uniqueIds));
    const platforms = new Set(sources.map((row) => parsePlatform(row.platform)));
    if (platforms.size > 1) {
      return { ok: false, message: "Bundle lots from the same platform only." };
    }

    const bundleId = crypto.randomUUID();

    await db.batch([
      db.insert(lineItems).values({
        id: bundleId,
        ...toRow(parsed.data),
        active: true,
      }),
      db
        .update(lineItems)
        .set({
          active: false,
          bundledIntoId: bundleId,
          updatedAt: new Date(),
        })
        .where(inArray(lineItems.id, uniqueIds)),
    ]);

    return { ok: true, id: bundleId };
  } catch (err) {
    unstable_rethrow(err);
    console.error("createBundleFromItems failed");
    return { ok: false, message: "Could not create the bundle. Try again." };
  }
}
