import { Button } from "@cdm-pickleball/ui/components/button";
import { Card } from "@cdm-pickleball/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  formatManilaYmd,
  formatSlotRangeLabel,
  manilaPickleballSlotStartUtc,
  pickleballCourtDayWindowLabel,
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
    const map = new Map<
      number,
      Map<number, { id: string; reservedByName: string | null; addr: string | null; noShow?: boolean | null }>
    >();
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
              reservedByName: r.reservedByName,
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
    <div className="container mx-auto max-w-lg px-4 py-12 md:py-14">
      <div className="mb-6 flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-muted-foreground text-xs font-medium uppercase tracking-[0.2em]">
            Corona Del Mar · Pickleball
          </p>
          <h1 className="font-serif text-foreground mt-3 mb-3 text-3xl tracking-tight md:text-[2rem]">Pickleball court</h1>
          <p className="text-muted-foreground text-sm leading-relaxed md:text-[0.9375rem]">
            Hourly schedule · Philippines time (UTC+8) · {pickleballCourtDayWindowLabel()} · up to four parties per
            hour
          </p>
        </div>
        <img
          src="/pickle-racket.jpg"
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
          {PICKLEBALL_SLOT_HOURS.map((hour) => {
            const berthsMap = byHourBerth.get(hour) ?? new Map();
            return (
              <Card key={hour} size="sm" className="p-4">
                <div className="font-serif mb-3 text-[0.9375rem] font-semibold">{formatSlotRangeLabel(hour)}</div>
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
                        <div
                          className={booked ? "text-[#fcd34d] dark:text-[#fcd34d]" : "text-muted-foreground"}
                        >
                          {booked ? (
                            <div>
                              <div className="font-serif text-foreground text-pretty font-semibold">
                                {booked.reservedByName?.trim() || "Reserved"}
                              </div>
                              {(booked.noShow || booked.addr) && (
                                <div className="mt-0.5 text-pretty text-xs font-normal">
                                  {[booked.noShow ? "No-show" : null, booked.addr].filter(Boolean).join(" · ")}
                                </div>
                              )}
                            </div>
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
      )}

      <p className="text-muted-foreground mt-6 text-center text-xs">
        <Link to="/how-to-reserve" className="underline underline-offset-2">
          How to reserve
        </Link>
        {" · "}
        <Link to="/tennis" className="underline underline-offset-2">
          Tennis court schedule
        </Link>
      </p>
    </div>
  );
}
