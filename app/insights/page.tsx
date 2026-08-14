import { AgingChart } from "@/components/aging-chart";
import { AppHeader } from "@/components/app-header";
import { BundleSuggestions } from "@/components/bundle-suggestions";
import { StaleActions } from "@/components/stale-actions";
import { attachAskAdvice } from "@/lib/ask";
import { suggestSmartInsights } from "@/lib/ai-bundles";
import { requireAppUser } from "@/lib/auth";
import { getDashboard } from "@/lib/db/queries";
import { buildInsights } from "@/lib/insights";

export const maxDuration = 60;

export default async function InsightsPage() {
  await requireAppUser();
  const { items } = await getDashboard();
  const insights = buildInsights(items);
  const smart = await suggestSmartInsights(items, insights.stale);
  const stale = attachAskAdvice(smart.stale, items);

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
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
