import { Button } from "@cdm-pickleball/ui/components/button";
import { Card } from "@cdm-pickleball/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  formatManilaYmd,
  formatSlotRangeLabel,
  manilaSlotStartUtc,
  SLOT_HOURS,
  tennisCourtDayWindowLabel,
} from "@/lib/manila";
import { formatOwnerAddressTriple } from "@/lib/reservation-display";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/tennis/")({
  component: TennisSchedulePage,
});

function TennisSchedulePage() {
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
    <div className="container mx-auto max-w-lg px-4 py-12 md:py-14">
      <div className="mb-6 flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-muted-foreground text-xs font-medium uppercase tracking-[0.2em]">
            Corona Del Mar · Tennis
          </p>
          <h1 className="font-serif text-foreground mt-3 mb-3 text-3xl tracking-tight md:text-[2rem]">Tennis court</h1>
          <p className="text-muted-foreground text-sm leading-relaxed md:text-[0.9375rem]">
            Hourly schedule · Philippines time (UTC+8) · {tennisCourtDayWindowLabel()}
          </p>
        </div>
        <img
          src="/tennis-racket.jpg"
          alt=""
          className="border-border hidden size-28 shrink-0 rounded-xl border object-cover shadow-md sm:block md:size-32"
          decoding="async"
        />
      </div>

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

      {listQ.isError ? (
        <p className="text-destructive text-center text-sm leading-relaxed">
          Couldn&apos;t load reservations. Check your connection and try again shortly.
        </p>
      ) : listQ.isPending ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-16" role="status">
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <span className="text-sm">Loading schedule…</span>
        </div>
      ) : (
        <div className="grid gap-3">
          {SLOT_HOURS.map((hour) => {
            const booked = byHour.get(hour);
            return (
              <Card key={hour} size="sm" className="flex flex-row flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-foreground font-medium">{formatSlotRangeLabel(hour)}</div>
                  <div className="text-muted-foreground mt-0.5 text-xs">Asia/Manila</div>
                </div>
                <div className="text-right text-sm">
                  {booked ? (
                    <div className="text-[#fcd34d] dark:text-[#fcd34d]">
                      <div className="text-foreground font-serif text-base font-semibold md:text-[0.9375rem]">
                        {booked.reservedByName?.trim() || "Reserved"}
                      </div>
                      {(booked.noShow || booked.addr) && (
                        <div className="text-muted-foreground mt-0.5 text-xs font-normal">
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
      )}

      <p className="text-muted-foreground mt-6 text-center text-xs">
        <Link to="/how-to-reserve" className="underline underline-offset-2">
          How to reserve
        </Link>
        {" · "}
        <Link to="/pickleball" className="underline underline-offset-2">
          Pickleball court schedule
        </Link>
      </p>
    </div>
  );
}
