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
  const { data: agencies } = useQuery(agenciesQuery);
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

  const agencyOptions = useMemo(
    () =>
      (agencies ?? [])
        .filter((a) => (scope === "ALL" ? true : a.id === scope))
        .map((a) => ({ id: a.id, name: a.name })),
    [agencies, scope],
  );

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
            <TabsTrigger value="buses">Buses</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="revenue">Reports</TabsTrigger>
            {isSuper ? <TabsTrigger value="access">Permissions</TabsTrigger> : null}
          </TabsList>

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

function AccessManager() {
  const queryClient = useQueryClient();
  const { data: agencies } = useQuery(agenciesQuery);
  const { data: staff, isLoading } = useQuery(staffDirectoryQuery);
  const [filter, setFilter] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Permissions updated");
      setPending(null);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not update permissions");
      setPending(null);
    },
  });

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (staff ?? []).filter(
      (s) =>
        !q ||
        s.full_name.toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q),
    );
  }, [staff, filter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-1 p-5">
          <h2 className="font-display text-lg font-bold">Roles &amp; permissions</h2>
          <p className="text-sm text-muted-foreground">
            Super admins control every agency. Assign an agency admin so they can only manage
            bookings, tickets and revenue for their own agency.
          </p>
        </CardContent>
      </Card>

      <Input
        placeholder="Search staff by name or email"
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
                    <p className="font-semibold">{person.full_name || "Unnamed user"}</p>
                    <p className="text-xs text-muted-foreground">{person.email ?? "—"}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {isSuperUser ? <Badge>Super admin</Badge> : null}
                      {agencyRole ? (
                        <Badge variant="secondary">
                          Agency admin ·{" "}
                          {(agencies ?? []).find((a) => a.id === agencyRole.agency_id)?.name ??
                            "unassigned"}
                        </Badge>
                      ) : null}
                      {!isSuperUser && !agencyRole ? (
                        <Badge variant="outline">Passenger</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
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
                      <option value="">No agency access</option>
                      {(agencies ?? []).map((a) => (
                        <option key={a.id} value={a.id}>
                          Admin · {a.name}
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
                      {isSuperUser ? "Remove super admin" : "Make super admin"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No accounts found.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

type AgencyOption = { id: number; name: string };

function useAdminMutation(onDone?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Saved");
      onDone?.();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save the change"),
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 text-sm font-normal normal-case text-foreground";

function AgencyPicker({
  agencies,
  value,
  onChange,
}: {
  agencies: AgencyOption[];
  value: number | "";
  onChange: (v: number) => void;
}) {
  if (agencies.length <= 1) return null;
  return (
    <Field label="Agency">
      <select
        className={selectClass}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value="">Select agency</option>
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
  const { data: buses, isLoading } = useQuery(agencyBusesQuery(scope));
  const mutate = useAdminMutation();
  const [agency, setAgency] = useState<number | "">(agencies[0]?.id ?? "");
  const [busNumber, setBusNumber] = useState("");
  const [plate, setPlate] = useState("");
  const [type, setType] = useState("Standard");
  const [capacity, setCapacity] = useState(30);
  const [editing, setEditing] = useState<number | null>(null);

  const agencyId = agencies.length === 1 ? agencies[0]!.id : agency;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agencyId) { toast.error("Choose an agency first"); return; }
    if (!busNumber.trim() || !plate.trim()) { toast.error("Bus number and plate are required"); return; }
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
          <h2 className="font-display text-lg font-bold">Add a bus</h2>
          <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
            <AgencyPicker agencies={agencies} value={agency} onChange={setAgency} />
            <Field label="Bus number">
              <Input value={busNumber} onChange={(e) => setBusNumber(e.target.value)} placeholder="HRZ-07" className="w-32" />
            </Field>
            <Field label="Plate">
              <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="RAD 123 B" className="w-36" />
            </Field>
            <Field label="Type">
              <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
                <option>Standard</option>
                <option>Executive</option>
                <option>Coaster</option>
              </select>
            </Field>
            <Field label="Seats">
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
              <Bus className="size-4" /> Add bus
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (buses ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No buses registered yet.
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
                        {b.bus_type} · {b.seat_capacity} seats
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={b.status === "ACTIVE" ? "default" : "secondary"}>
                        {b.status}
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
                        <option value="ACTIVE">Active</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                      <Button size="sm" variant="outline" onClick={() => setEditing(b.id)}>
                        Edit
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
  const { data: routes, isLoading } = useQuery(agencyRoutesQuery(scope));
  const { data: stations } = useQuery(stationsQuery);
  const mutate = useAdminMutation();
  const [agency, setAgency] = useState<number | "">(agencies[0]?.id ?? "");
  const [origin, setOrigin] = useState<number | "">("");
  const [destination, setDestination] = useState<number | "">("");
  const [distance, setDistance] = useState(100);
  const [duration, setDuration] = useState(120);

  const agencyId = agencies.length === 1 ? agencies[0]!.id : agency;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agencyId) { toast.error("Choose an agency first"); return; }
    if (!origin || !destination || origin === destination)
      { toast.error("Pick a different origin and destination"); return; }
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
          <h2 className="font-display text-lg font-bold">Add a route</h2>
          <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
            <AgencyPicker agencies={agencies} value={agency} onChange={setAgency} />
            <Field label="From">
              <select className={selectClass} value={origin} onChange={(e) => setOrigin(Number(e.target.value))}>
                <option value="">Origin</option>
                {(stations ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.city} · {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="To">
              <select
                className={selectClass}
                value={destination}
                onChange={(e) => setDestination(Number(e.target.value))}
              >
                <option value="">Destination</option>
                {(stations ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.city} · {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Distance (km)">
              <Input type="number" min={1} value={distance} onChange={(e) => setDistance(Number(e.target.value))} className="w-28" />
            </Field>
            <Field label="Duration (min)">
              <Input type="number" min={10} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-28" />
            </Field>
            <Button type="submit" disabled={mutate.isPending}>
              <RouteIcon className="size-4" /> Add route
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
                    <div className="flex items-center gap-2">
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? "Active" : "Paused"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => mutate.mutate(() => toggleRoute(r.id, !r.is_active))}
                      >
                        {r.is_active ? "Pause" : "Activate"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(r.id)}>
                        Edit
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
                No routes yet.
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TripsPanel({ scope, agencies }: { scope: number | "ALL"; agencies: AgencyOption[] }) {
  const today = todayISO();
  const { data: trips, isLoading } = useQuery(agencyTripsQuery(scope, today));
  const { data: buses } = useQuery(agencyBusesQuery(scope));
  const { data: routes } = useQuery(agencyRoutesQuery(scope));
  const mutate = useAdminMutation();

  const [agency, setAgency] = useState<number | "">(agencies[0]?.id ?? "");
  const agencyId = agencies.length === 1 ? agencies[0]!.id : agency;
  const [busId, setBusId] = useState<number | "">("");
  const [routeId, setRouteId] = useState<number | "">("");
  const [date, setDate] = useState(today);
  const [departure, setDeparture] = useState("08:00");
  const [arrival, setArrival] = useState("11:00");
  const [price, setPrice] = useState(5000);

  const busOptions = (buses ?? []).filter((b) => !agencyId || b.agency_id === agencyId);
  const routeOptions = (routes ?? []).filter((r) => !agencyId || r.agency_id === agencyId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agencyId) { toast.error("Choose an agency first"); return; }
    if (!busId || !routeId) { toast.error("Pick a bus and a route"); return; }
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
          <h2 className="font-display text-lg font-bold">Schedule a trip</h2>
          <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
            <AgencyPicker agencies={agencies} value={agency} onChange={setAgency} />
            <Field label="Bus">
              <select className={selectClass} value={busId} onChange={(e) => setBusId(Number(e.target.value))}>
                <option value="">Select bus</option>
                {busOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bus_number} ({b.seat_capacity})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Route">
              <select className={selectClass} value={routeId} onChange={(e) => setRouteId(Number(e.target.value))}>
                <option value="">Select route</option>
                {routeOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.origin.city} → {r.destination.city}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className="w-40" />
            </Field>
            <Field label="Departs">
              <Input type="time" value={departure} onChange={(e) => setDeparture(e.target.value)} className="w-28" />
            </Field>
            <Field label="Arrives">
              <Input type="time" value={arrival} onChange={(e) => setArrival(e.target.value)} className="w-28" />
            </Field>
            <Field label="Price (RWF)">
              <Input type="number" min={100} step={100} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-32" />
            </Field>
            <Button type="submit" disabled={mutate.isPending}>
              <CalendarPlus className="size-4" /> Schedule
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
                <div>
                  <p className="font-semibold">
                    {t.route.origin.city} → {t.route.destination.city}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(t.travel_date)} · {formatTime(t.departure_time)}–
                    {formatTime(t.arrival_time)} · {t.bus.bus_number} · {formatRwf(t.price_rwf)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className={selectClass}
                    value={t.status}
                    onChange={(e) =>
                      mutate.mutate(() =>
                        updateTripStatus(
                          t.id,
                          e.target.value as
                            | "SCHEDULED"
                            | "BOARDING"
                            | "DEPARTED"
                            | "COMPLETED"
                            | "CANCELLED",
                        ),
                      )
                    }
                  >
                    {["SCHEDULED", "BOARDING", "DEPARTED", "COMPLETED", "CANCELLED"].map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => mutate.mutate(() => deleteTrip(t.id))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(trips ?? []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No upcoming trips scheduled.
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
