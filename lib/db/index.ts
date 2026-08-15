import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const QUERY_TIMEOUT_MS = 10_000;

// Named function so hot reload replaces it instead of wrapping fetch again.
async function neonFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

neonConfig.fetchFunction = neonFetch;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  return drizzle(neon(url, { fetchOptions: { cache: "no-store" } }), {
    schema,
  });
}

export async function withDbRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch {
    return await run();
  }
}
