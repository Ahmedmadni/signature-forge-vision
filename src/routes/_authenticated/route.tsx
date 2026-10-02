import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MobileShell } from "@/components/app/MobileShell";

/**
 * Public app shell. Scanning, signing and device-local signatures work as a
 * guest; authentication is an optional account feature, not a route gate.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => (
    <MobileShell>
      <Outlet />
    </MobileShell>
  ),
});
