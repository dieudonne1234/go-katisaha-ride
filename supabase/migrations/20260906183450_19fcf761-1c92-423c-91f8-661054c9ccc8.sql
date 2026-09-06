CREATE POLICY "agency admins manage stations"
ON public.stations
FOR ALL
TO authenticated
USING (public.my_agency_id() IS NOT NULL)
WITH CHECK (public.my_agency_id() IS NOT NULL);