-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('SUPER_ADMIN','AGENCY_ADMIN','PASSENGER');
CREATE TYPE public.bus_status AS ENUM ('ACTIVE','INACTIVE','MAINTENANCE');
CREATE TYPE public.trip_status AS ENUM ('SCHEDULED','BOARDING','DEPARTED','COMPLETED','CANCELLED');
CREATE TYPE public.booking_status AS ENUM ('PENDING','CONFIRMED','CANCELLED','COMPLETED');
CREATE TYPE public.payment_status AS ENUM ('PENDING','SUCCESSFUL','FAILED','REFUNDED');
CREATE TYPE public.ticket_status AS ENUM ('VALID','USED','CANCELLED','EXPIRED');

-- ===== CORE =====
CREATE TABLE public.agencies (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  description text,
  logo_url text,
  phone text,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  city text NOT NULL,
  code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  agency_id bigint REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.buses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agency_id bigint NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  bus_number text NOT NULL,
  plate_number text NOT NULL,
  bus_type text NOT NULL DEFAULT 'Standard',
  seat_capacity int NOT NULL DEFAULT 20,
  status public.bus_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, bus_number)
);

CREATE TABLE public.bus_seats (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bus_id bigint NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  seat_label text NOT NULL,
  row_index int NOT NULL,
  col_index int NOT NULL,
  UNIQUE (bus_id, seat_label)
);

CREATE TABLE public.routes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agency_id bigint NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  origin_station_id bigint NOT NULL REFERENCES public.stations(id),
  destination_station_id bigint NOT NULL REFERENCES public.stations(id),
  distance_km int NOT NULL DEFAULT 0,
  duration_minutes int NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.trips (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agency_id bigint NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  bus_id bigint NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  route_id bigint NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  travel_date date NOT NULL,
  departure_time time NOT NULL,
  arrival_time time NOT NULL,
  price_rwf int NOT NULL,
  status public.trip_status NOT NULL DEFAULT 'SCHEDULED',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trips_search_idx ON public.trips (travel_date, route_id);

CREATE SEQUENCE public.booking_ref_seq START 1;

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE,
  trip_id bigint NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  agency_id bigint NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL,
  passenger_name text NOT NULL,
  passenger_phone text NOT NULL,
  passenger_email text,
  seat_count int NOT NULL,
  total_amount int NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_seats (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  trip_id bigint NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  seat_id bigint NOT NULL REFERENCES public.bus_seats(id) ON DELETE CASCADE,
  seat_label text NOT NULL,
  UNIQUE (trip_id, seat_id)
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  method text NOT NULL,
  amount int NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'PENDING',
  reference text NOT NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  ticket_code text NOT NULL UNIQUE,
  seat_label text NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'VALID',
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'INFO',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== GRANTS =====
GRANT SELECT ON public.agencies, public.stations, public.routes, public.buses, public.bus_seats, public.trips TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencies, public.stations, public.routes, public.buses, public.bus_seats, public.trips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.bookings, public.booking_seats, public.payments, public.tickets, public.notifications TO authenticated;
GRANT SELECT ON public.user_roles, public.audit_logs TO authenticated;
GRANT SELECT ON public.booking_seats TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- ===== ROLE HELPERS =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.my_agency_id()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'AGENCY_ADMIN' LIMIT 1;
$$;

-- ===== RLS =====
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- public catalog reads
CREATE POLICY "catalog read agencies" ON public.agencies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog read stations" ON public.stations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog read routes" ON public.routes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog read buses" ON public.buses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog read seats" ON public.bus_seats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog read trips" ON public.trips FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "occupancy read" ON public.booking_seats FOR SELECT TO anon, authenticated USING (true);

-- admin writes on catalog
CREATE POLICY "super manage agencies" ON public.agencies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'SUPER_ADMIN')) WITH CHECK (public.has_role(auth.uid(),'SUPER_ADMIN'));
CREATE POLICY "super manage stations" ON public.stations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'SUPER_ADMIN')) WITH CHECK (public.has_role(auth.uid(),'SUPER_ADMIN'));
CREATE POLICY "admins manage routes" ON public.routes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'SUPER_ADMIN') OR agency_id = public.my_agency_id())
  WITH CHECK (public.has_role(auth.uid(),'SUPER_ADMIN') OR agency_id = public.my_agency_id());
