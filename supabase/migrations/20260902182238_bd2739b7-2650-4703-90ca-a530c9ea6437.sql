-- Super admin can manage all role assignments
CREATE POLICY "super manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'SUPER_ADMIN'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Bootstrap the owner account as SUPER_ADMIN
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'SUPER_ADMIN'::app_role FROM auth.users WHERE email = 'dnayituriki03@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;