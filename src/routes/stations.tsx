import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import {
  allStationsQuery,
  createStation,
  deleteStation,
  myRolesQuery,
  toggleStation,
  updateStation,
} from "@/lib/admin-queries";

export const Route = createFileRoute("/stations")({
  head: () => ({
    meta: [
      { title: "Manage bus stations — KATISHA BUS" },
      {
        name: "description",
        content:
          "Agency staff can add, rename, hide or delete the bus stations used across KATISHA BUS routes and timetables.",
      },
      { property: "og:title", content: "Manage bus stations — KATISHA BUS" },
      {
        property: "og:description",
        content: "Keep every KATISHA BUS station name, city and code accurate for passengers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StationsPage,
});

function StationsPage() {
  const { user, loading } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useQuery({
    ...myRolesQuery,
    enabled: Boolean(user),
  });
  const isStaff = useMemo(
    () =>
      (roles ?? []).some(
        (r) => r.role === "SUPER_ADMIN" || (r.role === "AGENCY_ADMIN" && r.agency_id),
      ),
    [roles],
  );

  if (loading || (user && rolesLoading)) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-4xl space-y-3 px-4 py-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!user || !isStaff) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
          <MapPin className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-3 font-display text-xl font-bold">Staff area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only agency staff can manage stations. Sign in with a staff account to continue.
          </p>
          <Button asChild className="mt-4">
            <Link to="/auth" search={{ redirect: "/stations" }}>
              Sign in
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return <StationsManager />;
}

function StationsManager() {
  const qc = useQueryClient();
  const { data: stations, isLoading } = useQuery(allStationsQuery);
  const [form, setForm] = useState({ name: "", city: "", code: "" });
  const [editing, setEditing] = useState<number | null>(null);
  const [filter, setFilter] = useState("");

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "stations"] });
    void qc.invalidateQueries({ queryKey: ["stations"] });
    void qc.invalidateQueries({ queryKey: ["admin", "routes"] });
  };

  const add = useMutation({
    mutationFn: () =>
      createStation({
        name: form.name.trim(),
        city: form.city.trim(),
        code: form.code.trim().toUpperCase(),
      }),
    onSuccess: () => {
      setForm({ name: "", city: "", code: "" });
      toast.success("Station added");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: (v: { id: number; patch: Parameters<typeof updateStation>[1] }) =>
      updateStation(v.id, v.patch),
    onSuccess: () => {
      setEditing(null);
      toast.success("Station updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const flip = useMutation({
    mutationFn: (v: { id: number; active: boolean }) => toggleStation(v.id, v.active),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteStation(id),
    onSuccess: () => {
      toast.success("Station deleted");
      refresh();
    },
    onError: () =>
      toast.error("This station is used by a route, so it can't be deleted. Hide it instead."),
  });

  const rows = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const list = stations ?? [];
    if (!term) return list;
    return list.filter((s) => `${s.name} ${s.city} ${s.code}`.toLowerCase().includes(term));
  }, [stations, filter]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <PageHeader
          title="Stations"
          subtitle="Add, rename, hide or delete the stations passengers travel between."
        />

        <Card>
          <CardContent className="space-y-4 p-5">
            <form
              className="grid gap-2 sm:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.name.trim() || !form.city.trim() || !form.code.trim()) {
                  toast.error("Name, city and code are required");
                  return;
                }
                add.mutate();
              }}
            >
              <Input
                placeholder="Station name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                placeholder="Code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
              <Button type="submit" disabled={add.isPending}>
                Add station
              </Button>
            </form>

            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search stations"
              className="max-w-xs"
            />

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No stations yet. Add the first one above.
              </p>
            ) : (
              <div className="grid gap-2">
                {rows.map((s) =>
                  editing === s.id ? (
                    <form
                      key={s.id}
                      className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        save.mutate({
                          id: s.id,
                          patch: {
                            name: String(f.get("name") ?? "").trim(),
                            city: String(f.get("city") ?? "").trim(),
                            code: String(f.get("code") ?? "")
                              .trim()
                              .toUpperCase(),
                          },
                        });
                      }}
                    >
                      <Input name="name" defaultValue={s.name} />
                      <Input name="city" defaultValue={s.city} />
                      <Input name="code" defaultValue={s.code} />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={save.isPending}>
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
                    >
                      <div>
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.city} · {s.code}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={s.is_active ? "default" : "secondary"}>
                          {s.is_active ? "Active" : "Hidden"}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => setEditing(s.id)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => flip.mutate({ id: s.id, active: !s.is_active })}
                        >
                          {s.is_active ? "Hide" : "Show"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(s.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