CREATE POLICY "admins manage buses" ON public.buses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'SUPER_ADMIN') OR agency_id = public.my_agency_id())
  WITH CHECK (public.has_role(auth.uid(),'SUPER_ADMIN') OR agency_id = public.my_agency_id());
CREATE POLICY "admins manage trips" ON public.trips FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'SUPER_ADMIN') OR agency_id = public.my_agency_id())
  WITH CHECK (public.has_role(auth.uid(),'SUPER_ADMIN') OR agency_id = public.my_agency_id());
CREATE POLICY "admins manage bus seats" ON public.bus_seats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'SUPER_ADMIN') OR EXISTS (SELECT 1 FROM public.buses b WHERE b.id = bus_id AND b.agency_id = public.my_agency_id()))
  WITH CHECK (public.has_role(auth.uid(),'SUPER_ADMIN') OR EXISTS (SELECT 1 FROM public.buses b WHERE b.id = bus_id AND b.agency_id = public.my_agency_id()));

-- profiles
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "super read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'SUPER_ADMIN'));

CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "super read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'SUPER_ADMIN'));

-- bookings
CREATE POLICY "own bookings" ON public.bookings FOR SELECT TO authenticated USING (passenger_id = auth.uid());
CREATE POLICY "own bookings update" ON public.bookings FOR UPDATE TO authenticated
  USING (passenger_id = auth.uid()) WITH CHECK (passenger_id = auth.uid());
CREATE POLICY "staff read bookings" ON public.bookings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'SUPER_ADMIN') OR agency_id = public.my_agency_id());

CREATE POLICY "own payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.passenger_id = auth.uid()));
CREATE POLICY "staff read payments" ON public.payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'SUPER_ADMIN') OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.agency_id = public.my_agency_id()));

CREATE POLICY "own tickets" ON public.tickets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.passenger_id = auth.uid()));
CREATE POLICY "staff manage tickets" ON public.tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'SUPER_ADMIN') OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.agency_id = public.my_agency_id()))
  WITH CHECK (public.has_role(auth.uid(),'SUPER_ADMIN') OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.agency_id = public.my_agency_id()));

CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "super read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'SUPER_ADMIN'));

-- ===== SIGNUP TRIGGER =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'PASSENGER')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== ATOMIC BOOKING =====
CREATE OR REPLACE FUNCTION public.create_booking(
  _trip_id bigint,
  _seat_ids bigint[],
  _passenger_name text,
  _passenger_phone text,
  _passenger_email text
) RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_trip public.trips%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_ref text;
  v_count int := array_length(_seat_ids, 1);
  v_taken int;
  v_valid int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_count IS NULL OR v_count < 1 THEN RAISE EXCEPTION 'Select at least one seat'; END IF;

  SELECT * INTO v_trip FROM public.trips WHERE id = _trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found'; END IF;
  IF v_trip.status <> 'SCHEDULED' THEN RAISE EXCEPTION 'Trip is not open for booking'; END IF;

  SELECT count(*) INTO v_valid FROM public.bus_seats WHERE id = ANY(_seat_ids) AND bus_id = v_trip.bus_id;
  IF v_valid <> v_count THEN RAISE EXCEPTION 'Invalid seat selection'; END IF;

  SELECT count(*) INTO v_taken FROM public.booking_seats WHERE trip_id = _trip_id AND seat_id = ANY(_seat_ids);
  IF v_taken > 0 THEN RAISE EXCEPTION 'One or more seats have just been booked'; END IF;

  v_ref := 'KTB-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.booking_ref_seq')::text, 6, '0');

  INSERT INTO public.bookings (booking_ref, trip_id, agency_id, passenger_id, passenger_name, passenger_phone, passenger_email, seat_count, total_amount, status)
  VALUES (v_ref, _trip_id, v_trip.agency_id, v_uid, _passenger_name, _passenger_phone, _passenger_email, v_count, v_count * v_trip.price_rwf, 'PENDING')
  RETURNING * INTO v_booking;

  INSERT INTO public.booking_seats (booking_id, trip_id, seat_id, seat_label)
  SELECT v_booking.id, _trip_id, s.id, s.seat_label FROM public.bus_seats s WHERE s.id = ANY(_seat_ids);

  RETURN v_booking;
END;
$$;

