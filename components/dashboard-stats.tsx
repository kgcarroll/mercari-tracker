import type { Summary } from "@/lib/calculations";
import { formatMoney, formatPercent, formatRate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatCard({
  label,
  value,
  hint,
  large = false,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  large?: boolean;
  valueClassName?: string;
}) {
  return (
    <Card size={large ? "default" : "sm"}>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "font-semibold tracking-tight",
            large ? "text-3xl" : "text-2xl",
            valueClassName,
          )}
        >
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function PlatformCard({
  name,
  summary,
  salesShare,
  hint,
}: {
  name: string;
  summary: Summary;
  salesShare: number | null;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{name}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Gross sales</p>
          <p className="text-2xl font-semibold tracking-tight">
            {formatMoney(summary.totalSales)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {salesShare == null
              ? "No sales yet"
              : `${formatPercent(salesShare)} of combined sales`}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Realized profit</p>
            <p className="font-medium">{formatMoney(summary.totalProfit)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fees</p>
            <p className="font-medium">{formatMoney(summary.totalFees)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sold lots</p>
            <p className="font-medium">{summary.soldCount}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardStats({
  summary,
  byPlatform,
}: {
  summary: Summary;
  byPlatform: { mercari: Summary; vinted: Summary };
}) {
  const salesShare = (part: number) =>
    summary.totalSales === 0 ? null : part / summary.totalSales;

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
            valueClassName="text-green-700 dark:text-green-400"
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
            valueClassName="text-red-700 dark:text-red-400"
            hint={`${summary.unsoldCount} lots still on the shelf`}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Gross sales" value={formatMoney(summary.totalSales)} />
          <StatCard
            label="Average sales per day"
            value={formatMoney(summary.avgSalesPerDay)}
            hint={
              summary.soldCount === 0
                ? "Sold lots only"
                : summary.salesDayCount == null
                  ? "Needs a sold or posted date"
                  : `${formatMoney(summary.totalSales)} over ${summary.salesDayCount} ${summary.salesDayCount === 1 ? "day" : "days"}`
            }
          />
          <StatCard label="Total fees" value={formatMoney(summary.totalFees)} />
          <StatCard label="Total cost of all lots" value={formatMoney(summary.totalSpent)} />
          <StatCard
            label="Overall ROI"
            value={formatPercent(summary.roiOnCapital)}
            hint="Net profit ÷ all money spent"
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-xs font-medium">
                Unsold lots
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <p className="text-3xl font-semibold tracking-tight text-red-700 dark:text-red-400">
                {summary.unsoldCount}
              </p>
              <div className="grid justify-items-end gap-1 text-xs text-muted-foreground">
                <p>Mercari: {byPlatform.mercari.unsoldCount}</p>
                <p>Vinted: {byPlatform.vinted.unsoldCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="text-sm font-medium">Sold lots</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total amount of sales" value={String(summary.soldCount)} />
          <StatCard
            label="Sales per day"
            value={formatRate(summary.avgLotsPerDay)}
            hint={
              summary.soldCount === 0
                ? "Sold lots only"
                : summary.salesDayCount == null
                  ? "Needs a sold or posted date"
                  : `${summary.soldCount} lots over ${summary.salesDayCount} ${summary.salesDayCount === 1 ? "day" : "days"}`
            }
          />
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

      <section className="grid gap-3">
        <div>
          <h2 className="text-sm font-medium">Mercari vs Vinted</h2>
          <p className="text-xs text-muted-foreground">
            Combined net profit above is still the book. This split is sales and
            realized profit only — not ROI, which closet lots at $0 cost would
            distort.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <PlatformCard
            name="Mercari"
            summary={byPlatform.mercari}
            salesShare={salesShare(byPlatform.mercari.totalSales)}
            hint="Fee is 10% of (sale + shipping). Profit is sale − fee − cost."
          />
          <PlatformCard
            name="Vinted"
            summary={byPlatform.vinted}
            salesShare={salesShare(byPlatform.vinted.totalSales)}
            hint="No seller fee. Profit is sale − cost. Closet lots can be $0 cost."
          />
        </div>
      </section>
    </div>
  );
}
