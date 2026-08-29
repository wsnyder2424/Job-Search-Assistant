import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "./env";

/**
 * Supabase client for server components, route handlers and server actions.
 * Session cookies are read and refreshed through Next's cookie store.
 */
export async function getServerSupabase() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot set cookies; the middleware refreshes the
          // session instead, so this is safe to ignore here.
        }
      },
    },
  });
}

/** The signed-in user, or null. */
export async function getCurrentUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
