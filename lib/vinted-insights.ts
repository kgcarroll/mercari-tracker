import { roundMoney } from "@/lib/calculations";
import { nowAppDate, todayISODate } from "@/lib/dates";
import type { ComputedItem } from "@/lib/db/queries";
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
    stale.push({
      id: item.id,
      product: item.product,
      cost: item.cost,
      daysSitting: sitting,
      action: "drop",
      reason: `${sitting} days sitting. Drop the ask so it moves.`,
    });
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
