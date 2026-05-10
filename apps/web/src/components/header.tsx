import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const PUBLIC_NAV_LINKS = [
  { to: "/tennis", label: "Tennis schedule" },
  { to: "/pickleball", label: "Pickleball schedule" },
  { to: "/how-to-reserve", label: "How to reserve" },
] as const;

const MANAGER_NAV_LINKS = [
  { to: "/reservations/manage", label: "Manage courts" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export default function Header() {
  const { data: session } = authClient.useSession();
  const isManagerQ = useQuery({
    ...trpc.tennis.isManager.queryOptions(),
    enabled: Boolean(session?.user),
  });

  const showManagerNav = Boolean(session?.user) && Boolean(isManagerQ.data?.allowed);

  const links = showManagerNav ? [...PUBLIC_NAV_LINKS, ...MANAGER_NAV_LINKS] : PUBLIC_NAV_LINKS;

  return (
    <header className="print:hidden sticky top-0 z-40 border-b border-white/30 bg-[#fdfbf7]/78 shadow-[0_8px_40px_-18px_rgba(30,41,59,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#1e293b]/75 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
      <div className="container mx-auto flex max-w-6xl flex-row items-center justify-between gap-4 px-4 py-3.5">
        <Link
          to="/"
          className="font-serif text-foreground max-w-[min(100%,14rem)] text-balance text-sm leading-tight tracking-tight transition-colors hover:text-[#b45309] sm:max-w-none sm:text-base dark:hover:text-[#fcd34d]"
        >
          Corona Del Mar Clubhouse
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-sm font-medium md:gap-x-7 md:text-[0.9375rem]">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-foreground/90 transition-colors hover:text-[#b45309] dark:hover:text-[#fcd34d]"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
