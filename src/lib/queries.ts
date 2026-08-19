import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const TRIP_SELECT = `
  id, travel_date, departure_time, arrival_time, price_rwf, status,
  agency:agencies!trips_agency_id_fkey(id, name, code, description),
  bus:buses!trips_bus_id_fkey(id, bus_number, bus_type, seat_capacity, plate_number),
  route:routes!trips_route_id_fkey(
    id, distance_km, duration_minutes,
    origin:stations!routes_origin_station_id_fkey(id, name, city),
    destination:stations!routes_destination_station_id_fkey(id, name, city)
  )
`;

export type TripRow = {
  id: number;
  travel_date: string;
  departure_time: string;
  arrival_time: string;
  price_rwf: number;
  status: string;
  agency: { id: number; name: string; code: string; description: string | null };
  bus: {
    id: number;
    bus_number: string;
    bus_type: string;
    seat_capacity: number;
    plate_number: string;
  };
  route: {
    id: number;
    distance_km: number;
    duration_minutes: number;
    origin: { id: number; name: string; city: string };
    destination: { id: number; name: string; city: string };
  };
};

export type TripWithAvailability = TripRow & { booked_seats: number; available_seats: number };

export const stationsQuery = queryOptions({
  queryKey: ["stations"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("stations")
      .select("id, name, city, code")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return data;
  },
});

export const agenciesQuery = queryOptions({
  queryKey: ["agencies"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("agencies")
      .select("id, name, code, description, phone, email, is_active")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return data;
  },
});

async function attachAvailability(trips: TripRow[]): Promise<TripWithAvailability[]> {
  if (trips.length === 0) return [];
  const ids = trips.map((t) => t.id);
  const { data, error } = await supabase.from("booking_seats").select("trip_id").in("trip_id", ids);
  if (error) throw error;
  const counts = new Map<number, number>();
  for (const row of data ?? []) {
    counts.set(row.trip_id, (counts.get(row.trip_id) ?? 0) + 1);
  }
  return trips.map((t) => {
    const booked = counts.get(t.id) ?? 0;
    return { ...t, booked_seats: booked, available_seats: t.bus.seat_capacity - booked };
  });
}

export type SearchParams = { from: number; to: number; date: string };

export function searchTripsQuery(params: SearchParams) {
  return queryOptions({
    queryKey: ["trips", "search", params],
    queryFn: async () => {
      const { data: routes, error: routeError } = await supabase
        .from("routes")
        .select("id")
        .eq("origin_station_id", params.from)
        .eq("destination_station_id", params.to)
        .eq("is_active", true);
      if (routeError) throw routeError;
      const routeIds = (routes ?? []).map((r) => r.id);
      if (routeIds.length === 0) return [];

      const { data, error } = await supabase
        .from("trips")
        .select(TRIP_SELECT)
        .in("route_id", routeIds)
        .eq("travel_date", params.date)
        .eq("status", "SCHEDULED")
        .order("departure_time");
      if (error) throw error;
      return attachAvailability((data ?? []) as unknown as TripRow[]);
    },
  });
}

export function tripQuery(tripId: number) {
  return queryOptions({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(TRIP_SELECT)
        .eq("id", tripId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Trip not found");
      const [withAvailability] = await attachAvailability([data as unknown as TripRow]);
      return withAvailability;
    },
  });
}

export function tripSeatsQuery(tripId: number, busId: number | undefined) {
  return queryOptions({
    queryKey: ["trip", tripId, "seats", busId],
    enabled: Boolean(busId),
    queryFn: async () => {
      const { data: seats, error } = await supabase
        .from("bus_seats")
        .select("id, seat_label, row_index, col_index")
        .eq("bus_id", busId!)
        .order("row_index")
        .order("col_index");
      if (error) throw error;
      const { data: taken, error: takenError } = await supabase
        .from("booking_seats")
        .select("seat_id")
        .eq("trip_id", tripId);
      if (takenError) throw takenError;
      const takenIds = new Set((taken ?? []).map((t) => t.seat_id));
      return (seats ?? []).map((s) => ({ ...s, taken: takenIds.has(s.id) }));
    },
  });
}

const BOOKING_SELECT = `
  id, booking_ref, status, seat_count, total_amount, created_at,
  passenger_name, passenger_phone, passenger_email,
  trip:trips!bookings_trip_id_fkey(${TRIP_SELECT}),
  seats:booking_seats(seat_label),
  tickets(id, ticket_code, seat_label, status),
  payments(id, method, amount, status, reference, paid_at)
`;

export type BookingRow = {
  id: string;
  booking_ref: string;
  status: string;
  seat_count: number;
  total_amount: number;
  created_at: string;
  passenger_name: string;
  passenger_phone: string;
  passenger_email: string | null;
  trip: TripRow;
  seats: { seat_label: string }[];
  tickets: { id: string; ticket_code: string; seat_label: string; status: string }[];
  payments: { id: string; method: string; amount: number; status: string; reference: string; paid_at: string | null }[];
};

export function bookingQuery(bookingId: string) {
  return queryOptions({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Booking not found");
      return data as unknown as BookingRow;
    },
  });
}

export const myBookingsQuery = queryOptions({
  queryKey: ["bookings", "mine"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as BookingRow[];
  },
});

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, kind, is_read, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});
