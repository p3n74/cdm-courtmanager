import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from "@cdm-pickleball/ui/components/dialog";
import { cn } from "@cdm-pickleball/ui/lib/utils";
import { Maximize2 } from "lucide-react";
import * as React from "react";

const POSTER_SRC = "/notice.jpg";

type HeroTournamentPosterProps = {
  className?: string;
};

export function HeroTournamentPoster({ className }: HeroTournamentPosterProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div className={cn("relative w-full px-4 pb-6 md:px-0 md:pb-0", className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="border-border focus-visible:ring-ring/50 relative w-full cursor-zoom-in rounded-2xl border-2 border-border/55 bg-card text-left shadow-[0_28px_80px_-24px_rgba(30,41,59,0.35)] outline-none transition-transform hover:border-primary/30 hover:brightness-[1.02] focus-visible:ring-2 active:scale-[0.997] md:rounded-3xl dark:shadow-[0_28px_80px_-20px_rgba(0,0,0,0.55)]"
        >
          <div className="relative aspect-[3/4] max-h-[min(70vh,38rem)] w-full overflow-hidden rounded-[0.875rem] md:rounded-[1.375rem]">
            <img
              src={POSTER_SRC}
              alt="Poster for upcoming club tournament — select to enlarge"
              className="bg-muted h-full w-full object-contain"
              decoding="async"
              fetchPriority="high"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1e293b]/80 via-[#1e293b]/20 to-transparent pt-24 pb-4 px-5">
              <span className="font-serif inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-white drop-shadow-sm">
                <Maximize2 className="size-4 opacity-90" aria-hidden />
                Click to view full screen
              </span>
            </div>
          </div>
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "flex max-h-[96dvh] w-[calc(100vw-1rem)] max-w-[min(1200px,calc(100vw-1rem))] translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-lg border border-white/15 bg-[#0a0a0a] p-2 shadow-2xl ring-0 sm:w-[calc(100vw-2rem)]",
          )}
        >
          <DialogTitle className="sr-only">Tournament poster full screen</DialogTitle>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-1 sm:p-2">
            <img
              src={POSTER_SRC}
              alt="Tournament poster"
              className="max-h-[min(90dvh,1200px)] w-full object-contain"
              decoding="async"
            />
          </div>
          <DialogFooter className="border-border mt-0 shrink-0 border-t border-white/10 bg-[#0a0a0a]/95 px-3 py-3 sm:px-4">
            <DialogClose className="border-white/25 text-white hover:bg-white/12">Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
