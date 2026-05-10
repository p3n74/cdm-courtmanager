import { Link } from "@tanstack/react-router";

const footerLinks = [
  { to: "/tennis", label: "Tennis" },
  { to: "/pickleball", label: "Pickleball" },
  { to: "/how-to-reserve", label: "How to reserve" },
  { to: "/", label: "Home" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto shrink-0 border-border/50 border-t bg-[#1e293b] px-6 py-12 text-[#fdfbf7] print:hidden">
      <div className="container mx-auto flex max-w-5xl flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <p className="font-serif text-xl tracking-wide">Citadel-Codex</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Business solutions, software, and marketing—plus infrastructure and IT consulting—when you need clear
            delivery on systems, campaigns, and what runs behind them.
          </p>
          <div className="mt-5 flex flex-col gap-2 text-sm">
            <a href="mailto:nikolai@citadel-codex.com" className="text-[#fcd34d] transition-colors hover:text-[#fde68a]">
              nikolai@citadel-codex.com
            </a>
            <a
              href="https://citadel-codex.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-200 underline-offset-4 transition-colors hover:text-[#fcd34d]"
            >
              citadel-codex.com
            </a>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-10 gap-y-3 text-sm md:justify-end">
          {footerLinks.map(({ to, label }) => (
            <Link key={to} to={to} className="text-slate-200 transition-colors hover:text-[#fcd34d]">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="text-muted-foreground container mx-auto mt-10 max-w-5xl space-y-2 border-t border-white/10 pt-6 text-xs leading-relaxed text-slate-400">
        <p className="text-slate-300">Developed by Citadel-Codex.</p>
        <p>
          Corona Del Mar court schedules follow Manila (UTC+8). For business solutions, software, marketing,
          infrastructure, or IT consulting—{" "}
          <a href="mailto:nikolai@citadel-codex.com" className="text-slate-300 underline-offset-2 hover:text-[#fcd34d]">
            contact Citadel-Codex
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
