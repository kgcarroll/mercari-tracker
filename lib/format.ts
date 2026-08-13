const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return currency.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return percent.format(value);
}
