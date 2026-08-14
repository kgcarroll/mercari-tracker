"use client";

import { useMemo, useState } from "react";

import { adviseAsk } from "@/lib/ask";
import { calculateLineItem } from "@/lib/calculations";
import type { ComputedItem } from "@/lib/db/queries";
import { formatMoney, formatPercent } from "@/lib/format";
import {
  parsePlatform,
  VINTED_STORE,
  type Platform,
} from "@/lib/platform";
import { MERCARI_STORES, VINTED_STORES } from "@/lib/stores";
import type { ItemInput } from "@/app/actions/items";
import { AskAdvicePanel } from "@/components/ask-advice-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ItemFormProps = {
  initial?: Partial<ItemInput>;
  lots?: ComputedItem[];
  submitLabel: string;
  showActiveToggle?: boolean;
  onSubmit: (input: ItemInput) => Promise<void>;
  onCancel: () => void;
};

export function ItemForm({
  initial,
  lots = [],
  submitLabel,
  showActiveToggle = false,
  onSubmit,
  onCancel,
}: ItemFormProps) {
  const [product, setProduct] = useState(initial?.product ?? "");
  const [platform, setPlatform] = useState<Platform>(
    parsePlatform(initial?.platform),
  );
  const [store, setStore] = useState(
    parsePlatform(initial?.platform) === "vinted"
      ? VINTED_STORE
      : (initial?.store ?? "Hallmark"),
  );
  const [cost, setCost] = useState(String(initial?.cost ?? ""));
  const [salePrice, setSalePrice] = useState(String(initial?.salePrice ?? "0"));
  const [shippingCost, setShippingCost] = useState(String(initial?.shippingCost ?? ""));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [listedAt, setListedAt] = useState(initial?.listedAt ?? "");
  const [soldAt, setSoldAt] = useState(initial?.soldAt ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const preview = useMemo(() => {
    return calculateLineItem({
      cost: Number(cost) || 0,
      salePrice: Number(salePrice) || 0,
      shippingCost: Number(shippingCost) || 0,
      platform,
    });
  }, [cost, platform, salePrice, shippingCost]);

  const askAdvice = useMemo(() => {
    const sale = Number(salePrice) || 0;
    if (sale > 0 || platform === "vinted") return null;
    const sold = lots.filter(
      (item) => item.status === "sold" && item.platform !== "vinted",
    );
    const unsold = lots.filter(
      (item) =>
        item.status === "unsold" && item.active && item.platform !== "vinted",
    );
    return adviseAsk(
      {
        product,
        cost: Number(cost) || 0,
        shippingCost: Number(shippingCost) || 0,
        listedAt: listedAt.trim() || null,
        active: showActiveToggle ? active : true,
        status: "unsold",
      },
      sold,
      unsold,
    );
  }, [
    active,
    cost,
    listedAt,
    lots,
    platform,
    product,
    salePrice,
    shippingCost,
    showActiveToggle,
  ]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await onSubmit({
        product,
        store,
        cost: Number(cost) || 0,
        salePrice: Number(salePrice) || 0,
        shippingCost: Number(shippingCost) || 0,
        notes,
        listedAt,
        soldAt,
        active: showActiveToggle ? active : true,
        platform,
      });
    } catch (err) {
      const digest = err instanceof Error && "digest" in err;
      setError(
        !digest && err instanceof Error ? err.message : "Could not save. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-2">
        <Label htmlFor="platform">Platform</Label>
        <Select
          value={platform}
          onValueChange={(value) => {
            const next = parsePlatform(value);
            setPlatform(next);
            setStore(next === "vinted" ? VINTED_STORE : "Hallmark");
            if (next === "vinted") setShippingCost("0");
          }}
        >
          <SelectTrigger id="platform" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mercari">Mercari</SelectItem>
            <SelectItem value="vinted">Vinted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="product">Product</Label>
        <Input
          id="product"
          value={product}
          onChange={(event) => setProduct(event.target.value)}
          placeholder={
            platform === "vinted"
              ? "Women's tees lot (8)"
              : "Needoh Sugar Skull Cat (Pink)"
          }
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="store">Store</Label>
        <Select
          value={store}
          onValueChange={setStore}
          disabled={platform === "vinted"}
        >
          <SelectTrigger id="store" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(platform === "vinted" ? VINTED_STORES : MERCARI_STORES).map(
              (name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="cost">Cost</Label>
          <Input
            id="cost"
            type="number"
            min="0"
            step="0.01"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="salePrice">Sale price</Label>
          <Input
            id="salePrice"
            type="number"
            min="0"
            step="0.01"
            value={salePrice}
            onChange={(event) => setSalePrice(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="shippingCost">Shipping</Label>
          <Input
            id="shippingCost"
            type="number"
            min="0"
            step="0.01"
            value={shippingCost}
            onChange={(event) => setShippingCost(event.target.value)}
            required
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {platform === "vinted"
          ? "Vinted has no seller fee. Profit is sale − cost. Leave shipping at 0 unless you paid it. Cost can be 0 for closet clothes."
          : "Leave sale price at 0 for unsold inventory. Fee is 10% of (sale + shipping) and only applies once it sells. Profit is sale − fee − cost."}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="listedAt">Date posted</Label>
          <Input
            id="listedAt"
            type="date"
            value={listedAt}
            onChange={(event) => setListedAt(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="soldAt">Date sold</Label>
          <Input
            id="soldAt"
            type="date"
            value={soldAt}
            onChange={(event) => setSoldAt(event.target.value)}
            disabled={!(Number(salePrice) > 0)}
          />
          </div>
        </div>

      {showActiveToggle ? (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
          <div className="grid gap-1">
            <Label htmlFor="active">In rotation</Label>
            <p className="text-xs text-muted-foreground">
              Off means this lot is parked. It stays in the book but is left out of
              unsold cost, Insights, and Buy / Skip.
            </p>
          </div>
          <Switch
            id="active"
            checked={active}
            onCheckedChange={setActive}
            size="sm"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 text-sm sm:grid-cols-4">
        <PreviewStat label="Fee" value={formatMoney(preview.mercariFee)} />
        <PreviewStat label="Net sale" value={formatMoney(preview.netSale)} />
        <PreviewStat label="Profit" value={formatMoney(preview.profit)} />
        <PreviewStat label="Profit %" value={formatPercent(preview.profitPct)} />
      </div>

      {askAdvice ? <AskAdvicePanel advice={askAdvice} /> : null}

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
