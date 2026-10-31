import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { BrandMark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { preparePasswordRecovery, passwordValidation, expiredResetMessage } from "@/lib/password-recovery";

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
  const { recovering, signOut } = useAuth();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        await preparePasswordRecovery(supabase.auth, window.location.href, recovering);
        if (cancelled) return;
        setLinkError(null);
        setReady(true);
      } catch {
        if (cancelled) return;
        setLinkError(expiredResetMessage);
        setReady(false);
      }
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [recovering]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    const passwordError = passwordValidation(password, "reset");
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      await signOut();
      setPassword("");
      setConfirm("");
      toast.success("Password updated. Sign in with your new password.");
      await navigate({ to: "/auth", search: { passwordReset: true }, replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update your password. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
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
            {error || linkError ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive"
              >
                {linkError ?? error}
              </div>
            ) : null}
            {linkError ? <Button asChild variant="outline" className="w-full"><Link to="/auth">Request a new reset link</Link></Button> : null}
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
