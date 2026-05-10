import { Button } from "@cdm-pickleball/ui/components/button";
import { Card } from "@cdm-pickleball/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { useMemo, useState } from "react";

import {
  formatManilaYmd,
  formatSlotRangeLabel,
  manilaPickleballSlotStartUtc,
  PICKLEBALL_SLOT_HOURS,
} from "@/lib/manila";
import { formatOwnerAddressTriple } from "@/lib/reservation-display";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/pickleball/")({
  component: PickleballSchedulePage,
});

const BERTHS = [1, 2, 3, 4] as const;

function PickleballSchedulePage() {
  const todayQ = useQuery(trpc.pickleball.todayInManila.queryOptions());
  const [date, setDate] = useState<string | null>(null);
  const effectiveDate = date ?? todayQ.data?.date ?? formatManilaYmd(new Date());

  const listQ = useQuery({
    ...trpc.pickleball.listDay.queryOptions({ date: effectiveDate }),
    enabled: Boolean(effectiveDate),
  });

  const byHourBerth = useMemo(() => {
    const map = new Map<number, Map<number, { id: string; addr: string | null; noShow?: boolean | null }>>();
    for (const h of PICKLEBALL_SLOT_HOURS) {
      map.set(h, new Map());
    }
    if (!listQ.data?.reservations) {
      return map;
    }
    type Row = (typeof listQ.data.reservations)[number];
    for (const r of listQ.data.reservations as Row[]) {
      const start = new Date(r.slotStart as unknown as string);
      for (const h of PICKLEBALL_SLOT_HOURS) {
        if (manilaPickleballSlotStartUtc(listQ.data.date, h).getTime() === start.getTime()) {
          const b = Number(r.courtBerth);
          if (Number.isFinite(b) && (BERTHS as readonly number[]).includes(b)) {
            map.get(h)!.set(b, {
              id: r.id,
              addr: formatOwnerAddressTriple(r.phase, r.block, r.lot),
              noShow: r.noShow,
            });
          }
          break;
        }
      }
    }
    return map;
  }, [listQ.data]);

  return (
    <div className="container mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Pickleball court</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Hourly schedule · Philippines time (UTC+8) · 16:00–22:00 · up to four parties per hour
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setDate(formatManilaYmd(new Date()))}
          disabled={!todayQ.data}
        >
          <Calendar className="size-4" />
          Today in Manila
        </Button>
        <input
          type="date"
          className="border-input bg-background rounded-md border px-2 py-1.5 text-sm shadow-sm"
          value={effectiveDate}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {PICKLEBALL_SLOT_HOURS.map((hour) => {
          const berthsMap = byHourBerth.get(hour) ?? new Map();
          return (
            <Card key={hour} className="p-4">
              <div className="mb-3 font-medium">{formatSlotRangeLabel(hour)}</div>
              <div className="text-muted-foreground mb-2 text-xs">Asia/Manila</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {BERTHS.map((berth) => {
                  const booked = berthsMap.get(berth);
                  return (
                    <div
                      key={berth}
                      className="border-border bg-muted/20 flex flex-col gap-1 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="text-muted-foreground text-xs font-medium">Party {berth}</div>
                      <div className={booked ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                        {booked ? (
                          <>
                            Reserved
                            {booked.noShow ? " · no-show" : ""}
                            {booked.addr ? ` · ${booked.addr}` : ""}
                          </>
                        ) : (
                          "Available"
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/" className="underline underline-offset-2">
          Tennis court schedule
        </Link>
        . Authorized staff can book or cancel on{" "}
        <Link to="/reservations/manage" hash="pickleball-manage-section" className="underline underline-offset-2">
          manage pickleball
        </Link>{" "}
        (Google sign-in + allowlist).
      </p>
    </div>
  );
}
