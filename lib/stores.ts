export const MERCARI_STORES = [
  "Hallmark",
  "Learning Express",
  "Target",
  "Multiple Stores",
  "Other",
] as const;

export const VINTED_STORES = ["Closet"] as const;

export const STORES = [...MERCARI_STORES, ...VINTED_STORES] as const;
