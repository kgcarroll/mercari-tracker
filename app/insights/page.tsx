import { AgingChart } from "@/components/aging-chart";
import { AppHeader } from "@/components/app-header";
import { BundleSuggestions } from "@/components/bundle-suggestions";
import { InsightsPlatformToggle } from "@/components/insights-platform-toggle";
import { StaleActions } from "@/components/stale-actions";
import { attachAskAdvice } from "@/lib/ask";
import { suggestSmartInsights } from "@/lib/ai-bundles";
import { requireAppUser } from "@/lib/auth";
import { getDashboard } from "@/lib/db/queries";
import { buildInsights } from "@/lib/insights";
import {
  VINTED_DROP_AFTER_DAYS,
  VINTED_GOAL,
  buildVintedInsights,
} from "@/lib/vinted-insights";

export const maxDuration = 60;

export default async function InsightsPage({
  searchParams,
}: {
  searchParams?: Promise<{ platform?: string | string[] }>;
}) {
  await requireAppUser();
  const params = (await searchParams) ?? {};
  const raw = Array.isArray(params.platform) ? params.platform[0] : params.platform;
  const platform = raw === "vinted" ? "vinted" : "mercari";
  const { items } = await getDashboard();

  if (platform === "vinted") {
    const insights = buildVintedInsights(items);
    return (
      <div className="flex min-h-full flex-col">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {VINTED_GOAL === "clear"
                  ? `Clear the closet. Drop listings that have sat ${insights.staleAfterDays} days. A target appears when a similar listing already sold.`
                  : "Holding closet listings. Aging is tracked; drop nags are off."}
              </p>
            </div>
            <InsightsPlatformToggle value="vinted" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <StaleActions
              suggestions={insights.stale}
              emptyMessage={`Nothing has sat ${VINTED_DROP_AFTER_DAYS} days. Add posted dates if a listing is missing one.`}
            />
            <AgingChart buckets={insights.aging} measure="count" />
          </div>
        </main>
      </div>
    );
  }

  const insights = buildInsights(items);
  const smart = await suggestSmartInsights(items, insights.stale);
  const stale = attachAskAdvice(smart.stale, items);

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          </div>
          <InsightsPlatformToggle value="mercari" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <StaleActions suggestions={stale} />
          <AgingChart buckets={insights.aging} />
        </div>
        <BundleSuggestions bundles={smart.bundles} source={smart.source} />
      </main>
    </div>
  );
}
