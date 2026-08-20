import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bus, Clock, Filter, MapPin, SearchX, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell, PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { durationLabel, formatRwf, formatTime, todayISO } from "@/lib/format";
import { cacheStations, getCachedStations, pushRecentSearch } from "@/lib/localCache";
import { agenciesQuery, searchTripsQuery, stationsQuery } from "@/lib/queries";

type SearchQuery = { from?: number; to?: number; date: string; pax: number };

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchQuery => {
    const from = Number(search["from"]);
    const to = Number(search["to"]);
    const date = typeof search["date"] === "string" ? search["date"] : todayISO();
    const pax = Number(search["pax"]) > 0 ? Number(search["pax"]) : 1;
    const base: SearchQuery = { date, pax };
    if (Number.isFinite(from) && from > 0) base.from = from;
    if (Number.isFinite(to) && to > 0) base.to = to;
    return base;
  },
  head: () => ({
    meta: [
      { title: "Search buses — KATISHA BUS" },
      {
        name: "description",
        content:
          "Compare bus departures across Rwanda by agency, price and departure time, then reserve your seat instantly.",
      },
      { property: "og:title", content: "Search buses — KATISHA BUS" },
      {
        property: "og:description",
        content: "Find available buses between Rwandan stations and book a seat in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const params = Route.useSearch();
  const navigate = useNavigate();
  const { data: stations } = useQuery(stationsQuery);
  const { data: agencies } = useQuery(agenciesQuery);

  const [from, setFrom] = useState(params.from ? String(params.from) : "");
  const [to, setTo] = useState(params.to ? String(params.to) : "");
  const [date, setDate] = useState(params.date);
  const [pax, setPax] = useState(String(params.pax));

  const [agencyFilter, setAgencyFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("departure");

  useEffect(() => {
    setFrom(params.from ? String(params.from) : "");
    setTo(params.to ? String(params.to) : "");
    setDate(params.date);
    setPax(String(params.pax));
  }, [params]);

  useEffect(() => {
    if (stations?.length) cacheStations(stations);
  }, [stations]);

  const stationList = useMemo(
    () => (stations?.length ? stations : getCachedStations()),
    [stations],
  );

  const ready = Boolean(params.from && params.to);
  const query = useQuery({
    ...searchTripsQuery({ from: params.from ?? 0, to: params.to ?? 0, date: params.date }),
    enabled: ready,
  });

  const results = useMemo(() => {
    let list = (query.data ?? []).filter((t) => t.available_seats >= params.pax);
    if (agencyFilter !== "all") list = list.filter((t) => String(t.agency.id) === agencyFilter);
    if (timeFilter !== "all") {
      list = list.filter((t) => {
        const hour = Number(t.departure_time.slice(0, 2));
        if (timeFilter === "morning") return hour < 12;
        if (timeFilter === "afternoon") return hour >= 12 && hour < 17;
        return hour >= 17;
      });
    }
    const sorted = [...list];
    if (sortBy === "price") sorted.sort((a, b) => a.price_rwf - b.price_rwf);
    else if (sortBy === "seats") sorted.sort((a, b) => b.available_seats - a.available_seats);
    else if (sortBy === "arrival")
      sorted.sort((a, b) => a.arrival_time.localeCompare(b.arrival_time));
    else sorted.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
    return sorted;
  }, [query.data, agencyFilter, timeFilter, sortBy, params.pax]);

  function submit() {
    if (!from || !to || from === to) return;
    const fromStation = stationList.find((s) => String(s.id) === from);
    const toStation = stationList.find((s) => String(s.id) === to);
    pushRecentSearch({
      from: Number(from),
      to: Number(to),
      fromName: fromStation?.name ?? "",
      toName: toStation?.name ?? "",
      date,
      pax: Number(pax),
    });
    void navigate({
      to: "/search",
      search: { from: Number(from), to: Number(to), date, pax: Number(pax) },
    });
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <PageHeader
          title="Search buses"
          subtitle="Choose your stations and travel date to see live departures."
        />

        <Card className="mb-6 shadow-card">
          <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_1fr_auto_auto] md:items-end">
            <div className="space-y-1.5">
              <Label className="text-[11px] tracking-widest uppercase">From</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Departure" />
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
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Destination" />
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
                className="h-11"
                min={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] tracking-widest uppercase">Pax</Label>
              <Select value={pax} onValueChange={setPax}>
                <SelectTrigger className="h-11 w-full md:w-20">
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
            <Button className="h-11" onClick={submit} disabled={!from || !to || from === to}>
              Search
            </Button>
          </CardContent>
        </Card>

        {ready ? (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <Filter className="size-4" /> Filters
              </span>
              <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agencies</SelectItem>
                  {(agencies ?? []).map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-9 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="departure">Sort: departure time</SelectItem>
                  <SelectItem value="arrival">Sort: arrival time</SelectItem>
                  <SelectItem value="price">Sort: lowest price</SelectItem>
                  <SelectItem value="seats">Sort: most seats free</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {query.isLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-36 w-full rounded-xl" />
                ))}
              </div>
            ) : query.isError ? (
              <Card className="border-destructive/40">
                <CardContent className="p-6 text-sm">
                  We couldn't load departures. Check your connection and try again.
                  <Button className="mt-4" variant="secondary" onClick={() => void query.refetch()}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : results.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
                  <SearchX className="size-10 text-muted-foreground" />
                  <p className="font-display text-lg font-bold">No buses found</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    There are no departures matching these filters. Try another date, another
                    corridor, or clear the filters.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {results.length} bus{results.length === 1 ? "" : "es"} available
                </p>
                {results.map((trip) => (
                  <Card key={trip.id} className="overflow-hidden transition-shadow hover:shadow-lift">
                    <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                            {trip.agency.name}
                          </Badge>
                          <Badge variant="secondary">{trip.bus.bus_type}</Badge>
                          <span className="text-xs font-medium text-muted-foreground">
                            Bus {trip.bus.bus_number} · {trip.bus.plate_number}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <div>
                            <p className="font-display text-2xl font-extrabold">
                              {formatTime(trip.departure_time)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {trip.route.origin.name}
                            </p>
                          </div>
                          <div className="flex flex-col items-center px-2">
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {durationLabel(trip.route.duration_minutes)}
                            </span>
                            <div className="my-1 h-px w-16 bg-border" />
                            <span className="text-[11px] text-muted-foreground">
                              {trip.route.distance_km} km
                            </span>
                          </div>
                          <div>
                            <p className="font-display text-2xl font-extrabold">
                              {formatTime(trip.arrival_time)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {trip.route.destination.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {trip.route.origin.city} → {trip.route.destination.city}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="size-3.5" />
                            {trip.available_seats} of {trip.bus.seat_capacity} seats free
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5" />
                            Boarding 20 min before departure
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-row items-center justify-between gap-4 border-t border-border pt-4 md:flex-col md:items-end md:border-t-0 md:border-l md:pt-0 md:pl-6">
                        <div className="text-right">
                          <p className="font-display text-2xl font-extrabold text-primary">
                            {formatRwf(trip.price_rwf)}
                          </p>
                          <p className="text-xs text-muted-foreground">per passenger</p>
                        </div>
                        <Button asChild size="lg">
                          <Link
                            to="/trips/$tripId"
                            params={{ tripId: String(trip.id) }}
                            search={{ pax: params.pax }}
                          >
                            Select seats <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <Bus className="size-10 text-muted-foreground" />
              <p className="font-display text-lg font-bold">Where are you travelling?</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Pick a departure and destination station above to see all available buses.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
