import { Button } from "@cdm-pickleball/ui/components/button";
import { Card } from "@cdm-pickleball/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { useMemo, useState } from "react";

import {
  formatManilaYmd,
  formatSlotRangeLabel,
  manilaSlotStartUtc,
  pickleballCourtDayWindowLabel,
  SLOT_HOURS,
  tennisCourtDayWindowLabel,
} from "@/lib/manila";
import { formatOwnerAddressTriple } from "@/lib/reservation-display";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const todayQ = useQuery(trpc.tennis.todayInManila.queryOptions());
  const [date, setDate] = useState<string | null>(null);
  const effectiveDate = date ?? todayQ.data?.date ?? formatManilaYmd(new Date());

  const listQ = useQuery({
    ...trpc.tennis.listDay.queryOptions({ date: effectiveDate }),
    enabled: Boolean(effectiveDate),
  });

  const byHour = useMemo(() => {
    const map = new Map<
      number,
      { id: string; reservedByName: string | null; addr: string | null; noShow?: boolean | null }
    >();
    if (!listQ.data?.reservations) {
      return map;
    }
    type Row = (typeof listQ.data.reservations)[number];
    for (const r of listQ.data.reservations as Row[]) {
      const start = new Date(r.slotStart as unknown as string);
      for (const h of SLOT_HOURS) {
        if (manilaSlotStartUtc(listQ.data.date, h).getTime() === start.getTime()) {
          map.set(h, {
            id: r.id,
            reservedByName: r.reservedByName,
            addr: formatOwnerAddressTriple(r.phase, r.block, r.lot),
            noShow: r.noShow,
          });
          break;
        }
      }
    }
    return map;
  }, [listQ.data]);

  return (
    <div className="container mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Tennis court</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Hourly schedule · Philippines time (UTC+8) · {tennisCourtDayWindowLabel()}
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

      <div className="grid gap-2">
        {SLOT_HOURS.map((hour) => {
          const booked = byHour.get(hour);
          return (
            <Card key={hour} className="flex flex-row items-center justify-between p-4">
              <div>
                <div className="font-medium">{formatSlotRangeLabel(hour)}</div>
                <div className="text-muted-foreground text-xs">Asia/Manila</div>
              </div>
              <div className="text-right text-sm">
                {booked ? (
                  <div className="text-amber-600 dark:text-amber-400">
                    <div className="text-pretty font-medium">
                      {booked.reservedByName?.trim() || "Reserved"}
                    </div>
                    {(booked.noShow || booked.addr) && (
                      <div className="mt-0.5 text-pretty text-xs font-normal">
                        {[booked.noShow ? "No-show" : null, booked.addr].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Available</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-muted-foreground mt-6 text-center text-xs">
        Authorized staff can book or cancel tennis and pickleball slots on the manage courts page (Google sign-in + allowlist).{" "}
        <Link to="/pickleball" className="underline underline-offset-2">
          Pickleball schedule
        </Link>{" "}
        (four parties per hour, {pickleballCourtDayWindowLabel()} Manila).
      </p>
    </div>
  );
}
