import { desc, eq } from "drizzle-orm";

import { calculateLineItem, summarize, type Summary } from "@/lib/calculations";
import { toISODateString } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { lineItems, type LineItemRow } from "@/lib/db/schema";
import { parsePlatform } from "@/lib/platform";

export type ComputedItem = {
  id: string;
  product: string;
  store: string;
  cost: number;
  salePrice: number;
  shippingCost: number;
  notes: string | null;
  purchasedAt: string | null;
  listedAt: string | null;
  soldAt: string | null;
  active: boolean;
  bundledIntoId: string | null;
  bundledIntoProduct: string | null;
  platform: "mercari" | "vinted";
  mercariFee: number;
  netSale: number;
  profit: number | null;
  profitPct: number | null;
  status: "sold" | "unsold";
};

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

export function enrichItem(
  row: LineItemRow,
  bundledIntoProduct: string | null = null,
): ComputedItem {
  const cost = toNumber(row.cost);
  const salePrice = toNumber(row.salePrice);
  const shippingCost = toNumber(row.shippingCost);
  const platform = parsePlatform(row.platform);
  const calc = calculateLineItem({ cost, salePrice, shippingCost, platform });

  return {
    id: row.id,
    product: row.product,
    store: row.store,
    cost,
    salePrice,
    shippingCost,
    notes: row.notes,
    purchasedAt: toISODateString(row.purchasedAt),
    listedAt: toISODateString(row.listedAt),
    soldAt: toISODateString(row.soldAt),
    active: row.active,
    bundledIntoId: row.bundledIntoId,
    bundledIntoProduct,
    platform,
    ...calc,
  };
}

export async function listItems(): Promise<ComputedItem[]> {
  const db = getDb();
  let rows;
  try {
    rows = await db.select().from(lineItems).orderBy(desc(lineItems.createdAt));
  } catch {
    rows = await db.select().from(lineItems).orderBy(desc(lineItems.createdAt));
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  return rows.map((row) => {
    const parent = row.bundledIntoId ? byId.get(row.bundledIntoId) : undefined;
    return enrichItem(row, parent?.product ?? null);
  });
}

export async function getItem(id: string): Promise<ComputedItem | null> {
  const db = getDb();
  const [row] = await db.select().from(lineItems).where(eq(lineItems.id, id)).limit(1);
  return row ? enrichItem(row) : null;
}

export async function getDashboard(): Promise<{
  items: ComputedItem[];
  summary: Summary;
}> {
  const items = await listItems();
  return { items, summary: summarize(items) };
}
