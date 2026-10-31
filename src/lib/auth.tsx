import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

type AuthValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  recovering: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  loading: true,
  recovering: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let receivedEvent = false;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      receivedEvent = true;
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT") setRecovering(false);
      setSession(next);
      setLoading(false);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void queryClient.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      if (receivedEvent) return;
      setSession(current);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      recovering,
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
      },
    }),
    [session, loading, recovering, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
