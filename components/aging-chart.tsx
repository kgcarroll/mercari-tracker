"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { formatMoney } from "@/lib/format";
import {
  AGING_MAX_DAYS,
  AGING_MIN_DAYS,
  FRESH_MAX_DAYS,
  STALE_MIN_DAYS,
  type AgingBucket,
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
  cost: { label: "Cash sitting", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function AgingChart({ buckets }: { buckets: AgingBucket[] }) {
  const data = buckets.map((bucket) => ({
    bucket: bucket.label,
    cost: bucket.cost,
    count: bucket.count,
  }));
  const total = buckets.reduce((sum, bucket) => sum + bucket.cost, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging inventory</CardTitle>
        <CardDescription>
          {formatMoney(total)} still on the shelf. Fresh is 0–{FRESH_MAX_DAYS}{" "}
          days posted, aging {AGING_MIN_DAYS}–{AGING_MAX_DAYS}, stale{" "}
          {STALE_MIN_DAYS}+.
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
              tickFormatter={(value: number) => `$${value}`}
              width={48}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatMoney(Number(value))}
                />
              }
            />
            <Bar dataKey="cost" fill="var(--color-cost)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
