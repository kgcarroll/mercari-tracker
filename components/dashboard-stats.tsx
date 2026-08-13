import type { Summary } from "@/lib/calculations";
import { formatMoney, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatCard({
  label,
  value,
  hint,
  large = false,
}: {
  label: string;
  value: string;
  hint?: string;
  large?: boolean;
}) {
  return (
    <Card size={large ? "default" : "sm"}>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={large ? "text-3xl font-semibold tracking-tight" : "text-2xl font-semibold tracking-tight"}>
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function DashboardStats({ summary }: { summary: Summary }) {
  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <div>
          <h2 className="text-sm font-medium">Net profit</h2>
          <p className="text-xs text-muted-foreground">
            Realized profit minus unsold inventory at cost. That is sales − fees −
            every lot you bought — not fake fees on unsold items.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            large
            label="Net profit"
            value={formatMoney(summary.netProfit)}
            hint={`${formatMoney(summary.totalProfit)} realized − ${formatMoney(summary.unsoldCost)} still in stock`}
          />
          <StatCard
            large
            label="Realized profit"
            value={formatMoney(summary.totalProfit)}
            hint="Sold lots only"
          />
          <StatCard
            large
            label="Unsold inventory cost"
            value={formatMoney(summary.unsoldCost)}
            hint={`${summary.unsoldCount} lots still on the shelf`}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Gross sales" value={formatMoney(summary.totalSales)} />
          <StatCard label="Total Mercari fees" value={formatMoney(summary.totalFees)} />
          <StatCard label="Total cost of all lots" value={formatMoney(summary.totalSpent)} />
          <StatCard
            label="Overall ROI"
            value={formatPercent(summary.roiOnCapital)}
            hint="Net profit ÷ all money spent"
          />
        </div>
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="text-sm font-medium">Sold lots</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Total amount of sales" value={String(summary.soldCount)} />
          <StatCard
            label="Average profit from items sold"
            value={formatMoney(summary.avgProfitPerSold)}
          />
          <StatCard
            label="ROI on sold cost"
            value={formatPercent(summary.roiOnSoldCost)}
          />
        </div>
      </section>
    </div>
  );
}
