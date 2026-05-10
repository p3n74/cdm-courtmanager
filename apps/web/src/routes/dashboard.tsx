import { Button } from "@cdm-pickleball/ui/components/button";
import { Card } from "@cdm-pickleball/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@cdm-pickleball/ui/components/dialog";
import { Input } from "@cdm-pickleball/ui/components/input";
import { Label } from "@cdm-pickleball/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import type { AppRouter } from "@cdm-pickleball/api/routers/index";
import { useState } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import {
  formatManilaLongDate,
  formatManilaYmd,
  formatReservationSlotLabel,
} from "@/lib/manila";
import { formatOwnerAddressTriple } from "@/lib/reservation-display";
import { trpc, trpcClient } from "@/utils/trpc";

type SuspendedQuery = inferRouterOutputs<AppRouter>["managers"]["listSuspendedHomeowners"];
type SuspendedHomeowner = SuspendedQuery["suspended"][number];

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        to: "/login",
        throw: true,
      });
    }
    return { session };
  },
});

function formatAddedAt(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function RouteComponent() {
  const queryClient = useQueryClient();
  const { session } = Route.useRouteContext();
  const user = session.data?.user;
  const [emailInput, setEmailInput] = useState("");

  const isManagerQ = useQuery({
    ...trpc.tennis.isManager.queryOptions(),
    enabled: Boolean(user),
  });

  const listQ = useQuery({
    ...trpc.managers.list.queryOptions(),
    enabled: Boolean(user) && Boolean(isManagerQ.data?.allowed),
  });

  const suspendedQ = useQuery({
    ...trpc.managers.listSuspendedHomeowners.queryOptions(),
    enabled: Boolean(user) && Boolean(isManagerQ.data?.allowed),
  });

  const [suspendDetail, setSuspendDetail] = useState<SuspendedHomeowner | null>(null);

  const addMut = useMutation({
    mutationFn: async (email: string) => trpcClient.managers.add.mutate({ email }),
    onSuccess: async () => {
      toast.success("Manager added—ask them to sign in with Google using that email.");
      setEmailInput("");
      await queryClient.invalidateQueries(trpc.managers.list.queryFilter());
      await queryClient.invalidateQueries(trpc.tennis.isManager.queryFilter());
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => trpcClient.managers.remove.mutate({ id }),
    onSuccess: async () => {
      toast.success("Manager removed.");
      await queryClient.invalidateQueries(trpc.managers.list.queryFilter());
      await queryClient.invalidateQueries(trpc.tennis.isManager.queryFilter());
    },
    onError: (err) => toast.error(err.message),
  });

  if (isManagerQ.isLoading || (!isManagerQ.data?.allowed && isManagerQ.isFetching)) {
    return (
      <div className="flex justify-center py-16">
        <Loader />
      </div>
    );
  }

  if (!isManagerQ.data?.allowed) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Signed in as <span className="text-foreground">{user?.email ?? user?.name}</span>. Reservation manager tools
          are only visible to accounts on the allowlist.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Link
            to="/"
            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
          >
            Tennis schedule
          </Link>
          <Link
            to="/pickleball"
            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
          >
            Pickleball schedule
          </Link>
        </div>
      </div>
    );
  }

  const managers = listQ.data?.managers ?? [];
  const myEmail = user?.email?.trim().toLowerCase() ?? null;
  const suspendedPayload = suspendedQ.data;
  const suspendMonthLabel = suspendedPayload?.monthStartsAtUtc
    ? formatManilaLongDate(formatManilaYmd(new Date(suspendedPayload.monthStartsAtUtc)))
    : null;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Manager dashboard</h1>
      <p className="text-muted-foreground text-sm">
        Welcome, {user?.name ?? user?.email}. Invite managers by adding their Gmail / Google-backed email—they sign in
        with Google and can use{" "}
        <Link to="/reservations/manage" className="text-primary underline-offset-4 hover:underline">
          Manage courts
        </Link>
        .
      </p>

      <Card className="mt-10 p-6">
        <h2 className="text-lg font-semibold text-destructive">Suspended homeowners</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Lots with <span className="font-medium text-foreground">three or more no-shows</span> in the{" "}
          <span className="font-medium text-foreground">current Philippine calendar month</span> (combined tennis +
          pickleball through today, Asia/Manila)—same rule as warnings when booking.
        </p>

        {suspendMonthLabel ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Counting from month start: <span className="font-medium text-foreground">{suspendMonthLabel}</span>
          </p>
        ) : null}

        <div className="mt-6">
          {suspendedQ.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : !suspendedPayload?.suspended.length ? (
            <p className="text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm">
              No homeowners meet the suspension threshold right now.
            </p>
          ) : (
            <ul className="divide-border divide-y rounded-md border">
              {suspendedPayload.suspended.map((row) => {
                const addr =
                  formatOwnerAddressTriple(row.phase, row.block, row.lot) ??
                  `Phase ${row.phase}, Block ${row.block}, Lot ${row.lot}`;
                return (
                  <li key={row.homeownerId}>
                    <button
                      type="button"
                      className="hover:bg-muted/50 flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left transition-colors"
                      onClick={() => setSuspendDetail(row)}
                    >
                      <div>
                        <div className="font-medium">{addr}</div>
                        <div className="text-muted-foreground mt-0.5 text-xs">Tap to view no-show bookings</div>
                      </div>
                      <div className="text-destructive shrink-0 rounded-full bg-destructive/12 px-3 py-1 text-sm font-semibold tabular-nums">
                        {row.noShowCount} no-shows
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <Dialog
        open={suspendDetail !== null}
        onOpenChange={(open) => {
          if (!open) setSuspendDetail(null);
        }}
      >
        <DialogContent className="max-h-[min(85vh,560px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>No-show history</DialogTitle>
            <DialogDescription>
              {suspendDetail
                ? `${formatOwnerAddressTriple(suspendDetail.phase, suspendDetail.block, suspendDetail.lot) ?? `Phase ${suspendDetail.phase}, Block ${suspendDetail.block}, Lot ${suspendDetail.lot}`} · booked under these names/numbers but marked no-show in the current Manila month`
                : null}
            </DialogDescription>
          </DialogHeader>
          {suspendDetail ? (
            <div className="border-border max-h-[min(50vh,320px)] overflow-auto border">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-muted/80 sticky top-0">
                  <tr className="border-border border-b">
                    <th className="text-left font-medium whitespace-nowrap px-2 py-2">When (Manila)</th>
                    <th className="text-left font-medium px-2 py-2">Court</th>
                    <th className="text-left font-medium px-2 py-2">Reserved for</th>
                  </tr>
                </thead>
                <tbody>
                  {suspendDetail.incidents.map((inc) => (
                    <tr key={`${inc.sport}-${inc.reservationId}`} className="border-border border-b last:border-0">
                      <td className="text-muted-foreground whitespace-nowrap px-2 py-2 align-top">
                        {formatReservationSlotLabel(inc.slotStart)}
                      </td>
                      <td className="px-2 py-2 align-top capitalize">
                        {inc.sport}
                        {inc.sport === "pickleball" ? ` · party ${inc.courtBerth}` : ""}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {[inc.reservedByName, inc.reservedByContact].filter(Boolean).join(" · ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose type="button" className="min-w-[5rem]">
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="mt-10 p-6">
        <h2 className="text-lg font-semibold">Reservation managers</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Listed emails match Google sign-in. You cannot remove your own row here; ask another manager to revoke you.
        </p>

        <form
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const v = emailInput.trim();
            if (!v) {
              toast.error("Enter an email");
              return;
            }
            addMut.mutate(v);
          }}
        >
          <div className="min-w-0 flex-1 space-y-2 sm:max-w-md">
            <Label htmlFor="new-manager-email">Add manager by email</Label>
            <Input
              id="new-manager-email"
              type="email"
              autoComplete="email"
              placeholder="friend@gmail.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={addMut.isPending}>
            {addMut.isPending ? "Adding…" : "Add manager"}
          </Button>
        </form>

        <div className="border-border mt-8 border-t pt-6">
          <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">Current managers</h3>
          {listQ.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : managers.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">No allowlist rows loaded.</p>
          ) : (
            <ul className="divide-border divide-y rounded-md border">
              {managers.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="font-medium">{m.email}</div>
                    <div className="text-muted-foreground text-xs">Added {formatAddedAt(m.createdAt)} (Manila display)</div>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={removeMut.isPending || m.email === myEmail}
                    title={m.email === myEmail ? "Ask another manager to remove your email" : undefined}
                    onClick={() => removeMut.mutate(m.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <p className="text-muted-foreground mt-10 text-center text-xs">
        Bootstrap: seed the first manager from <code className="text-muted-foreground">packages/db</code> with{" "}
        <code className="text-muted-foreground">bun run db:seed:reservation-manager</code> (loads{" "}
        <code className="text-muted-foreground">apps/server/.env</code>), or from repo root:{" "}
        <code className="text-muted-foreground">bun run --filter @cdm-pickleball/db db:seed:reservation-manager</code>.
      </p>
    </div>
  );
}
