import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/pickleball")({
  component: PickleballLayout,
});

function PickleballLayout() {
  return <Outlet />;
}
