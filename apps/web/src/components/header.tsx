import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const PUBLIC_NAV_LINKS = [
  { to: "/", label: "Tennis schedule" },
  { to: "/pickleball", label: "Pickleball schedule" },
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
    <div className="print:hidden">
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} to={to}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
