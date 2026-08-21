import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { agenciesQuery } from "@/lib/queries";

export const Route = createFileRoute("/agencies")({
  head: () => ({
    meta: [
      { title: "Bus agencies in Rwanda — KATISHA BUS" },
      {
        name: "description",
        content:
          "Horizon Express, Volcano Express and Stella Express — the bus agencies you can book with on KATISHA BUS.",
      },
      { property: "og:title", content: "Bus agencies in Rwanda — KATISHA BUS" },
      {
        property: "og:description",
        content: "Browse partner bus agencies and their contact details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgenciesPage,
});

function AgenciesPage() {
  const { data, isLoading } = useQuery(agenciesQuery);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="font-display text-2xl font-extrabold">Partner agencies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Book with trusted Rwandan bus operators.
        </p>

        {isLoading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(data ?? []).map((a) => (
              <Card key={a.id}>
                <CardContent className="space-y-2 p-6">
                  <p className="font-display text-lg font-bold">{a.name}</p>
                  <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    {a.code}
                  </p>
                  {a.description ? (
                    <p className="text-sm text-muted-foreground">{a.description}</p>
                  ) : null}
                  <div className="space-y-1 pt-2 text-sm">
                    {a.phone ? (
                      <p className="flex items-center gap-2">
                        <Phone className="size-4 text-primary" />
                        {a.phone}
                      </p>
                    ) : null}
                    {a.email ? (
                      <p className="flex items-center gap-2">
                        <Mail className="size-4 text-primary" />
                        {a.email}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
