import { formatPercent, formatRate } from "@/lib/format";
import type { FamilyRestock, RestockAction } from "@/lib/restock";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const actionLabel: Record<RestockAction, string> = {
  buy: "Buy",
  maybe: "Maybe",
  skip: "Skip",
};

const columns: { action: RestockAction; title: string; empty: string }[] = [
  { action: "buy", title: "Buy", empty: "Nothing looks like a restock." },
  { action: "maybe", title: "Maybe", empty: "No maybes." },
  { action: "skip", title: "Skip", empty: "Nothing to skip." },
];

function badgeVariant(action: RestockAction) {
  if (action === "skip") return "destructive" as const;
  if (action === "maybe") return "outline" as const;
  return "default" as const;
}

function FamilyRow({ row }: { row: FamilyRestock }) {
  const meta = [
    row.stores.length > 0 ? row.stores.join(" · ") : null,
    `${row.soldCount} sold`,
    `${row.unsoldCount} unsold`,
    row.roiOnSoldCost == null ? null : `${formatPercent(row.roiOnSoldCost)} ROI`,
    row.medianDaysToSell == null
      ? null
      : `${formatRate(row.medianDaysToSell)} days to sell`,
  ].filter(Boolean);

  return (
    <li className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium" title={row.label}>
          {row.label}
        </p>
        <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>
      </div>
      <Badge variant={badgeVariant(row.action)}>{actionLabel[row.action]}</Badge>
    </li>
  );
}

export function RestockGuide({
  rows,
  note,
}: {
  rows: FamilyRestock[];
  note: string | null;
}) {
  return (
    <div className="grid gap-4">
      {note ? (
        <Card>
          <CardHeader>
            <CardTitle>This trip</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{note}</p>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((column) => {
          const list = rows.filter((row) => row.action === column.action);
          return (
            <Card key={column.action}>
              <CardHeader>
                <CardTitle>{column.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{column.empty}</p>
                ) : (
                  <ul className="grid gap-3">
                    {list.map((row) => (
                      <FamilyRow key={row.family} row={row} />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
