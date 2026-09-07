import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/implementer")({
  beforeLoad: () => { throw redirect({ to: "/agent" }); },
});