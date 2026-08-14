"use client";

import { useState } from "react";

import { createItem, updateItem, type ItemInput } from "@/app/actions/items";
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

export function ItemDialogs({
  item,
  lots = [],
  open,
  onOpenChange,
  onSaved,
  onDelete,
}: {
  item: ComputedItem | null;
  lots?: ComputedItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  onDelete?: (item: ComputedItem) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEdit = Boolean(item);

  async function handleSubmit(input: ItemInput) {
    if (item) {
      await updateItem(item.id, input);
    } else {
      await createItem(input);
    }
    onSaved?.();
    onOpenChange(false);
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
