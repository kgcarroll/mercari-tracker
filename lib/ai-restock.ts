import { generateText, Output } from "ai";
import { z } from "zod";

import type { FamilyRestock, RestockAction } from "@/lib/restock";
import { sortRestock } from "@/lib/restock";

const FREE_MODEL = "inclusionai/ling-3.0-tiny-free";

const restockOutput = z.object({
  note: z.string(),
  families: z.array(
    z.object({
      family: z.string(),
      action: z.enum(["buy", "skip", "maybe"]),
      reason: z.string(),
    }),
  ),
});

export async function suggestRestock(
  rows: FamilyRestock[],
): Promise<{
  rows: FamilyRestock[];
  note: string | null;
  source: "ai" | "rules";
}> {
  const catalog = rows.map((row) => ({
    family: row.family,
    label: row.label,
    stores: row.stores,
    soldCount: row.soldCount,
    unsoldCount: row.unsoldCount,
    medianSale: row.medianSale,
    medianProfit: row.medianProfit,
    roiOnSoldCost: row.roiOnSoldCost,
    medianDaysToSell: row.medianDaysToSell,
    ruleAction: row.action,
  }));

  try {
    const { output } = await generateText({
      model: FREE_MODEL,
      output: Output.object({ schema: restockOutput }),
      prompt: `You advise a Mercari Needoh restock trip to Hallmark, Learning Express, and Target.

For every family, set action to buy, skip, or maybe, with a short reason.
Also write a 1-2 sentence "this trip" note. Name stores when it helps.

Guidance:
- buy: sold at a healthy profit and extras are not already sitting. Winners like Knittens, Sugar Skulls, Teenie Jacks.
- skip: 2+ already unsold, never sold, or weak profit. Do not buy another full lantern if several are sitting.
- maybe: sold well but one is already listed, or history is thin.
- Do not mark everything buy. Do not mark everything skip.
- Use only these family keys.

Families JSON:
${JSON.stringify(catalog)}`,
    });

    const byFamily = new Map(
      (output?.families ?? []).map((row) => [row.family, row]),
    );
    const next = rows.map((row) => {
      const ai = byFamily.get(row.family);
      if (!ai) return row;
      return {
        ...row,
        action: ai.action as RestockAction,
        reason: ai.reason,
      };
    });

    const note = output?.note?.trim() || null;
    return {
      rows: sortRestock(next),
      note,
      source: byFamily.size > 0 || note ? "ai" : "rules",
    };
  } catch {
    return { rows, note: null, source: "rules" };
  }
}