-- ===== MOCK PAYMENT + TICKETS =====
CREATE OR REPLACE FUNCTION public.pay_booking(_booking_id uuid, _method text)
RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_seat record;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR v_booking.passenger_id <> v_uid THEN RAISE EXCEPTION 'Booking not found'; END IF;
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
  VALUES (v_uid, 'Booking confirmed',
          'Your booking ' || v_booking.booking_ref || ' is confirmed and paid.', 'BOOKING');

  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id)
  VALUES (v_uid, 'PAYMENT_SUCCESSFUL', 'booking', _booking_id::text);

  RETURN v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR v_booking.passenger_id <> v_uid THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.status = 'CANCELLED' THEN RETURN; END IF;
  UPDATE public.bookings SET status = 'CANCELLED' WHERE id = _booking_id;
  UPDATE public.tickets SET status = 'CANCELLED' WHERE booking_id = _booking_id;
  UPDATE public.payments SET status = 'REFUNDED' WHERE booking_id = _booking_id AND status = 'SUCCESSFUL';
  DELETE FROM public.booking_seats WHERE booking_id = _booking_id;
  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (v_uid, 'Booking cancelled', 'Booking ' || v_booking.booking_ref || ' was cancelled.', 'BOOKING');
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking(bigint, bigint[], text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

-- ===== SEED =====
INSERT INTO public.stations (name, city, code) VALUES
  ('Nyabugogo Bus Station','Kigali','NYB'),
  ('Kigali Bus Station','Kigali','KGL'),
  ('Musanze Bus Station','Musanze','MSZ'),
  ('Huye Bus Station','Huye','HUY'),
  ('Rubavu Bus Station','Rubavu','RBV'),
  ('Rusizi Bus Station','Rusizi','RSZ'),
  ('Muhanga Bus Station','Muhanga','MHG'),
  ('Kayonza Bus Station','Kayonza','KYZ');

INSERT INTO public.agencies (name, code, description, phone, email) VALUES
  ('Horizon Express','HRZ','Comfortable long-distance coaches connecting Kigali to the Northern Province and beyond.','+250788100100','info@horizonexpress.rw'),
  ('Volcano Express','VLC','Rwanda''s trusted operator on the Kigali - Musanze - Rubavu corridor.','+250788200200','info@volcanoexpress.rw'),
  ('Stella Express','STL','Reliable daily departures across the Southern and Western provinces.','+250788300300','info@stellaexpress.rw');

-- buses: 3 per agency
INSERT INTO public.buses (agency_id, bus_number, plate_number, bus_type, seat_capacity)
SELECT a.id, a.code || '-' || n, 'RAD ' || (100 + a.id * 10 + n) || ' K',
       CASE n WHEN 1 THEN 'Executive Coach' WHEN 2 THEN 'Standard Coach' ELSE 'VIP Coach' END, 20
FROM public.agencies a CROSS JOIN generate_series(1,3) n;

-- seats: rows A-E, 4 seats per row
INSERT INTO public.bus_seats (bus_id, seat_label, row_index, col_index)
SELECT b.id, chr(64 + r) || c, r, c
FROM public.buses b CROSS JOIN generate_series(1,5) r CROSS JOIN generate_series(1,4) c;

-- routes: each agency serves 3 corridors from Nyabugogo
INSERT INTO public.routes (agency_id, origin_station_id, destination_station_id, distance_km, duration_minutes)
SELECT a.id, o.id, d.id, x.km, x.mins
FROM public.agencies a
CROSS JOIN (VALUES ('Musanze Bus Station',106,120),('Huye Bus Station',133,150),('Rubavu Bus Station',157,180)) AS x(dest, km, mins)
JOIN public.stations d ON d.name = x.dest
JOIN public.stations o ON o.name = 'Nyabugogo Bus Station';

-- trips: next 14 days, 3 departures per route
INSERT INTO public.trips (agency_id, bus_id, route_id, travel_date, departure_time, arrival_time, price_rwf)
SELECT r.agency_id,
       (SELECT b.id FROM public.buses b WHERE b.agency_id = r.agency_id ORDER BY b.id LIMIT 1 OFFSET (t.slot - 1)),
       r.id,
       (CURRENT_DATE + d)::date,
       t.dep,
       (t.dep + make_interval(mins => r.duration_minutes))::time,
       CASE WHEN r.distance_km < 120 THEN 5000 WHEN r.distance_km < 145 THEN 6500 ELSE 8000 END
FROM public.routes r
CROSS JOIN generate_series(0,13) d
CROSS JOIN (VALUES (1,'06:30'::time),(2,'10:00'::time),(3,'15:30'::time)) AS t(slot, dep);