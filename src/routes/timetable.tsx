import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";

import { AppShell, PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { durationLabel, formatDate, formatRwf, formatShortDate, formatTime, todayISO } from "@/lib/format";
import { agenciesQuery, timetableQuery } from "@/lib/queries";

type TimetableSearch = { date: string; agency: number | "ALL" };

function nextDays(count: number): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export const Route = createFileRoute("/timetable")({
  validateSearch: (search: Record<string, unknown>): TimetableSearch => {
    const date = typeof search["date"] === "string" ? (search["date"] as string) : todayISO();
    const rawAgency = Number(search["agency"]);
    return {
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayISO(),
      agency: Number.isFinite(rawAgency) && rawAgency > 0 ? rawAgency : "ALL",
    };
  },
  head: () => ({
    meta: [
      { title: "Bus timetable & fares — KATISHA BUS" },
      {
        name: "description",
        content:
          "Full daily timetable for Horizon, Volcano and Stella Express: departure times, arrival times, journey length, fares and seats left.",
      },
      { property: "og:title", content: "Bus timetable & fares — KATISHA BUS" },
      {
        property: "og:description",
        content: "See every scheduled departure in Rwanda with times, prices and seat availability before you book.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TimetablePage,
});

function TimetablePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState("");

  const days = useMemo(() => nextDays(7), []);
  const { data: agencies } = useQuery(agenciesQuery);
  const trips = useQuery(timetableQuery(search.date, search.agency));

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return trips.data ?? [];
    return (trips.data ?? []).filter((t) =>
      `${t.route.origin.city} ${t.route.destination.city} ${t.agency.name}`
        .toLowerCase()
        .includes(term),
    );
  }, [trips.data, query]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <PageHeader
          title="Timetable & fares"
          subtitle={`All scheduled departures for ${formatDate(search.date)}`}
        />

        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => void navigate({ search: { ...search, date: d } })}
              className={
                d === search.date
                  ? "shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                  : "shrink-0 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary"
              }
            >
              {formatShortDate(d)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={search.agency === "ALL" ? "default" : "outline"}
            onClick={() => void navigate({ search: { ...search, agency: "ALL" } })}
          >
            All agencies
          </Button>
          {(agencies ?? []).map((a) => (
            <Button
              key={a.id}
              size="sm"
              variant={search.agency === a.id ? "default" : "outline"}
              onClick={() => void navigate({ search: { ...search, agency: a.id } })}
            >
              {a.name}
            </Button>
          ))}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by city"
            className="max-w-[200px]"
          />
        </div>

        <div className="mt-6 space-y-3">
          {trips.isLoading ? (
            <>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarDays className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No departures published for this day yet. Try another date.
                </p>
              </CardContent>
            </Card>
          ) : (
            rows.map((trip) => (
              <Card key={trip.id}>
                <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{trip.agency.name}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {trip.bus.bus_type} · {trip.bus.bus_number}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 font-display text-lg font-bold">
                      <span>{formatTime(trip.departure_time)}</span>
                      <ArrowRight className="size-4 text-muted-foreground" />
                      <span>{formatTime(trip.arrival_time)}</span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {trip.route.origin.city} → {trip.route.destination.city}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      {durationLabel(trip.route.duration_minutes)} · {trip.route.distance_km} km ·{" "}
                      {trip.available_seats > 0
                        ? `${trip.available_seats} seats left`
                        : "Fully booked"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-extrabold">
                      {formatRwf(trip.price_rwf)}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="mt-2"
                      disabled={trip.available_seats <= 0}
                    >
                      <Link
                        to="/trips/$tripId"
                        params={{ tripId: String(trip.id) }}
                        search={{ pax: 1 }}
                      >
                        {trip.available_seats > 0 ? "Book seats" : "Full"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
