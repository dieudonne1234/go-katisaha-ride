import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CalendarDays, LoaderCircle, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { findRecommendedTrips } from "@/lib/trip-recommendations.functions";
import type { RecommendationResult } from "@/lib/trip-recommendations";
import { durationLabel, formatDate, formatRwf, formatTime } from "@/lib/format";

export function TripRecommendations({ date, originId, passengers }: { date: string; originId: number | null; passengers: number }) {
  const recommend = useServerFn(findRecommendedTrips);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || description.trim().length < 3) return;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const next = await recommend({ data: { description: description.trim(), date, originId, passengers } });
      if (next.error) setError(next.error);
      else setResult(next);
    } catch {
      setError("Could not find recommendations. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="trip-finder-title" className="border-y border-border py-7">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="size-5 text-primary" aria-hidden="true" />
        <h2 id="trip-finder-title" className="text-lg font-bold">Find my trip</h2>
      </div>
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        <Label htmlFor="travel-request">Where would you like to go?</Label>
        <Textarea id="travel-request" value={description} onChange={(event) => setDescription(event.target.value)}
          maxLength={1000} disabled={busy} rows={3}
          placeholder="From Kigali to Musanze tomorrow morning, 2 passengers, under 6,000 RWF each."
          className="min-h-24 resize-y bg-card" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-4" />{formatDate(date)} · {passengers} {passengers === 1 ? "passenger" : "passengers"}</span>
          <Button type="submit" disabled={busy || description.trim().length < 3}>
            {busy ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="size-4" />}
            {busy ? "Finding trips…" : "Recommend trips"}
          </Button>
        </div>
      </form>
      <div aria-live="polite" aria-busy={busy} className="mt-4">
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {result ? <>
          <p role="status" className="mb-4 text-sm text-muted-foreground">{result.message}</p>
          <div className="grid gap-4 lg:grid-cols-3">
            {result.trips.map((trip) => <article key={trip.id} className="flex flex-col rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-primary">{trip.agency.name}</p>
              <h3 className="mt-2 flex items-start gap-2 font-semibold"><MapPin className="mt-0.5 size-4 shrink-0" />{trip.route.origin.city} → {trip.route.destination.city}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{trip.route.origin.name} → {trip.route.destination.name}</p>
              <p className="mt-3 text-sm">{formatDate(trip.travel_date)}</p>
              <p className="mt-1 text-sm font-medium">{formatTime(trip.departure_time)} → {formatTime(trip.arrival_time)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{durationLabel(trip.route.duration_minutes)} · {trip.bus.bus_type} · {trip.available_seats} seats left</p>
              <p className="mt-3 font-bold">{formatRwf(trip.price_rwf)} <span className="text-xs font-normal text-muted-foreground">per passenger</span></p>
              <Button asChild className="mt-4 w-full"><Link to="/trips/$tripId" params={{ tripId: String(trip.id) }} search={{ pax: result.passengers }}>Choose seats <ArrowRight className="size-4" /></Link></Button>
            </article>)}
          </div>
        </> : null}
      </div>
    </section>
  );
}