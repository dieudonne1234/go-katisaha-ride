import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { BrandMark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Search = { redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const value = search["redirect"];
    return typeof value === "string" ? { redirect: value } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — KATISHA BUS" },
      {
        name: "description",
        content:
          "Sign in or create your KATISHA BUS account to book bus tickets across Rwanda and manage your digital tickets.",
      },
      { property: "og:title", content: "Sign in — KATISHA BUS" },
      {
        property: "og:description",
        content: "Access your KATISHA BUS account to book and manage bus tickets in Rwanda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function safePath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("known to be weak") || m.includes("pwned"))
    return "That password appears in known data breaches. Please choose a stronger, unique one.";
  if (m.includes("invalid login credentials"))
    return "Wrong email or password. If you just registered, confirm your email first.";
  if (m.includes("email not confirmed"))
    return "Your email isn't confirmed yet. Check your inbox for the confirmation link.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "An account with this email already exists — sign in instead.";
  if (m.includes("password should be at least"))
    return "Password must be at least 6 characters.";
  if (m.includes("invalid") && m.includes("email")) return "Please enter a valid email address.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  return message;
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirm, setSentConfirm] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function resendConfirmation() {
    if (!emailRe.test(email.trim())) {
      const message = "Enter your email address first.";
      setFormError(message);
      toast.error(message);
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setFormError(null);
      setSentConfirm(true);
      toast.success("Confirmation email sent again");
    } catch (error) {
      const message = friendlyError(
        error instanceof Error ? error.message : "Could not resend the email",
      );
      setFormError(message);
      toast.error(message);
    } finally {
      setResending(false);
    }
  }

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: safePath(redirect), replace: true });
    }
  }, [user, loading, redirect, navigate]);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setFormError(null);
    setSentConfirm(false);
  }

  function validate(): string | null {
    if (!emailRe.test(email.trim())) return "Please enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (mode === "signup") {
      if (fullName.trim().length < 2) return "Please enter your full name.";
      if (fullName.trim().length > 100) return "Full name is too long.";
      const cleanPhone = phone.replace(/[\s-]/g, "");
      if (!/^\+?\d{9,15}$/.test(cleanPhone))
        return "Enter a valid phone number, e.g. +250788123456.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const invalid = validate();
    if (invalid) {
      setFormError(invalid);
      toast.error(invalid);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        toast.success("Welcome back to KATISHA BUS");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim(), phone: phone.replace(/\s/g, "") },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentConfirm(true);
          toast.success("Check your email to confirm your account");
        } else {
          toast.success("Account created");
        }
      }
    } catch (error) {
      const message = friendlyError(
        error instanceof Error ? error.message : "Something went wrong",
      );
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!emailRe.test(email.trim())) {
      const message = "Enter your email address first.";
      setFormError(message);
      toast.error(message);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      const message = friendlyError(error.message);
      setFormError(message);
      toast.error(message);
    } else {
      setFormError(null);
      toast.success("Password reset link sent");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark className="size-12" />
          <h1 className="mt-4 text-2xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Book your journey across Rwanda in a few taps.
          </p>
        </div>

        <Card className="shadow-card">
          <CardContent className="space-y-5 p-6">
            <Tabs value={mode} onValueChange={(v) => switchMode(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Register</TabsTrigger>
              </TabsList>
            </Tabs>

            {sentConfirm ? (
              <div className="rounded-lg bg-success/10 p-4 text-sm text-foreground">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
                account, then sign in.
              </div>
            ) : null}

            {formError ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive"
              >
                {formError}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {mode === "signup" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+250 7xx xxx xxx"
                    />
                  </div>
                </>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {mode === "signup" ? (
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters. Avoid common passwords — they are rejected for your
                    safety.
                  </p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            {mode === "signin" ? (
              <button
                type="button"
                onClick={() => void handleReset()}
                className="w-full text-center text-sm font-medium text-primary hover:underline"
              >
                Forgot your password?
              </button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
