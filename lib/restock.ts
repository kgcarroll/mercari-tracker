import { roundMoney } from "@/lib/calculations";
import { daysBetween, median, parseISODate } from "@/lib/dates";
import type { ComputedItem } from "@/lib/db/queries";
import { productFamily } from "@/lib/insights";

export type RestockAction = "buy" | "skip" | "maybe";

export type FamilyRestock = {
  family: string;
  label: string;
  stores: string[];
  soldCount: number;
  unsoldCount: number;
  soldCost: number;
  unsoldCost: number;
  totalProfit: number;
  roiOnSoldCost: number | null;
  medianDaysToSell: number | null;
  medianSale: number | null;
  medianProfit: number | null;
  action: RestockAction;
  reason: string;
};

const HEALTHY_PROFIT = 8;

function isBundle(product: string): boolean {
  return /^bundle:/i.test(product.trim());
}

function daysToSell(item: ComputedItem): number | null {
  if (item.status !== "sold" || !item.listedAt || !item.soldAt) return null;
  const posted = parseISODate(item.listedAt);
  const sold = parseISODate(item.soldAt);
  if (!posted || !sold) return null;
  return Math.max(0, daysBetween(posted, sold));
}

function familyLabel(items: ComputedItem[]): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    const name = item.product
      .replace(/^Needoh\s+/i, "")
      .replace(/\s*\([^)]*\)/g, "")
      .trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return (
    [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].length - b[0].length,
    )[0]?.[0] ?? items[0]?.product ?? "Unknown"
  );
}

function storesFor(items: ComputedItem[]): string[] {
  const stores = new Set<string>();
  for (const item of items) {
    const store = item.store.trim();
    if (!store || /^multiple stores$/i.test(store)) continue;
    stores.add(store);
  }
  return [...stores].sort((a, b) => a.localeCompare(b));
}

export function decideRestock(
  row: Omit<FamilyRestock, "action" | "reason">,
): { action: RestockAction; reason: string } {
  const profit = row.medianProfit;
  const days =
    row.medianDaysToSell == null
      ? ""
      : ` in about ${Math.round(row.medianDaysToSell)} ${Math.round(row.medianDaysToSell) === 1 ? "day" : "days"}`;

  if (row.unsoldCount >= 3) {
    return {
      action: "skip",
      reason: `${row.unsoldCount} already sitting. Don't add another.`,
    };
  }

  if (row.soldCount === 0 && row.unsoldCount >= 1) {
    return {
      action: "skip",
      reason: `None sold yet and ${row.unsoldCount} still listed.`,
    };
  }

  if (profit != null && profit < HEALTHY_PROFIT && row.soldCount >= 1) {
    return {
      action: "skip",
      reason: `Sold, but profit is only about ${formatUsd(profit)}.`,
    };
  }

  if (
    row.soldCount >= 1 &&
    profit != null &&
    profit >= HEALTHY_PROFIT &&
    row.unsoldCount === 0
  ) {
    return {
      action: "buy",
      reason: `Sold ${row.soldCount} at about ${formatUsd(profit)} profit${days}. If you see it, buy.`,
    };
  }

  if (
    row.soldCount >= 2 &&
    profit != null &&
    profit >= HEALTHY_PROFIT &&
    row.unsoldCount <= 1
  ) {
    return {
      action: "buy",
      reason: `Sold ${row.soldCount} at about ${formatUsd(profit)} profit${days}. Buy another if the shelf is empty.`,
    };
  }

  if (
    row.soldCount >= 1 &&
    profit != null &&
    profit >= HEALTHY_PROFIT &&
    row.unsoldCount >= 1
  ) {
    return {
      action: "maybe",
      reason: `Prints well (~${formatUsd(profit)}), but you already have ${row.unsoldCount} listed.`,
    };
  }

  return {
    action: "maybe",
    reason: "Not enough history to call it a restock.",
  };
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function buildRestockGuide(items: ComputedItem[]): FamilyRestock[] {
  const groups = new Map<string, ComputedItem[]>();
  for (const item of items) {
    if (isBundle(item.product)) continue;
    const family = productFamily(item.product);
    if (!family) continue;
    const list = groups.get(family) ?? [];
    list.push(item);
    groups.set(family, list);
  }

  const rows: FamilyRestock[] = [];
  for (const [family, group] of groups) {
    const sold = group.filter((item) => item.status === "sold");
    const unsold = group.filter((item) => item.status === "unsold" && item.active);
    const soldCost = roundMoney(sold.reduce((sum, item) => sum + item.cost, 0));
    const totalProfit = roundMoney(
      sold.reduce((sum, item) => sum + (item.profit ?? 0), 0),
    );
    const sellTimes = sold
      .map(daysToSell)
      .filter((value): value is number => value != null);
    const sales = sold.map((item) => item.salePrice);
    const profits = sold
      .map((item) => item.profit)
      .filter((value): value is number => value != null);

    const stats = {
      family,
      label: familyLabel(group),
      stores: storesFor(group),
      soldCount: sold.length,
      unsoldCount: unsold.length,
      soldCost,
      unsoldCost: roundMoney(unsold.reduce((sum, item) => sum + item.cost, 0)),
      totalProfit,
      roiOnSoldCost: soldCost === 0 ? null : totalProfit / soldCost,
      medianDaysToSell: median(sellTimes),
      medianSale: median(sales),
      medianProfit: median(profits),
    };
    const { action, reason } = decideRestock(stats);
    rows.push({ ...stats, action, reason });
  }

  return sortRestock(rows);
}

export function sortRestock(rows: FamilyRestock[]): FamilyRestock[] {
  return [...rows].sort((a, b) => {
    const rank = { buy: 0, maybe: 1, skip: 2 };
    const byAction = rank[a.action] - rank[b.action];
    if (byAction !== 0) return byAction;
    if (a.action === "skip") {
      return b.unsoldCount - a.unsoldCount || b.unsoldCost - a.unsoldCost;
    }
    return (b.roiOnSoldCost ?? -1) - (a.roiOnSoldCost ?? -1);
  });
}

export function restockTripNote(rows: FamilyRestock[]): string | null {
  const buy = rows.filter((row) => row.action === "buy").map((row) => row.label);
  const skip = rows
    .filter((row) => row.action === "skip" && row.unsoldCount >= 2)
    .map((row) => row.label);
  if (buy.length === 0 && skip.length === 0) return null;
  const parts: string[] = [];
  if (buy.length > 0) {
    parts.push(`Buy ${buy.slice(0, 3).join(", ")} if you see them.`);
  }
  if (skip.length > 0) {
    parts.push(`Skip more ${skip.slice(0, 3).join(", ")} — extras are already sitting.`);
  }
  return parts.join(" ");
}
