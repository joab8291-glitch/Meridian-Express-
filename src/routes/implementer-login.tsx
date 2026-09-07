import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/implementer-login")({
  beforeLoad: () => { throw redirect({ to: "/agent-login" }); },
});