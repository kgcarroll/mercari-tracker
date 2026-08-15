import { generateText, Output } from "ai";
import { z } from "zod";

import { median, nowAppDate } from "@/lib/dates";
import type { ComputedItem } from "@/lib/db/queries";
import {
  bundlesFromIds,
  daysSitting,
  exactFamilyCompsFor,
  familyCompsFor,
  productFamily,
  ruleBasedBundles,
  type BundleSuggestion,
  type InventoryAction,
  type StaleSuggestion,
} from "@/lib/insights";

const FREE_MODEL = "inclusionai/ling-3.0-tiny-free";

const bundleMixSchema = z
  .array(
    z.object({
      title: z.string(),
      why: z.string(),
      itemIds: z.array(z.string()).min(2).max(4),
    }),
  )
  .min(3)
  .max(3);

const insightOutput = z.object({
  actions: z.array(
    z.object({
      id: z.string(),
      action: z.enum(["solo", "bundle", "hold"]),
      reason: z.string(),
    }),
  ),
  bundles: bundleMixSchema,
});

function mapAction(action: "solo" | "bundle" | "hold"): InventoryAction {
  if (action === "solo") return "relist";
  return action;
}

function unsoldCatalog(
  items: ComputedItem[],
  today = nowAppDate(),
  staleIds?: Set<string>,
) {
  const unsold = items.filter(
    (item) =>
      item.status === "unsold" && item.active && item.platform !== "vinted",
  );
  const sold = items.filter(
    (item) => item.status === "sold" && item.platform !== "vinted",
  );
  return unsold.map((item) => {
    const family = productFamily(item.product);
    const exact = exactFamilyCompsFor(family, sold);
    const related = familyCompsFor(family, sold);
    return {
      id: item.id,
      product: item.product,
      family,
      cost: item.cost,
      shippingCost: item.shippingCost,
      daysSitting: daysSitting(item, today),
      unsoldInFamily: unsold.filter((row) => productFamily(row.product) === family)
        .length,
      exactMedianSale: median(exact.sales),
      exactMedianProfit: median(exact.profits),
      relatedMedianSale: median(related.sales),
      relatedMedianProfit: median(related.profits),
      stale: staleIds?.has(item.id) ?? false,
    };
  });
}

function pricedBundles(
  items: ComputedItem[],
  mixes: Array<{ title: string; why: string; itemIds: string[] }>,
  prefix: string,
): BundleSuggestion[] {
  const unsold = items.filter(
    (item) =>
      item.status === "unsold" && item.active && item.platform !== "vinted",
  );
  const sold = items.filter(
    (item) => item.status === "sold" && item.platform !== "vinted",
  );
  return bundlesFromIds(
    unsold,
    sold,
    mixes.map((bundle, index) => ({
      id: `${prefix}-${index}`,
      title: bundle.title,
      why: bundle.why,
      itemIds: bundle.itemIds,
    })),
  );
}

export async function suggestSmartInsights(
  items: ComputedItem[],
  stale: StaleSuggestion[],
  today = nowAppDate(),
): Promise<{
  stale: StaleSuggestion[];
  bundles: BundleSuggestion[];
  source: "ai" | "rules";
}> {
  const unsold = items.filter(
    (item) =>
      item.status === "unsold" && item.active && item.platform !== "vinted",
  );
  const sold = items.filter(
    (item) => item.status === "sold" && item.platform !== "vinted",
  );
  const fallbackBundles = ruleBasedBundles(unsold, sold);
  const catalog = unsoldCatalog(
    items,
    today,
    new Set(stale.map((row) => row.id)),
  );

  try {
    const { output } = await generateText({
      model: FREE_MODEL,
      output: Output.object({ schema: insightOutput }),
      prompt: `You decide what to do with unsold Mercari Needoh lots.

For every catalog item where stale=true, set action to solo, bundle, or hold, with a short reason.

Guidance:
- solo: this exact SKU or close comps sold at a healthy profit (Knittens $68, Sugar Skulls ~$26, Teenie Jacks ~$24–$28). Also use solo for a first copy of a lantern if related Teenie Jacks sold well.
- bundle: no exact comps, shipping is large vs a cheap single, OR extras when 3+ of the same family are sitting. Do not mark every lot bundle.
- hold: rarely. Do not special-case any SKU by name.
- Do not mark everything solo. Do not mark everything bundle.

Also return EXACTLY 3 optional bundle alternatives.
- Each bundle 2-4 items, different families inside a bundle (never three Jack-Glow-Lanterns).
- Prefer items you marked bundle.
- Bundles may reuse items across the 3 alternatives.
- Use only these item ids.

Catalog JSON:
${JSON.stringify(catalog)}`,
    });

    const actionById = new Map(
      (output?.actions ?? []).map((row) => [row.id, row]),
    );
    const nextStale = stale.map((row) => {
      const ai = actionById.get(row.id);
      if (!ai) return row;
      return {
        ...row,
        action: mapAction(ai.action),
        reason: ai.reason,
      };
    });

    const bundles = pricedBundles(items, output?.bundles ?? [], "ai");

    return {
      stale: nextStale,
      bundles: bundles.length >= 3 ? bundles.slice(0, 3) : fallbackBundles.slice(0, 3),
      source: actionById.size > 0 ? "ai" : "rules",
    };
  } catch {
    return {
      stale,
      bundles: fallbackBundles.slice(0, 3),
      source: "rules",
    };
  }
}
