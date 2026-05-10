import { createFileRoute, Outlet } from "@tanstack/react-router";

import { BlurPageBackdrop } from "@/components/blur-page-backdrop";

export const Route = createFileRoute("/tennis")({
  component: TennisLayout,
});

function TennisLayout() {
  return (
    <BlurPageBackdrop imageSrc="/bg-2.jpg">
      <Outlet />
    </BlurPageBackdrop>
  );
}
