import { Card } from "@cdm-pickleball/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";

const HOTLINE_DISPLAY = "0905 345 3769";
const HOTLINE_TEL = "tel:+639053453769";

const POLICY_POINTS = [
  <>
    Reservations must be arranged either through the <span className="font-medium text-foreground">CDMH Admin Office</span>{" "}
    or by calling the booking hotline at{" "}
    <a
      href={HOTLINE_TEL}
      className="text-[#b45309] underline decoration-[#fcd34d]/60 underline-offset-2 hover:text-[#92400e] dark:text-[#fcd34d]"
    >
      {HOTLINE_DISPLAY}
    </a>
    . Only the <span className="font-medium text-foreground">person who will actually play</span> may book—immediate
    family counts as playing together. Booking for anyone else is <span className="font-medium text-foreground">not</span>{" "}
    permitted, to discourage slot hoarding and misuse.
  </>,
  <>
    Book ahead by <span className="font-medium text-foreground">one (1) full day</span>, during booking hours{" "}
    <span className="font-medium text-foreground">8:30 AM to 5:00 PM</span>, by calling{" "}
    <a
      href={HOTLINE_TEL}
      className="text-[#b45309] underline decoration-[#fcd34d]/60 underline-offset-2 hover:text-[#92400e] dark:text-[#fcd34d]"
    >
      {HOTLINE_DISPLAY}
    </a>
    . Reservations made by text message or chat are <span className="font-medium text-foreground">not</span> accepted.{" "}
    <span className="font-medium text-foreground">Monday play</span> can only be booked on the preceding{" "}
    <span className="font-medium text-foreground">Saturday</span>, during the same 8:30 AM–5:00 PM window, via the Admin
    Office or booking hotline.
  </>,
  <>
    To cancel a confirmed booking, call the Admin Office{" "}
    <span className="font-medium text-foreground">before 5:00 PM</span>; otherwise the slot may be counted as a no-show.
    After <span className="font-medium text-foreground">three (3) no-shows</span>, booking privileges are suspended.
  </>,
  <>
    For evening play <span className="font-medium text-foreground">6:00 PM to 10:00 PM</span>, court-lighting charges
    must be paid before the game begins.
  </>,
  <>
    Please honor these rules—fair turnaround for everyone keeps the courts predictable and enjoyable for the whole community.
  </>,
] as const;

export const Route = createFileRoute("/how-to-reserve")({
  component: HowToReservePage,
});

function HowToReservePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 md:py-16">
      <p className="font-serif text-muted-foreground text-xs font-medium uppercase tracking-[0.2em]">Corona Del Mar</p>
      <h1 className="font-serif text-foreground mt-3 mb-2 text-3xl tracking-tight md:text-[2rem]">
        How to reserve a court
      </h1>
      <p className="text-muted-foreground mb-10 text-sm leading-relaxed md:text-[0.9375rem]">
        Summarized HOA guidelines for reserving tennis or pickleball court time through CDMH ({HOTLINE_DISPLAY}).
      </p>

      <Card className="border-border/80 mb-10 p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start gap-3 pb-6">
          <div className="bg-primary/10 text-primary rounded-full p-2.5">
            <Phone className="size-5 shrink-0" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-serif text-foreground font-semibold">Booking hotline</p>
            <a
              href={HOTLINE_TEL}
              className="text-foreground hover:text-[#b45309] mt-1 block text-xl font-semibold tracking-tight tabular-nums transition-colors md:text-2xl dark:hover:text-[#fcd34d]"
            >
              {HOTLINE_DISPLAY}
            </a>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Use voice calls within booking hours (8:30 AM–5:00 PM). Text and chat apps cannot be used to reserve or
              cancel.
            </p>
          </div>
        </div>
      </Card>

      <h2 className="font-serif text-foreground mb-6 text-xl tracking-tight">Reservation policy (HOA)</h2>
      <ol className="text-muted-foreground space-y-6 text-sm leading-relaxed md:text-[0.9375rem] [&>li]:pl-2">
        {POLICY_POINTS.map((node, index) => (
          <li key={index} className="marker:text-foreground/80 list-none">
            <div className="border-border bg-card/70 flex gap-4 rounded-xl border px-5 py-4 shadow-sm backdrop-blur-sm">
              <span className="font-serif text-foreground/70 mt-0.5 shrink-0 text-lg tabular-nums">{index + 1}.</span>
              <div className="min-w-0">{node}</div>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-muted-foreground mt-12 border-t border-border/60 pt-8 text-center text-xs leading-relaxed">
        Open the{" "}
        <Link to="/tennis" className="text-[#b45309] underline decoration-[#fcd34d]/60 underline-offset-2 dark:text-[#fcd34d]">
          tennis
        </Link>
        {" "}or{" "}
        <Link
          to="/pickleball"
          className="text-[#b45309] underline decoration-[#fcd34d]/60 underline-offset-2 dark:text-[#fcd34d]"
        >
          pickleball
        </Link>{" "}
        schedule, or head{" "}
        <Link to="/" className="text-[#b45309] underline decoration-[#fcd34d]/60 underline-offset-2 dark:text-[#fcd34d]">
          home
        </Link>
        .
      </p>
    </div>
  );
}
