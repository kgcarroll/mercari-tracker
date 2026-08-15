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

const lotsConfig = {
  sold: { label: "Sold", color: "var(--chart-1)" },
  unsold: { label: "Unsold", color: "var(--chart-2)" },
} satisfies ChartConfig;

const capitalConfig = {
  sold: { label: "Sold cost", color: "var(--chart-1)" },
  unsold: { label: "Unsold inventory cost", color: "var(--chart-2)" },
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
    { metric: "Gross sales", amount: summary.totalSales },
    { metric: "Fees", amount: summary.totalFees },
    { metric: "Realized profit", amount: summary.totalProfit },
    { metric: "Unsold inventory", amount: summary.unsoldCost },
    { metric: "Net profit", amount: summary.netProfit },
  ];

  const lotsData = [
    { key: "sold", name: "Sold", value: summary.soldCount, fill: "var(--color-sold)" },
    { key: "unsold", name: "Unsold", value: summary.unsoldCount, fill: "var(--color-unsold)" },
  ];

  const capitalData = [
    { key: "sold", name: "Sold cost", value: summary.soldCost, fill: "var(--color-sold)" },
    {
      key: "unsold",
      name: "Unsold inventory cost",
      value: summary.unsoldCost,
      fill: "var(--color-unsold)",
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
              <Bar dataKey="amount" fill="var(--color-amount)" radius={6} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items sold vs unsold</CardTitle>
          <CardDescription>
            {summary.soldCount} sold · {summary.unsoldCount} unsold inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={lotsConfig} className="mx-auto aspect-square max-h-64">
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
            {formatMoney(summary.soldCost)} sold cost ·{" "}
            {formatMoney(summary.unsoldCost)} unsold inventory cost
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={capitalConfig} className="mx-auto aspect-square max-h-64">
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
