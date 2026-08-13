import { calculateLineItem, roundMoney } from "@/lib/calculations";
import { daysBetween, median, nowAppDate, parseISODate, todayISODate } from "@/lib/dates";
import type { ComputedItem } from "@/lib/db/queries";

export type InventoryAction = "relist" | "bundle" | "hold";

export type StaleSuggestion = {
  id: string;
  product: string;
  cost: number;
  daysSitting: number | null;
  action: InventoryAction;
  reason: string;
};

export type AgingBucketKey = "fresh" | "aging" | "stale" | "undated";

export type AgingBucket = {
  key: AgingBucketKey;
  label: string;
  count: number;
  cost: number;
};

export type BundleSuggestion = {
  id: string;
  title: string;
  why: string;
  itemIds: string[];
  products: string[];
  cost: number;
  shippingCost: number;
  suggestedSale: number;
  mercariFee: number;
  profit: number;
};

export type InventoryInsights = {
  today: string;
  medianDaysToSell: number | null;
  staleAfterDays: number;
  stale: StaleSuggestion[];
  aging: AgingBucket[];
  bundles: BundleSuggestion[];
};

/** Posted 0–6 days. */
export const FRESH_MAX_DAYS = 6;
/** Posted 7–13 days. */
export const AGING_MIN_DAYS = 7;
export const AGING_MAX_DAYS = 13;
/** Posted 14+ days. */
export const STALE_MIN_DAYS = 14;

