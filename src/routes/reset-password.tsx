import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { BrandMark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — KATISHA BUS" },
      {
        name: "description",
        content: "Choose a new password for your KATISHA BUS account and get back to booking tickets.",
      },
      { property: "og:title", content: "Set a new password — KATISHA BUS" },
      {
        property: "og:description",
        content: "Securely reset your KATISHA BUS account password.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
      const code = url.searchParams.get("code");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      try {
        if (tokenHash) {
          const { error: err } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (err) throw err;
        } else if (code) {
          const { error: err } = await supabase.auth.exchangeCodeForSession(code);
          if (err) throw err;
        } else if (accessToken && refreshToken) {
          const { error: err } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (err) throw err;
        }
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!data.session) {
          setError("This reset link has expired or was already used. Request a new one.");
        }
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? "This reset link has expired or was already used. Request a new one."
            : "Could not verify the reset link.",
        );
        setReady(true);
      }
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      toast.error(err.message);
      return;
    }
    toast.success("Password updated");
    void navigate({ to: "/", replace: true });
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark className="size-12" />
          <h1 className="mt-4 text-2xl font-bold">Set a new password</h1>
        </div>
        <Card className="shadow-card">
          <CardContent className="space-y-4 p-6">
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive"
              >
                {error}
              </div>
            ) : null}
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy || !ready}>
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
