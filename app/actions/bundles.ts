"use server";

import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import { refineSmartBundles } from "@/lib/ai-bundles";
import { getDashboard } from "@/lib/db/queries";
import type { BundleSuggestion } from "@/lib/insights";

const refineSchema = z.object({
  prompt: z.string().trim().min(1, "Ask for a different mix.").max(240),
  current: z.array(
    z.object({
      title: z.string(),
      why: z.string(),
      itemIds: z.array(z.string()),
      products: z.array(z.string()),
    }),
  ),
});

export async function refineBundleSuggestions(
  prompt: string,
  current: Array<{
    title: string;
    why: string;
    itemIds: string[];
    products: string[];
  }>,
): Promise<BundleSuggestion[]> {
  await requireAppUser();
  const input = refineSchema.parse({ prompt, current });
  const { items } = await getDashboard();
  try {
    return await refineSmartBundles(items, input.prompt, input.current);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Could not build")) {
      throw err;
    }
    throw new Error("Could not update mixes. Try again.");
  }
}
