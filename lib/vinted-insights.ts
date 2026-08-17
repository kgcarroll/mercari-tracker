import { roundMoney } from "@/lib/calculations";
import { median, nowAppDate, todayISODate } from "@/lib/dates";
import type { ComputedItem } from "@/lib/db/queries";
import { formatMoney } from "@/lib/format";
import {
  agingKey,
  daysSitting,
  type AgingBucket,
  type AgingBucketKey,
  type BundleSuggestion,
  type InventoryInsights,
  type StaleSuggestion,
} from "@/lib/insights";

/** Clear the closet. Switch to "hold" to stop drop nags. */
export type VintedGoal = "clear" | "hold";

export const VINTED_GOAL: VintedGoal = "clear";

/** Days sitting before "drop it". Raise this to relax. */
export const VINTED_DROP_AFTER_DAYS = 14;
/** After this, aim a bit under the sold median. */
export const VINTED_NUDGE_AFTER_DAYS = 21;
/** After this, aim further under the sold median. */
export const VINTED_CLEAR_AFTER_DAYS = 30;
export const VINTED_MIN_ASK = 3;

const WEAK_TITLE_TOKENS = new Set([
  "and",
  "boy",
  "boys",
  "for",
  "girl",
  "girls",
  "kid",
  "kids",
  "large",
  "man",
  "medium",
  "men",
  "mens",
  "nwt",
  "nwot",
  "size",
  "small",
  "the",
  "with",
  "woman",
  "women",
  "womens",
  "xxl",
]);

export function vintedDropAfterDays(
  goal: VintedGoal = VINTED_GOAL,
  dropAfterDays = VINTED_DROP_AFTER_DAYS,
): number {
  return goal === "clear" ? dropAfterDays : Number.POSITIVE_INFINITY;
}

export function shouldDropVintedListing(
  days: number | null,
  goal: VintedGoal = VINTED_GOAL,
  dropAfterDays = VINTED_DROP_AFTER_DAYS,
): boolean {
  if (goal !== "clear") return false;
  return days != null && days >= dropAfterDays;
}

/** Brand / garment tokens. Keeps parentheticals. Drops size, gender, numbers. */
export function vintedTitleTokens(title: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const token of title
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)) {
    if (
      token.length < 3 ||
      WEAK_TITLE_TOKENS.has(token) ||
      /^\d/.test(token) ||
      seen.has(token)
    ) {
      continue;
    }
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

function sharedTitleTokens(a: string, b: string): number {
  const other = new Set(vintedTitleTokens(b));
  let shared = 0;
  for (const token of vintedTitleTokens(a)) {
    if (other.has(token)) shared += 1;
  }
  return shared;
}

/** Same brand + garment, not swimsuit vs leggings. Needs 2 shared tokens. */
export function similarVintedSold(
  title: string,
  sold: ComputedItem[],
): ComputedItem[] {
  const tokens = vintedTitleTokens(title);
  if (tokens.length < 2) return [];
  return sold.filter(
    (item) => item.salePrice > 0 && sharedTitleTokens(title, item.product) >= 2,
  );
}

export function vintedTargetAsk(
  medianSale: number,
  days: number,
): number {
  let ask = Math.round(medianSale);
  if (days >= VINTED_CLEAR_AFTER_DAYS) ask -= 4;
  else if (days >= VINTED_NUDGE_AFTER_DAYS) ask -= 2;
  return Math.max(VINTED_MIN_ASK, ask);
}

function dropSuggestion(
  item: ComputedItem,
  sitting: number,
  sold: ComputedItem[],
): StaleSuggestion {
  const comps = similarVintedSold(item.product, sold);
  const soldAround = median(comps.map((comp) => comp.salePrice));
  if (soldAround == null) {
    return {
      id: item.id,
      product: item.product,
      cost: item.cost,
      daysSitting: sitting,
      action: "drop",
      reason: `${sitting} days sitting. Drop the ask so it moves.`,
    };
  }

  const ask = vintedTargetAsk(soldAround, sitting);
  const around = formatMoney(roundMoney(soldAround));
  const compBit =
    comps.length === 1
      ? `A similar listing sold for ${around}.`
      : `Similar listings sold around ${around}.`;
  const tryBit =
    ask === Math.round(soldAround)
      ? "Try that."
      : `Try about ${formatMoney(ask)}.`;

  return {
    id: item.id,
    product: item.product,
    cost: item.cost,
    daysSitting: sitting,
    action: "drop",
    ask,
    askLabel: "Try about",
    reason: `${sitting} days sitting. ${compBit} ${tryBit}`,
  };
}

/**
 * Clothing lots later. Keep this hook so Vinted Insights can attach
 * bundles without teaching Needoh mix logic about closet listings.
 */
export function vintedBundles(
  _unsold: ComputedItem[],
  _sold: ComputedItem[],
): BundleSuggestion[] {
  return [];
}

export function buildVintedInsights(
  items: ComputedItem[],
  today = nowAppDate(),
  goal: VintedGoal = VINTED_GOAL,
): InventoryInsights {
  const dropAfterDays = vintedDropAfterDays(goal);
  const unsold = items.filter(
    (item) =>
      item.status === "unsold" && item.active && item.platform === "vinted",
  );
  const sold = items.filter(
    (item) => item.status === "sold" && item.platform === "vinted",
  );

  const stale: StaleSuggestion[] = [];
  for (const item of unsold) {
    const sitting = daysSitting(item, today);
    if (sitting == null) {
      stale.push({
        id: item.id,
        product: item.product,
        cost: item.cost,
        daysSitting: null,
        action: "hold",
        reason: "Add a posted date so we know when to drop the ask.",
      });
      continue;
    }
    if (!shouldDropVintedListing(sitting, goal, VINTED_DROP_AFTER_DAYS)) {
      continue;
    }
    stale.push(dropSuggestion(item, sitting, sold));
  }
  stale.sort((a, b) => {
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
    medianDaysToSell: null,
    staleAfterDays: Number.isFinite(dropAfterDays) ? dropAfterDays : VINTED_DROP_AFTER_DAYS,
    stale,
    aging: [agingMap.fresh, agingMap.aging, agingMap.stale, agingMap.undated],
    bundles: vintedBundles(unsold, sold),
  };
}
