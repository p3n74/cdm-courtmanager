import { cn } from "@cdm-pickleball/ui/lib/utils";

/** CSS `blur()` uses px only; approximate a "10% blur" as a sharp layer + heavily blurred duplicate at 10% opacity. */
const BG_LAYER = "absolute inset-[-6%] scale-[1.02]" as const;

function washStyle(imageSrc: string) {
  return {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    /** Viewport-fixed photos: content scrolls, image stays anchored (see home sticky hero + tennis/pickle layouts). */
    backgroundAttachment: "fixed" as const,
  };
}

type BlurPageBackdropProps = {
  /** Public URL (e.g. `/bg.jpg`) shown full-bleed with subtle blur mix + scrim. */
  imageSrc: string;
  children: React.ReactNode;
  className?: string;
};

function PhotoBackdropWash({ imageSrc }: { imageSrc: string }) {
  const st = washStyle(imageSrc);
  return (
    <>
      <div className={cn(BG_LAYER)} style={st} />
      <div className={cn(BG_LAYER, "blur-3xl opacity-[0.10]")} style={st} />
    </>
  );
}

/** For a `position:fixed` full-viewport shell; layers use default attachment so the image stays put while content scrolls. */
function PhotoBackdropWashPinnedShell({ imageSrc }: { imageSrc: string }) {
  const scrollAttach = {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  } as const;
  return (
    <>
      <div className={cn(BG_LAYER)} style={scrollAttach} />
      <div className={cn(BG_LAYER, "blur-3xl opacity-[0.10]")} style={scrollAttach} />
    </>
  );
}

const SECTION_SCRIM_CLASS =
  "pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fdfbf7]/84 via-[#faf8f3]/76 to-[#f1f5f9]/86 dark:from-background/86 dark:via-background/74 dark:to-background/88";

/**
 * Photo wash behind route content; shell is `position:fixed` so the scene stays pinned while scrolling (combines with overflow clipping so blur edges don’t bleed past the viewport).
 */
export function BlurPageBackdrop({ imageSrc, children, className }: BlurPageBackdropProps) {
  return (
    <div className={cn("relative isolate flex min-h-0 min-w-0 w-full flex-1 flex-col", className)}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden"
      >
        <PhotoBackdropWashPinnedShell imageSrc={imageSrc} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fdfbf7]/86 via-[#f6f4ef]/78 to-[#eef2f6]/88 dark:from-background/88 dark:via-background/76 dark:to-background/90" />
      </div>
      <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

type SectionPhotoBackdropProps = {
  imageSrc: string;
  children: React.ReactNode;
  className?: string;
  /** Rounded/clipping on the backdrop layer (not the section) so blurred wash edges don’t bleed past the band vertically. */
  pinSurfaceClassName?: string;
};

/** Same wash as full-page layouts, tuned for stacked home bands (viewport-fixed image + matching scrim, clipped to the section). */
export function SectionPhotoBackdrop({ imageSrc, children, className, pinSurfaceClassName }: SectionPhotoBackdropProps) {
  return (
    <section className={cn("relative isolate print:bg-white overflow-x-clip", className)}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 overflow-hidden print:hidden",
          pinSurfaceClassName,
        )}
      >
        <PhotoBackdropWash imageSrc={imageSrc} />
        <div className={cn(SECTION_SCRIM_CLASS, "[background-attachment:fixed]")} />
      </div>
      <div className="relative z-0">{children}</div>
    </section>
  );
}
