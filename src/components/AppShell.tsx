import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarClock,
  Building2,
  Home,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Ticket,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { BrandWordmark } from "@/components/Brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n, type TKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { myRolesQuery } from "@/lib/admin-queries";
import { useAuth } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "nav.home" as TKey, icon: Home },
  { to: "/search", label: "nav.search" as TKey, icon: Search },
  { to: "/tickets", label: "nav.tickets" as TKey, icon: Ticket },
  { to: "/notifications", label: "nav.alerts" as TKey, icon: Bell },
  { to: "/profile", label: "nav.profile" as TKey, icon: User },
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
  const { t } = useI18n();
  const online = useOnline();
  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-xs font-semibold text-warning-foreground">
      <WifiOff className="size-3.5" />
      {t("net.banner")}
    </div>
  );
}

export function ConnectionPill() {
  const { t } = useI18n();
  const online = useOnline();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        online ? "bg-success/12 text-success" : "bg-warning/20 text-warning-foreground",
      )}
    >
      {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
      {online ? t("net.online") : t("net.offline")}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
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
                  {t(item.label)}
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
              {t("nav.agencies")}
            </Link>
            <Link
              to="/timetable"
              search={{ date: todayISO(), agency: "ALL" as const }}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                pathname.startsWith("/timetable")
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              {t("nav.timetable")}
            </Link>
            {isStaff ? (
              <>
                <Link
                  to="/stations"
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    pathname.startsWith("/stations")
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {t("nav.stations")}
                </Link>
                <Link
                  to="/admin"
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {t("nav.dashboard")}
                </Link>
              </>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex"><ConnectionPill /></span>
            <LanguageSwitcher />
            <MobileMenu isStaff={isStaff} pathname={pathname} />
            {user ? (
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                <LogOut className="size-4" />
                <span className="hidden sm:inline">{t("nav.signOut")}</span>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth" search={{ redirect: pathname }}>
                  {t("nav.signIn")}
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
                {t(item.label)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

const MOBILE_EXTRA = [
  { to: "/timetable", label: "nav.timetable" as TKey, icon: CalendarClock },
  { to: "/agencies", label: "nav.agencies" as TKey, icon: Building2 },
] as const;

const MOBILE_STAFF = [
  { to: "/stations", label: "nav.stations" as TKey, icon: MapPin },
  { to: "/admin", label: "nav.adminDashboard" as TKey, icon: ShieldCheck },
] as const;

function MobileMenu({
  isStaff,
  pathname,
}: {
  isStaff: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);

  const { t } = useI18n();
  const renderLink = (item: { to: string; label: TKey; icon: typeof Home }) => {
    const Icon = item.icon;
    const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
    const search =
      item.to === "/search"
        ? { date: todayISO(), pax: 1 }
        : item.to === "/timetable"
          ? { date: todayISO(), agency: "ALL" as const }
          : {};
    return (
      <SheetClose asChild key={item.to}>
        <Link
          to={item.to}
          search={search}
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold",
            active
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
          )}
        >
          <Icon className="size-5" />
          {t(item.label)}
        </Link>
      </SheetClose>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden" aria-label={t("nav.openMenu")}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>{t("nav.allPages")}</SheetTitle>
        </SheetHeader>
        <nav className="mt-4 grid gap-1">
          {NAV.map(renderLink)}
          {MOBILE_EXTRA.map(renderLink)}
          {isStaff ? (
            <>
              <p className="mt-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("nav.staff")}
              </p>
              {MOBILE_STAFF.map(renderLink)}
            </>
          ) : (
            <p className="mt-3 px-4 text-xs text-muted-foreground">
              {t("nav.staffHint")}
            </p>
          )}
        </nav>
      </SheetContent>
    </Sheet>
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
