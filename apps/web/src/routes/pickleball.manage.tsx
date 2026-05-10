import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy URL: management now lives under `/reservations/manage` with both grids. */
export const Route = createFileRoute("/pickleball/manage")({
  beforeLoad: () => {
    redirect({
      to: "/reservations/manage",
      hash: "pickleball-manage-section",
      throw: true,
      replace: true,
    });
  },
  component: () => null,
});
