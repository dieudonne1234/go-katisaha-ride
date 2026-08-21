import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { profileQuery } from "@/lib/queries";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My profile — KATISHA BUS" },
      {
        name: "description",
        content: "Manage your KATISHA BUS account details used for bus ticket bookings.",
      },
      { property: "og:title", content: "My profile — KATISHA BUS" },
      { property: "og:description", content: "Update your name, phone number and email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ ...profileQuery, enabled: Boolean(user) });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save your profile");
    },
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <h1 className="font-display text-2xl font-extrabold">My profile</h1>

        {!user ? (
          <Card className="mt-6">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Sign in to manage your profile.</p>
              <Button asChild className="mt-4">
                <Link to="/auth" search={{ redirect: "/profile" }}>
                  Sign in
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-6">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email ?? user.email ?? ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 7xx xxx xxx"
                />
              </div>
              <Button
                className="w-full"
                disabled={save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => void signOut()}>
                Sign out
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
