import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Home, LogOut, Search, Ticket, User, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { BrandWordmark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/tickets", label: "My Tickets", icon: Ticket },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-xs font-semibold text-warning-foreground">
      <WifiOff className="size-3.5" />
      You are offline — showing saved data. Booking and payment need a connection.
    </div>
  );
}

export function ConnectionPill() {
  const online = useOnline();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        online ? "bg-success/12 text-success" : "bg-warning/20 text-warning-foreground",
      )}
    >
      {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
      {online ? "Online" : "Offline"}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: roles } = useQuery({ ...myRolesQuery, enabled: Boolean(user) });
  const isStaff = (roles ?? []).some(
    (r) => r.role === "SUPER_ADMIN" || (r.role === "AGENCY_ADMIN" && r.agency_id),
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <OfflineBanner />
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="shrink-0">
            <BrandWordmark />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  search={item.to === "/search" ? { date: todayISO(), pax: 1 } : {}}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              to="/agencies"
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                pathname.startsWith("/agencies")
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              Agencies
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ConnectionPill />
            {user ? (
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth" search={{ redirect: pathname }}>
                  Sign in
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                search={item.to === "/search" ? { date: todayISO(), pax: 1 } : {}}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.6 : 2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
