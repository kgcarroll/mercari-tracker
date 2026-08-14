export const PLATFORMS = ["mercari", "vinted"] as const;

export type Platform = (typeof PLATFORMS)[number];

export const DEFAULT_PLATFORM: Platform = "mercari";
export const VINTED_STORE = "Closet";

export function parsePlatform(value: string | null | undefined): Platform {
  return value === "vinted" ? "vinted" : "mercari";
}

export function isVinted(platform?: string | null): boolean {
  return parsePlatform(platform) === "vinted";
}

export function isMercari(platform?: string | null): boolean {
  return !isVinted(platform);
}

export function platformLabel(platform?: string | null): string {
  return isVinted(platform) ? "Vinted" : "Mercari";
}

export function feeRateFor(platform?: string | null): number {
  return isVinted(platform) ? 0 : 0.1;
}
