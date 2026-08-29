"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "./env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Browser-side Supabase client, reused across renders. */
export function getBrowserSupabase() {
  if (!cached) {
    const { url, anonKey } = requireSupabaseEnv();
    cached = createBrowserClient(url, anonKey);
  }
  return cached;
}
