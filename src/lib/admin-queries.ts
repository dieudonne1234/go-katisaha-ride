import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type StaffRole = {
  role: "SUPER_ADMIN" | "AGENCY_ADMIN" | "PASSENGER";
  agency_id: number | null;
};

export const myRolesQuery = queryOptions({
  queryKey: ["admin", "roles"],
  queryFn: async (): Promise<StaffRole[]> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return [];
    const { data, error } = await supabase.from("user_roles").select("role, agency_id");
    if (error) throw error;
    return (data ?? []) as StaffRole[];
  },
});

const ADMIN_BOOKING_SELECT = `
  id, booking_ref, status, seat_count, total_amount, created_at, agency_id,
  passenger_name, passenger_phone, passenger_email,
  trip:trips!bookings_trip_id_fkey(
    id, travel_date, departure_time, arrival_time, price_rwf, status,
    agency:agencies!trips_agency_id_fkey(id, name, code),
    bus:buses!trips_bus_id_fkey(id, bus_number, plate_number),
    route:routes!trips_route_id_fkey(
      id,
      origin:stations!routes_origin_station_id_fkey(id, name, city),
      destination:stations!routes_destination_station_id_fkey(id, name, city)
    )
  ),
  seats:booking_seats(seat_label),
  tickets(id, ticket_code, seat_label, status)
`;

export type AdminBooking = {
  id: string;
  booking_ref: string;
  status: string;
  seat_count: number;
  total_amount: number;
  created_at: string;
  agency_id: number;
  passenger_name: string;
  passenger_phone: string;
  passenger_email: string | null;
  trip: {
    id: number;
    travel_date: string;
    departure_time: string;
    arrival_time: string;
    price_rwf: number;
    status: string;
    agency: { id: number; name: string; code: string };
    bus: { id: number; bus_number: string; plate_number: string };
    route: {
      id: number;
      origin: { id: number; name: string; city: string };
      destination: { id: number; name: string; city: string };
    };
  };
  seats: { seat_label: string }[];
  tickets: { id: string; ticket_code: string; seat_label: string; status: string }[];
};

export function agencyBookingsQuery(agencyId: number | "ALL") {
  return queryOptions({
    queryKey: ["admin", "bookings", agencyId],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select(ADMIN_BOOKING_SELECT)
        .order("created_at", { ascending: false })
        .limit(300);
      if (agencyId !== "ALL") q = q.eq("agency_id", agencyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AdminBooking[];
    },
  });
}

export type AdminPayment = {
  id: string;
  booking_id: string;
  method: string;
  amount: number;
  status: string;
  reference: string;
  paid_at: string | null;
  created_at: string;
};

export const agencyPaymentsQuery = queryOptions({
  queryKey: ["admin", "payments"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("payments")
      .select("id, booking_id, method, amount, status, reference, paid_at, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as AdminPayment[];
  },
});

export async function findTicketByCode(code: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `id, ticket_code, seat_label, status, used_at,
       booking:bookings!tickets_booking_id_fkey(
         booking_ref, passenger_name, passenger_phone, status, agency_id,
         trip:trips!bookings_trip_id_fkey(
           travel_date, departure_time,
           route:routes!trips_route_id_fkey(
             origin:stations!routes_origin_station_id_fkey(city),
             destination:stations!routes_destination_station_id_fkey(city)
           )
         )
       )`,
    )
    .eq("ticket_code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data as unknown as {
    id: string;
    ticket_code: string;
    seat_label: string;
    status: string;
    used_at: string | null;
    booking: {
      booking_ref: string;
      passenger_name: string;
      passenger_phone: string;
      status: string;
      agency_id: number;
      trip: {
        travel_date: string;
        departure_time: string;
        route: { origin: { city: string }; destination: { city: string } };
      };
    };
  } | null;
}

export async function markTicketUsed(ticketId: string) {
  const { error } = await supabase
    .from("tickets")
    .update({ status: "USED", used_at: new Date().toISOString() })
    .eq("id", ticketId);
  if (error) throw error;
}

export type StaffMember = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  roles: { role: StaffRole["role"]; agency_id: number | null }[];
};

export const staffDirectoryQuery = queryOptions({
  queryKey: ["admin", "staff"],
  queryFn: async (): Promise<StaffMember[]> => {
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, phone").order("created_at"),
      supabase.from("user_roles").select("user_id, role, agency_id"),
    ]);
    if (pErr) throw pErr;
    if (rErr) throw rErr;
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: (roles ?? [])
        .filter((r) => r.user_id === p.id)
        .map((r) => ({ role: r.role as StaffRole["role"], agency_id: r.agency_id })),
    }));
  },
});

export async function grantRole(
  userId: string,
  role: StaffRole["role"],
  agencyId: number | null,
) {
  const { error } = await supabase
    .from("user_roles")
    .upsert(
      { user_id: userId, role, agency_id: role === "AGENCY_ADMIN" ? agencyId : null },
      { onConflict: "user_id,role" },
    );
  if (error) throw error;
}

