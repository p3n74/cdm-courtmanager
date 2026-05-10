import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@cdm-pickleball/ui/components/button";

type QuoteSlide = {
  quote: string;
  name: string;
  role: string;
};

const SLIDES: QuoteSlide[] = [
  {
    quote:
      "One board for tennis and pickleball at the clubhouse means neighbors can plan the day without guessing—especially on busy weekends.",
    name: "Community member",
    role: "Homeowner",
  },
  {
    quote:
      "Clear schedules mean fewer phone tags. Staff see names and contacts in one view; everyone else sees what’s open on the nets.",
    name: "Court coordinator",
    role: "Volunteer steward",
  },
  {
    quote:
      "Corona Del Mar is about showing up for each other. The courts are no different—fair times, shared space, and hosts who care.",
    name: "Board member",
    role: "Clubhouse",
  },
];

export function TestimonialsCarousel() {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % SLIDES.length), []);
  const prev = useCallback(() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    const t = window.setInterval(next, 8000);
    return () => window.clearInterval(t);
  }, [next]);

  const slide = SLIDES[index]!;

  return (
    <section
      aria-label="Testimonials"
      className="print:hidden mt-24 overflow-hidden rounded-2xl px-4 py-16 sm:px-8 md:py-20"
      style={{
        backgroundImage:
          "linear-gradient(165deg, oklch(0.42 0.065 268) 0%, oklch(0.32 0.05 264) 45%, oklch(0.26 0.045 266) 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 md:gap-6">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0 border-white/25 bg-[#1e293b]/40 text-[#fcd34d] backdrop-blur-md hover:bg-[#1e293b]/55"
          onClick={prev}
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <Quote className="text-muted-foreground/40 mx-auto mb-6 size-10 text-[#94a3b8]" aria-hidden />
          <blockquote
            key={slide.quote}
            className="font-serif text-xl leading-snug tracking-tight text-[#fdfbf7] md:text-2xl md:leading-snug"
          >
            “{slide.quote}”
          </blockquote>
          <footer className="text-muted-foreground mt-8 text-sm text-slate-300">
            <span className="text-[#fcd34d]/95 font-medium">{slide.name}</span>
            <span className="text-slate-400"> · {slide.role}</span>
          </footer>
          <div className="mt-8 flex justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to testimonial ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index ? "w-8 bg-[#fcd34d]" : "w-2 bg-white/35 hover:bg-white/55"
                }`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0 border-white/25 bg-[#1e293b]/40 text-[#fcd34d] backdrop-blur-md hover:bg-[#1e293b]/55"
          onClick={next}
          aria-label="Next testimonial"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}
