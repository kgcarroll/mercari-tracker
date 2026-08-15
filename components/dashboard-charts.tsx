"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import type { Summary } from "@/lib/calculations";
import { formatMoney } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const moneyConfig = {
  amount: { label: "Amount", color: "var(--chart-1)" },
} satisfies ChartConfig;

const platformSplitConfig = {
  soldMercari: { label: "Sold Mercari", color: "#5E6DF2" },
  soldVinted: { label: "Sold Vinted", color: "#007782" },
  unsoldMercari: { label: "Unsold Mercari", color: "#C5CBF9" },
  unsoldVinted: { label: "Unsold Vinted", color: "#9DCDD2" },
} satisfies ChartConfig;

const platformConfig = {
  mercari: { label: "Mercari", color: "#5E6DF2" },
  vinted: { label: "Vinted", color: "#007782" },
} satisfies ChartConfig;

export function DashboardCharts({
  summary,
  byPlatform,
}: {
  summary: Summary;
  byPlatform: { mercari: Summary; vinted: Summary };
}) {
  const moneyData = [
    { metric: "Gross sales", amount: summary.totalSales, fill: "#4F7CC8" },
    { metric: "Fees", amount: summary.totalFees, fill: "#C55252" },
    { metric: "Realized profit", amount: summary.totalProfit, fill: "#3D9A5C" },
    { metric: "Unsold inventory", amount: summary.unsoldCost, fill: "#C9943A" },
    {
      metric: "Net profit",
      amount: summary.netProfit,
      fill: summary.netProfit < 0 ? "#B04444" : "#348055",
    },
  ];

  const lotsData = [
    {
      key: "soldMercari",
      name: "Sold Mercari",
      value: byPlatform.mercari.soldCount,
      fill: "var(--color-soldMercari)",
    },
    {
      key: "soldVinted",
      name: "Sold Vinted",
      value: byPlatform.vinted.soldCount,
      fill: "var(--color-soldVinted)",
    },
    {
      key: "unsoldMercari",
      name: "Unsold Mercari",
      value: byPlatform.mercari.unsoldCount,
      fill: "var(--color-unsoldMercari)",
    },
    {
      key: "unsoldVinted",
      name: "Unsold Vinted",
      value: byPlatform.vinted.unsoldCount,
      fill: "var(--color-unsoldVinted)",
    },
  ];

  const capitalData = [
    {
      key: "soldMercari",
      name: "Sold Mercari",
      value: byPlatform.mercari.soldCost,
      fill: "var(--color-soldMercari)",
    },
    {
      key: "soldVinted",
      name: "Sold Vinted",
      value: byPlatform.vinted.soldCost,
      fill: "var(--color-soldVinted)",
    },
    {
      key: "unsoldMercari",
      name: "Unsold Mercari",
      value: byPlatform.mercari.unsoldCost,
      fill: "var(--color-unsoldMercari)",
    },
    {
      key: "unsoldVinted",
      name: "Unsold Vinted",
      value: byPlatform.vinted.unsoldCost,
      fill: "var(--color-unsoldVinted)",
    },
  ];

  const platformMoney = [
    {
      metric: "Gross sales",
      mercari: byPlatform.mercari.totalSales,
      vinted: byPlatform.vinted.totalSales,
    },
    {
      metric: "Realized profit",
      mercari: byPlatform.mercari.totalProfit,
      vinted: byPlatform.vinted.totalProfit,
    },
    {
      metric: "Fees",
      mercari: byPlatform.mercari.totalFees,
      vinted: byPlatform.vinted.totalFees,
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Mercari vs Vinted</CardTitle>
          <CardDescription>
            Gross sales and realized profit by platform. Combined net profit stays
            in the snapshot below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={platformConfig} className="aspect-auto h-64 w-full">
            <BarChart data={platformMoney} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="metric" tickLine={false} axisLine={false} />
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
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="mercari" fill="var(--color-mercari)" radius={6} />
              <Bar dataKey="vinted" fill="var(--color-vinted)" radius={6} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Money snapshot</CardTitle>
          <CardDescription>
            Net profit = realized profit − unsold inventory at cost
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={moneyConfig} className="aspect-auto h-64 w-full">
            <BarChart data={moneyData} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="metric" tickLine={false} axisLine={false} />
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
              <Bar dataKey="amount" radius={6}>
                {moneyData.map((row) => (
                  <Cell key={row.metric} fill={row.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items sold vs unsold</CardTitle>
          <CardDescription>
            {summary.soldCount} sold ({byPlatform.mercari.soldCount} Mercari ·{" "}
            {byPlatform.vinted.soldCount} Vinted) · {summary.unsoldCount} unsold (
            {byPlatform.mercari.unsoldCount} Mercari · {byPlatform.vinted.unsoldCount}{" "}
            Vinted)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={platformSplitConfig} className="mx-auto aspect-square max-h-64">
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="key" hideLabel />}
              />
              <Pie data={lotsData} dataKey="value" nameKey="key" innerRadius={52}>
                {lotsData.map((slice) => (
                  <Cell key={slice.key} fill={slice.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="key" />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capital in sold vs sitting</CardTitle>
          <CardDescription>
            {formatMoney(summary.soldCost)} sold ({formatMoney(byPlatform.mercari.soldCost)}{" "}
            Mercari · {formatMoney(byPlatform.vinted.soldCost)} Vinted) ·{" "}
            {formatMoney(summary.unsoldCost)} unsold (
            {formatMoney(byPlatform.mercari.unsoldCost)} Mercari ·{" "}
            {formatMoney(byPlatform.vinted.unsoldCost)} Vinted)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={platformSplitConfig} className="mx-auto aspect-square max-h-64">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="key"
                    hideLabel
                    formatter={(value) => formatMoney(Number(value))}
                  />
                }
              />
              <Pie data={capitalData} dataKey="value" nameKey="key" innerRadius={52}>
                {capitalData.map((slice) => (
                  <Cell key={slice.key} fill={slice.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="key" />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
