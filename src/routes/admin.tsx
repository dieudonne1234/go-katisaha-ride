import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Banknote, QrCode, ShieldCheck, Ticket as TicketIcon } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { formatDate, formatRwf, formatTime } from "@/lib/format";
import { agenciesQuery } from "@/lib/queries";
import {
  agencyBookingsQuery,
  agencyPaymentsQuery,
  findTicketByCode,
  markTicketUsed,
  myRolesQuery,
  type AdminBooking,
} from "@/lib/admin-queries";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Agency dashboard — KATISHA BUS" },
      {
        name: "description",
        content:
          "Agency admin dashboard for Horizon, Volcano and Stella Express: manage bookings, verify tickets and track revenue.",
      },
      { property: "og:title", content: "Agency dashboard — KATISHA BUS" },
      {
        property: "og:description",
        content: "Manage bookings, verify boarding tickets and view revenue for your bus agency.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          {icon}
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminPage() {
  const { user, loading } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useQuery({
    ...myRolesQuery,
    enabled: Boolean(user),
  });

  const isSuper = (roles ?? []).some((r) => r.role === "SUPER_ADMIN");
  const agencyRole = (roles ?? []).find((r) => r.role === "AGENCY_ADMIN" && r.agency_id);
  const hasAccess = isSuper || Boolean(agencyRole);

  if (loading || (user && rolesLoading)) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-5xl space-y-3 px-4 py-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!user || !hasAccess) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-lg px-4 py-16">
          <Card>
            <CardContent className="p-8 text-center">
              <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
              <h1 className="mt-3 font-display text-xl font-bold">Staff area</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {user
                  ? "Your account is not linked to a bus agency. Ask your agency administrator for access."
                  : "Sign in with your agency staff account to open the dashboard."}
              </p>
              {!user ? (
                <Button asChild className="mt-4">
                  <Link to="/auth" search={{ redirect: "/admin" }}>
                    Sign in
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return <Dashboard isSuper={isSuper} agencyId={agencyRole?.agency_id ?? null} />;
}

function Dashboard({ isSuper, agencyId }: { isSuper: boolean; agencyId: number | null }) {
  const queryClient = useQueryClient();
  const { data: agencies } = useQuery({ ...agenciesQuery, enabled: isSuper });
  const [scope, setScope] = useState<number | "ALL">(isSuper ? "ALL" : (agencyId as number));

  const { data: bookings, isLoading } = useQuery(agencyBookingsQuery(scope));
  const { data: payments } = useQuery(agencyPaymentsQuery);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const scopedBookingIds = useMemo(
    () => new Set((bookings ?? []).map((b) => b.id)),
    [bookings],
  );

  const revenue = useMemo(() => {
    const rows = (payments ?? []).filter((p) => scopedBookingIds.has(p.booking_id));
    const successful = rows.filter((p) => p.status === "SUCCESSFUL");
    const refunded = rows.filter((p) => p.status === "REFUNDED");
    const byMethod = new Map<string, number>();
    for (const p of successful) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
    return {
      gross: successful.reduce((s, p) => s + p.amount, 0),
      refunded: refunded.reduce((s, p) => s + p.amount, 0),
      count: successful.length,
      byMethod: [...byMethod.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [payments, scopedBookingIds]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (bookings ?? []).filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (!term) return true;
      return (
        b.booking_ref.toLowerCase().includes(term) ||
        b.passenger_name.toLowerCase().includes(term) ||
        b.passenger_phone.toLowerCase().includes(term)
      );
    });
  }, [bookings, statusFilter, search]);

  const seatsSold = (bookings ?? [])
    .filter((b) => b.status === "CONFIRMED")
    .reduce((s, b) => s + b.seat_count, 0);
  const pending = (bookings ?? []).filter((b) => b.status === "PENDING").length;

  const agencyLabel =
    scope === "ALL"
      ? "All agencies"
      : ((agencies ?? []).find((a) => a.id === scope)?.name ??
        (bookings ?? [])[0]?.trip.agency.name ??
        "Your agency");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold">{agencyLabel} dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage bookings, verify boarding tickets and track revenue.
            </p>
          </div>
          {isSuper ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={scope === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setScope("ALL")}
              >
                All
              </Button>
              {(agencies ?? []).map((a) => (
                <Button
                  key={a.id}
                  variant={scope === a.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScope(a.id)}
                >
                  {a.name}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Revenue"
            value={formatRwf(revenue.gross)}
            icon={<Banknote className="size-5" />}
          />
          <Stat
            label="Paid bookings"
            value={String(revenue.count)}
            icon={<BadgeCheck className="size-5" />}
          />
          <Stat
            label="Seats sold"
            value={String(seatsSold)}
            icon={<TicketIcon className="size-5" />}
          />
          <Stat label="Pending" value={String(pending)} icon={<QrCode className="size-5" />} />
        </div>

        <Tabs defaultValue="bookings" className="mt-8">
          <TabsList>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="verify">Verify ticket</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ref, passenger or phone"
                className="max-w-xs"
              />
              {["ALL", "PENDING", "CONFIRMED", "CANCELLED"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No bookings match this filter.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="verify" className="mt-4">
            <VerifyPanel
              onVerified={() => {
                void queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
              }}
            />
          </TabsContent>

          <TabsContent value="revenue" className="mt-4 space-y-3">
            <Card>
              <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Gross revenue
                  </p>
                  <p className="font-display text-2xl font-bold">{formatRwf(revenue.gross)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Refunded</p>
                  <p className="font-display text-2xl font-bold">{formatRwf(revenue.refunded)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Net</p>
                  <p className="font-display text-2xl font-bold">
                    {formatRwf(revenue.gross - revenue.refunded)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-bold">By payment method</h2>
                {revenue.byMethod.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {revenue.byMethod.map(([method, amount]) => (
                      <li
                        key={method}
                        className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0"
                      >
                        <span className="font-semibold">{method}</span>
                        <span>{formatRwf(amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-bold">Top routes</h2>
                <TopRoutes bookings={bookings ?? []} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function TopRoutes({ bookings }: { bookings: AdminBooking[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, { seats: number; amount: number }>();
    for (const b of bookings) {
      if (b.status !== "CONFIRMED") continue;
      const key = `${b.trip.route.origin.city} → ${b.trip.route.destination.city}`;
      const prev = map.get(key) ?? { seats: 0, amount: 0 };
      map.set(key, { seats: prev.seats + b.seat_count, amount: prev.amount + b.total_amount });
    }
    return [...map.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 6);
  }, [bookings]);

  if (rows.length === 0)
    return <p className="mt-2 text-sm text-muted-foreground">No confirmed bookings yet.</p>;

  return (
    <ul className="mt-3 space-y-2">
      {rows.map(([route, v]) => (
        <li
          key={route}
          className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0"
        >
          <span className="font-semibold">{route}</span>
          <span className="text-muted-foreground">
            {v.seats} seats · {formatRwf(v.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BookingRow({ booking: b }: { booking: AdminBooking }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-52">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold">{b.booking_ref}</span>
            <Badge
              variant={
                b.status === "CONFIRMED"
                  ? "default"
                  : b.status === "CANCELLED"
                    ? "destructive"
                    : "secondary"
              }
            >
              {b.status}
            </Badge>
          </div>
          <p className="mt-1 font-display text-lg font-bold">
            {b.trip.route.origin.city} → {b.trip.route.destination.city}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(b.trip.travel_date)} · {formatTime(b.trip.departure_time)} ·{" "}
            {b.trip.bus.bus_number} ({b.trip.bus.plate_number})
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">{b.passenger_name}</p>
          <p className="text-muted-foreground">{b.passenger_phone}</p>
          <p className="text-muted-foreground">
            Seats: {b.seats.map((s) => s.seat_label).join(", ") || "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold">{formatRwf(b.total_amount)}</p>
          <p className="text-xs text-muted-foreground">
            {b.tickets.filter((t) => t.status === "USED").length}/{b.tickets.length} boarded
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function VerifyPanel({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const lookup = useMutation({
    mutationFn: () => findTicketByCode(code),
    onSuccess: (t) => setMessage(t ? null : "No ticket found with that code."),
    onError: (e: Error) => setMessage(e.message),
  });

  const board = useMutation({
    mutationFn: (id: string) => markTicketUsed(id),
    onSuccess: () => {
      setMessage("Ticket marked as boarded.");
      lookup.mutate();
      onVerified();
    },
    onError: (e: Error) => setMessage(e.message),
  });

  const ticket = lookup.data;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <h2 className="font-display text-lg font-bold">Verify a boarding ticket</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the ticket code printed on the passenger's ticket (e.g. KTB-2026-000123-A1).
          </p>
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage(null);
              if (code.trim()) lookup.mutate();
            }}
          >
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ticket code"
              className="max-w-sm font-mono"
            />
            <Button type="submit" disabled={lookup.isPending || !code.trim()}>
              {lookup.isPending ? "Checking…" : "Check ticket"}
            </Button>
          </form>
          {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      {ticket ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-bold">{ticket.ticket_code}</p>
                <p className="mt-1 font-display text-lg font-bold">
                  {ticket.booking.trip.route.origin.city} →{" "}
                  {ticket.booking.trip.route.destination.city}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(ticket.booking.trip.travel_date)} ·{" "}
                  {formatTime(ticket.booking.trip.departure_time)} · Seat {ticket.seat_label}
                </p>
                <p className="mt-2 text-sm">
                  {ticket.booking.passenger_name} · {ticket.booking.passenger_phone}
                </p>
              </div>
              <div className="text-right">
                <Badge
                  variant={
                    ticket.status === "VALID"
                      ? "default"
                      : ticket.status === "USED"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {ticket.status}
                </Badge>
                <p className="mt-1 text-xs text-muted-foreground">
                  Booking {ticket.booking.booking_ref} · {ticket.booking.status}
                </p>
              </div>
            </div>

            <div className="mt-4">
              {ticket.status === "VALID" && ticket.booking.status === "CONFIRMED" ? (
                <Button onClick={() => board.mutate(ticket.id)} disabled={board.isPending}>
                  {board.isPending ? "Saving…" : "Mark as boarded"}
                </Button>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">
                  {ticket.status === "USED"
                    ? `Already boarded${ticket.used_at ? ` on ${new Date(ticket.used_at).toLocaleString("en-GB")}` : ""}.`
                    : "This ticket cannot be used for boarding."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
