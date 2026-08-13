import { date, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const lineItems = pgTable("line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  product: text("product").notNull(),
  store: text("store").notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }).notNull().default("0"),
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  notes: text("notes"),
  purchasedAt: date("purchased_at"),
  listedAt: date("listed_at"),
  soldAt: date("sold_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LineItemRow = typeof lineItems.$inferSelect;
export type NewLineItem = typeof lineItems.$inferInsert;
