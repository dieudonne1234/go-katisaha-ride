CREATE OR REPLACE FUNCTION public.pay_booking(_booking_id uuid, _method text)
RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_seat record;
BEGIN
  IF _method NOT IN ('MTN_MOMO','AIRTEL_MONEY','CASH') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  -- Only staff of the booking's agency (or super admin) may record a verified payment
  IF NOT (public.has_role(v_uid, 'SUPER_ADMIN') OR v_booking.agency_id = public.my_agency_id()) THEN
    RAISE EXCEPTION 'Only agency staff can confirm payments';
  END IF;
  IF v_booking.status = 'CONFIRMED' THEN RETURN v_booking; END IF;
  IF v_booking.status <> 'PENDING' THEN RAISE EXCEPTION 'Booking cannot be paid'; END IF;

  INSERT INTO public.payments (booking_id, method, amount, status, reference, paid_at)
  VALUES (_booking_id, _method, v_booking.total_amount, 'SUCCESSFUL',
          'PAY-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)), now());

  FOR v_seat IN SELECT seat_label FROM public.booking_seats WHERE booking_id = _booking_id LOOP
    INSERT INTO public.tickets (booking_id, ticket_code, seat_label)
    VALUES (_booking_id, v_booking.booking_ref || '-' || v_seat.seat_label, v_seat.seat_label);
  END LOOP;

  UPDATE public.bookings SET status = 'CONFIRMED' WHERE id = _booking_id RETURNING * INTO v_booking;

  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (v_booking.passenger_id, 'Booking confirmed',
          'Your booking ' || v_booking.booking_ref || ' is confirmed and paid.', 'BOOKING');

  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id)
  VALUES (v_uid, 'PAYMENT_CONFIRMED_BY_STAFF', 'booking', _booking_id::text);

  RETURN v_booking;
END;
$$;

-- Catalog read policies: replace USING (true) with real predicates
DROP POLICY IF EXISTS "catalog read agencies" ON public.agencies;
CREATE POLICY "catalog read agencies" ON public.agencies FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "catalog read stations" ON public.stations;
CREATE POLICY "catalog read stations" ON public.stations FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "catalog read routes" ON public.routes;
CREATE POLICY "catalog read routes" ON public.routes FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "catalog read trips" ON public.trips;
CREATE POLICY "catalog read trips" ON public.trips FOR SELECT TO anon, authenticated
  USING (status <> 'CANCELLED' OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.trip_id = trips.id AND b.passenger_id = auth.uid()));

DROP POLICY IF EXISTS "catalog read buses" ON public.buses;
CREATE POLICY "catalog read buses" ON public.buses FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.bus_id = buses.id));

DROP POLICY IF EXISTS "catalog read seats" ON public.bus_seats;
CREATE POLICY "catalog read seats" ON public.bus_seats FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.bus_id = bus_seats.bus_id AND t.status = 'SCHEDULED'));

DROP POLICY IF EXISTS "occupancy read" ON public.booking_seats;
CREATE POLICY "occupancy read" ON public.booking_seats FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = booking_seats.trip_id AND t.status IN ('SCHEDULED','BOARDING')));
CREATE POLICY "own booking seats" ON public.booking_seats FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_seats.booking_id AND (b.passenger_id = auth.uid() OR b.agency_id = public.my_agency_id() OR public.has_role(auth.uid(),'SUPER_ADMIN'))));