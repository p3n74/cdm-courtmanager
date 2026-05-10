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
import { createFileRoute } from "@tanstack/react-router";
import type { AppRouter } from "@cdm-pickleball/api/routers/index";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { countHomeownerReservationsOnManageDay } from "@/lib/homeowner-day-reservations";
import {
  formatManilaLongDate,
  formatManilaYmd,
  formatReservationSlotLabel,
  formatSlotRangeLabel,
  manilaPickleballSlotStartUtc,
  manilaSlotStartUtc,
  PICKLEBALL_SLOT_HOURS,
  SLOT_HOURS,
} from "@/lib/manila";
import { formatOwnerAddressTriple } from "@/lib/reservation-display";
import { trpc, trpcClient } from "@/utils/trpc";

type TennisHist = inferRouterOutputs<AppRouter>["tennis"]["homeownerReservationHistory"];
type PickleHist = inferRouterOutputs<AppRouter>["pickleball"]["homeownerReservationHistory"];

export const Route = createFileRoute("/reservations/manage")({
  component: CombinedManageCourtsPage,
});

const PICKLEBALL_BERTHS = [1, 2, 3, 4] as const;

function parsePositiveInt(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    return null;
  }
  return n;
}

function formatPartyLine(name?: string | null, contact?: string | null): string | null {
  const n = name?.trim() ?? "";
  const c = contact?.trim() ?? "";
  if (!n && !c) {
    return null;
  }
  if (n && c) {
    return `${n} · ${c}`;
  }
  return n || c;
}

function addressTripleKey(phase: string, block: string, lot: string): string | null {
  const p = parsePositiveInt(phase);
  const b = parsePositiveInt(block);
  const l = parsePositiveInt(lot);
  if (p === null || b === null || l === null) {
    return null;
  }
  return `${p}-${b}-${l}`;
}

function homeownerHistKey(hist: { phase: number; block: number; lot: number }): string {
  return `${hist.phase}-${hist.block}-${hist.lot}`;
}