export function productFamily(product: string): string {
  return product
    .toLowerCase()
    .replace(/^bundle:\s*/, "")
    .replace(/^needoh\s+/, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function daysSitting(item: ComputedItem, today: Date): number | null {
  if (item.status !== "unsold" || !item.listedAt) return null;
  const posted = parseISODate(item.listedAt);
  if (!posted) return null;
  return Math.max(0, daysBetween(posted, today));
}

function daysToSell(item: ComputedItem): number | null {
  if (item.status !== "sold" || !item.listedAt || !item.soldAt) return null;
  const posted = parseISODate(item.listedAt);
  const sold = parseISODate(item.soldAt);
  if (!posted || !sold) return null;
  return Math.max(0, daysBetween(posted, sold));
}

function agingKey(days: number | null): AgingBucketKey {
  if (days == null) return "undated";
  if (days >= STALE_MIN_DAYS) return "stale";
  if (days >= AGING_MIN_DAYS) return "aging";
  return "fresh";
}

export function familyCompsFor(
  family: string,
  sold: ComputedItem[],
): { sales: number[]; profits: number[] } {
  const sales: number[] = [];
  const profits: number[] = [];
  for (const item of sold) {
    const soldFamily = productFamily(item.product);
    if (soldFamily === family || soldFamily.includes(family) || family.includes(soldFamily)) {
      sales.push(item.salePrice);
      if (item.profit != null) profits.push(item.profit);
    }
  }
  return { sales, profits };
}

export function exactFamilyCompsFor(
  family: string,
  sold: ComputedItem[],
): { sales: number[]; profits: number[] } {
  const sales: number[] = [];
  const profits: number[] = [];
  for (const item of sold) {
    if (productFamily(item.product) !== family) continue;
    sales.push(item.salePrice);
    if (item.profit != null) profits.push(item.profit);
  }
  return { sales, profits };
}

export function decideAction(
  item: ComputedItem,
  sold: ComputedItem[],
  unsold: ComputedItem[],
): { action: InventoryAction; reason: string } {
  const family = productFamily(item.product);
  const exact = exactFamilyCompsFor(family, sold);
  const related = familyCompsFor(family, sold);
  const exactProfit = median(exact.profits);
  const exactSale = median(exact.sales);
  const relatedProfit = median(related.profits);
  const relatedSale = median(related.sales);
  const unsoldInFamily = unsold.filter(
    (row) => productFamily(row.product) === family,
  ).length;

  if (exactProfit != null && exactProfit >= 8 && exactSale != null) {
    return {
      action: "relist",
      reason: `This exact SKU sold around ${formatUsd(exactSale)} with about ${formatUsd(exactProfit)} profit. List it solo.`,
    };
  }

  if (unsoldInFamily >= 3 && (exactProfit == null || exactProfit < 8)) {
    return {
      action: "bundle",
      reason: `${unsoldInFamily} of this family are sitting and have not sold as this exact SKU. Keep one listed solo; bundle the extras.`,
    };
  }

  if (exactProfit == null && item.cost <= 8 && item.shippingCost >= 4.5) {
    return {
      action: "bundle",
      reason: "No sold comps for this exact SKU, and shipping is large vs a cheap single. Better in a mixed listing.",
    };
  }

  if (relatedSale != null && relatedProfit != null && relatedProfit >= 8) {
    return {
      action: "relist",
      reason: `Related lots sold around ${formatUsd(relatedSale)} with about ${formatUsd(relatedProfit)} profit. Try this solo before bundling.`,
    };
  }

  return {
    action: "relist",
    reason: "Try it solo first. Bundle only if it still will not move.",
  };
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function priceBundle(items: ComputedItem[]): {
  cost: number;
  shippingCost: number;
  suggestedSale: number;
  mercariFee: number;
  profit: number;
} {
  const cost = roundMoney(items.reduce((sum, item) => sum + item.cost, 0));
  const shippingCost = roundMoney(
    Math.max(...items.map((item) => item.shippingCost), 4.91),
  );
  const suggestedSale = roundMoney(Math.max(items.length * 18, cost * 2.5));
  const calc = calculateLineItem({
    cost,
    salePrice: suggestedSale,
    shippingCost,
  });
  return {
    cost,
    shippingCost,
    suggestedSale,
    mercariFee: calc.mercariFee,
    profit: calc.profit ?? 0,
  };
}

export function bundlesFromIds(
  items: ComputedItem[],
  groups: Array<{ id: string; title: string; why: string; itemIds: string[] }>,
): BundleSuggestion[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const bundles: BundleSuggestion[] = [];

  for (const group of groups) {
    const members: ComputedItem[] = [];
    const families = new Set<string>();
    for (const id of group.itemIds) {
      const item = byId.get(id);
      if (!item || item.status !== "unsold") continue;
      const family = productFamily(item.product);
      if (families.has(family)) continue;
      families.add(family);
      members.push(item);
    }
    if (members.length < 2) continue;
    bundles.push({
      id: group.id,
      title: group.title,
      why: group.why,
      itemIds: members.map((item) => item.id),
      products: members.map((item) => item.product),
      ...priceBundle(members),
    });
  }

  return bundles;
}

function leftoverPool(unsold: ComputedItem[], sold: ComputedItem[]): ComputedItem[] {
  return unsold.filter((item) => {
    const family = productFamily(item.product);
    const exact = sold.filter((row) => productFamily(row.product) === family);
    const exactProfit = median(
      exact.map((row) => row.profit).filter((value): value is number => value != null),
    );
    return exactProfit == null || exactProfit < 8;
  });
}

function firstOfFamily(pool: ComputedItem[], test: (family: string) => boolean): ComputedItem | undefined {
  return pool.find((item) => test(productFamily(item.product)));
}

export function ruleBasedBundles(
  unsold: ComputedItem[],
  sold: ComputedItem[],
): BundleSuggestion[] {
  const pool = leftoverPool(unsold, sold);
  const lantern = firstOfFamily(pool, (family) => /jack-glow-lantern$/.test(family));
  const glob = firstOfFamily(pool, (family) => /glob/.test(family));
  const pups = firstOfFamily(pool, (family) => /funky pups/.test(family));
  const hotShots = firstOfFamily(pool, (family) => /hot shots/.test(family));
  const gummy = firstOfFamily(pool, (family) => /gummy/.test(family));
  const glitter = firstOfFamily(pool, (family) => /glitter/.test(family));

  let bundles = bundlesFromIds(unsold, [
    {
      id: "glow-mix",
      title: "Glow mix",
      why: "One lantern plus other glow leftovers. Not three lanterns.",
      itemIds: [lantern, glob, pups].filter(Boolean).map((item) => item!.id),
    },
    {
      id: "slow-le",
      title: "Learning Express slow movers",
      why: "Different LE singles that have not printed like Knittens.",
      itemIds: [hotShots, gummy, glitter, pups]
        .filter(Boolean)
        .map((item) => item!.id)
        .slice(0, 3),
    },
    {
      id: "shelf-clear",
      title: "Shelf-clear pair",
      why: "A small mixed listing if the glow and LE mixes are not a fit.",
      itemIds: [hotShots, glob, lantern].filter(Boolean).map((item) => item!.id),
    },
  ]);

  if (bundles.length >= 3) return bundles.slice(0, 3);

  const unique = [...new Map(pool.map((item) => [productFamily(item.product), item])).values()];
  const extras = [0, 1, 2]
    .map((offset) => unique.slice(offset, offset + 3))
    .filter((group) => group.length >= 2)
    .map((group, index) => ({
      id: `mix-${index}`,
      title: `Mix ${index + 1}`,
      why: "Different leftover families. List strong singles on their own.",
      itemIds: group.map((item) => item.id),
    }));

  return bundlesFromIds(unsold, [
    ...bundles.map((bundle) => ({
      id: bundle.id,
      title: bundle.title,
      why: bundle.why,
      itemIds: bundle.itemIds,
    })),
    ...extras,
  ]).slice(0, 3);
}

export function buildInsights(
  items: ComputedItem[],
  today = nowAppDate(),
): InventoryInsights {
  const sellTimes = items
    .map(daysToSell)
    .filter((value): value is number => value != null);
  const medianDaysToSell = median(sellTimes);
  const sold = items.filter((item) => item.status === "sold");
  const unsold = items.filter((item) => item.status === "unsold");

  const stale: StaleSuggestion[] = unsold
    .map((item) => {
      const sitting = daysSitting(item, today);
      const { action, reason } = decideAction(item, sold, unsold);
      const needsAction = sitting == null || sitting >= AGING_MIN_DAYS;
      if (!needsAction) return null;
      return {
        id: item.id,
        product: item.product,
        cost: item.cost,
        daysSitting: sitting,
        action,
        reason,
      };
    })
    .filter((row): row is StaleSuggestion => row != null)
    .sort((a, b) => {
      if (a.daysSitting == null && b.daysSitting == null) return b.cost - a.cost;
      if (a.daysSitting == null) return 1;
      if (b.daysSitting == null) return -1;
      return b.daysSitting - a.daysSitting || b.cost - a.cost;
    });

  const agingMap: Record<AgingBucketKey, AgingBucket> = {
    fresh: { key: "fresh", label: "Fresh", count: 0, cost: 0 },
    aging: { key: "aging", label: "Aging", count: 0, cost: 0 },
    stale: { key: "stale", label: "Stale", count: 0, cost: 0 },
    undated: { key: "undated", label: "No date", count: 0, cost: 0 },
  };

  for (const item of unsold) {
    const key = agingKey(daysSitting(item, today));
    agingMap[key].count += 1;
    agingMap[key].cost = roundMoney(agingMap[key].cost + item.cost);
  }

  return {
    today: todayISODate(),
    medianDaysToSell,
    staleAfterDays: AGING_MIN_DAYS,
    stale,
    aging: [agingMap.fresh, agingMap.aging, agingMap.stale, agingMap.undated],
    bundles: ruleBasedBundles(unsold, sold),
  };
}
