import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  History,
  MapPin,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { formatDate, formatRwf, formatTime, todayISO } from "@/lib/format";
import {
  cacheStations,
  getCachedStations,
  getRecentSearches,
  pushRecentSearch,
  type RecentSearch,
} from "@/lib/localCache";
import { agenciesQuery, myBookingsQuery, stationsQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KATISHA BUS — Book Your Journey Across Rwanda" },
      {
        name: "description",
        content:
          "Search and book bus tickets across Rwanda with Horizon Express, Volcano Express and Stella Express. Pick your seat, pay by Mobile Money, travel with a QR ticket.",
      },
      { property: "og:title", content: "KATISHA BUS — Book Your Journey Across Rwanda" },
      {
        property: "og:description",
        content:
          "Rwanda's bus ticket booking platform. Compare trips, choose your seat and get an instant digital QR ticket.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const POPULAR = [
  { to: "Musanze Bus Station", label: "Musanze", note: "Volcanoes National Park", price: 5000 },
  { to: "Rubavu Bus Station", label: "Rubavu", note: "Lake Kivu beaches", price: 8000 },
  { to: "Huye Bus Station", label: "Huye", note: "Southern Province", price: 6500 },
];

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stations } = useQuery(stationsQuery);
  const { data: agencies } = useQuery(agenciesQuery);
  const { data: bookings } = useQuery({ ...myBookingsQuery, enabled: Boolean(user) });

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO());
  const [pax, setPax] = useState<string>("1");
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  useEffect(() => setRecent(getRecentSearches()), []);
  useEffect(() => {
    if (stations?.length) cacheStations(stations);
  }, [stations]);

  const stationList = useMemo(
    () => (stations?.length ? stations : getCachedStations()),
    [stations],
  );

  useEffect(() => {
    if (!from && stationList.length) {
      const nyabugogo = stationList.find((s) => s.name.startsWith("Nyabugogo"));
      if (nyabugogo) setFrom(String(nyabugogo.id));
    }
  }, [stationList, from]);

  const upcoming = useMemo(
    () =>
      (bookings ?? [])
        .filter((b) => b.status === "CONFIRMED" && b.trip.travel_date >= todayISO())
        .sort((a, b) => a.trip.travel_date.localeCompare(b.trip.travel_date))[0],
    [bookings],
  );

  function runSearch(nextFrom = from, nextTo = to, nextDate = date, nextPax = Number(pax)) {
    if (!nextFrom || !nextTo || nextFrom === nextTo) return;
    const fromStation = stationList.find((s) => String(s.id) === String(nextFrom));
    const toStation = stationList.find((s) => String(s.id) === String(nextTo));
    pushRecentSearch({
      from: Number(nextFrom),
      to: Number(nextTo),
      fromName: fromStation?.name ?? "",
      toName: toStation?.name ?? "",
      date: nextDate,
      pax: nextPax,
    });
    void navigate({
      to: "/search",
      search: { from: Number(nextFrom), to: Number(nextTo), date: nextDate, pax: nextPax },
    });
  }

  const sameStation = Boolean(from && to && from === to);

  return (
    <AppShell>
      <section className="bg-hero text-surface-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-28 sm:pt-16">
          <p className="text-xs font-bold tracking-[0.24em] text-accent uppercase">
            Rwanda Bus Network
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl leading-tight font-extrabold sm:text-5xl">
            Book your journey across Rwanda
          </h1>
          <p className="mt-4 max-w-xl text-sm text-surface-foreground/80 sm:text-base">
            Compare departures from Horizon Express, Volcano Express and Stella Express, choose
            your exact seat and travel with an instant digital QR ticket.
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-20 w-full max-w-6xl px-4">
        <Card className="border-none shadow-lift">
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto_auto] md:items-end">
              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-widest uppercase">From</Label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger className="h-12 w-full">
                    <SelectValue placeholder="Departure station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stationList.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-widest uppercase">To</Label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger className="h-12 w-full">
                    <SelectValue placeholder="Destination station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stationList.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-widest uppercase">Date</Label>
                <Input
                  type="date"
                  className="h-12"
                  min={todayISO()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-widest uppercase">Passengers</Label>
                <Select value={pax} onValueChange={setPax}>
                  <SelectTrigger className="h-12 w-full md:w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="lg"
                className="h-12 w-full md:w-auto"
                disabled={!from || !to || sameStation}
                onClick={() => runSearch()}
              >
                Search buses
                <ArrowRight className="size-4" />
              </Button>
            </div>
            {sameStation ? (
              <p className="mt-3 text-xs font-medium text-destructive">
                Departure and destination must be different stations.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-12">
        {upcoming ? (
          <section>
            <h2 className="mb-3 text-lg font-bold">Upcoming trip</h2>
            <Card className="border-primary/25 bg-primary/5">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-xs font-bold tracking-widest text-primary uppercase">
                    {upcoming.booking_ref}
                  </p>
                  <p className="mt-1 font-display text-lg font-bold">
                    {upcoming.trip.route.origin.city} → {upcoming.trip.route.destination.city}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(upcoming.trip.travel_date)} ·{" "}
                    {formatTime(upcoming.trip.departure_time)} · Seat{" "}
                    {upcoming.seats.map((s) => s.seat_label).join(", ")}
                  </p>
                </div>
                <Button asChild variant="secondary">
                  <a href={`/tickets/${upcoming.id}`}>
                    <Ticket className="size-4" /> View ticket
                  </a>
                </Button>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {recent.length > 0 ? (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <History className="size-4 text-muted-foreground" /> Recent searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {recent.map((r, i) => (
                <button
                  key={`${r.from}-${r.to}-${r.date}-${i}`}
                  onClick={() => runSearch(String(r.from), String(r.to), r.date, r.pax)}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  {r.fromName.replace(" Bus Station", "")} →{" "}
                  {r.toName.replace(" Bus Station", "")}
                  <span className="ml-2 text-xs text-muted-foreground">{r.date}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 text-lg font-bold">Popular destinations</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {POPULAR.map((p) => {
              const destination = stationList.find((s) => s.name === p.to);
              return (
                <Card
                  key={p.to}
                  className="cursor-pointer transition-shadow hover:shadow-lift"
                  onClick={() => destination && runSearch(from, String(destination.id))}
                >
                  <CardContent className="p-5">
                    <MapPin className="size-5 text-accent" />
                    <p className="mt-3 font-display text-lg font-bold">{p.label}</p>
                    <p className="text-sm text-muted-foreground">{p.note}</p>
                    <p className="mt-3 text-sm font-semibold text-primary">
                      from {formatRwf(p.price)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">Available agencies</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {(agencies ?? []).map((a) => (
              <Card key={a.id}>
                <CardContent className="p-5">
                  <span className="inline-flex rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold tracking-wider text-secondary-foreground">
                    {a.code}
                  </span>
                  <p className="mt-3 font-display text-base font-bold">{a.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {a.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: CalendarDays,
              title: "Book 14 days ahead",
              body: "Daily departures at 06:30, 10:00 and 15:30 on every corridor.",
            },
            {
              icon: ShieldCheck,
              title: "Guaranteed seat",
              body: "Seats are locked the moment you reserve — no double bookings.",
            },
            {
              icon: Clock,
              title: "Arrive 20 min early",
              body: "Show your QR ticket at the gate for a quick scan and boarding.",
            },
          ].map((t) => (
            <div key={t.title} className="rounded-xl border border-border bg-card p-5">
              <t.icon className="size-5 text-primary" />
              <p className="mt-3 font-semibold">{t.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </section>

        <section className="flex items-center gap-3 rounded-xl bg-surface p-5 text-surface-foreground">
          <Users className="size-5 text-accent" />
          <p className="text-sm">
            Travelling as a group? Select up to 5 seats in a single booking and get one reference
            for everyone.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
