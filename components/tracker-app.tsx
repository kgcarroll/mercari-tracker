"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";

import { createBundleFromItems, deleteItem, setItemsActive } from "@/app/actions/items";
import {
  calculateLineItem,
  roundMoney,
  summarize,
  summarizeByPlatform,
} from "@/lib/calculations";
import { todayISODate } from "@/lib/dates";
import type { ComputedItem } from "@/lib/db/queries";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { parsePlatform, platformLabel, VINTED_STORE } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { DashboardCharts } from "@/components/dashboard-charts";
import { DashboardStats } from "@/components/dashboard-stats";
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

type Filter = "all" | "sold" | "unsold" | "inactive";
type PlatformFilter = "all" | "mercari" | "vinted";

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

type PendingServerItems =
  | { kind: "create"; id: string }
  | { kind: "update"; id: string; salePrice: number; active: boolean }
  | { kind: "active"; ids: string[]; active: boolean }
  | { kind: "bundle"; id: string; sourceIds: string[] }
  | { kind: "delete"; id: string };

function flipActive(
  current: ComputedItem[],
  ids: string[],
  active: boolean,
): ComputedItem[] {
  const idSet = new Set(ids);
  return current.map((item) => {
    if (idSet.has(item.id)) return { ...item, active };
    if (item.bundledIntoId && idSet.has(item.bundledIntoId)) {
      return { ...item, active: !active };
    }
    return item;
  });
}

