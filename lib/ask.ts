import { calculateLineItem, roundMoney } from "@/lib/calculations";
import { daysBetween, median, nowAppDate, parseISODate } from "@/lib/dates";
import type { ComputedItem } from "@/lib/db/queries";
import { formatMoney } from "@/lib/format";
import {
  AGING_MIN_DAYS,
  STALE_MIN_DAYS,
  decideAction,
  exactFamilyCompsFor,
  familyCompsFor,
  productFamily,
  soloCompSale,
  type InventoryAction,
  type StaleSuggestion,
} from "@/lib/insights";

/** Profit below this after Mercari fees is barely covering shipping. */
export const FLOOR_PROFIT = 5;
/** Same bar Insights uses for a healthy solo. */
export const HEALTHY_PROFIT = 8;

export type AskStage = "fresh" | "aging" | "stale" | "undated";

export type AskAdvice = {
  ask: number;
  floor: number;
  feeAtAsk: number;
  profitAtAsk: number | null;
  stage: AskStage;
  action: InventoryAction;
  label: "Ask" | "Drop to" | "Last solo ask";
  reason: string;
  compSale: number | null;
};

export type AskSubject = {
  product: string;
  cost: number;
  shippingCost: number;
  listedAt: string | null;
  active: boolean;
  status: "sold" | "unsold";
};

function roundDollar(value: number): number {
  return Math.max(1, Math.round(value));
}

function sittingDays(listedAt: string | null, today: Date): number | null {
  if (!listedAt) return null;
  const posted = parseISODate(listedAt);
  if (!posted) return null;
  return Math.max(0, daysBetween(posted, today));
}

/** Sale price that yields `profit` after Mercari's 10% on (sale + shipping). */
export function saleToHitProfit(
  cost: number,
  shippingCost: number,
  profit: number,
): number {
  return roundMoney((profit + cost + 0.1 * shippingCost) / 0.9);
}

function stageFor(days: number | null): AskStage {
  if (days == null) return "undated";
  if (days >= STALE_MIN_DAYS) return "stale";
  if (days >= AGING_MIN_DAYS) return "aging";
  return "fresh";
}

function dropFromComp(
  comp: number,
  stage: AskStage,
): { ask: number; label: AskAdvice["label"] } {
  if (stage === "aging") {
    return { ask: roundDollar(comp - 2), label: "Drop to" };
  }
  if (stage === "stale") {
    return { ask: roundDollar(comp - 4), label: "Last solo ask" };
  }
  return { ask: roundDollar(comp), label: "Ask" };
}

export function adviseAsk(
  item: AskSubject,
  sold: ComputedItem[],
  unsold: ComputedItem[],
  today = nowAppDate(),
): AskAdvice | null {
  if (!item.active || item.status !== "unsold") return null;
  if (!item.product.trim()) return null;

  const sitting = sittingDays(item.listedAt, today);
  const stage = stageFor(sitting);
  const stub = {
    product: item.product,
    cost: item.cost,
    shippingCost: item.shippingCost,
  } as ComputedItem;
  const { action } = decideAction(stub, sold, unsold);

  const family = productFamily(item.product);
  const exactSale = median(exactFamilyCompsFor(family, sold).sales);
  const relatedSale = median(familyCompsFor(family, sold).sales);
  const comp = soloCompSale(stub, sold);
  const floor = roundDollar(
    saleToHitProfit(item.cost, item.shippingCost, FLOOR_PROFIT),
  );
  const dropped = dropFromComp(comp, stage);
  let ask = Math.max(dropped.ask, floor);
  let label = dropped.label;

  if (action === "bundle" || action === "hold") {
    ask = Math.max(roundDollar(comp), floor);
    label = "Ask";
  }

  const atAsk = calculateLineItem({
    cost: item.cost,
    salePrice: ask,
    shippingCost: item.shippingCost,
  });

  const sittingBit =
    sitting == null
      ? "No posted date yet."
      : sitting === 1
        ? "1 day sitting."
        : `${sitting} days sitting.`;
  const compBit =
    exactSale != null
      ? `Exact comps sold around ${formatMoney(exactSale)}.`
      : relatedSale != null
        ? `Related comps sold around ${formatMoney(relatedSale)}.`
        : "No sold comps for this family, so the ask is a cost-based guess.";
  const keepBit =
    action === "bundle"
      ? ` Do not keep cutting a solo — bundle instead of going below ${formatMoney(floor)}.`
      : action === "hold"
        ? ` Hold rather than listing below ${formatMoney(floor)}.`
        : atAsk.profit != null && atAsk.profit < HEALTHY_PROFIT
          ? ` That is a thin solo (under ${formatMoney(HEALTHY_PROFIT)} profit). Keep it rather than listing below ${formatMoney(floor)}.`
          : ` Keep it rather than listing below ${formatMoney(floor)}.`;

  return {
    ask,
    floor,
    feeAtAsk: atAsk.mercariFee,
    profitAtAsk: atAsk.profit,
    stage,
    action,
    label,
    reason: `${sittingBit} ${compBit}${keepBit}`,
    compSale: exactSale ?? relatedSale ?? null,
  };
}

export function attachAskAdvice(
  stale: StaleSuggestion[],
  items: ComputedItem[],
  today = nowAppDate(),
): StaleSuggestion[] {
  const sold = items.filter((item) => item.status === "sold");
  const unsold = items.filter((item) => item.status === "unsold" && item.active);
  return stale.map((row) => {
    const item = items.find((lot) => lot.id === row.id);
    if (!item) return row;
    const advice = adviseAsk(item, sold, unsold, today);
    if (!advice) return row;
    return {
      ...row,
      ask: advice.ask,
      floor: advice.floor,
      profitAtAsk: advice.profitAtAsk,
      askLabel: advice.label,
    };
  });
}
