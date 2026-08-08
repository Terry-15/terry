"use client";

import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/** Client Supabase côté navigateur (formulaires de connexion). */
export function clientNavigateur() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