function TennisReservationHistoryTables({ hist }: { hist: TennisHist }) {
  const label =
    formatOwnerAddressTriple(hist.phase, hist.block, hist.lot) ?? `${hist.phase}-${hist.block}-${hist.lot}`;
  return (
    <div className="border-border mt-5 grid gap-6 border-t pt-5">
      <section>
        <h4 className="mb-2 text-xs font-semibold tracking-wide uppercase">All reservations · {label}</h4>
        {!hist.hasHomeownerRow ? (
          <p className="text-muted-foreground mb-2 text-xs">
            No homeowner row for this address yet—it will be created on first booking.
          </p>
        ) : null}
        <div className="border-border max-h-44 overflow-auto border">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-muted/80 sticky top-0">
              <tr className="border-border border-b">
                <th scope="col" className="text-left font-medium whitespace-nowrap px-2 py-2">
                  Slot (Manila)
                </th>
                <th scope="col" className="text-left font-medium px-2 py-2">
                  Reserved for
                </th>
                <th scope="col" className="text-center font-medium whitespace-nowrap px-2 py-2">
                  No-show
                </th>
              </tr>
            </thead>
            <tbody>
              {hist.allHistory.length === 0 ? (
                <tr>
                  <td className="text-muted-foreground px-2 py-3 italic" colSpan={3}>
                    No reservations recorded for this homeowner yet.
                  </td>
                </tr>
              ) : (
                hist.allHistory.map((row) => (
                  <tr key={row.id} className="border-border border-b last:border-0">
                    <td className="text-muted-foreground whitespace-nowrap px-2 py-2 align-top">
                      {formatReservationSlotLabel(row.slotStart)}
                    </td>
                    <td className="px-2 py-2 align-top">{formatPartyLine(row.reservedByName, row.reservedByContact) ?? "—"}</td>
                    <td className="text-center px-2 py-2 align-top">{row.noShow ? "Yes" : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold tracking-wide uppercase">No-show history · {label}</h4>
        <div className="border-border max-h-44 overflow-auto border">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-muted/80 sticky top-0">
              <tr className="border-border border-b">
                <th scope="col" className="text-left font-medium whitespace-nowrap px-2 py-2">
                  Slot (Manila)
                </th>
                <th scope="col" className="text-left font-medium px-2 py-2">
                  Reserved for
                </th>
              </tr>
            </thead>
            <tbody>
              {hist.noShowHistory.length === 0 ? (
                <tr>
                  <td className="text-muted-foreground px-2 py-3 italic" colSpan={2}>
                    No no-shows on record for this homeowner.
                  </td>
                </tr>
              ) : (
                hist.noShowHistory.map((row) => (
                  <tr key={row.id} className="border-border border-b last:border-0">
                    <td className="text-muted-foreground whitespace-nowrap px-2 py-2 align-top">
                      {formatReservationSlotLabel(row.slotStart)}
                    </td>
                    <td className="px-2 py-2 align-top">{formatPartyLine(row.reservedByName, row.reservedByContact) ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PickleballReservationHistoryTables({ hist }: { hist: PickleHist }) {
  const label =
    formatOwnerAddressTriple(hist.phase, hist.block, hist.lot) ?? `${hist.phase}-${hist.block}-${hist.lot}`;
  return (
    <div className="border-border mt-5 grid gap-6 border-t pt-5">
      <section>
        <h4 className="mb-2 text-xs font-semibold tracking-wide uppercase">All reservations · {label}</h4>
        {!hist.hasHomeownerRow ? (
          <p className="text-muted-foreground mb-2 text-xs">
            No homeowner row for this address yet—it will be created on first booking.
          </p>
        ) : null}
        <div className="border-border max-h-44 overflow-auto border">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-muted/80 sticky top-0">
              <tr className="border-border border-b">
                <th scope="col" className="text-left font-medium whitespace-nowrap px-2 py-2">
                  Slot (Manila)
                </th>
                <th scope="col" className="text-center font-medium whitespace-nowrap px-2 py-2">
                  Party
                </th>
                <th scope="col" className="text-left font-medium px-2 py-2">
                  Reserved for
                </th>
                <th scope="col" className="text-center font-medium whitespace-nowrap px-2 py-2">
                  No-show
                </th>
              </tr>
            </thead>
            <tbody>
              {hist.allHistory.length === 0 ? (
                <tr>
                  <td className="text-muted-foreground px-2 py-3 italic" colSpan={4}>
                    No reservations recorded for this homeowner yet.
                  </td>
                </tr>
              ) : (
                hist.allHistory.map((row) => (
                  <tr key={row.id} className="border-border border-b last:border-0">
                    <td className="text-muted-foreground whitespace-nowrap px-2 py-2 align-top">
                      {formatReservationSlotLabel(row.slotStart)}
                    </td>
                    <td className="text-center px-2 py-2 align-top">{row.courtBerth}</td>
                    <td className="px-2 py-2 align-top">
                      {formatPartyLine(row.reservedByName, row.reservedByContact) ?? "—"}
                    </td>
                    <td className="text-center px-2 py-2 align-top">{row.noShow ? "Yes" : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold tracking-wide uppercase">No-show history · {label}</h4>
        <div className="border-border max-h-44 overflow-auto border">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-muted/80 sticky top-0">
              <tr className="border-border border-b">
                <th scope="col" className="text-left font-medium whitespace-nowrap px-2 py-2">
                  Slot (Manila)
                </th>
                <th scope="col" className="text-center font-medium whitespace-nowrap px-2 py-2">
                  Party
                </th>
                <th scope="col" className="text-left font-medium px-2 py-2">
                  Reserved for
                </th>
              </tr>
            </thead>
            <tbody>
              {hist.noShowHistory.length === 0 ? (
                <tr>
                  <td className="text-muted-foreground px-2 py-3 italic" colSpan={3}>
                    No no-shows on record for this homeowner.
                  </td>
                </tr>
              ) : (
                hist.noShowHistory.map((row) => (
                  <tr key={row.id} className="border-border border-b last:border-0">
                    <td className="text-muted-foreground whitespace-nowrap px-2 py-2 align-top">
                      {formatReservationSlotLabel(row.slotStart)}
                    </td>
                    <td className="text-center px-2 py-2 align-top">{row.courtBerth}</td>
                    <td className="px-2 py-2 align-top">
                      {formatPartyLine(row.reservedByName, row.reservedByContact) ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CombinedManageCourtsPage() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const todayQ = useQuery(trpc.tennis.todayInManila.queryOptions());
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const effectiveDate = dateOverride ?? todayQ.data?.date ?? formatManilaYmd(new Date());
  const dateHeading = formatManilaLongDate(effectiveDate);

  const [tennisReserveOpen, setTennisReserveOpen] = useState(false);
  const [tennisSlotHour, setTennisSlotHour] = useState<number | null>(null);
  const [tennisModalPhase, setTennisModalPhase] = useState("");
  const [tennisModalBlock, setTennisModalBlock] = useState("");
  const [tennisModalLot, setTennisModalLot] = useState("");
  const [tennisModalName, setTennisModalName] = useState("");
  const [tennisModalContact, setTennisModalContact] = useState("");
  const [tennisHist, setTennisHist] = useState<TennisHist | null>(null);

  const [pbReserveOpen, setPbReserveOpen] = useState(false);
  const [pbSlotHour, setPbSlotHour] = useState<number | null>(null);
  const [pbBerth, setPbBerth] = useState<number | null>(null);
  const [pbModalPhase, setPbModalPhase] = useState("");
  const [pbModalBlock, setPbModalBlock] = useState("");
  const [pbModalLot, setPbModalLot] = useState("");
  const [pbModalName, setPbModalName] = useState("");
  const [pbModalContact, setPbModalContact] = useState("");
  const [pbHist, setPbHist] = useState<PickleHist | null>(null);

  const isManagerQ = useQuery({
    ...trpc.tennis.isManager.queryOptions(),
    enabled: Boolean(session?.user),
  });

  const manageEnabled = Boolean(session?.user) && Boolean(isManagerQ.data?.allowed) && Boolean(effectiveDate);

  const tennisListQ = useQuery({
    ...trpc.tennis.listManageDay.queryOptions({ date: effectiveDate }),
    enabled: manageEnabled,
  });

  const pickleListQ = useQuery({
    ...trpc.pickleball.listManageDay.queryOptions({ date: effectiveDate }),
    enabled: manageEnabled,
  });

  const tennisCreateMut = useMutation({
    mutationFn: async (input: {
      date: string;
      slotHour: number;
      phase: number;
      block: number;
      lot: number;
      reservedByName: string;
      reservedByContact: string;
    }) => trpcClient.tennis.createReservation.mutate(input),
    onSuccess: async () => {
      toast.success("Tennis reservation created");
      setTennisReserveOpen(false);
      setTennisSlotHour(null);
      setTennisModalPhase("");
      setTennisModalBlock("");
      setTennisModalLot("");
      setTennisModalName("");
      setTennisModalContact("");
      setTennisHist(null);
      await queryClient.invalidateQueries(trpc.tennis.listManageDay.queryFilter());
    },
    onError: (err) => toast.error(err.message),
  });

  const tennisCancelMut = useMutation({
    mutationFn: async (id: string) => trpcClient.tennis.cancelReservation.mutate({ id }),
    onSuccess: async () => {
      toast.success("Tennis reservation cancelled");
      await queryClient.invalidateQueries(trpc.tennis.listManageDay.queryFilter());
    },
    onError: (err) => toast.error(err.message),
  });

  const tennisNoShowMut = useMutation({
    mutationFn: async (input: { id: string; noShow: boolean }) =>
      trpcClient.tennis.setReservationNoShow.mutate(input),
    onSuccess: async (_, variables) => {
      toast.success(variables.noShow ? "Marked as no-show" : "No-show cleared");
      await queryClient.invalidateQueries(trpc.tennis.listManageDay.queryFilter());
    },
    onError: (err) => toast.error(err.message),
  });

  const tennisSearchHistMut = useMutation({
    mutationFn: async (args: { phase: number; block: number; lot: number }) =>
      trpcClient.tennis.homeownerReservationHistory.query(args),
    onSuccess: (data) => {
      setTennisHist(data);
    },
    onError: (err) => toast.error(err.message),
  });

  const pbCreateMut = useMutation({
    mutationFn: async (input: {
      date: string;
      slotHour: number;
      courtBerth: 1 | 2 | 3 | 4;
      phase: number;
      block: number;
      lot: number;
      reservedByName: string;
      reservedByContact: string;
    }) => trpcClient.pickleball.createReservation.mutate(input),
    onSuccess: async () => {
      toast.success("Pickleball reservation created");
      setPbReserveOpen(false);
      setPbSlotHour(null);
      setPbBerth(null);
      setPbModalPhase("");
      setPbModalBlock("");
      setPbModalLot("");
      setPbModalName("");
      setPbModalContact("");
      setPbHist(null);
      await queryClient.invalidateQueries(trpc.pickleball.listManageDay.queryFilter());
    },
    onError: (err) => toast.error(err.message),
  });

  const pbCancelMut = useMutation({
    mutationFn: async (id: string) => trpcClient.pickleball.cancelReservation.mutate({ id }),
    onSuccess: async () => {
      toast.success("Pickleball reservation cancelled");
      await queryClient.invalidateQueries(trpc.pickleball.listManageDay.queryFilter());
    },
    onError: (err) => toast.error(err.message),
  });

  const pbNoShowMut = useMutation({
    mutationFn: async (input: { id: string; noShow: boolean }) =>
      trpcClient.pickleball.setReservationNoShow.mutate(input),
    onSuccess: async (_, variables) => {
      toast.success(variables.noShow ? "Marked as no-show" : "No-show cleared");
      await queryClient.invalidateQueries(trpc.pickleball.listManageDay.queryFilter());
    },
    onError: (err) => toast.error(err.message),
  });

  const pbSearchHistMut = useMutation({
    mutationFn: async (args: { phase: number; block: number; lot: number }) =>
      trpcClient.pickleball.homeownerReservationHistory.query(args),
    onSuccess: (data) => {
      setPbHist(data);
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (tennisHist === null) return;
    const k = addressTripleKey(tennisModalPhase, tennisModalBlock, tennisModalLot);
    if (k !== null && k !== homeownerHistKey(tennisHist)) setTennisHist(null);
  }, [tennisModalPhase, tennisModalBlock, tennisModalLot, tennisHist]);

  useEffect(() => {
    if (pbHist === null) return;
    const k = addressTripleKey(pbModalPhase, pbModalBlock, pbModalLot);
    if (k !== null && k !== homeownerHistKey(pbHist)) setPbHist(null);
  }, [pbModalPhase, pbModalBlock, pbModalLot, pbHist]);

  function openTennisReserve(slotHour: number) {
    setTennisSlotHour(slotHour);
    setTennisHist(null);
    setTennisModalPhase("");
    setTennisModalBlock("");
    setTennisModalLot("");
    setTennisModalName("");
    setTennisModalContact("");
    setTennisReserveOpen(true);
  }

  function openPbReserve(slotHour: number, courtBerth: (typeof PICKLEBALL_BERTHS)[number]) {
    setPbSlotHour(slotHour);
    setPbBerth(courtBerth);
    setPbHist(null);
    setPbModalPhase("");
    setPbModalBlock("");
    setPbModalLot("");
    setPbModalName("");
    setPbModalContact("");
    setPbReserveOpen(true);
  }

  function runTennisHomeownerSearch() {
    const ph = parsePositiveInt(tennisModalPhase);
    const bk = parsePositiveInt(tennisModalBlock);
    const lt = parsePositiveInt(tennisModalLot);
    if (ph === null || bk === null || lt === null) {
      toast.error("Enter phase, block, and lot as whole numbers ≥ 1");
      return;
    }
    tennisSearchHistMut.mutate({ phase: ph, block: bk, lot: lt });
  }

  function submitTennisReserve() {
    if (tennisSlotHour === null || tennisHist === null) return;
    if (homeownerHistKey(tennisHist) !== addressTripleKey(tennisModalPhase, tennisModalBlock, tennisModalLot)) {
      toast.error("Search the homeowner address again");
      return;
    }
    const ph = parsePositiveInt(tennisModalPhase);
    const bk = parsePositiveInt(tennisModalBlock);
    const lt = parsePositiveInt(tennisModalLot);
    if (ph === null || bk === null || lt === null) {
      toast.error("Enter phase, block, and lot as whole numbers ≥ 1");
      return;
    }
    const partyName = tennisModalName.trim();
    const partyContact = tennisModalContact.trim();
    if (!partyName || !partyContact) {
      toast.error("Enter the person's name and contact number");
      return;
    }
    tennisCreateMut.mutate({
      date: effectiveDate,
      slotHour: tennisSlotHour,
      phase: ph,
      block: bk,
      lot: lt,
      reservedByName: partyName,
      reservedByContact: partyContact,
    });
  }

  function runPbHomeownerSearch() {
    const ph = parsePositiveInt(pbModalPhase);
    const bk = parsePositiveInt(pbModalBlock);
    const lt = parsePositiveInt(pbModalLot);
    if (ph === null || bk === null || lt === null) {
      toast.error("Enter phase, block, and lot as whole numbers ≥ 1");
      return;
    }
    pbSearchHistMut.mutate({ phase: ph, block: bk, lot: lt });
  }

  function submitPbReserve() {
    if (pbSlotHour === null || pbBerth === null || pbHist === null) return;
    if (homeownerHistKey(pbHist) !== addressTripleKey(pbModalPhase, pbModalBlock, pbModalLot)) {
      toast.error("Search the homeowner address again");
      return;
    }
    const ph = parsePositiveInt(pbModalPhase);
    const bk = parsePositiveInt(pbModalBlock);
    const lt = parsePositiveInt(pbModalLot);
    if (ph === null || bk === null || lt === null) {
      toast.error("Enter phase, block, and lot as whole numbers ≥ 1");
      return;
    }
    const partyName = pbModalName.trim();
    const partyContact = pbModalContact.trim();
    if (!partyName || !partyContact) {
      toast.error("Enter the person's name and contact number");
      return;
    }
    pbCreateMut.mutate({
      date: effectiveDate,
      slotHour: pbSlotHour,
      courtBerth: pbBerth as 1 | 2 | 3 | 4,
      phase: ph,
      block: bk,
      lot: lt,
      reservedByName: partyName,
      reservedByContact: partyContact,
    });
  }

  if (sessionPending || todayQ.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto max-w-md px-4 py-10">
        <h1 className="mb-2 text-2xl font-semibold">Manage court reservations</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Sign in with Google. Only allowlisted emails can change tennis and pickleball schedules.
        </p>
        <Button
          type="button"
          className="w-full"
          onClick={() =>
            authClient.signIn.social({
              provider: "google",
              callbackURL: `${window.location.origin}/reservations/manage`,
            })
          }
        >
          Continue with Google
        </Button>
        {!import.meta.env.PROD && (
          <p className="mt-4 text-xs text-muted-foreground">
            Requires <code className="text-xs">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="text-xs">GOOGLE_CLIENT_SECRET</code> on the server.
          </p>
        )}
      </div>
    );
  }

  if (!isManagerQ.data?.allowed) {
    return (
      <div className="container mx-auto max-w-md px-4 py-10">
        <h1 className="mb-2 text-2xl font-semibold">Not authorized</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {session.user.email}. This account is not on the reservation manager allowlist.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={() =>
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  toast.success("Signed out");
                },
              },
            })
          }
        >
          Sign out
        </Button>
      </div>
    );
  }

  type TennisRow = NonNullable<(typeof tennisListQ)["data"]>["reservations"][number];
  const tennisByHour = new Map<
    number,
    { id: string; addr: string | null; party: string | null; noShow: boolean | null | undefined }
  >();
  if (tennisListQ.data?.reservations) {
    for (const r of tennisListQ.data.reservations as TennisRow[]) {
      const start = new Date(r.slotStart as unknown as string);
      for (const h of SLOT_HOURS) {
        if (manilaSlotStartUtc(tennisListQ.data.date, h).getTime() === start.getTime()) {
          tennisByHour.set(h, {
            id: r.id,
            addr: formatOwnerAddressTriple(r.phase, r.block, r.lot),
            party: formatPartyLine(r.reservedByName, r.reservedByContact),
            noShow: r.noShow,
          });
          break;
        }
      }
    }
  }

  type PickleRow = NonNullable<(typeof pickleListQ)["data"]>["reservations"][number];
  const pbByHourBerth = new Map<
    number,
    Map<number, { id: string; addr: string | null; party: string | null; noShow: boolean | null | undefined }>
  >();
  for (const h of PICKLEBALL_SLOT_HOURS) {
    pbByHourBerth.set(h, new Map());
  }
  if (pickleListQ.data?.reservations) {
    for (const r of pickleListQ.data.reservations as PickleRow[]) {
      const start = new Date(r.slotStart as unknown as string);
      for (const h of PICKLEBALL_SLOT_HOURS) {
        if (manilaPickleballSlotStartUtc(pickleListQ.data.date, h).getTime() === start.getTime()) {
          const b = Number(r.courtBerth);
          if (Number.isFinite(b) && (PICKLEBALL_BERTHS as readonly number[]).includes(b)) {
            pbByHourBerth.get(h)!.set(b, {
              id: r.id,
              addr: formatOwnerAddressTriple(r.phase, r.block, r.lot),
              party: formatPartyLine(r.reservedByName, r.reservedByContact),
              noShow: r.noShow,
            });
          }
          break;
        }
      }
    }
  }

  const tennisSearchReady =
    tennisHist !== null &&
    addressTripleKey(tennisModalPhase, tennisModalBlock, tennisModalLot) !== null &&
    addressTripleKey(tennisModalPhase, tennisModalBlock, tennisModalLot) === homeownerHistKey(tennisHist);

  const pbSearchReady =
    pbHist !== null &&
    addressTripleKey(pbModalPhase, pbModalBlock, pbModalLot) !== null &&
    addressTripleKey(pbModalPhase, pbModalBlock, pbModalLot) === homeownerHistKey(pbHist);

  const tennisSlotSummary =
    tennisSlotHour !== null ? `${formatSlotRangeLabel(tennisSlotHour)} · tennis` : "";

  const pbSlotSummary =
    pbSlotHour !== null && pbBerth !== null
      ? `${formatSlotRangeLabel(pbSlotHour)} · pickleball · party ${pbBerth}`
      : "";

  const tennisSameDayCount =
    tennisSearchReady && tennisHist && tennisListQ.data
      ? countHomeownerReservationsOnManageDay(tennisListQ.data.reservations ?? [], tennisHist)
      : 0;
  const showTennisFairAccessWarn = tennisReserveOpen && tennisSearchReady && tennisSameDayCount >= 1;

  const pbSameDayCount =
    pbSearchReady && pbHist && pickleListQ.data
      ? countHomeownerReservationsOnManageDay(pickleListQ.data.reservations ?? [], pbHist)
      : 0;
  const showPbFairAccessWarn = pbReserveOpen && pbSearchReady && pbSameDayCount >= 1;

  return (
    <div className="container mx-auto max-w-lg px-4 py-6">
      <h1 className="text-balance text-2xl leading-snug font-semibold">
        Manage courts for {dateHeading}
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Manila calendar date (Asia/Manila): tennis hourly blocks 06:00–16:00 wall time, pickleball 16:00–22:00. One date
        picker controls both grids. On first booking for an address we create its homeowner row.
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <Label htmlFor="courts-date-picker" className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0" />
            Pick date
          </Label>
          <Input
            id="courts-date-picker"
            type="date"
            className="w-full max-w-[11.5rem] sm:w-auto"
            value={effectiveDate}
            onChange={(e) => setDateOverride(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 self-start sm:self-auto"
          onClick={() => setDateOverride(null)}
          disabled={!todayQ.data}
        >
          Today in Manila
        </Button>
      </div>

      {/* Tennis */}
      <h2 id="tennis-manage-section" className="mt-12 scroll-mt-6 text-xl font-semibold tracking-tight">
        Tennis court
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">One reservation per hourly slot · 06:00–16:00 Manila wall time.</p>

      <div className="mt-6 grid gap-2">
        {SLOT_HOURS.map((hour) => {
          const booked = tennisByHour.get(hour);
          return (
            <Card key={`t-${hour}`} className="flex flex-row flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <div className="font-medium">{formatSlotRangeLabel(hour)}</div>
                {booked?.party ? <div className="mt-1 text-xs">{booked.party}</div> : null}
                {booked?.addr ? (
                  <div className="text-muted-foreground mt-1 text-xs">
                    {booked.addr}
                    {booked.noShow ? " · no-show" : ""}
                  </div>
                ) : booked ? (
                  <div className="text-muted-foreground mt-1 text-xs italic">Legacy reservation · no address on file</div>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {booked ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={tennisNoShowMut.isPending}
                      onClick={() => tennisNoShowMut.mutate({ id: booked.id, noShow: !booked.noShow })}
                    >
                      {booked.noShow ? "Clear no-show" : "No-show"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={tennisCancelMut.isPending}
                      onClick={() => tennisCancelMut.mutate(booked.id)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={tennisListQ.isLoading}
                    onClick={() => openTennisReserve(hour)}
                  >
                    Reserve
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pickleball */}
      <h2 id="pickleball-manage-section" className="mt-14 scroll-mt-6 text-xl font-semibold tracking-tight">
        Pickleball court
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">Up to four parties per hour · 16:00–22:00 Manila wall time.</p>

      <div className="mt-6 grid gap-3">
        {PICKLEBALL_SLOT_HOURS.map((hour) => {
          const berthMap = pbByHourBerth.get(hour) ?? new Map();
          return (
            <Card key={`pb-${hour}`} className="p-4">
              <div className="mb-3 font-medium">{formatSlotRangeLabel(hour)}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {PICKLEBALL_BERTHS.map((berth) => {
                  const booked = berthMap.get(berth);
                  return (
                    <div
                      key={`${hour}-${berth}`}
                      className="border-border flex flex-col gap-2 rounded-md border bg-muted/10 px-3 py-3"
                    >
                      <div className="text-muted-foreground text-xs font-medium">Party {berth}</div>
                      {booked ? (
                        <>
                          {booked.party ? <div className="text-sm">{booked.party}</div> : null}
                          {booked.addr ? (
                            <div className="text-muted-foreground text-xs">
                              {booked.addr}
                              {booked.noShow ? " · no-show" : ""}
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-xs italic">Legacy · no address on file</div>
                          )}
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={pbNoShowMut.isPending}
                              onClick={() => pbNoShowMut.mutate({ id: booked.id, noShow: !booked.noShow })}
                            >
                              {booked.noShow ? "Clear no-show" : "No-show"}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={pbCancelMut.isPending}
                              onClick={() => pbCancelMut.mutate(booked.id)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="self-start"
                          disabled={pickleListQ.isLoading}
                          onClick={() => openPbReserve(hour, berth)}
                        >
                          Reserve
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tennis reserve dialog */}
      <Dialog
        open={tennisReserveOpen}
        onOpenChange={(open) => {
          setTennisReserveOpen(open);
          if (!open) {
            setTennisSlotHour(null);
            setTennisHist(null);
            setTennisModalPhase("");
            setTennisModalBlock("");
            setTennisModalLot("");
            setTennisModalName("");
            setTennisModalContact("");
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reserve tennis slot</DialogTitle>
            <DialogDescription>
              {tennisSlotHour !== null
                ? tennisSearchReady
                  ? `${tennisSlotSummary} · ${formatManilaLongDate(effectiveDate)} — Who is playing for this hour, and how to reach them?`
                  : `${tennisSlotSummary} · ${formatManilaLongDate(effectiveDate)} — Search the subdivision lot, review history, then complete the reservation.`
                : null}
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (tennisSearchReady) submitTennisReserve();
            }}
          >
            <fieldset className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tennis-res-phase">Phase</Label>
                <Input
                  id="tennis-res-phase"
                  inputMode="numeric"
                  type="number"
                  min={1}
                  step={1}
                  autoComplete="off"
                  required
                  value={tennisModalPhase}
                  onChange={(e) => setTennisModalPhase(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tennis-res-block">Block</Label>
                <Input
                  id="tennis-res-block"
                  inputMode="numeric"
                  type="number"
                  min={1}
                  step={1}
                  autoComplete="off"
                  required
                  value={tennisModalBlock}
                  onChange={(e) => setTennisModalBlock(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tennis-res-lot">Lot</Label>
                <Input
                  id="tennis-res-lot"
                  inputMode="numeric"
                  type="number"
                  min={1}
                  step={1}
                  autoComplete="off"
                  required
                  value={tennisModalLot}
                  onChange={(e) => setTennisModalLot(e.target.value)}
                  placeholder="2"
                />
              </div>
            </fieldset>

            {tennisSearchReady && tennisHist ? (
              <>
                <TennisReservationHistoryTables hist={tennisHist} />
                {tennisHist.noShowsInManilaCalendarMonth >= 3 ? (
                  <div
                    role="status"
                    className="border border-yellow-600/70 bg-yellow-500/[0.13] px-3 py-2 text-xs leading-snug text-yellow-950 dark:border-yellow-500/55 dark:bg-yellow-500/15 dark:text-yellow-50"
                  >
                    <span className="font-semibold">Warning:</span> This lot has three or more no-shows recorded in the
                    current Philippine calendar month (Asia/Manila: from the 1st through now). Count:{" "}
                    {tennisHist.noShowsInManilaCalendarMonth}. Please confirm before booking.
                  </div>
                ) : null}
                {showTennisFairAccessWarn ? (
                  <div
                    role="status"
                    className="border border-amber-600/70 bg-amber-500/[0.12] px-3 py-2 text-xs leading-snug text-amber-950 dark:border-amber-500/55 dark:bg-amber-500/14 dark:text-amber-50"
                  >
                    <span className="font-semibold">Fair access:</span> This homeowner already has{" "}
                    {tennisSameDayCount} tennis reservation
                    {tennisSameDayCount === 1 ? "" : "s"} on {formatManilaLongDate(effectiveDate)} (Manila date).
                    Booking another favors the same lot over spreading play; proceed only if quiet days or staff approve.
                  </div>
                ) : null}
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tennis-res-name">Name</Label>
                    <Input
                      id="tennis-res-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={tennisModalName}
                      onChange={(e) => setTennisModalName(e.target.value)}
                      placeholder="Person using the court"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tennis-res-contact">Contact number</Label>
                    <Input
                      id="tennis-res-contact"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={tennisModalContact}
                      onChange={(e) => setTennisModalContact(e.target.value)}
                      placeholder="+63… or local number"
                    />
                  </div>
                </div>
              </>
            ) : null}

            <DialogFooter className="mt-0 gap-2 sm:justify-between">
              <DialogClose type="button" className="min-w-[5rem]">
                Cancel
              </DialogClose>
              {tennisSearchReady ? (
                <Button
                  type="submit"
                  disabled={
                    tennisCreateMut.isPending || tennisSlotHour === null || tennisSearchHistMut.isPending
                  }
                >
                  {tennisCreateMut.isPending ? "Booking…" : "Reserve"}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={tennisSearchHistMut.isPending || tennisSlotHour === null}
                  onClick={runTennisHomeownerSearch}
                >
                  {tennisSearchHistMut.isPending ? "Searching…" : "Search"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pickleball reserve dialog */}
      <Dialog
        open={pbReserveOpen}
        onOpenChange={(open) => {
          setPbReserveOpen(open);
          if (!open) {
            setPbSlotHour(null);
            setPbBerth(null);
            setPbHist(null);
            setPbModalPhase("");
            setPbModalBlock("");
            setPbModalLot("");
            setPbModalName("");
            setPbModalContact("");
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reserve pickleball spot</DialogTitle>
            <DialogDescription>
              {pbSlotHour !== null && pbBerth !== null
                ? pbSearchReady
                  ? `${pbSlotSummary} · ${formatManilaLongDate(effectiveDate)} — Who is playing for this hour, and how to reach them?`
                  : `${pbSlotSummary} · ${formatManilaLongDate(effectiveDate)} — Search the subdivision lot, review history, then complete the reservation.`
                : null}
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (pbSearchReady) submitPbReserve();
            }}
          >
            <fieldset className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pb-res-phase">Phase</Label>
                <Input
                  id="pb-res-phase"
                  inputMode="numeric"
                  type="number"
                  min={1}
                  step={1}
                  autoComplete="off"
                  required
                  value={pbModalPhase}
                  onChange={(e) => setPbModalPhase(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pb-res-block">Block</Label>
                <Input
                  id="pb-res-block"
                  inputMode="numeric"
                  type="number"
                  min={1}
                  step={1}
                  autoComplete="off"
                  required
                  value={pbModalBlock}
                  onChange={(e) => setPbModalBlock(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pb-res-lot">Lot</Label>
                <Input
                  id="pb-res-lot"
                  inputMode="numeric"
                  type="number"
                  min={1}
                  step={1}
                  autoComplete="off"
                  required
                  value={pbModalLot}
                  onChange={(e) => setPbModalLot(e.target.value)}
                  placeholder="2"
                />
              </div>
            </fieldset>

            {pbSearchReady && pbHist ? (
              <>
                <PickleballReservationHistoryTables hist={pbHist} />
                {pbHist.noShowsInManilaCalendarMonth >= 3 ? (
                  <div
                    role="status"
                    className="border border-yellow-600/70 bg-yellow-500/[0.13] px-3 py-2 text-xs leading-snug text-yellow-950 dark:border-yellow-500/55 dark:bg-yellow-500/15 dark:text-yellow-50"
                  >
                    <span className="font-semibold">Warning:</span> This lot has three or more no-shows recorded in the
                    current Philippine calendar month (Asia/Manila: from the 1st through now). Count:{" "}
                    {pbHist.noShowsInManilaCalendarMonth}. Please confirm before booking.
                  </div>
                ) : null}
                {showPbFairAccessWarn ? (
                  <div
                    role="status"
                    className="border border-amber-600/70 bg-amber-500/[0.12] px-3 py-2 text-xs leading-snug text-amber-950 dark:border-amber-500/55 dark:bg-amber-500/14 dark:text-amber-50"
                  >
                    <span className="font-semibold">Fair access:</span> This homeowner already has{" "}
                    {pbSameDayCount} pickleball reservation
                    {pbSameDayCount === 1 ? "" : "s"} on {formatManilaLongDate(effectiveDate)} (Manila date). Booking
                    another favors the same lot over spreading play; proceed only if quiet days or staff approve.
                  </div>
                ) : null}
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pb-res-name">Name</Label>
                    <Input
                      id="pb-res-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={pbModalName}
                      onChange={(e) => setPbModalName(e.target.value)}
                      placeholder="Person using the court"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pb-res-contact">Contact number</Label>
                    <Input
                      id="pb-res-contact"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={pbModalContact}
                      onChange={(e) => setPbModalContact(e.target.value)}
                      placeholder="+63… or local number"
                    />
                  </div>
                </div>
              </>
            ) : null}

            <DialogFooter className="mt-0 gap-2 sm:justify-between">
              <DialogClose type="button" className="min-w-[5rem]">
                Cancel
              </DialogClose>
              {pbSearchReady ? (
                <Button
                  type="submit"
                  disabled={
                    pbCreateMut.isPending ||
                    pbSlotHour === null ||
                    pbBerth === null ||
                    pbSearchHistMut.isPending
                  }
                >
                  {pbCreateMut.isPending ? "Booking…" : "Reserve"}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={pbSearchHistMut.isPending || pbSlotHour === null || pbBerth === null}
                  onClick={runPbHomeownerSearch}
                >
                  {pbSearchHistMut.isPending ? "Searching…" : "Search"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
