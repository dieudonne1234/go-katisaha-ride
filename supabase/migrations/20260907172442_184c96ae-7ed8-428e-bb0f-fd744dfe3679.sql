CREATE OR REPLACE FUNCTION public.get_ticket_public(_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'ticket_code', t.ticket_code,
    'seat_label', t.seat_label,
    'status', t.status,
    'used_at', t.used_at,
    'booking', jsonb_build_object(
      'booking_ref', b.booking_ref,
      'passenger_name', b.passenger_name,
      'status', b.status
    ),
    'trip', jsonb_build_object(
      'travel_date', tr.travel_date,
      'departure_time', tr.departure_time,
      'origin_city', os.city,
      'origin_station', os.name,
      'destination_city', ds.city,
      'destination_station', ds.name
    ),
    'agency', jsonb_build_object('name', a.name)
  )
  FROM tickets t
  JOIN bookings b ON b.id = t.booking_id
  JOIN trips tr ON tr.id = b.trip_id
  JOIN routes r ON r.id = tr.route_id
  JOIN stations os ON os.id = r.origin_station_id
  JOIN stations ds ON ds.id = r.destination_station_id
  JOIN agencies a ON a.id = b.agency_id
  WHERE t.ticket_code = upper(trim(_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_ticket_public(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_ticket_public(text) TO authenticated;