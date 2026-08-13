import { daysBetween, nowAppDate, parseISODate } from "@/lib/dates";

export const MERCARI_FEE_RATE = 0.1;

export type MoneyInputs = {
  cost: number;
  salePrice: number;
  shippingCost: number;
};

export type SummaryItem = MoneyInputs & {
  listedAt?: string | null;
  soldAt?: string | null;
};

export type LineItemTotals = {
  mercariFee: number;
  netSale: number;
  profit: number | null;
  profitPct: number | null;
  status: "sold" | "unsold";
};

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isSold(salePrice: number): boolean {
  return salePrice > 0;
}

export function calculateLineItem({
  cost,
  salePrice,
  shippingCost,
}: MoneyInputs): LineItemTotals {
  if (!isSold(salePrice)) {
    return {
      mercariFee: 0,
      netSale: 0,
      profit: null,
      profitPct: null,
      status: "unsold",
    };
  }

  const mercariFee = roundMoney((salePrice + shippingCost) * MERCARI_FEE_RATE);
  const netSale = roundMoney(salePrice - mercariFee);
  // Shipping is in the fee base only. Buyer-paid shipping nets out except for
  // the 10% Mercari takes on it, which is already inside mercariFee.
  const profit = roundMoney(netSale - cost);
  const profitPct = cost === 0 ? null : profit / cost;

  return {
    mercariFee,
    netSale,
    profit,
    profitPct,
    status: "sold",
  };
}

export type Summary = {
  lotCount: number;
  soldCount: number;
  unsoldCount: number;
  sellThrough: number;
  totalSpent: number;
  soldCost: number;
  unsoldCost: number;
  totalSales: number;
  totalFees: number;
  soldShipping: number;
  totalProfit: number;
  netProfit: number;
  avgProfitPerSold: number | null;
  avgSalesPerDay: number | null;
  avgLotsPerDay: number | null;
  salesDayCount: number | null;
  roiOnCapital: number | null;
  roiOnSoldCost: number | null;
};

function saleDate(item: SummaryItem): Date | null {
  return parseISODate(item.soldAt ?? "") ?? parseISODate(item.listedAt ?? "");
}

function salesWindowDays(items: SummaryItem[], today: Date): number | null {
  let first: Date | null = null;
  for (const item of items) {
    if (!isSold(item.salePrice)) continue;
    const date = saleDate(item);
    if (!date) continue;
    if (!first || date < first) first = date;
  }
  if (!first) return null;
  return Math.max(1, daysBetween(first, today) + 1);
}

export function summarize(
  items: Array<SummaryItem & { profit?: number | null }>,
  today = nowAppDate(),
): Summary {
  const lotCount = items.length;
  let soldCount = 0;
  let totalSpent = 0;
  let soldCost = 0;
  let unsoldCost = 0;
  let totalSales = 0;
  let totalFees = 0;
  let soldShipping = 0;
  let totalProfit = 0;

  for (const item of items) {
    const calc = calculateLineItem(item);
    totalSpent = roundMoney(totalSpent + item.cost);

    if (calc.status === "sold") {
      soldCount += 1;
      soldCost = roundMoney(soldCost + item.cost);
      totalSales = roundMoney(totalSales + item.salePrice);
      totalFees = roundMoney(totalFees + calc.mercariFee);
      soldShipping = roundMoney(soldShipping + item.shippingCost);
      totalProfit = roundMoney(totalProfit + (calc.profit ?? 0));
    } else {
      unsoldCost = roundMoney(unsoldCost + item.cost);
    }
  }

  const unsoldCount = lotCount - soldCount;
  const netProfit = roundMoney(totalProfit - unsoldCost);
  const salesDayCount = soldCount === 0 ? null : salesWindowDays(items, today);

  return {
    lotCount,
    soldCount,
    unsoldCount,
    sellThrough: lotCount === 0 ? 0 : soldCount / lotCount,
    totalSpent,
    soldCost,
    unsoldCost,
    totalSales,
    totalFees,
    soldShipping,
    totalProfit,
    netProfit,
    avgProfitPerSold: soldCount === 0 ? null : roundMoney(totalProfit / soldCount),
    avgSalesPerDay:
      salesDayCount == null ? null : roundMoney(totalSales / salesDayCount),
    avgLotsPerDay:
      salesDayCount == null ? null : roundMoney(soldCount / salesDayCount),
    salesDayCount,
    roiOnCapital: totalSpent === 0 ? null : netProfit / totalSpent,
    roiOnSoldCost: soldCost === 0 ? null : totalProfit / soldCost,
  };
}
