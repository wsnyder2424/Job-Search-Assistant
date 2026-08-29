import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { readSupabaseEnv } from "@/lib/supabase/env";

/**
 * Where an OAuth provider sends the user back to.
 *
 * Supabase's browser client uses the PKCE flow, so the provider returns a
 * one-time `code` that has to be exchanged for a session here, on the server,
 * where the session cookie can actually be written.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  /**
   * Behind a proxy the request's own host is the internal one, so prefer the
   * forwarded host when deciding where to send the user back to.
   */
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;

  // Only ever redirect to a path on this app — never to an attacker-supplied
  // absolute URL smuggled in through `next`.
  const requestedNext = url.searchParams.get("next") ?? "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/";

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);

  // The provider reports a refusal (or a misconfiguration) in the query string.
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) return fail(providerError);

  if (!code) return fail("That sign-in link was missing its code. Try again.");
  if (!readSupabaseEnv()) return fail("Supabase is not configured on this server.");

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) return fail(error.message);

  // "/" decides between /onboarding and /home based on whether this account
  // already belongs to a household.
  return NextResponse.redirect(`${origin}${next}`);
}