function serverMatchesPending(
  items: ComputedItem[],
  pending: PendingServerItems,
): boolean {
  if (pending.kind === "create") {
    return items.some((item) => item.id === pending.id);
  }
  if (pending.kind === "update") {
    const row = items.find((item) => item.id === pending.id);
    return (
      row != null &&
      row.salePrice === pending.salePrice &&
      row.active === pending.active
    );
  }
  if (pending.kind === "active") {
    return pending.ids.every(
      (id) => items.find((item) => item.id === id)?.active === pending.active,
    );
  }
  if (pending.kind === "delete") {
    return !items.some((item) => item.id === pending.id);
  }
  if (!items.some((item) => item.id === pending.id && item.active)) return false;
  return pending.sourceIds.every(
    (id) => items.find((item) => item.id === id)?.active === false,
  );
}

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
  const [localItems, setLocalItems] = useState(items);
  const [filter, setFilter] = useState<Filter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("product");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ComputedItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"activate" | "deactivate" | "bundle" | null>(
    null,
  );
  const pendingServer = useRef<PendingServerItems | null>(null);

  useEffect(() => {
    const pending = pendingServer.current;
    if (pending && !serverMatchesPending(items, pending)) return;
    pendingServer.current = null;
    setLocalItems(items);
  }, [items]);

  const summary = useMemo(() => summarize(localItems), [localItems]);
  const byPlatform = useMemo(() => summarizeByPlatform(localItems), [localItems]);

  const scopedItems = useMemo(
    () =>
      platformFilter === "all"
        ? localItems
        : localItems.filter((item) => item.platform === platformFilter),
    [localItems, platformFilter],
  );

  const activeItems = useMemo(
    () => scopedItems.filter((item) => item.active),
    [scopedItems],
  );
  const inactiveItems = useMemo(
    () => scopedItems.filter((item) => !item.active),
    [scopedItems],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = scopedItems.filter((item) => {
      if (filter === "inactive") {
        if (item.active) return false;
      } else if (!item.active) {
        return false;
      } else if (filter !== "all" && item.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        item.product.toLowerCase().includes(q) ||
        item.store.toLowerCase().includes(q) ||
        platformLabel(item.platform).toLowerCase().includes(q)
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
  }, [filter, query, scopedItems, sortDir, sortKey]);

  const selectableVisible = visible.filter((item) => item.status === "unsold");
  const selectedItems = localItems.filter((item) => selectedIds.has(item.id));
  const selectedUnsold = selectedItems.filter((item) => item.status === "unsold");
  const selectedActive = selectedItems.filter((item) => item.active);
  const selectedInactive = selectedItems.filter((item) => !item.active);
  const allVisibleSelected =
    selectableVisible.length > 0 &&
    selectableVisible.every((item) => selectedIds.has(item.id));

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

  function closeDialog() {
    setOpen(false);
    setSelected(null);
  }

  function bundleInput(items: ComputedItem[]) {
    const stores = [
      ...new Set(
        items
          .map((item) => item.store.trim())
          .filter((store) => store && !/^multiple stores$/i.test(store)),
      ),
    ];
    const names = items.map((item) =>
      item.product
        .replace(/^Needoh\s+/i, "")
        .replace(/^BUNDLE:\s*/i, "")
        .trim(),
    );
    const platform = parsePlatform(items[0]?.platform);
    return {
      product: `BUNDLE: ${names.join("/")}`,
      store:
        platform === "vinted"
          ? VINTED_STORE
          : stores.length === 1
            ? stores[0]
            : "Multiple Stores",
      cost: roundMoney(items.reduce((sum, item) => sum + item.cost, 0)),
      salePrice: 0,
      shippingCost: 0,
      notes: `Created from: ${items.map((item) => item.product).join("; ")}`,
      listedAt: todayISODate(),
      soldAt: "",
      active: true,
      platform,
    };
  }

  function createBundle() {
    if (selectedUnsold.length < 2) return;
    const sources = selectedUnsold;
    const platforms = new Set(sources.map((source) => parsePlatform(source.platform)));
    if (platforms.size > 1) {
      setActionError("Bundle lots from the same platform only.");
      return;
    }
    const input = bundleInput(sources);
    const sourceIds = sources.map((source) => source.id);
    const sourceIdSet = new Set(sourceIds);
    const previous = localItems;
    const money = calculateLineItem({
      cost: input.cost,
      salePrice: 0,
      shippingCost: 0,
      platform: input.platform,
    });

    setActionError(null);
    setBusy("bundle");
    void (async () => {
      try {
        const result = await createBundleFromItems(sourceIds, input);
        if (!result.ok) {
          setActionError(result.message);
          return;
        }
        pendingServer.current = {
          kind: "bundle",
          id: result.id,
          sourceIds,
        };
        setLocalItems([
          {
            id: result.id,
            product: input.product,
            store: input.store,
            cost: input.cost,
            salePrice: 0,
            shippingCost: 0,
            notes: input.notes ?? null,
            purchasedAt: null,
            listedAt: input.listedAt || null,
            soldAt: null,
            active: true,
            bundledIntoId: null,
            bundledIntoProduct: null,
            platform: input.platform,
            ...money,
          },
          ...previous.map((item) =>
            sourceIdSet.has(item.id)
              ? {
                  ...item,
                  active: false,
                  bundledIntoId: result.id,
                  bundledIntoProduct: input.product,
                }
              : item,
          ),
        ]);
        setSelectedIds(new Set());
        setFilter("all");
      } catch {
        pendingServer.current = null;
        setLocalItems(previous);
        setActionError("Could not create the bundle. Try again.");
      } finally {
        setBusy(null);
      }
    })();
  }

  async function removeItem(item: ComputedItem) {
    const previous = localItems;
    pendingServer.current = { kind: "delete", id: item.id };
    setLocalItems((current) =>
      current
        .filter((row) => row.id !== item.id)
        .map((row) =>
          row.bundledIntoId === item.id
            ? { ...row, bundledIntoId: null, bundledIntoProduct: null }
            : row,
        ),
    );
    setSelectedIds((ids) => {
      const next = new Set(ids);
      next.delete(item.id);
      return next;
    });
    setOpen(false);
    setSelected(null);
    setFilter("all");
    setActionError(null);

    try {
      const result = await deleteItem(item.id);
      if (!result.ok) {
        pendingServer.current = null;
        setLocalItems(previous);
        setActionError(result.message);
      }
    } catch {
      pendingServer.current = null;
      setLocalItems(previous);
      setActionError("Could not delete that lot.");
    }
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAllVisible(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const item of selectableVisible) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  }

  function runActiveChange(active: boolean) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    if (active) {
      const blocked = selectedItems.some((item) => {
        if (!item.bundledIntoId) return false;
        const parent = localItems.find((row) => row.id === item.bundledIntoId);
        return Boolean(parent && (parent.active || parent.status === "sold"));
      });
      if (blocked) {
        setActionError(
          "Deactivate the bundle first if you want this lot back in rotation.",
        );
        return;
      }
    }

    const previous = localItems;
    const restoresChildren = ids.some((id) =>
      localItems.some((item) => item.bundledIntoId === id),
    );
    pendingServer.current = { kind: "active", ids, active };
    setLocalItems(flipActive(localItems, ids, active));
    setSelectedIds(new Set());
    setFilter(active || restoresChildren ? "all" : "inactive");
    setActionError(null);
    setBusy(active ? "activate" : "deactivate");
    void (async () => {
      try {
        const result = await setItemsActive(ids, active);
        if (!result.ok) {
          pendingServer.current = null;
          setLocalItems(previous);
          setActionError(result.message);
          return;
        }
      } catch (err) {
        pendingServer.current = null;
        setLocalItems(previous);
        setActionError(
          err instanceof Error ? err.message : "Could not update those lots",
        );
      } finally {
        setBusy(null);
      }
    })();
  }

  return (
    <div className="grid min-w-0 gap-8">
      <DashboardStats summary={summary} byPlatform={byPlatform} />
      <DashboardCharts summary={summary} byPlatform={byPlatform} />
      <div className="grid min-w-0 gap-4">
        <div className="sticky top-14 z-40 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
            <TabsList>
              <TabsTrigger value="all">All ({activeItems.length})</TabsTrigger>
              <TabsTrigger value="sold">
                Sold ({activeItems.filter((item) => item.status === "sold").length})
              </TabsTrigger>
              <TabsTrigger value="unsold">
                Unsold ({activeItems.filter((item) => item.status === "unsold").length})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inactive ({inactiveItems.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs
            value={platformFilter}
            onValueChange={(value) => setPlatformFilter(value as PlatformFilter)}
          >
            <TabsList>
              <TabsTrigger value="all">All platforms</TabsTrigger>
              <TabsTrigger value="mercari">Mercari</TabsTrigger>
              <TabsTrigger value="vinted">Vinted</TabsTrigger>
            </TabsList>
          </Tabs>
          </div>
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

        {selectedIds.size > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
            <p className="text-sm font-medium">{selectedIds.size} selected</p>
            {selectedActive.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => runActiveChange(false)}
              >
                {busy === "deactivate" ? "Deactivating…" : "Deactivate"}
              </Button>
            ) : null}
            {selectedInactive.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => runActiveChange(true)}
              >
                {busy === "activate" ? "Activating…" : "Activate"}
              </Button>
            ) : null}
            <Button
              size="sm"
              disabled={busy !== null || selectedUnsold.length < 2}
              onClick={createBundle}
            >
              {busy === "bundle" ? "Creating…" : "Create bundle"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy !== null}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        ) : null}

        {actionError ? (
          <p className="mt-2 text-sm text-destructive">{actionError}</p>
        ) : null}
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border border-border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  className="size-3.5 accent-primary"
                  checked={allVisibleSelected}
                  disabled={selectableVisible.length === 0}
                  onChange={(event) => toggleSelectAllVisible(event.target.checked)}
                  aria-label="Select visible unsold lots"
                />
              </TableHead>
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
                  !item.active
                    ? "text-muted-foreground"
                    : item.status === "sold"
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-700 dark:text-red-400",
                )}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    className="size-3.5 accent-primary"
                    checked={selectedIds.has(item.id)}
                    disabled={item.status === "sold"}
                    onChange={(event) =>
                      toggleSelected(item.id, event.target.checked)
                    }
                    aria-label={`Select ${item.product}`}
                  />
                </TableCell>
                <TableCell className="max-w-0 truncate font-medium" title={item.product}>
                  <span className="block truncate">{item.product}</span>
                  {item.platform === "vinted" ||
                  (!item.active && item.bundledIntoProduct) ? (
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {item.platform === "vinted" ? "Vinted" : ""}
                      {item.platform === "vinted" &&
                      !item.active &&
                      item.bundledIntoProduct
                        ? " · "
                        : ""}
                      {!item.active && item.bundledIntoProduct
                        ? `In ${item.bundledIntoProduct}`
                        : ""}
                    </span>
                  ) : null}
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
                <TableCell colSpan={12} className="py-10 text-center text-muted-foreground">
                  No lots match this filter.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

        <ItemDialogs
          item={selected}
          lots={localItems}
          open={open}
          onSaved={() => setSelectedIds(new Set())}
          onUpdated={(updated) => {
            pendingServer.current = {
              kind: "update",
              id: updated.id,
              salePrice: updated.salePrice,
              active: updated.active,
            };
            setLocalItems((current) =>
              current.map((row) => (row.id === updated.id ? updated : row)),
            );
            setActionError(null);
          }}
          onUpdateFailed={(previous, message) => {
            pendingServer.current = null;
            setLocalItems((current) =>
              current.map((row) => (row.id === previous.id ? previous : row)),
            );
            setActionError(message);
          }}
          onCreated={(created) => {
            pendingServer.current = { kind: "create", id: created.id };
            setLocalItems((current) => [created, ...current]);
            setSelectedIds(new Set());
            setFilter("all");
            setActionError(null);
            if (created.platform === "vinted") setPlatformFilter("vinted");
          }}
          onCreateFailed={(id, message) => {
            pendingServer.current = null;
            setLocalItems((current) => current.filter((item) => item.id !== id));
            setActionError(message);
          }}
          onDelete={removeItem}
          onOpenChange={(next) => {
            if (next) setOpen(true);
            else closeDialog();
          }}
        />
      </div>
    </div>
  );
}
