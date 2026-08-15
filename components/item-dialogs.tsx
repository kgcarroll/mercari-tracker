"use client";

import { useState } from "react";

import { createItem, updateItem, type ItemInput } from "@/app/actions/items";
import { calculateLineItem } from "@/lib/calculations";
import { todayISODate } from "@/lib/dates";
import { parsePlatform, VINTED_STORE } from "@/lib/platform";
import type { ComputedItem } from "@/lib/db/queries";
import { ItemForm } from "@/components/item-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function itemFromInput(
  id: string,
  input: ItemInput,
  current?: ComputedItem,
): ComputedItem {
  const platform = parsePlatform(input.platform ?? current?.platform);
  const money = calculateLineItem({
    cost: input.cost,
    salePrice: input.salePrice,
    shippingCost: input.shippingCost,
    platform,
  });
  return {
    id,
    product: input.product,
    store: platform === "vinted" ? VINTED_STORE : input.store?.trim() || "Hallmark",
    cost: input.cost,
    salePrice: input.salePrice,
    shippingCost: input.shippingCost,
    notes: input.notes?.trim() || null,
    purchasedAt: current?.purchasedAt ?? null,
    listedAt: input.listedAt?.trim() || null,
    soldAt: input.salePrice > 0 ? input.soldAt?.trim() || todayISODate() : null,
    active: input.active ?? current?.active ?? true,
    bundledIntoId: current?.bundledIntoId ?? null,
    bundledIntoProduct: current?.bundledIntoProduct ?? null,
    platform,
    ...money,
  };
}

export function ItemDialogs({
  item,
  lots = [],
  open,
  onOpenChange,
  onSaved,
  onCreated,
  onCreateFailed,
  onUpdated,
  onUpdateFailed,
  onDelete,
}: {
  item: ComputedItem | null;
  lots?: ComputedItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  onCreated?: (item: ComputedItem) => void;
  onCreateFailed?: (id: string, message: string) => void;
  onUpdated?: (item: ComputedItem) => void;
  onUpdateFailed?: (item: ComputedItem, message: string) => void;
  onDelete?: (item: ComputedItem) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEdit = Boolean(item);

  async function handleSubmit(input: ItemInput) {
    if (item) {
      const updated = itemFromInput(item.id, input, item);
      onUpdated?.(updated);
      onSaved?.();
      onOpenChange(false);
      const result = await updateItem(item.id, input);
      if (!result.ok) {
        onUpdateFailed?.(item, result.message);
      }
      return;
    }

    const id = crypto.randomUUID();
    onCreated?.(itemFromInput(id, input));
    onOpenChange(false);

    const result = await createItem({ ...input, id });
    if (!result.ok) {
      onCreateFailed?.(id, result.message);
    }
  }

  async function handleDelete() {
    if (!item) return;
    setConfirmDelete(false);
    onOpenChange(false);
    await onDelete?.(item);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[min(90dvh,44rem)] max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit item" : "Add item"}</DialogTitle>
          </DialogHeader>
          {isEdit && item?.bundledIntoProduct ? (
            <p className="text-sm text-muted-foreground">
              This lot is linked to {item.bundledIntoProduct}.
            </p>
          ) : null}
          <ItemForm
            key={item?.id ?? "new"}
            lots={lots}
            initial={
              item
                ? {
                    product: item.product,
                    store: item.store,
                    cost: item.cost,
                    salePrice: item.salePrice,
                    shippingCost: item.shippingCost,
                    notes: item.notes ?? "",
                    listedAt: item.listedAt ?? "",
                    soldAt: item.soldAt ?? "",
                    active: item.active,
                    platform: item.platform,
                  }
                : { salePrice: 0, active: true, platform: "mercari" }
            }
            submitLabel={isEdit ? "Save changes" : "Add item"}
            showActiveToggle={isEdit}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
          {isEdit ? (
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => setConfirmDelete(true)}
            >
              Delete item
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lot?</AlertDialogTitle>
            <AlertDialogDescription>
              {item?.product} will be removed from the tracker. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
