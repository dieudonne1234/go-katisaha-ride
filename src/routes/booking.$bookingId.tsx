import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Loader2, MapPin, ShieldCheck, Smartphone, Ticket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatRwf, formatTime } from "@/lib/format";
import { bookingQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/booking/$bookingId")({
  head: () => ({
    meta: [
      { title: "Pay for your booking — KATISHA BUS" },
      {
        name: "description",
        content:
          "Pay your reserved KATISHA BUS seats with MTN Mobile Money or Airtel Money and get your ticket instantly.",
      },
      { property: "og:title", content: "Pay for your booking — KATISHA BUS" },
      {
        property: "og:description",
        content: "Secure mobile money checkout for your Rwandan bus trip.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookingPage,
});

const METHODS = [
  { id: "MTN_MOMO", label: "MTN Mobile Money", hint: "Dial-free push to your MTN line" },
  { id: "AIRTEL_MONEY", label: "Airtel Money", hint: "Approve the prompt on your Airtel line" },
] as const;

function BookingPage() {
  const { bookingId } = Route.useParams();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<string>("MTN_MOMO");

  const bookingResult = useQuery(bookingQuery(bookingId));
  const booking = bookingResult.data;

  const pay = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("pay_booking", {
        _booking_id: bookingId,
        _method: method,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      void queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Payment successful — your ticket is ready");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Payment failed, please try again");
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("cancel_booking", { _booking_id: bookingId });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      void queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
      toast.success("Booking cancelled");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not cancel this booking");
    },
  });

  if (bookingResult.isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (bookingResult.isError || !booking) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-xl font-bold">Booking unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We could not load this booking. It may have been removed or belongs to another account.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const trip = booking.trip;
  const isConfirmed = booking.status === "CONFIRMED";
  const isCancelled = booking.status === "CANCELLED";
  const payment = booking.payments.find((p) => p.status === "SUCCESSFUL") ?? booking.payments[0];

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card className="mb-6 border-none bg-hero text-surface-foreground shadow-lift">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-accent text-accent-foreground hover:bg-accent">
                {booking.booking_ref}
              </Badge>
              <Badge variant="secondary">{booking.status}</Badge>
            </div>
            <h1 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">
              {trip.route.origin.city} → {trip.route.destination.city}
            </h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-surface-foreground/85">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {formatDate(trip.travel_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {formatTime(trip.departure_time)}
              </span>
              <span className="flex items-center gap-1.5">
                <Ticket className="size-4" />
                Seats {booking.seats.map((s) => s.seat_label).join(", ") || "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">Amount due</span>
              <span className="font-display text-2xl font-extrabold text-primary">
                {formatRwf(booking.total_amount)}
              </span>
            </div>

            {isConfirmed ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg bg-secondary p-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="text-sm">
                    <p className="font-semibold">Payment received</p>
                    <p className="text-muted-foreground">
                      Paid with {payment?.method.replace("_", " ") ?? "mobile money"} · reference{" "}
                      {payment?.reference ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="font-display text-base font-bold">Your tickets</h2>
                  {booking.tickets.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-4 rounded-lg border border-border px-4 py-3 text-sm"
                    >
                      <TicketQr value={verifyUrl(t.ticket_code)} size={96} />
                      <div className="min-w-0">
                        <p className="font-mono font-semibold">{t.ticket_code}</p>
                        <p className="text-muted-foreground">
                          Seat {t.seat_label} · {t.status}
                        </p>
                        <Link
                          to="/verify/$ticketCode"
                          params={{ ticketCode: t.ticket_code }}
                          className="mt-1 inline-block text-xs font-semibold text-primary underline"
                        >
                          Open boarding check
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                <Button asChild className="w-full" size="lg">
                  <Link to="/">Back to home</Link>
                </Button>
              </div>
            ) : isCancelled ? (
              <div className="rounded-lg bg-secondary p-4 text-sm">
                This booking was cancelled. The seats have been released.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-base font-bold">Choose payment method</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Mobile money is simulated in this demo — no real charge is made.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
                        method === m.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
                      <span>
                        <span className="block text-sm font-semibold">{m.label}</span>
                        <span className="block text-xs text-muted-foreground">{m.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={pay.isPending || cancel.isPending}
                  onClick={() => pay.mutate()}
                >
                  {pay.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Confirming payment…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" /> Pay {formatRwf(booking.total_amount)}
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={pay.isPending || cancel.isPending}
                  onClick={() => cancel.mutate()}
                >
                  {cancel.isPending ? "Cancelling…" : "Cancel booking"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
