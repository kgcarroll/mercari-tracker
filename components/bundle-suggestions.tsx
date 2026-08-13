import { formatMoney } from "@/lib/format";
import type { BundleSuggestion } from "@/lib/insights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BundleSuggestions({
  bundles,
  source,
}: {
  bundles: BundleSuggestion[];
  source?: "ai" | "rules";
}) {
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
                    Fee {formatMoney(bundle.mercariFee)} at the suggested price.
                  </p>
                  <p>5% off family comps.</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
