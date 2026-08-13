"use client";

import { useState } from "react";

import { refineBundleSuggestions } from "@/app/actions/bundles";
import { formatMoney } from "@/lib/format";
import type { BundleSuggestion } from "@/lib/insights";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function BundleSuggestions({
  bundles: initialBundles,
  source,
}: {
  bundles: BundleSuggestion[];
  source?: "ai" | "rules";
}) {
  const [bundles, setBundles] = useState(initialBundles);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const ask = prompt.trim();
    if (!ask || pending) return;
    setError(null);
    setPending(true);
    try {
      const next = await refineBundleSuggestions(
        ask,
        bundles.map((bundle) => ({
          title: bundle.title,
          why: bundle.why,
          itemIds: bundle.itemIds,
          products: bundle.products,
        })),
      );
      setBundles(next);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update mixes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-sm font-medium">Bundle Builder</h2>
        <p className="text-xs text-muted-foreground">
          Three optional mix ideas. Each bundle uses different products. List
          winners like Knittens solo.
          {source === "ai"
            ? " Mixes chosen with the same AI call as Do this next; prices are calculated, not guessed."
            : " Mixes from inventory rules. AI SDK runs on this page when Gateway is available; prices are always calculated."}
        </p>
      </div>
      {bundles.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Need at least two unsold lots to suggest a bundle.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-3">
            {bundles.map((bundle) => (
              <Card key={bundle.id} size="sm">
                <CardHeader>
                  <CardTitle>{bundle.title}</CardTitle>
                  <CardDescription>{bundle.why}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <ul className="grid gap-1 text-sm">
                    {bundle.products.map((name, index) => (
                      <li key={bundle.itemIds[index]} className="truncate" title={name}>
                        {name}
                      </li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Stat label="Combined cost" value={formatMoney(bundle.cost)} />
                    <Stat label="Suggested sale" value={formatMoney(bundle.suggestedSale)} />
                    <Stat label="One ship" value={formatMoney(bundle.shippingCost)} />
                    <Stat label="Est. profit" value={formatMoney(bundle.profit)} />
                  </div>
                  <div className="grid gap-0.5 text-xs text-muted-foreground">
                    <p>
                      Fee {formatMoney(bundle.mercariFee)} at the suggested
                      price.
                    </p>
                    <p>5% off family comps.</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <Input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask for a different mix…"
              maxLength={240}
              disabled={pending}
              aria-label="Ask for a different mix"
            />
            <Button type="submit" disabled={pending || prompt.trim().length === 0}>
              {pending ? "Updating…" : "Update"}
            </Button>
            {error ? (
              <p className="text-xs text-destructive sm:col-span-2">{error}</p>
            ) : null}
          </form>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
