"use client";

import { useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";

import type { ComputedItem } from "@/lib/db/queries";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemDialogs } from "@/components/item-dialogs";

type Filter = "all" | "sold" | "unsold";

type SortKey =
  | "product"
  | "store"
  | "cost"
  | "salePrice"
  | "shippingCost"
  | "mercariFee"
  | "profit"
  | "profitPct"
  | "listedAt"
  | "soldAt";

type SortDir = "asc" | "desc";

function compareNullableString(
  a: string | null,
  b: string | null,
  dir: SortDir,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const diff = a.localeCompare(b);
  return dir === "asc" ? diff : -diff;
}

function compareNullableNumber(
  a: number | null,
  b: number | null,
  dir: SortDir,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const diff = a - b;
  return dir === "asc" ? diff : -diff;
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  align = "left",
  className,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  align?: "left" | "right";
  className?: string;
  onSort: (column: SortKey) => void;
}) {
  const active = sortKey === column;
  const Icon = !active
    ? ChevronsUpDownIcon
    : sortDir === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon;

  return (
    <TableHead className={cn(align === "right" && "text-right", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          align === "right" && "ml-auto flex-row-reverse",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className="size-3.5 shrink-0 opacity-70" />
      </button>
    </TableHead>
  );
}

export function TrackerApp({ items }: { items: ComputedItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("product");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ComputedItem | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!q) return true;
      return (
        item.product.toLowerCase().includes(q) ||
        item.store.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === "product" || sortKey === "store") {
        const diff = a[sortKey].localeCompare(b[sortKey], undefined, {
          sensitivity: "base",
        });
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortKey === "listedAt" || sortKey === "soldAt") {
        return compareNullableString(a[sortKey], b[sortKey], sortDir);
      }
      return compareNullableNumber(a[sortKey], b[sortKey], sortDir);
    });
  }, [filter, items, query, sortDir, sortKey]);

  function toggleSort(column: SortKey) {
    if (sortKey === column) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(column);
    setSortDir(column === "product" || column === "store" ? "asc" : "desc");
  }

  function openCreate() {
    setSelected(null);
    setOpen(true);
  }

  function openEdit(item: ComputedItem) {
    setSelected(item);
    setOpen(true);
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All ({items.length})</TabsTrigger>
            <TabsTrigger value="sold">
              Sold ({items.filter((item) => item.status === "sold").length})
            </TabsTrigger>
            <TabsTrigger value="unsold">
              Unsold ({items.filter((item) => item.status === "unsold").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex min-w-0 gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product or store"
            className="min-w-0 sm:w-64"
          />
          <Button onClick={openCreate}>Add item</Button>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border border-border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <SortHeader
                label="Product"
                column="product"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <SortHeader
                label="Store"
                column="store"
                className="w-28"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <SortHeader
                label="Cost"
                column="cost"
                className="w-[4.75rem]"
                sortKey={sortKey}
                sortDir={sortDir}
                align="right"
                onSort={toggleSort}
              />
              <SortHeader
                label="Sale"
                column="salePrice"
                className="w-[4.75rem]"
                sortKey={sortKey}
                sortDir={sortDir}
                align="right"
                onSort={toggleSort}
              />
              <SortHeader
                label="Ship"
                column="shippingCost"
                className="w-[4.75rem]"
                sortKey={sortKey}
                sortDir={sortDir}
                align="right"
                onSort={toggleSort}
              />
              <SortHeader
                label="Fee"
                column="mercariFee"
                className="w-[4.75rem]"
                sortKey={sortKey}
                sortDir={sortDir}
                align="right"
                onSort={toggleSort}
              />
              <SortHeader
                label="Profit"
                column="profit"
                className="w-[4.75rem]"
                sortKey={sortKey}
                sortDir={sortDir}
                align="right"
                onSort={toggleSort}
              />
              <SortHeader
                label="ROI"
                column="profitPct"
                className="w-16"
                sortKey={sortKey}
                sortDir={sortDir}
                align="right"
                onSort={toggleSort}
              />
              <SortHeader
                label="Posted"
                column="listedAt"
                className="w-[4.75rem]"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <SortHeader
                label="Sold"
                column="soldAt"
                className="w-[4.75rem]"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((item) => (
              <TableRow
                key={item.id}
                className={cn(
                  item.status === "sold"
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-700 dark:text-red-400",
                )}
              >
                <TableCell className="max-w-0 truncate font-medium" title={item.product}>
                  {item.product}
                </TableCell>
                <TableCell className="truncate" title={item.store}>
                  {item.store}
                </TableCell>
                <TableCell className="text-right">{formatMoney(item.cost)}</TableCell>
                <TableCell className="text-right">{formatMoney(item.salePrice)}</TableCell>
                <TableCell className="text-right">{formatMoney(item.shippingCost)}</TableCell>
                <TableCell className="text-right">{formatMoney(item.mercariFee)}</TableCell>
                <TableCell className="text-right">{formatMoney(item.profit)}</TableCell>
                <TableCell className="text-right">{formatPercent(item.profitPct)}</TableCell>
                <TableCell>{formatDate(item.listedAt)}</TableCell>
                <TableCell>{formatDate(item.soldAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                  No lots match this filter.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <ItemDialogs item={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
