import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Loader2, ShieldCheck, Ticket, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { findTicketByCode, markTicketUsed, myRolesQuery } from "@/lib/admin-queries";
import { useAuth } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/format";

export const Route = createFileRoute("/verify/$ticketCode")({
  head: () => ({
    meta: [
      { title: "Verify boarding ticket — KATISHA BUS" },
      {
        name: "description",
        content:
          "Scan a KATISHA BUS ticket QR code to check the booking details and confirm the passenger has boarded.",
      },
      { property: "og:title", content: "Verify boarding ticket — KATISHA BUS" },
      {
        property: "og:description",
        content: "Check a ticket and confirm boarding for a Rwandan bus trip.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyPage,
});

type PublicTicket = {
  ticket_code: string;
  seat_label: string;
  status: string;
  used_at: string | null;
  booking: { booking_ref: string; passenger_name: string; status: string };
  trip: {
    travel_date: string;
    departure_time: string;
    origin_city: string;
    origin_station: string;
    destination_city: string;
    destination_station: string;
  };
  agency: { name: string };
};

function VerifyPage() {
  const { ticketCode } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const roles = useQuery({ ...myRolesQuery, enabled: Boolean(user) });
  const isStaff = (roles.data ?? []).some(
    (r) => r.role === "SUPER_ADMIN" || r.role === "AGENCY_ADMIN",
  );

  // Public lookup — works for anyone who scans the QR code, no sign-in needed.
  const ticket = useQuery({
    queryKey: ["verify-ticket", ticketCode],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ticket_public", { _code: ticketCode });
      if (error) throw error;
      return (data as unknown as PublicTicket | null) ?? null;
    },
  });

  // Staff-only lookup to get the internal ticket id for boarding confirmation.
  const staffTicket = useQuery({
    queryKey: ["verify-ticket-staff", ticketCode],
    queryFn: () => findTicketByCode(ticketCode),
    enabled: Boolean(user) && isStaff,
  });

  const board = useMutation({
    mutationFn: async () => {
      if (!staffTicket.data) throw new Error("Ticket not found");
      await markTicketUsed(staffTicket.data.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["verify-ticket", ticketCode] });
      void queryClient.invalidateQueries({ queryKey: ["verify-ticket-staff", ticketCode] });
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Boarding confirmed");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not confirm boarding");
    },
  });

  const data = ticket.data;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl px-4 py-8">
        <h1 className="font-display text-2xl font-extrabold">Ticket verification</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{ticketCode}</p>

        {ticket.isLoading ? (
          <Skeleton className="mt-6 h-56 w-full rounded-xl" />
        ) : !data ? (
          <Card className="mt-6">
            <CardContent className="flex items-start gap-3 p-6">
              <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="text-sm">
                <p className="font-semibold">Ticket not found</p>
                <p className="text-muted-foreground">
                  This code does not match any KATISHA BUS ticket. Check the code and try again.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-6">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={data.status === "VALID" ? "default" : "secondary"}>
                  {data.status}
                </Badge>
                <Badge variant="secondary">{data.booking.status}</Badge>
                <span className="font-mono text-xs font-bold">{data.booking.booking_ref}</span>
              </div>

              <div>
                <p className="font-display text-xl font-bold">
                  {data.trip.origin_city} → {data.trip.destination_city}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.trip.origin_station} → {data.trip.destination_station}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(data.trip.travel_date)} · {formatTime(data.trip.departure_time)} ·
                  Seat {data.seat_label}
                </p>
              </div>

              <div className="rounded-lg bg-secondary p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <Ticket className="size-4 text-primary" /> {data.booking.passenger_name}
                </p>
                <p className="mt-1 text-muted-foreground">Operated by {data.agency.name}</p>
              </div>

              {data.status === "USED" ? (
                <div className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">Already boarded</p>
                    <p className="text-muted-foreground">
                      {data.used_at ? new Date(data.used_at).toLocaleString() : "Marked as used"}
                    </p>
                  </div>
                </div>
              ) : isStaff ? (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={
                    board.isPending || data.booking.status !== "CONFIRMED" || !staffTicket.data
                  }
                  onClick={() => board.mutate()}
                >
                  {board.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Confirming…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" /> Confirm boarded
                    </>
                  )}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Show this page to the bus crew — they will confirm your boarding.
                </p>
              )}

              {!user && (
                <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
                  Are you bus crew?{" "}
                  <Link
                    to="/auth"
                    search={{ redirect: `/verify/${ticketCode}` }}
                    className="font-semibold text-primary underline"
                  >
                    Sign in
                  </Link>{" "}
                  to confirm boarding.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
