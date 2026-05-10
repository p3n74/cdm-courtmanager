import { buttonVariants } from "@cdm-pickleball/ui/components/button";
import { cn } from "@cdm-pickleball/ui/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SectionPhotoBackdrop } from "@/components/blur-page-backdrop";
import { HeroTournamentPoster } from "@/components/hero-tournament-poster";
import { TestimonialsCarousel } from "@/components/testimonials-carousel";
import { pickleballCourtDayWindowLabel, tennisCourtDayWindowLabel } from "@/lib/manila";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="print:bg-white">
      <SectionPhotoBackdrop
        imageSrc="/bg.jpg"
        className="border-border/20 sticky top-16 z-0 flex min-h-[100dvh] flex-col justify-center border-b"
      >
        <div className="container mx-auto grid max-w-6xl gap-12 px-4 py-14 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-center md:gap-14 md:py-16 lg:gap-16">
          <div className="max-w-xl">
            <p className="font-serif text-muted-foreground text-sm font-medium uppercase tracking-[0.2em] md:text-[0.8125rem]">
              Corona Del Mar · Clubhouse
            </p>
            <h1 className="font-serif text-foreground mt-4 text-4xl leading-[1.08] tracking-tight md:text-5xl lg:text-[3.35rem]">
              Community courts for tennis and pickleball.
            </h1>
            <p className="text-muted-foreground mt-6 text-base leading-relaxed md:text-lg">
              Tennis and pickleball each have their own schedule and allotted court times. This website is the schedule
              board—open tennis or pickleball below to see what's reserved. To reserve a court, see the{" "}
              <Link
                to="/how-to-reserve"
                className="text-[#b45309] underline decoration-[#fcd34d]/65 underline-offset-4 hover:text-[#92400e] dark:text-[#fcd34d]"
              >
                reservation guidelines
              </Link>
              .
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/tennis"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "inline-flex gap-2 text-sm md:px-5",
                )}
              >
                Tennis schedule
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/pickleball"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "inline-flex gap-2 text-sm md:px-5")}
              >
                Pickleball schedule
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <HeroTournamentPoster />
        </div>
      </SectionPhotoBackdrop>

      <SectionPhotoBackdrop
        imageSrc="/bg-2.jpg"
        pinSurfaceClassName="rounded-t-[1.75rem] md:rounded-t-3xl"
        className="border-border/35 relative z-[1] rounded-t-[1.75rem] border-x-0 border-t pt-16 pb-16 shadow-[0_-18px_50px_-20px_rgba(30,41,59,0.18)] md:rounded-t-3xl dark:shadow-[0_-18px_50px_-20px_rgba(0,0,0,0.45)]"
      >
        <div className="container mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl tracking-tight md:text-4xl">Our community courts</h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed md:text-base">
              Tennis and pickleball share the clubhouse slab. Tennis allows{" "}
              <span className="text-foreground/90 font-medium">only one playing group each hour</span>—no second party splits
              the same hourly reservation. Pickleball divides it into{" "}
              <span className="text-foreground/90 font-medium">four side-by-side nets</span> on one tennis footprint, so up
              to four unrelated parties can reserve the same hour when the pickleball layout is live. Clubhouse nets stay on
              hand. Tap the tennis or pickleball tiles below for the calendar you need.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <AmenityCard
              to="/tennis"
              title="Tennis court"
              description={`Single tennis booking per hour (${tennisCourtDayWindowLabel()}) · clubhouse nets`}
              image="/tennis-court.jpg"
            />
            <AmenityCard
              to="/pickleball"
              title="Pickleball courts"
              description={`Same slab marked as four pickleball nets · four bookings per hour max (${pickleballCourtDayWindowLabel()}) · clubhouse nets`}
              image="/pickle-court.jpg"
            />
            <AmenityCard
              to="/how-to-reserve"
              title="Reservation guidelines"
              description="Booking rules from the HOA—hotline, advance notice, cancellations, and Manila (UTC+8) court time—all in one place."
              image="/tennis-racket.jpg"
              cta="View guidelines →"
            />
          </div>
          <p className="text-muted-foreground mx-auto mt-14 max-w-2xl text-center text-xs leading-relaxed md:text-sm">
            These pages are read-only: they show names on the court calendar, not a checkout line. Booking or changes go
            through the HOA process described in the{" "}
            <Link
              to="/how-to-reserve"
              className="text-[#b45309] underline decoration-[#fcd34d]/65 underline-offset-4 hover:text-[#92400e] dark:text-[#fcd34d]"
            >
              reservation guidelines
            </Link>
            .
          </p>
        </div>

        <div className="container mx-auto max-w-6xl px-4 pt-12">
          <TestimonialsCarousel />
        </div>
      </SectionPhotoBackdrop>
    </div>
  );
}

function AmenityCard({
  to,
  title,
  description,
  image,
  cta = "Open schedule →",
}: {
  to: "/tennis" | "/pickleball" | "/how-to-reserve";
  title: string;
  description: string;
  image: string;
  cta?: string;
}) {
  return (
    <Link
      to={to}
      className="border-border group block overflow-hidden rounded-2xl border-2 border-border/55 bg-card shadow-[0_16px_50px_-24px_rgba(30,41,59,0.2)] outline-offset-4 transition-all hover:border-primary/35 hover:shadow-[0_22px_60px_-20px_rgba(30,41,59,0.28)] focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover transition-transform duration-[1.05s] ease-out group-hover:scale-105"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1e293b]/45 to-transparent opacity-95" />
      </div>
      <div className="px-6 py-8">
        <h3 className="font-serif text-xl tracking-tight">{title}</h3>
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed md:text-sm">{description}</p>
        <p className="text-[#fcd34d] mt-5 text-sm font-medium">{cta}</p>
      </div>
    </Link>
  );
}
