import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Ticket } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { formatDate, formatRwf, formatTime } from "@/lib/format";
import { myBookingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "My tickets — KATISHA BUS" },
      {
        name: "description",
        content: "All your KATISHA BUS bookings and tickets, with seats, fares and travel dates.",
      },
      { property: "og:title", content: "My tickets — KATISHA BUS" },
      { property: "og:description", content: "View your Rwandan bus bookings and ticket codes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TicketsPage,
});

function TicketsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ ...myBookingsQuery, enabled: Boolean(user) });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-display text-2xl font-extrabold">My tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every booking you have made with KATISHA BUS.
        </p>

        {!user ? (
          <Card className="mt-6">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Sign in to see your tickets.</p>
              <Button asChild className="mt-4">
                <Link to="/auth" search={{ redirect: "/tickets" }}>
                  Sign in
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <Card className="mt-6">
            <CardContent className="p-8 text-center">
              <Ticket className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No bookings yet.</p>
              <Button asChild className="mt-4">
                <Link to="/">Find a trip</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-3">
            {(data ?? []).map((b) => (
              <Card key={b.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold">{b.booking_ref}</span>
                      <Badge variant="secondary">{b.status}</Badge>
                    </div>
                    <p className="mt-1 font-display text-lg font-bold">
                      {b.trip.route.origin.city} → {b.trip.route.destination.city}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(b.trip.travel_date)} · {formatTime(b.trip.departure_time)} · Seats{" "}
                      {b.seats.map((s) => s.seat_label).join(", ") || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-extrabold text-primary">
                      {formatRwf(b.total_amount)}
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-2">
                      <Link to="/booking/$bookingId" params={{ bookingId: b.id }}>
                        View
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
