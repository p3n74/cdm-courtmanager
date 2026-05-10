type HeroFramedImageProps = {
  src: string;
  alt?: string;
  /** Override image treatment; default keeps a soft blur for abstract photos. */
  imageClassName?: string;
};

/**
 * Framed hero artwork; sources live under `apps/web/public/`.
 */
export function HeroFramedImage({
  src,
  alt = "Clubhouse outlook",
  imageClassName = "h-full w-full scale-[1.06] object-cover blur-[6px]",
}: HeroFramedImageProps) {
  return (
    <div className="relative w-full px-4 pb-6 md:px-0 md:pb-0">
      <div
        aria-hidden
        className="border-border/30 pointer-events-none absolute -inset-3 rounded-[2rem] border-2 border-dashed opacity-35 md:inset-[-1.25rem]"
      />
      <div className="border-background relative aspect-[4/5] max-h-[min(70vh,36rem)] w-full overflow-hidden rounded-2xl border-[10px] border-white bg-white shadow-[0_28px_80px_-24px_rgba(30,41,59,0.35)] ring-4 ring-black/[0.04] md:aspect-[5/6] md:rounded-3xl dark:border-[#1e293b] dark:bg-[#1e293b]/40 dark:shadow-[0_28px_80px_-20px_rgba(0,0,0,0.55)]">
        <img
          src={src}
          alt={alt}
          className={imageClassName}
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#1e293b]/55 via-transparent to-[#fcd34d]/10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#1e293b]/45 to-transparent" />
      </div>
    </div>
  );
}
