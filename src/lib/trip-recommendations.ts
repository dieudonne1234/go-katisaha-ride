export type TripIntent = {
  origin: string | null;
  destination: string | null;
  date: string | null;
  passengers: number;
  maximumFare: number | null;
  earliestDeparture: string | null;
  latestDeparture: string | null;
  agency: string | null;
  busType: string | null;
  priority: "price" | "early" | "late" | "duration";
};

export type RecommendedTrip = {
  id: number;
  travel_date: string;
  departure_time: string;
  arrival_time: string;
  price_rwf: number;
  available_seats: number;
  agency: { name: string };
  bus: { bus_type: string; seat_capacity: number };
  route: {
    duration_minutes: number;
    origin: { id: number; name: string; city: string };
    destination: { id: number; name: string; city: string };
  };
};

export type RecommendationResult = {
  trips: RecommendedTrip[];
  message: string;
  date: string;
  passengers: number;
  error: string | null;
};

const normalized = (value: string) => value.toLowerCase().trim();
const matches = (term: string, ...values: string[]) => values.some((v) => normalized(v).includes(normalized(term)));

export function matchAvailableTrips(trips: RecommendedTrip[], intent: TripIntent, date: string) {
  return trips.filter((trip) => {
    const route = trip.route;
    return trip.travel_date === date && trip.available_seats >= intent.passengers
      && (!intent.origin || matches(intent.origin, route.origin.city, route.origin.name))
      && Boolean(intent.destination && matches(intent.destination, route.destination.city, route.destination.name))
      && (intent.maximumFare === null || trip.price_rwf <= intent.maximumFare)
      && (!intent.earliestDeparture || trip.departure_time.slice(0, 5) >= intent.earliestDeparture)
      && (!intent.latestDeparture || trip.departure_time.slice(0, 5) <= intent.latestDeparture)
      && (!intent.agency || matches(intent.agency, trip.agency.name))
      && (!intent.busType || matches(intent.busType, trip.bus.bus_type));
  }).sort((a, b) => {
    if (intent.priority === "price") return a.price_rwf - b.price_rwf || a.departure_time.localeCompare(b.departure_time);
    if (intent.priority === "duration") return a.route.duration_minutes - b.route.duration_minutes || a.price_rwf - b.price_rwf;
    if (intent.priority === "late") return b.departure_time.localeCompare(a.departure_time);
    return a.departure_time.localeCompare(b.departure_time) || a.price_rwf - b.price_rwf;
  });
}

export function verifiedRecommendations(ids: number[], available: RecommendedTrip[]) {
  const byId = new Map(available.map((trip) => [trip.id, trip]));
  return [...new Set(ids)].flatMap((id) => {
    const trip = byId.get(id);
    return trip ? [trip] : [];
  }).slice(0, 3);
}