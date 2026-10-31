import type { SupabaseClient } from "@supabase/supabase-js";

type AuthClient = SupabaseClient["auth"];

export const expiredResetMessage = "This reset link has expired or was already used. Request a new one.";

// The SDK owns implicit/PKCE callbacks. Only token-hash links need manual verification.
export async function preparePasswordRecovery(auth: AuthClient, href: string, recovered = false) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.slice(1));
  if (hash.has("error") || hash.has("error_code") || url.searchParams.has("error")) {
    throw new Error(expiredResetMessage);
  }
  const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
  const implicitRecovery = hash.get("type") === "recovery" && Boolean(hash.get("access_token")) && Boolean(hash.get("refresh_token"));
  const code = url.searchParams.get("code");
  if (!tokenHash && !implicitRecovery && !code && !recovered) throw new Error(expiredResetMessage);

  const { error: initializationError } = await auth.initialize();
  if (initializationError) throw new Error(expiredResetMessage);
  if (tokenHash) {
    const { error } = await auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (error) throw new Error(expiredResetMessage);
  }
  const { data, error } = await auth.getUser();
  if (error || !data.user) throw new Error(expiredResetMessage);
  return data.user;
}

export function passwordValidation(password: string, mode: "signin" | "signup" | "reset") {
  if (!password) return "Please enter your password.";
  if (mode !== "signin" && password.length < 8) return "Password must be at least 8 characters.";
  return null;
}