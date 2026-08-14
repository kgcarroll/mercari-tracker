import { formatMoney } from "@/lib/format";
import type { StaleSuggestion } from "@/lib/insights";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const actionLabel: Record<StaleSuggestion["action"], string> = {
  relist: "List solo",
  bundle: "Bundle",
  hold: "Hold",
};

function sittingLabel(days: number | null): string {
  if (days == null) return "No posted date";
  if (days === 1) return "1 day sitting";
  return `${days} days sitting`;
}

export function StaleActions({
  suggestions,
}: {
  suggestions: StaleSuggestion[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Do this next</CardTitle>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing looks stale. Add posted dates on unsold lots so aging can be tracked.
          </p>
        ) : (
          <ul className="grid max-h-80 gap-3 overflow-y-auto pr-1">
            {suggestions.map((row) => (
              <li key={row.id} className="flex min-w-0 items-start justify-between gap-3">
                <div className="grid min-w-0 gap-1">
                  <p className="truncate font-medium" title={row.product}>
                    {row.product}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(row.cost)} · {sittingLabel(row.daysSitting)}
                    {row.ask != null
                      ? ` · suggested ask ${formatMoney(row.ask)} · floor ${formatMoney(row.floor)}`
                      : ""}
                  </p>
                  {row.profitAtAsk != null ? (
                    <p className="text-xs text-muted-foreground">
                      About {formatMoney(row.profitAtAsk)} profit at that ask after fees
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{row.reason}</p>
                </div>
                <Badge
                  variant={
                    row.action === "hold"
                      ? "outline"
                      : row.action === "bundle"
                        ? "secondary"
                        : "default"
                  }
                >
                  {actionLabel[row.action]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
