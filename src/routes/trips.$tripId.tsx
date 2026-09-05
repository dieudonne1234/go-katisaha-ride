import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bus, Clock, Info, MapPin, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { durationLabel, formatDate, formatRwf, formatTime } from "@/lib/format";
import { getPassengerDetails, savePassengerDetails } from "@/lib/localCache";
import { profileQuery, tripQuery, tripSeatsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

type TripSearch = { pax: number };

export const Route = createFileRoute("/trips/$tripId")({
  validateSearch: (search: Record<string, unknown>): TripSearch => ({
    pax: Number(search["pax"]) > 0 ? Number(search["pax"]) : 1,
  }),
  head: () => ({
    meta: [
      { title: "Choose your seat — KATISHA BUS" },
      {
        name: "description",
        content:
          "Review the trip, pick your exact seat on the bus layout and confirm your passenger details.",
      },
      { property: "og:title", content: "Choose your seat — KATISHA BUS" },
      {
        property: "og:description",
        content: "Interactive bus seat map with live availability for your Rwandan bus trip.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TripPage,
});

function SeatBox({
  label,
  state,
  onClick,
}: {
  label: string;
  state: "available" | "selected" | "booked";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={state === "booked"}
      onClick={onClick}
      aria-label={`Seat ${label} ${state}`}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-lg border-2 text-xs font-bold transition-all",
        state === "available" &&
          "border-border bg-card text-foreground hover:border-primary hover:bg-primary/5",
        state === "selected" && "border-primary bg-primary text-primary-foreground shadow-card",
        state === "booked" && "cursor-not-allowed border-transparent bg-muted text-muted-foreground/60",
      )}
    >
      {label}
    </button>
  );
}

function TripPage() {
  const { tripId } = Route.useParams();
  const { pax } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const id = Number(tripId);
  const tripResult = useQuery(tripQuery(id));
  const trip = tripResult.data;
  const seatsResult = useQuery(tripSeatsQuery(id, trip?.bus.id));
  const { data: profile } = useQuery({ ...profileQuery, enabled: Boolean(user) });

  const [selected, setSelected] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const cached = getPassengerDetails();
    if (cached) {
      setName((v) => v || cached.name);
      setPhone((v) => v || cached.phone);
      setEmail((v) => v || cached.email);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      setName((v) => v || profile.full_name || "");
      setPhone((v) => v || profile.phone || "");
      setEmail((v) => v || profile.email || "");
    }
  }, [profile]);

  const rows = useMemo(() => {
    const map = new Map<number, typeof seatsResult.data>();
    for (const seat of seatsResult.data ?? []) {
      const list = map.get(seat.row_index) ?? [];
      list.push(seat);
      map.set(seat.row_index, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [seatsResult.data]);

  const selectedSeats = (seatsResult.data ?? []).filter((s) => selected.includes(s.id));
  const total = (trip?.price_rwf ?? 0) * selected.length;

  function toggleSeat(seatId: number) {
    setSelected((prev) => {
      if (prev.includes(seatId)) return prev.filter((s) => s !== seatId);
      if (prev.length >= 5) {
        toast.error("You can book up to 5 seats at once");
        return prev;
      }
      return [...prev, seatId];
    });
  }

  const booking = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_booking", {
        _trip_id: id,
        _seat_ids: selected,
        _passenger_name: name.trim(),
        _passenger_phone: phone.trim(),
        _passenger_email: email.trim(),
      });
      if (error) throw error;
      return data as unknown as { id: string; booking_ref: string };
    },
    onSuccess: (data) => {
      savePassengerDetails({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      void queryClient.invalidateQueries({ queryKey: ["trip", id] });
      toast.success(`Seats reserved — ${data.booking_ref}`);
      void navigate({ to: "/booking/$bookingId", params: { bookingId: data.id } });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not reserve those seats");
      void queryClient.invalidateQueries({ queryKey: ["trip", id] });
      setSelected([]);
    },
  });

  if (tripResult.isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (tripResult.isError || !trip) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-xl font-bold">Trip unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This trip no longer exists or could not be loaded.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const canSubmit =
    selected.length > 0 && name.trim().length > 1 && phone.trim().length >= 8 && Boolean(user);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <Card className="mb-6 border-none bg-hero text-surface-foreground shadow-lift">
          <CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <Badge className="bg-accent text-accent-foreground hover:bg-accent">
                {trip.agency.name}
              </Badge>
              <h1 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">
                {trip.route.origin.city} → {trip.route.destination.city}
              </h1>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-surface-foreground/85">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" />
                  {formatTime(trip.departure_time)} – {formatTime(trip.arrival_time)} (
                  {durationLabel(trip.route.duration_minutes)})
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {formatDate(trip.travel_date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Bus className="size-4" />
                  {trip.bus.bus_type} · {trip.bus.bus_number}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-4" />
                  {trip.available_seats} seats free
                </span>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xs tracking-widest text-surface-foreground/70 uppercase">
                Fare per seat
              </p>
              <p className="font-display text-3xl font-extrabold text-accent">
                {formatRwf(trip.price_rwf)}
              </p>
            </div>
          </CardContent>
        </Card>

        <RouteTimetable
          routeId={trip.route.id}
          date={trip.travel_date}
          currentTripId={trip.id}
        />



        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-bold">Select your seat</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Booking for {pax} passenger{pax === 1 ? "" : "s"}. Tap a seat to select it.
              </p>

              <div className="mt-5 flex flex-wrap gap-4 text-xs font-medium">
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded border-2 border-border bg-card" /> Available
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded border-2 border-primary bg-primary" /> Selected
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded bg-muted" /> Booked
                </span>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-5">
                <div className="mb-5 flex justify-end">
                  <span className="rounded-lg bg-surface px-3 py-1.5 text-[11px] font-bold tracking-widest text-surface-foreground uppercase">
                    Driver
                  </span>
                </div>

                {seatsResult.isLoading ? (
                  <Skeleton className="h-56 w-full" />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    {rows.map(([rowIndex, seats]) => (
                      <div key={rowIndex} className="flex items-center gap-3">
                        {(seats ?? []).slice(0, 2).map((seat) => (
                          <SeatBox
                            key={seat.id}
                            label={seat.seat_label}
                            state={
                              seat.taken
                                ? "booked"
                                : selected.includes(seat.id)
                                  ? "selected"
                                  : "available"
                            }
                            onClick={() => toggleSeat(seat.id)}
                          />
                        ))}
                        <span className="w-8" />
                        {(seats ?? []).slice(2).map((seat) => (
                          <SeatBox
                            key={seat.id}
                            label={seat.seat_label}
                            state={
                              seat.taken
                                ? "booked"
                                : selected.includes(seat.id)
                                  ? "selected"
                                  : "available"
                            }
                            onClick={() => toggleSeat(seat.id)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <h3 className="font-display text-base font-bold">Passenger information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pname">Full name</Label>
                    <Input
                      id="pname"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pphone">Phone number</Label>
                    <Input
                      id="pphone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+250 7xx xxx xxx"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="pemail">Email (optional)</Label>
                    <Input
                      id="pemail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:sticky lg:top-24">
            <CardContent className="space-y-4 p-6">
              <h2 className="font-display text-lg font-bold">Booking summary</h2>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Agency</dt>
                  <dd className="font-semibold">{trip.agency.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Route</dt>
                  <dd className="font-semibold">
                    {trip.route.origin.city} → {trip.route.destination.city}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-semibold">{formatDate(trip.travel_date)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Departure</dt>
                  <dd className="font-semibold">{formatTime(trip.departure_time)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Seats</dt>
                  <dd className="font-semibold">
                    {selectedSeats.length
                      ? selectedSeats.map((s) => s.seat_label).join(", ")
                      : "—"}
                  </dd>
                </div>
              </dl>

              <div className="flex items-baseline justify-between border-t border-border pt-4">
                <span className="text-sm font-semibold">Total</span>
                <span className="font-display text-2xl font-extrabold text-primary">
                  {formatRwf(total)}
                </span>
              </div>

              {!user ? (
                <div className="flex gap-2 rounded-lg bg-secondary p-3 text-xs">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Sign in to reserve your seats.{" "}
                    <Link
                      to="/auth"
                      search={{ redirect: `/trips/${tripId}` }}
                      className="font-semibold text-primary underline"
                    >
                      Sign in or register
                    </Link>
                  </span>
                </div>
              ) : null}

              <Button
                className="w-full"
                size="lg"
                disabled={!canSubmit || booking.isPending}
                onClick={() => booking.mutate()}
              >
                {booking.isPending ? "Reserving…" : "Continue to payment"}
                <ArrowRight className="size-4" />
              </Button>

              {user && selected.length > 0 && (name.trim().length < 2 || phone.trim().length < 8) ? (
                <p className="text-xs text-muted-foreground">
                  Enter the passenger name and phone number to continue.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
