"use server";

import { z } from "zod";

import { requireAppUser } from "@/lib/auth";
import { refineSmartBundles } from "@/lib/ai-bundles";
import { getDashboard } from "@/lib/db/queries";
import type { BundleSuggestion } from "@/lib/insights";

export type RefineBundlesResult =
  | { ok: true; bundles: BundleSuggestion[] }
  | { ok: false; message: string };

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
): Promise<RefineBundlesResult> {
  await requireAppUser();
  const parsed = refineSchema.safeParse({ prompt, current });
  if (!parsed.success) {
    return { ok: false, message: "Ask for a different mix." };
  }

  const { items } = await getDashboard();
  try {
    const bundles = await refineSmartBundles(
      items,
      parsed.data.prompt,
      parsed.data.current,
    );
    return { ok: true, bundles };
  } catch (err) {
    console.error("refineBundleSuggestions failed", err);
    if (err instanceof Error && err.message.startsWith("Could not build")) {
      return { ok: false, message: err.message };
    }
    return { ok: false, message: "Could not update mixes. Try again." };
  }
}
