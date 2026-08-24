import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { EmailOtpType } from "@supabase/supabase-js";

import { AppShell } from "@/components/AppShell";
import { BrandMark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/confirm")({
  head: () => ({
    meta: [
      { title: "Confirming your email — KATISHA BUS" },
      {
        name: "description",
        content: "Finish activating your KATISHA BUS account from the confirmation link we emailed you.",
      },
      { property: "og:title", content: "Confirming your email — KATISHA BUS" },
      {
        property: "og:description",
        content: "Activate your KATISHA BUS account to start booking bus tickets in Rwanda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const errorDescription =
        url.searchParams.get("error_description") ?? hash.get("error_description");

      if (errorDescription) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          /expired|invalid/i.test(errorDescription)
            ? "This confirmation link has expired or was already used. Request a new one from the sign-in page."
            : errorDescription,
        );
        return;
      }

      try {
        const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
        const type = (url.searchParams.get("type") ?? "signup") as EmailOtpType;
        const code = url.searchParams.get("code");
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("This confirmation link is missing its security token.");
        }

        if (cancelled) return;

        if (type === "recovery") {
          void navigate({ to: "/reset-password", replace: true });
          return;
        }

        setStatus("done");
        setMessage("Your email is confirmed. You're signed in and ready to book.");
        toast.success("Email confirmed — welcome to KATISHA BUS");
        window.setTimeout(() => {
          if (!cancelled) void navigate({ to: "/", replace: true });
        }, 1800);
      } catch (error) {
        if (cancelled) return;
        const raw = error instanceof Error ? error.message : "Could not confirm your email";
        setStatus("error");
        setMessage(
          /expired|invalid|not found/i.test(raw)
            ? "This confirmation link has expired or was already used. Request a new one from the sign-in page."
            : raw,
        );
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <BrandMark className="size-12" />
            <h1 className="text-xl font-bold">
              {status === "working"
                ? "Confirming your email"
                : status === "done"
                  ? "Email confirmed"
                  : "Confirmation failed"}
            </h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            {status !== "working" ? (
              <Button asChild className="w-full">
                <Link to={status === "done" ? "/" : "/auth"} search={status === "done" ? {} : {}}>
                  {status === "done" ? "Continue to KATISHA BUS" : "Back to sign in"}
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
