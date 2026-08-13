import { config } from "dotenv";
import { getDb } from "../lib/db";
import { lineItems } from "../lib/db/schema";

config({ path: ".env.local" });

type SeedItem = {
  product: string;
  store: string;
  cost: number;
  salePrice: number;
  shippingCost: number;
};

const SEED: SeedItem[] = [
  { product: "Needoh Advent Calendar", store: "Hallmark", cost: 43, salePrice: 90, shippingCost: 7.97 },
  { product: "Needoh Funky Frights", store: "Hallmark", cost: 20, salePrice: 70, shippingCost: 7.97 },
  { product: "Needoh Cloud Pleaser", store: "Target", cost: 6, salePrice: 25, shippingCost: 7.48 },
  { product: "Needoh Cloud Pleaser", store: "Target", cost: 6, salePrice: 21.25, shippingCost: 7.97 },
  { product: "Needoh Sugar Skull Cat (Purple)", store: "Learning Express", cost: 7, salePrice: 26.25, shippingCost: 4.91 },
  { product: "Needoh Sugar Skull Cat (Pink)", store: "Learning Express", cost: 7, salePrice: 28, shippingCost: 4.91 },
  { product: "Needoh Mello Mallo (Pink)", store: "Target", cost: 6, salePrice: 15, shippingCost: 4.91 },
  { product: "Needoh Gummy Bear (Purple)", store: "Learning Express", cost: 7, salePrice: 17.1, shippingCost: 5.66 },
  { product: "Needoh Glitter & Glow (Pink)", store: "Learning Express", cost: 7, salePrice: 13, shippingCost: 6.73 },
  { product: "Needoh Sugar Skull Cat (Purple)", store: "Learning Express", cost: 7, salePrice: 26.6, shippingCost: 4.91 },
  { product: "Needoh Teenie Jack-Glow-Lantern", store: "Hallmark", cost: 6, salePrice: 24.32, shippingCost: 4.91 },
  { product: "Needoh Sugar Skull Cat (Pink)", store: "Learning Express", cost: 7, salePrice: 26, shippingCost: 4.91 },
  { product: "Needoh Teenie Jack-Glow-Lantern", store: "Hallmark", cost: 6, salePrice: 28, shippingCost: 4.91 },
  { product: "BUNDLE: Orange Glowy Ghost/Purple Jack-Glow-Lantern", store: "Multiple Stores", cost: 14, salePrice: 83.4, shippingCost: 5.66 },
  { product: "BUNDLE: Pink Cool Cats/Yellow Mello Mallo", store: "Multiple Stores", cost: 14, salePrice: 29, shippingCost: 4.91 },
  { product: "BUNDLE: Knitten/Purple Glowy Ghost/Green Glowy Ghost/Orange Jack Glow Lantern", store: "Multiple Stores", cost: 28, salePrice: 200, shippingCost: 6.73 },
  { product: "BUNDLE: Pink Nice Cream Cone/Blue Mello Mallo", store: "Multiple Stores", cost: 13, salePrice: 25.92, shippingCost: 5.66 },
  { product: "Needoh Nice Cream Cone (Orange)", store: "Learning Express", cost: 8, salePrice: 16.24, shippingCost: 5.66 },
  { product: "Needoh Super Fuzz Ball", store: "Learning Express", cost: 16, salePrice: 42, shippingCost: 7.97 },
  { product: "Needoh Nice-sicle", store: "Hallmark", cost: 8, salePrice: 22, shippingCost: 5.66 },
  { product: "Needoh Teenie Jack-Glow-Lantern", store: "Hallmark", cost: 6, salePrice: 28, shippingCost: 4.91 },
  { product: "Needoh Hot Shots 4 pack", store: "Learning Express", cost: 8, salePrice: 0, shippingCost: 5.66 },
  { product: "Needoh Glitter & Glow (Blue)", store: "Learning Express", cost: 7, salePrice: 0, shippingCost: 4.91 },
  { product: "Needoh Cloud Pleaser", store: "Target", cost: 6, salePrice: 0, shippingCost: 4.91 },
  { product: "Needoh Cloud Pleaser", store: "Target", cost: 6, salePrice: 0, shippingCost: 4.91 },
  { product: "Needoh Jack-Glow-Lantern (Green)", store: "Hallmark", cost: 7, salePrice: 0, shippingCost: 4.91 },
  { product: "Needoh Jack-Glow-Lantern (Orange)", store: "Hallmark", cost: 7, salePrice: 0, shippingCost: 4.91 },
  { product: "Needoh Knittens (Green)", store: "Hallmark", cost: 7, salePrice: 68, shippingCost: 4.91 },
  { product: "Needoh Gummy Bear (Orange)", store: "Learning Express", cost: 8, salePrice: 0, shippingCost: 5.66 },
  { product: "Needoh Teenie Jack-Glow-Lantern", store: "Hallmark", cost: 6, salePrice: 0, shippingCost: 4.91 },
  { product: "Needoh Jack-Glow-Lantern (Orange)", store: "Hallmark", cost: 7, salePrice: 0, shippingCost: 4.91 },
  { product: "Needoh Jack-Glow-Lantern (Orange)", store: "Hallmark", cost: 7, salePrice: 0, shippingCost: 4.91 },
  { product: "Needoh Jack-Glow-Lantern (Green)", store: "Hallmark", cost: 7, salePrice: 0, shippingCost: 4.91 },
  { product: "Needoh Glow in the Dark Glob (Green)", store: "Learning Express", cost: 7, salePrice: 0, shippingCost: 4.91 },
  { product: "Needoh Color Changing Cube (Yellow)", store: "Learning Express", cost: 7, salePrice: 16, shippingCost: 5.66 },
  { product: "Needoh Teenie Funky Pups", store: "Learning Express", cost: 7, salePrice: 0, shippingCost: 4.91 },
  { product: "Needoh Advent Calendar", store: "Hallmark", cost: 43, salePrice: 0, shippingCost: 7.97 },
  { product: "BUNDLE: Nice-Sicle/Nice-Sicle", store: "Hallmark", cost: 16, salePrice: 40, shippingCost: 5.66 },
];

async function main() {
  const db = getDb();
  const existing = await db.select({ id: lineItems.id }).from(lineItems).limit(1);
  const force = process.argv.includes("--force");

  if (existing.length > 0 && !force) {
    console.log("Database already has line items. Pass --force to replace them.");
    return;
  }

  if (force) {
    await db.delete(lineItems);
  }

  await db.insert(lineItems).values(
    SEED.map((item) => ({
      product: item.product,
      store: item.store,
      cost: item.cost.toFixed(2),
      salePrice: item.salePrice.toFixed(2),
      shippingCost: item.shippingCost.toFixed(2),
    })),
  );

  console.log(`Seeded ${SEED.length} line items.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
