import { Toaster } from "@cdm-pickleball/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "@/components/header";
import SiteFooter from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import type { trpc } from "@/utils/trpc";

import "../index.css";

export interface RouterAppContext {
  trpc: typeof trpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "Corona Del Mar Clubhouse · Tennis & pickleball",
      },
      {
        name: "description",
        content:
          "Corona Del Mar Clubhouse community courts—tennis and pickleball schedules together in Manila time.",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange storageKey="vite-ui-theme">
        <div className="flex min-h-svh flex-col print:h-auto print:min-h-0">
          <Header />
          <div className="tropical-page-gradient flex min-h-0 min-w-0 w-full flex-1 flex-col print:bg-white">
            <Outlet />
          </div>
          <SiteFooter />
        </div>
        <div className="print:hidden">
          <Toaster richColors />
        </div>
      </ThemeProvider>
      <div className="print:hidden">
        <TanStackRouterDevtools position="bottom-left" />
        <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
      </div>
    </>
  );
}
