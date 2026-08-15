"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import { formatMoney } from "@/lib/format";
import {
  AGING_MAX_DAYS,
  AGING_MIN_DAYS,
  FRESH_MAX_DAYS,
  STALE_MIN_DAYS,
  type AgingBucket,
  type AgingBucketKey,
} from "@/lib/insights";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const agingConfig = {
  cost: { label: "Cash sitting" },
  count: { label: "Listings" },
} satisfies ChartConfig;

const BAR_FILL: Record<AgingBucketKey, string> = {
  fresh: "#86efac",
  aging: "#fb923c",
  stale: "#f87171",
  undated: "#737373",
};

export function AgingChart({
  buckets,
  measure = "cost",
}: {
  buckets: AgingBucket[];
  measure?: "cost" | "count";
}) {
  const data = buckets.map((bucket) => ({
    bucket: bucket.label,
    key: bucket.key,
    cost: bucket.cost,
    count: bucket.count,
    fill: BAR_FILL[bucket.key],
  }));
  const totalCost = buckets.reduce((sum, bucket) => sum + bucket.cost, 0);
  const totalCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const byCount = measure === "count";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging inventory</CardTitle>
        <CardDescription>
          {byCount
            ? `${totalCount} listing${totalCount === 1 ? "" : "s"} on the shelf.`
            : `${formatMoney(totalCost)} still on the shelf.`}{" "}
          Fresh is 0–{FRESH_MAX_DAYS} days posted, aging {AGING_MIN_DAYS}–
          {AGING_MAX_DAYS}, stale {STALE_MIN_DAYS}+.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={agingConfig} className="aspect-auto h-64 w-full">
          <BarChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) =>
                byCount ? String(value) : `$${value}`
              }
              width={48}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    byCount
                      ? `${Number(value)} listing${Number(value) === 1 ? "" : "s"}`
                      : formatMoney(Number(value))
                  }
                />
              }
            />
            <Bar dataKey={byCount ? "count" : "cost"} radius={6}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
