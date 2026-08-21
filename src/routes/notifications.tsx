import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { notificationsQuery } from "@/lib/queries";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — KATISHA BUS" },
      {
        name: "description",
        content: "Booking confirmations, payment receipts and travel updates from KATISHA BUS.",
      },
      { property: "og:title", content: "Notifications — KATISHA BUS" },
      { property: "og:description", content: "Stay updated on your KATISHA BUS trips." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ ...notificationsQuery, enabled: Boolean(user) });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl font-extrabold">Notifications</h1>

        {!user ? (
          <Card className="mt-6">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Sign in to see your notifications.</p>
              <Button asChild className="mt-4">
                <Link to="/auth" search={{ redirect: "/notifications" }}>
                  Sign in
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <Card className="mt-6">
            <CardContent className="p-8 text-center">
              <Bell className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Nothing here yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-3">
            {(data ?? []).map((n) => (
              <Card key={n.id}>
                <CardContent className="flex items-start justify-between gap-4 p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{n.title}</p>
                      {!n.is_read ? <Badge>New</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  </div>
                  {!n.is_read ? (
                    <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                      Mark read
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