export async function revokeRole(userId: string, role: StaffRole["role"]) {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) throw error;
}

/* ---------------- Fleet, routes and trips management ---------------- */

export type AdminBus = {
  id: number;
  agency_id: number;
  bus_number: string;
  plate_number: string;
  bus_type: string;
  seat_capacity: number;
  status: string;
};

export function agencyBusesQuery(agencyId: number | "ALL") {
  return queryOptions({
    queryKey: ["admin", "buses", agencyId],
    queryFn: async (): Promise<AdminBus[]> => {
      let q = supabase
        .from("buses")
        .select("id, agency_id, bus_number, plate_number, bus_type, seat_capacity, status")
        .order("bus_number");
      if (agencyId !== "ALL") q = q.eq("agency_id", agencyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AdminBus[];
    },
  });
}

export async function createBus(input: {
  agency_id: number;
  bus_number: string;
  plate_number: string;
  bus_type: string;
  seat_capacity: number;
}) {
  const { data, error } = await supabase.from("buses").insert(input).select("id").single();
  if (error) throw error;
  const seats = Array.from({ length: input.seat_capacity }, (_, i) => {
    const row = Math.floor(i / 4) + 1;
    const col = i % 4;
    return {
      bus_id: data.id,
      seat_label: `${row}${["A", "B", "C", "D"][col]}`,
      row_index: row,
      col_index: col,
    };
  });
  const { error: seatError } = await supabase.from("bus_seats").insert(seats);
  if (seatError) throw seatError;
  return data.id as number;
}

export async function updateBusStatus(id: number, status: "ACTIVE" | "INACTIVE" | "MAINTENANCE") {
  const { error } = await supabase.from("buses").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteBus(id: number) {
  const { error } = await supabase.from("buses").delete().eq("id", id);
  if (error) throw error;
}

export type AdminRoute = {
  id: number;
  agency_id: number;
  origin_station_id: number;
  destination_station_id: number;
  distance_km: number;
  duration_minutes: number;
  is_active: boolean;
  origin: { id: number; name: string; city: string };
  destination: { id: number; name: string; city: string };
};

export function agencyRoutesQuery(agencyId: number | "ALL") {
  return queryOptions({
    queryKey: ["admin", "routes", agencyId],
    queryFn: async (): Promise<AdminRoute[]> => {
      let q = supabase
        .from("routes")
        .select(
          `id, agency_id, origin_station_id, destination_station_id, distance_km, duration_minutes, is_active,
           origin:stations!routes_origin_station_id_fkey(id, name, city),
           destination:stations!routes_destination_station_id_fkey(id, name, city)`,
        )
        .order("id");
      if (agencyId !== "ALL") q = q.eq("agency_id", agencyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AdminRoute[];
    },
  });
}

export async function createRoute(input: {
  agency_id: number;
  origin_station_id: number;
  destination_station_id: number;
  distance_km: number;
  duration_minutes: number;
}) {
  const { error } = await supabase.from("routes").insert(input);
  if (error) throw error;
}

export async function toggleRoute(id: number, isActive: boolean) {
  const { error } = await supabase.from("routes").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function deleteRoute(id: number) {
  const { error } = await supabase.from("routes").delete().eq("id", id);
  if (error) throw error;
}

export type AdminTrip = {
  id: number;
  agency_id: number;
  bus_id: number;
  route_id: number;
  travel_date: string;
  departure_time: string;
  arrival_time: string;
  price_rwf: number;
  status: string;
  bus: { bus_number: string; plate_number: string; seat_capacity: number };
  route: {
    id: number;
    origin: { name: string; city: string };
    destination: { name: string; city: string };
  };
};

export function agencyTripsQuery(agencyId: number | "ALL", fromDate: string) {
  return queryOptions({
    queryKey: ["admin", "trips", agencyId, fromDate],
    queryFn: async (): Promise<AdminTrip[]> => {
      let q = supabase
        .from("trips")
        .select(
          `id, agency_id, bus_id, route_id, travel_date, departure_time, arrival_time, price_rwf, status,
           bus:buses!trips_bus_id_fkey(bus_number, plate_number, seat_capacity),
           route:routes!trips_route_id_fkey(
             id,
             origin:stations!routes_origin_station_id_fkey(name, city),
             destination:stations!routes_destination_station_id_fkey(name, city)
           )`,
        )
        .gte("travel_date", fromDate)
        .order("travel_date")
        .order("departure_time")
        .limit(300);
      if (agencyId !== "ALL") q = q.eq("agency_id", agencyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AdminTrip[];
    },
  });
}

export async function createTrip(input: {
  agency_id: number;
  bus_id: number;
  route_id: number;
  travel_date: string;
  departure_time: string;
  arrival_time: string;
  price_rwf: number;
}) {
  const { error } = await supabase.from("trips").insert(input);
  if (error) throw error;
}

export async function updateTripStatus(
  id: number,
  status: "SCHEDULED" | "BOARDING" | "DEPARTED" | "COMPLETED" | "CANCELLED",
) {
  const { error } = await supabase.from("trips").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteTrip(id: number) {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}
