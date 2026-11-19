import { useI18n } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Banknote,
  Bus,
  CalendarPlus,
  QrCode,
  Route as RouteIcon,
  ShieldCheck,
  Ticket as TicketIcon,
  Trash2,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { formatDate, formatRwf, formatTime, todayISO } from "@/lib/format";
import { agenciesQuery, stationsQuery } from "@/lib/queries";
import {
  agencyBookingsQuery,
  agencyPaymentsQuery,
  findTicketByCode,
  markTicketUsed,
  myRolesQuery,
  agencyBusesQuery,
  agencyRoutesQuery,
  agencyTripsQuery,
  createBus,
  createRoute,
  createTrip,
  deleteBus,
  deleteRoute,
  deleteTrip,
  toggleRoute,
  updateBusStatus,
  updateTripStatus,
  updateBus,
  updateRoute,
  updateTrip,
  staffDirectoryQuery,
  allAgenciesQuery,
  allStationsQuery,
  createAgency,
  updateAgency,
  toggleAgency,
  createStation,
  updateStation,
  toggleStation,
  grantRole,
  revokeRole,
  type AdminBooking,
  type AdminBus,
  type AdminRoute,
  type AdminTrip,
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
  const { tr, lang } = useI18n();
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
  const { tr, lang } = useI18n();
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
              <h1 className="mt-3 font-display text-xl font-bold">{tr("Staff area")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {user
                  ? tr(
                      "Your account is not linked to a bus agency. Ask your agency administrator for access.",
                    )
                  : tr("Sign in with your agency staff account to open the dashboard.")}
              </p>
              {!user ? (
                <Button asChild className="mt-4">
                  <Link to="/auth" search={{ redirect: "/admin" }}>
                    {tr("Sign in")}
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
  const { tr, lang } = useI18n();
  const queryClient = useQueryClient();
  const { data: agencies } = useQuery(agenciesQuery);
  const [scope, setScope] = useState<number | "ALL">(isSuper ? "ALL" : (agencyId as number));

  const { data: bookings, isLoading } = useQuery(agencyBookingsQuery(scope));
  const { data: payments } = useQuery(agencyPaymentsQuery);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const scopedBookingIds = useMemo(() => new Set((bookings ?? []).map((b) => b.id)), [bookings]);

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

  const agencyOptions = useMemo(
    () =>
      (agencies ?? [])
        .filter((a) => (scope === "ALL" ? true : a.id === scope))
        .map((a) => ({ id: a.id, name: a.name })),
    [agencies, scope],
  );

  const agencyLabel =
    scope === "ALL"
      ? tr("All agencies")
      : ((agencies ?? []).find((a) => a.id === scope)?.name ??
        (bookings ?? [])[0]?.trip.agency.name ??
        tr("Your agency"));

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold">
              {agencyLabel} {tr("dashboard")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tr("Manage bookings, verify boarding tickets and track revenue.")}
            </p>
          </div>
          {isSuper ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={scope === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setScope("ALL")}
              >
                {tr("All")}
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
            label={tr("Revenue")}
            value={formatRwf(revenue.gross)}
            icon={<Banknote className="size-5" />}
          />
          <Stat
            label={tr("Paid bookings")}
            value={String(revenue.count)}
            icon={<BadgeCheck className="size-5" />}
          />
          <Stat
            label={tr("Seats sold")}
            value={String(seatsSold)}
            icon={<TicketIcon className="size-5" />}
          />
          <Stat
            label={tr("Pending")}
            value={String(pending)}
            icon={<QrCode className="size-5" />}
          />
        </div>

        <Tabs defaultValue="bookings" className="mt-8">
          <TabsList className="h-auto flex-wrap gap-1">
            <TabsTrigger value="bookings">{tr("Bookings")}</TabsTrigger>
            <TabsTrigger value="verify">{tr("Verify ticket")}</TabsTrigger>
            <TabsTrigger value="buses">{tr("Buses")}</TabsTrigger>
            <TabsTrigger value="routes">{tr("Routes")}</TabsTrigger>
            <TabsTrigger value="trips">{tr("Trips")}</TabsTrigger>
            <TabsTrigger value="revenue">{tr("Reports")}</TabsTrigger>
            {isSuper ? <TabsTrigger value="network">{tr("Agencies")}</TabsTrigger> : null}
            {isSuper ? <TabsTrigger value="access">{tr("Permissions")}</TabsTrigger> : null}
          </TabsList>

          {isSuper ? (
            <TabsContent value="network" className="mt-4">
              <NetworkManager />
            </TabsContent>
          ) : null}

          {isSuper ? (
            <TabsContent value="access" className="mt-4">
              <AccessManager />
            </TabsContent>
          ) : null}

          <TabsContent value="bookings" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr("Search ref, passenger or phone")}
                className="max-w-xs"
              />
              {["ALL", "PENDING", "CONFIRMED", "CANCELLED"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "ALL" ? tr("All") : tr(s)}
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
                  {tr("No bookings match this filter.")}
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

          <TabsContent value="buses" className="mt-4">
            <BusesPanel scope={scope} agencies={agencyOptions} />
          </TabsContent>

          <TabsContent value="routes" className="mt-4">
            <RoutesPanel scope={scope} agencies={agencyOptions} />
          </TabsContent>

          <TabsContent value="trips" className="mt-4">
            <TripsPanel scope={scope} agencies={agencyOptions} />
          </TabsContent>

          <TabsContent value="revenue" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportBookingsCsv(filtered, agencyLabel, tr)}
              >
                {tr("Export CSV")}
              </Button>
            </div>
            <Card>
              <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {tr("Gross revenue")}
                  </p>
                  <p className="font-display text-2xl font-bold">{formatRwf(revenue.gross)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {tr("Refunded")}
                  </p>
                  <p className="font-display text-2xl font-bold">{formatRwf(revenue.refunded)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {tr("Net")}
                  </p>
                  <p className="font-display text-2xl font-bold">
                    {formatRwf(revenue.gross - revenue.refunded)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-bold">{tr("By payment method")}</h2>
                {revenue.byMethod.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{tr("No payments yet.")}</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {revenue.byMethod.map(([method, amount]) => (
                      <li
                        key={method}
                        className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0"
                      >
                        <span className="font-semibold">{tr(method)}</span>
                        <span>{formatRwf(amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-bold">{tr("Top routes")}</h2>
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
  const { tr, lang } = useI18n();
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
    return <p className="mt-2 text-sm text-muted-foreground">{tr("No confirmed bookings yet.")}</p>;

  return (
    <ul className="mt-3 space-y-2">
      {rows.map(([route, v]) => (
        <li
          key={route}
          className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0"
        >
          <span className="font-semibold">{route}</span>
          <span className="text-muted-foreground">
            {v.seats} {tr("Seats")} · {formatRwf(v.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BookingRow({ booking: b }: { booking: AdminBooking }) {
  const { tr, lang } = useI18n();
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-52">
          <div className="flex flex-wrap items-center gap-2">
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
              {tr(b.status)}
            </Badge>
          </div>
          <p className="mt-1 font-display text-lg font-bold">
            {b.trip.route.origin.city} → {b.trip.route.destination.city}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(b.trip.travel_date, lang)} · {formatTime(b.trip.departure_time, lang)} ·{" "}
            {b.trip.bus.bus_number} ({b.trip.bus.plate_number})
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">{b.passenger_name}</p>
          <p className="text-muted-foreground">{b.passenger_phone}</p>
          <p className="text-muted-foreground">
            {tr("Seats")}: {b.seats.map((s) => s.seat_label).join(", ") || "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold">{formatRwf(b.total_amount)}</p>
          <p className="text-xs text-muted-foreground">
            {b.tickets.filter((t) => t.status === "USED").length}/{b.tickets.length} {tr("boarded")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function VerifyPanel({ onVerified }: { onVerified: () => void }) {
  const { tr, lang } = useI18n();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const lookup = useMutation({
    mutationFn: () => findTicketByCode(code),
    onSuccess: (t) => setMessage(t ? null : "No ticket found with that code."),
    onError: (e: Error) =>
      setMessage(lang === "en" ? e.message : "Could not verify this ticket. Please try again."),
  });

  const board = useMutation({
    mutationFn: (id: string) => markTicketUsed(id),
    onSuccess: () => {
      setMessage("Ticket marked as boarded.");
      lookup.mutate();
      onVerified();
    },
    onError: (e: Error) =>
      setMessage(lang === "en" ? e.message : "Could not verify this ticket. Please try again."),
  });

  const ticket = lookup.data;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <h2 className="font-display text-lg font-bold">{tr("Verify a boarding ticket")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr(
              "Enter the ticket code printed on the passenger's ticket (e.g. KTB-2026-000123-A1).",
            )}
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
              placeholder={tr("Ticket code")}
              className="max-w-sm font-mono"
            />
            <Button type="submit" disabled={lookup.isPending || !code.trim()}>
              {lookup.isPending ? tr("Checking…") : tr("Check ticket")}
            </Button>
          </form>
          {message ? <p className="mt-3 text-sm text-muted-foreground">{tr(message)}</p> : null}
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
                  {formatDate(ticket.booking.trip.travel_date, lang)} ·{" "}
                  {formatTime(ticket.booking.trip.departure_time, lang)} · {tr("Seat")}{" "}
                  {ticket.seat_label}
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
                  {tr(ticket.status)}
                </Badge>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tr("Booking")}
                  {ticket.booking.booking_ref} · {tr(ticket.booking.status)}
                </p>
              </div>
            </div>

            <div className="mt-4">
              {ticket.status === "VALID" && ticket.booking.status === "CONFIRMED" ? (
                <Button onClick={() => board.mutate(ticket.id)} disabled={board.isPending}>
                  {board.isPending ? tr("Saving…") : tr("Mark as boarded")}
                </Button>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">
                  {ticket.status === "USED"
                    ? `${tr("alreadyBoarded")}${ticket.used_at ? ` · ${new Date(ticket.used_at).toLocaleString()}` : ""}.`
                    : tr("This ticket cannot be used for boarding.")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function AccessManager() {
  const { tr, lang } = useI18n();
  const queryClient = useQueryClient();
  const { data: agencies } = useQuery(agenciesQuery);
  const { data: staff, isLoading } = useQuery(staffDirectoryQuery);
  const [filter, setFilter] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success(tr("Permissions updated"));
      setPending(null);
    },
    onError: (e: unknown) => {
      toast.error(
        lang === "en" && e instanceof Error ? e.message : tr("Could not update permissions"),
      );
      setPending(null);
    },
  });

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (staff ?? []).filter(
      (s) =>
        !q || s.full_name.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q),
    );
  }, [staff, filter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-1 p-5">
          <h2 className="font-display text-lg font-bold">{tr("Roles & permissions")}</h2>
          <p className="text-sm text-muted-foreground">
            {tr(
              "Super admins control every agency. Assign an agency admin so they can only manage bookings, tickets and revenue for their own agency.",
            )}
          </p>
        </CardContent>
      </Card>

      <Input
        placeholder={tr("Search staff by name or email")}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <div className="space-y-3">
          {rows.map((person) => {
            const isSuperUser = person.roles.some((r) => r.role === "SUPER_ADMIN");
            const agencyRole = person.roles.find((r) => r.role === "AGENCY_ADMIN");
            const busy = pending === person.id;
            return (
              <Card key={person.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div className="min-w-48">
                    <p className="font-semibold">{person.full_name || tr("Unnamed user")}</p>
                    <p className="text-xs text-muted-foreground">{person.email ?? "—"}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {isSuperUser ? <Badge>{tr("Super admin")}</Badge> : null}
                      {agencyRole ? (
                        <Badge variant="secondary">
                          {tr("Agency admin")} ·{" "}
                          {(agencies ?? []).find((a) => a.id === agencyRole.agency_id)?.name ??
                            tr("unassigned")}
                        </Badge>
                      ) : null}
                      {!isSuperUser && !agencyRole ? (
                        <Badge variant="outline">{tr("Passenger")}</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="h-9 max-w-full rounded-lg border border-input bg-background px-2 text-sm"
                      disabled={busy}
                      value={agencyRole?.agency_id ?? ""}
                      onChange={(e) => {
                        setPending(person.id);
                        const value = e.target.value;
                        mutate.mutate(() =>
                          value
                            ? grantRole(person.id, "AGENCY_ADMIN", Number(value))
                            : revokeRole(person.id, "AGENCY_ADMIN"),
                        );
                      }}
                    >
                      <option value="">{tr("No agency access")}</option>
                      {(agencies ?? []).map((a) => (
                        <option key={a.id} value={a.id}>
                          {tr("Admin")} · {a.name}
                        </option>
                      ))}
                    </select>

                    <Button
                      size="sm"
                      variant={isSuperUser ? "outline" : "default"}
                      disabled={busy}
                      onClick={() => {
                        setPending(person.id);
                        mutate.mutate(() =>
                          isSuperUser
                            ? revokeRole(person.id, "SUPER_ADMIN")
                            : grantRole(person.id, "SUPER_ADMIN", null),
                        );
                      }}
                    >
                      {isSuperUser ? tr("Remove super admin") : tr("Make super admin")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {tr("No accounts found.")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

type AgencyOption = { id: number; name: string };

function useAdminMutation(onDone?: () => void) {
  const { tr, lang } = useI18n();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success(tr("Saved"));
      onDone?.();
    },
    onError: (e: unknown) =>
      toast.error(
        lang === "en" && e instanceof Error ? e.message : tr("Could not save the change"),
      ),
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { tr, lang } = useI18n();
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

const selectClass =
  "h-9 max-w-full rounded-lg border border-input bg-background px-2 text-sm font-normal normal-case text-foreground";

function AgencyPicker({
  agencies,
  value,
  onChange,
}: {
  agencies: AgencyOption[];
  value: number | "";
  onChange: (v: number) => void;
}) {
  const { tr, lang } = useI18n();
  if (agencies.length <= 1) return null;
  return (
    <Field label={tr("Agency")}>
      <select
        className={selectClass}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value="">{tr("Select agency")}</option>
        {agencies.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function BusesPanel({ scope, agencies }: { scope: number | "ALL"; agencies: AgencyOption[] }) {
  const { tr, lang } = useI18n();
  const { data: buses, isLoading } = useQuery(agencyBusesQuery(scope));
  const mutate = useAdminMutation();
  const [agency, setAgency] = useState<number | "">(agencies[0]?.id ?? "");
  const [busNumber, setBusNumber] = useState("");
  const [plate, setPlate] = useState("");
  const [type, setType] = useState("Standard");
  const [capacity, setCapacity] = useState(30);
  const [editing, setEditing] = useState<number | null>(null);

  const agencyId = agencies.length === 1 ? (agencies[0]?.id ?? "") : agency;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agencyId) {
      toast.error(tr("Choose an agency first"));
      return;
    }
    if (!busNumber.trim() || !plate.trim()) {
      toast.error(tr("Bus number and plate are required"));
      return;
    }
    mutate.mutate(async () => {
      await createBus({
        agency_id: agencyId,
        bus_number: busNumber.trim(),
        plate_number: plate.trim().toUpperCase(),
        bus_type: type,
        seat_capacity: capacity,
      });
      setBusNumber("");
      setPlate("");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <h2 className="font-display text-lg font-bold">{tr("Add a bus")}</h2>
          <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
            <AgencyPicker agencies={agencies} value={agency} onChange={setAgency} />
            <Field label={tr("Bus number")}>
              <Input
                value={busNumber}
                onChange={(e) => setBusNumber(e.target.value)}
                placeholder="HRZ-07"
                className="w-32"
              />
            </Field>
            <Field label={tr("Plate")}>
              <Input
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="RAD 123 B"
                className="w-36"
              />
            </Field>
            <Field label={tr("Type")}>
              <select
                className={selectClass}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="Standard">{tr("Standard")}</option>
                <option value="Executive">{tr("Executive")}</option>
                <option value="Coaster">{tr("Coaster")}</option>
              </select>
            </Field>
            <Field label={tr("Seats")}>
              <Input
                type="number"
                min={8}
                max={80}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-24"
              />
            </Field>
            <Button type="submit" disabled={mutate.isPending}>
              <Bus className="size-4" /> {tr("Add bus")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (buses ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {tr("No buses registered yet.")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(buses ?? []).map((b) => (
            <Card key={b.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                {editing === b.id ? (
                  <BusEditor
                    bus={b}
                    pending={mutate.isPending}
                    onCancel={() => setEditing(null)}
                    onSave={(patch) =>
                      mutate.mutate(async () => {
                        await updateBus(b.id, patch);
                        setEditing(null);
                      })
                    }
                  />
                ) : (
                  <>
                    <div>
                      <p className="font-semibold">
                        {b.bus_number} · {b.plate_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tr(b.bus_type)} · {b.seat_capacity} {tr("Seats")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={b.status === "ACTIVE" ? "default" : "secondary"}>
                        {tr(b.status)}
                      </Badge>
                      <select
                        className={selectClass}
                        value={b.status}
                        onChange={(e) =>
                          mutate.mutate(() =>
                            updateBusStatus(
                              b.id,
                              e.target.value as "ACTIVE" | "INACTIVE" | "MAINTENANCE",
                            ),
                          )
                        }
                      >
                        <option value="ACTIVE">{tr("Active")}</option>
                        <option value="MAINTENANCE">{tr("Maintenance")}</option>
                        <option value="INACTIVE">{tr("Inactive")}</option>
                      </select>
                      <Button size="sm" variant="outline" onClick={() => setEditing(b.id)}>
                        {tr("Edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => mutate.mutate(() => deleteBus(b.id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RoutesPanel({ scope, agencies }: { scope: number | "ALL"; agencies: AgencyOption[] }) {
  const { tr, lang } = useI18n();
  const { data: routes, isLoading } = useQuery(agencyRoutesQuery(scope));
  const { data: stations } = useQuery(stationsQuery);
  const mutate = useAdminMutation();
  const [agency, setAgency] = useState<number | "">(agencies[0]?.id ?? "");
  const [origin, setOrigin] = useState<number | "">("");
  const [destination, setDestination] = useState<number | "">("");
  const [distance, setDistance] = useState(100);
  const [duration, setDuration] = useState(120);
  const [editing, setEditing] = useState<number | null>(null);

  const agencyId = agencies.length === 1 ? (agencies[0]?.id ?? "") : agency;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agencyId) {
      toast.error(tr("Choose an agency first"));
      return;
    }
    if (!origin || !destination || origin === destination) {
      toast.error(tr("Pick a different origin and destination"));
      return;
    }
    mutate.mutate(() =>
      createRoute({
        agency_id: agencyId,
        origin_station_id: Number(origin),
        destination_station_id: Number(destination),
        distance_km: distance,
        duration_minutes: duration,
      }),
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <h2 className="font-display text-lg font-bold">{tr("Add a route")}</h2>
          <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
            <AgencyPicker agencies={agencies} value={agency} onChange={setAgency} />
            <Field label={tr("From")}>
              <select
                className={selectClass}
                value={origin}
                onChange={(e) => setOrigin(Number(e.target.value))}
              >
                <option value="">{tr("Origin")}</option>
                {(stations ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.city} · {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr("To")}>
              <select
                className={selectClass}
                value={destination}
                onChange={(e) => setDestination(Number(e.target.value))}
              >
                <option value="">{tr("Destination")}</option>
                {(stations ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.city} · {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr("Distance (km)")}>
              <Input
                type="number"
                min={1}
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                className="w-28"
              />
            </Field>
            <Field label={tr("Duration (min)")}>
              <Input
                type="number"
                min={10}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-28"
              />
            </Field>
            <Button type="submit" disabled={mutate.isPending}>
              <RouteIcon className="size-4" /> {tr("Add route")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <div className="space-y-2">
          {(routes ?? []).map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                {editing === r.id ? (
                  <RouteEditor
                    route={r}
                    stations={stations ?? []}
                    pending={mutate.isPending}
                    onCancel={() => setEditing(null)}
                    onSave={(patch) =>
                      mutate.mutate(async () => {
                        await updateRoute(r.id, patch);
                        setEditing(null);
                      })
                    }
                  />
                ) : (
                  <>
                    <div>
                      <p className="font-semibold">
                        {r.origin.city} → {r.destination.city}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.origin.name} → {r.destination.name} · {r.distance_km} km ·{" "}
                        {r.duration_minutes} min
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? tr("Active") : tr("Paused")}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => mutate.mutate(() => toggleRoute(r.id, !r.is_active))}
                      >
                        {r.is_active ? tr("Pause") : tr("Activate")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(r.id)}>
                        {tr("Edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => mutate.mutate(() => deleteRoute(r.id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
          {(routes ?? []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {tr("No routes yet.")}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TripsPanel({ scope, agencies }: { scope: number | "ALL"; agencies: AgencyOption[] }) {
  const { tr, lang } = useI18n();
  const today = todayISO();
  const { data: trips, isLoading } = useQuery(agencyTripsQuery(scope, today));
  const { data: buses } = useQuery(agencyBusesQuery(scope));
  const { data: routes } = useQuery(agencyRoutesQuery(scope));
  const mutate = useAdminMutation();

  const [agency, setAgency] = useState<number | "">(agencies[0]?.id ?? "");
  const agencyId = agencies.length === 1 ? (agencies[0]?.id ?? "") : agency;
  const [busId, setBusId] = useState<number | "">("");
  const [routeId, setRouteId] = useState<number | "">("");
  const [date, setDate] = useState(today);
  const [departure, setDeparture] = useState("08:00");
  const [arrival, setArrival] = useState("11:00");
  const [price, setPrice] = useState(5000);
  const [editing, setEditing] = useState<number | null>(null);

  const busOptions = (buses ?? []).filter((b) => !agencyId || b.agency_id === agencyId);
  const routeOptions = (routes ?? []).filter((r) => !agencyId || r.agency_id === agencyId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agencyId) {
      toast.error(tr("Choose an agency first"));
      return;
    }
    if (!busId || !routeId) {
      toast.error(tr("Pick a bus and a route"));
      return;
    }
    mutate.mutate(() =>
      createTrip({
        agency_id: agencyId,
        bus_id: Number(busId),
        route_id: Number(routeId),
        travel_date: date,
        departure_time: departure,
        arrival_time: arrival,
        price_rwf: price,
      }),
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <h2 className="font-display text-lg font-bold">{tr("Schedule a trip")}</h2>
          <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
            <AgencyPicker agencies={agencies} value={agency} onChange={setAgency} />
            <Field label={tr("Bus")}>
              <select
                className={selectClass}
                value={busId}
                onChange={(e) => setBusId(Number(e.target.value))}
              >
                <option value="">{tr("Select bus")}</option>
                {busOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bus_number} ({b.seat_capacity})
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr("Route")}>
              <select
                className={selectClass}
                value={routeId}
                onChange={(e) => setRouteId(Number(e.target.value))}
              >
                <option value="">{tr("Select route")}</option>
                {routeOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.origin.city} → {r.destination.city}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr("Date")}>
              <Input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                className="w-40"
              />
            </Field>
            <Field label={tr("Departs")}>
              <Input
                type="time"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                className="w-28"
              />
            </Field>
            <Field label={tr("Arrives")}>
              <Input
                type="time"
                value={arrival}
                onChange={(e) => setArrival(e.target.value)}
                className="w-28"
              />
            </Field>
            <Field label={tr("Price (RWF)")}>
              <Input
                type="number"
                min={100}
                step={100}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-32"
              />
            </Field>
            <Button type="submit" disabled={mutate.isPending}>
              <CalendarPlus className="size-4" /> {tr("Schedule")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <div className="space-y-2">
          {(trips ?? []).map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                {editing === t.id ? (
                  <TripEditor
                    trip={t}
                    buses={busOptions}
                    routes={routeOptions}
                    pending={mutate.isPending}
                    onCancel={() => setEditing(null)}
                    onSave={(patch) =>
                      mutate.mutate(async () => {
                        await updateTrip(t.id, patch);
                        setEditing(null);
                      })
                    }
                  />
                ) : (
                  <>
                    <div>
                      <p className="font-semibold">
                        {t.route.origin.city} → {t.route.destination.city}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.travel_date, lang)} · {formatTime(t.departure_time, lang)}–
                        {formatTime(t.arrival_time, lang)} · {t.bus.bus_number} ·{" "}
                        {formatRwf(t.price_rwf)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className={selectClass}
                        value={t.status}
                        onChange={(e) =>
                          mutate.mutate(() =>
                            updateTripStatus(
                              t.id,
                              e.target.value as
                                "SCHEDULED" | "BOARDING" | "DEPARTED" | "COMPLETED" | "CANCELLED",
                            ),
                          )
                        }
                      >
                        {["SCHEDULED", "BOARDING", "DEPARTED", "COMPLETED", "CANCELLED"].map(
                          (s) => (
                            <option key={s} value={s}>
                              {tr(s)}
                            </option>
                          ),
                        )}
                      </select>
                      <Button size="sm" variant="outline" onClick={() => setEditing(t.id)}>
                        {tr("Edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => mutate.mutate(() => deleteTrip(t.id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
          {(trips ?? []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {tr("No upcoming trips scheduled.")}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

type Station = { id: number; name: string; city: string };

function EditorActions({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
  const { tr, lang } = useI18n();
  return (
    <div className="flex items-end gap-2">
      <Button type="submit" size="sm" disabled={pending}>
        {tr("Save")}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onCancel}>
        {tr("Cancel")}
      </Button>
    </div>
  );
}

function BusEditor({
  bus,
  pending,
  onCancel,
  onSave,
}: {
  bus: AdminBus;
  pending: boolean;
  onCancel: () => void;
  onSave: (patch: { bus_number: string; plate_number: string; bus_type: string }) => void;
}) {
  const { tr, lang } = useI18n();
  const [busNumber, setBusNumber] = useState(bus.bus_number);
  const [plate, setPlate] = useState(bus.plate_number);
  const [type, setType] = useState(bus.bus_type);

  return (
    <form
      className="flex w-full flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busNumber.trim() || !plate.trim()) {
          toast.error(tr("Bus number and plate are required"));
          return;
        }
        onSave({
          bus_number: busNumber.trim(),
          plate_number: plate.trim().toUpperCase(),
          bus_type: type,
        });
      }}
    >
      <Field label={tr("Bus number")}>
        <Input value={busNumber} onChange={(e) => setBusNumber(e.target.value)} className="w-32" />
      </Field>
      <Field label={tr("Plate")}>
        <Input value={plate} onChange={(e) => setPlate(e.target.value)} className="w-36" />
      </Field>
      <Field label={tr("Type")}>
        <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="Standard">{tr("Standard")}</option>
          <option value="Executive">{tr("Executive")}</option>
          <option value="Coaster">{tr("Coaster")}</option>
        </select>
      </Field>
      <p className="text-xs text-muted-foreground">
        {tr("seatMapFixed", { count: bus.seat_capacity })}
      </p>
      <EditorActions pending={pending} onCancel={onCancel} />
    </form>
  );
}

function RouteEditor({
  route,
  stations,
  pending,
  onCancel,
  onSave,
}: {
  route: AdminRoute;
  stations: Station[];
  pending: boolean;
  onCancel: () => void;
  onSave: (patch: {
    origin_station_id: number;
    destination_station_id: number;
    distance_km: number;
    duration_minutes: number;
  }) => void;
}) {
  const { tr, lang } = useI18n();
  const [origin, setOrigin] = useState(route.origin_station_id);
  const [destination, setDestination] = useState(route.destination_station_id);
  const [distance, setDistance] = useState(route.distance_km);
  const [duration, setDuration] = useState(route.duration_minutes);

  return (
    <form
      className="flex w-full flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!origin || !destination || origin === destination) {
          toast.error(tr("Pick a different origin and destination"));
          return;
        }
        onSave({
          origin_station_id: origin,
          destination_station_id: destination,
          distance_km: distance,
          duration_minutes: duration,
        });
      }}
    >
      <Field label={tr("From")}>
        <select
          className={selectClass}
          value={origin}
          onChange={(e) => setOrigin(Number(e.target.value))}
        >
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.city} · {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={tr("To")}>
        <select
          className={selectClass}
          value={destination}
          onChange={(e) => setDestination(Number(e.target.value))}
        >
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.city} · {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={tr("Distance (km)")}>
        <Input
          type="number"
          min={1}
          value={distance}
          onChange={(e) => setDistance(Number(e.target.value))}
          className="w-28"
        />
      </Field>
      <Field label={tr("Duration (min)")}>
        <Input
          type="number"
          min={10}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-28"
        />
      </Field>
      <EditorActions pending={pending} onCancel={onCancel} />
    </form>
  );
}

function TripEditor({
  trip,
  buses,
  routes,
  pending,
  onCancel,
  onSave,
}: {
  trip: AdminTrip;
  buses: AdminBus[];
  routes: AdminRoute[];
  pending: boolean;
  onCancel: () => void;
  onSave: (patch: {
    bus_id: number;
    route_id: number;
    travel_date: string;
    departure_time: string;
    arrival_time: string;
    price_rwf: number;
  }) => void;
}) {
  const { tr, lang } = useI18n();
  const [busId, setBusId] = useState(trip.bus_id);
  const [routeId, setRouteId] = useState(trip.route_id);
  const [date, setDate] = useState(trip.travel_date);
  const [departure, setDeparture] = useState(trip.departure_time.slice(0, 5));
  const [arrival, setArrival] = useState(trip.arrival_time.slice(0, 5));
  const [price, setPrice] = useState(trip.price_rwf);

  return (
    <form
      className="flex w-full flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busId || !routeId) {
          toast.error(tr("Pick a bus and a route"));
          return;
        }
        onSave({
          bus_id: busId,
          route_id: routeId,
          travel_date: date,
          departure_time: departure,
          arrival_time: arrival,
          price_rwf: price,
        });
      }}
    >
      <Field label={tr("Bus")}>
        <select
          className={selectClass}
          value={busId}
          onChange={(e) => setBusId(Number(e.target.value))}
        >
          {buses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.bus_number} ({b.seat_capacity})
            </option>
          ))}
        </select>
      </Field>
      <Field label={tr("Route")}>
        <select
          className={selectClass}
          value={routeId}
          onChange={(e) => setRouteId(Number(e.target.value))}
        >
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.origin.city} → {r.destination.city}
            </option>
          ))}
        </select>
      </Field>
      <Field label={tr("Date")}>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-40"
        />
      </Field>
      <Field label={tr("Departs")}>
        <Input
          type="time"
          value={departure}
          onChange={(e) => setDeparture(e.target.value)}
          className="w-28"
        />
      </Field>
      <Field label={tr("Arrives")}>
        <Input
          type="time"
          value={arrival}
          onChange={(e) => setArrival(e.target.value)}
          className="w-28"
        />
      </Field>
      <Field label={tr("Price (RWF)")}>
        <Input
          type="number"
          min={100}
          step={100}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-32"
        />
      </Field>
      <EditorActions pending={pending} onCancel={onCancel} />
    </form>
  );
}

function exportBookingsCsv(bookings: AdminBooking[], label: string, tr: (text: string) => string) {
  if (bookings.length === 0) {
    toast.error(tr("Nothing to export yet"));
    return;
  }
  const header = [
    "Booking ref",
    "Status",
    "Passenger",
    "Phone",
    "Agency",
    "Route",
    "Travel date",
    "Departure",
    "Seats",
    "Amount (RWF)",
  ];
  const translatedHeader = header.map((label) => tr(label));
  const rows = bookings.map((b) => [
    b.booking_ref,
    tr(b.status),
    b.passenger_name,
    b.passenger_phone,
    b.trip.agency.name,
    `${b.trip.route.origin.city} - ${b.trip.route.destination.city}`,
    b.trip.travel_date,
    b.trip.departure_time,
    String(b.seat_count),
    String(b.total_amount),
  ]);
  const csv = [translatedHeader, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `katisha-report-${label.toLowerCase().replace(/\s+/g, "-")}-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function NetworkManager() {
  const { tr, lang } = useI18n();
  const qc = useQueryClient();
  const { data: agencies } = useQuery(allAgenciesQuery);
  const { data: stations } = useQuery(allStationsQuery);
  const [editAgency, setEditAgency] = useState<number | null>(null);
  const [editStation, setEditStation] = useState<number | null>(null);
  const [aForm, setAForm] = useState({ name: "", code: "", phone: "", email: "" });
  const [sForm, setSForm] = useState({ name: "", city: "", code: "" });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const addAgency = useMutation({
    mutationFn: () =>
      createAgency({
        name: aForm.name.trim(),
        code: aForm.code.trim().toUpperCase(),
        phone: aForm.phone.trim() || null,
        email: aForm.email.trim() || null,
      }),
    onSuccess: () => {
      setAForm({ name: "", code: "", phone: "", email: "" });
      toast.success(tr("Agency added"));
      void refresh();
    },
    onError: (e: Error) => toast.error(lang === "en" ? e.message : tr("Could not save the change")),
  });

  const saveAgency = useMutation({
    mutationFn: (v: { id: number; patch: Parameters<typeof updateAgency>[1] }) =>
      updateAgency(v.id, v.patch),
    onSuccess: () => {
      setEditAgency(null);
      toast.success(tr("Agency updated"));
      void refresh();
    },
    onError: (e: Error) => toast.error(lang === "en" ? e.message : tr("Could not save the change")),
  });

  const flipAgency = useMutation({
    mutationFn: (v: { id: number; active: boolean }) => toggleAgency(v.id, v.active),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(lang === "en" ? e.message : tr("Could not save the change")),
  });

  const addStation = useMutation({
    mutationFn: () =>
      createStation({
        name: sForm.name.trim(),
        city: sForm.city.trim(),
        code: sForm.code.trim().toUpperCase(),
      }),
    onSuccess: () => {
      setSForm({ name: "", city: "", code: "" });
      toast.success(tr("Station added"));
      void refresh();
    },
    onError: (e: Error) => toast.error(lang === "en" ? e.message : tr("Could not save the change")),
  });

  const saveStation = useMutation({
    mutationFn: (v: { id: number; patch: Parameters<typeof updateStation>[1] }) =>
      updateStation(v.id, v.patch),
    onSuccess: () => {
      setEditStation(null);
      toast.success(tr("Station updated"));
      void refresh();
    },
    onError: (e: Error) => toast.error(lang === "en" ? e.message : tr("Could not save the change")),
  });

  const flipStation = useMutation({
    mutationFn: (v: { id: number; active: boolean }) => toggleStation(v.id, v.active),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(lang === "en" ? e.message : tr("Could not save the change")),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-lg font-bold">{tr("Bus agencies")}</h2>
          <form
            className="grid gap-2 sm:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!aForm.name.trim() || !aForm.code.trim()) {
                toast.error(tr("Name and code are required"));
                return;
              }
              addAgency.mutate();
            }}
          >
            <Input
              placeholder={tr("Agency name")}
              value={aForm.name}
              onChange={(e) => setAForm({ ...aForm, name: e.target.value })}
            />
            <Input
              placeholder={tr("Code")}
              value={aForm.code}
              onChange={(e) => setAForm({ ...aForm, code: e.target.value })}
            />
            <Input
              placeholder={tr("Phone")}
              value={aForm.phone}
              onChange={(e) => setAForm({ ...aForm, phone: e.target.value })}
            />
            <Input
              placeholder={tr("Email")}
              value={aForm.email}
              onChange={(e) => setAForm({ ...aForm, email: e.target.value })}
            />
            <Button type="submit" disabled={addAgency.isPending}>
              {tr("Add agency")}
            </Button>
          </form>

          <div className="space-y-2">
            {(agencies ?? []).map((a) =>
              editAgency === a.id ? (
                <form
                  key={a.id}
                  className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    saveAgency.mutate({
                      id: a.id,
                      patch: {
                        name: String(f.get("name") ?? "").trim(),
                        code: String(f.get("code") ?? "")
                          .trim()
                          .toUpperCase(),
                        phone: String(f.get("phone") ?? "").trim() || null,
                        email: String(f.get("email") ?? "").trim() || null,
                      },
                    });
                  }}
                >
                  <Input name="name" defaultValue={a.name} />
                  <Input name="code" defaultValue={a.code} />
                  <Input name="phone" defaultValue={a.phone ?? ""} />
                  <Input name="email" defaultValue={a.email ?? ""} />
                  <EditorActions
                    pending={saveAgency.isPending}
                    onCancel={() => setEditAgency(null)}
                  />
                </form>
              ) : (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
                >
                  <div>
                    <p className="font-semibold">
                      {a.name} <span className="text-xs text-muted-foreground">({a.code})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.phone ?? tr("No phone")} · {a.email ?? tr("No email")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={a.is_active ? "default" : "secondary"}>
                      {a.is_active ? tr("Active") : tr("Hidden")}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => setEditAgency(a.id)}>
                      {tr("Edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => flipAgency.mutate({ id: a.id, active: !a.is_active })}
                    >
                      {a.is_active ? tr("Hide") : tr("Show")}
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-lg font-bold">{tr("Stations")}</h2>
          <form
            className="grid gap-2 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!sForm.name.trim() || !sForm.city.trim() || !sForm.code.trim()) {
                toast.error(tr("Name, city and code are required"));
                return;
              }
              addStation.mutate();
            }}
          >
            <Input
              placeholder={tr("Station name")}
              value={sForm.name}
              onChange={(e) => setSForm({ ...sForm, name: e.target.value })}
            />
            <Input
              placeholder={tr("City")}
              value={sForm.city}
              onChange={(e) => setSForm({ ...sForm, city: e.target.value })}
            />
            <Input
              placeholder={tr("Code")}
              value={sForm.code}
              onChange={(e) => setSForm({ ...sForm, code: e.target.value })}
            />
            <Button type="submit" disabled={addStation.isPending}>
              {tr("Add station")}
            </Button>
          </form>

          <div className="grid gap-2 md:grid-cols-2">
            {(stations ?? []).map((s) =>
              editStation === s.id ? (
                <form
                  key={s.id}
                  className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    saveStation.mutate({
                      id: s.id,
                      patch: {
                        name: String(f.get("name") ?? "").trim(),
                        city: String(f.get("city") ?? "").trim(),
                        code: String(f.get("code") ?? "")
                          .trim()
                          .toUpperCase(),
                      },
                    });
                  }}
                >
                  <Input name="name" defaultValue={s.name} />
                  <Input name="city" defaultValue={s.city} />
                  <Input name="code" defaultValue={s.code} />
                  <EditorActions
                    pending={saveStation.isPending}
                    onCancel={() => setEditStation(null)}
                  />
                </form>
              ) : (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
                >
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.city} · {s.code}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={s.is_active ? "default" : "secondary"}>
                      {s.is_active ? tr("Active") : tr("Hidden")}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => setEditStation(s.id)}>
                      {tr("Edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => flipStation.mutate({ id: s.id, active: !s.is_active })}
                    >
                      {s.is_active ? tr("Hide") : tr("Show")}
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
