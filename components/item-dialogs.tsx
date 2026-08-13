"use client";

import { useState } from "react";

import { createItem, deleteItem, updateItem, type ItemInput } from "@/app/actions/items";
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
  open,
  onOpenChange,
}: {
  item: ComputedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEdit = Boolean(item);

  async function handleSubmit(input: ItemInput) {
    if (item) {
      await updateItem(item.id, input);
    } else {
      await createItem(input);
    }
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!item) return;
    await deleteItem(item.id);
    setConfirmDelete(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit item" : "Add item"}</DialogTitle>
          </DialogHeader>
          <ItemForm
            key={item?.id ?? "new"}
            initial={
              item
                ? {
                    product: item.product,
                    store: item.store,
                    cost: item.cost,
                    salePrice: item.salePrice,
                    shippingCost: item.shippingCost,
                    notes: item.notes ?? "",
                  }
                : { salePrice: 0 }
            }
            submitLabel={isEdit ? "Save changes" : "Add item"}
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
