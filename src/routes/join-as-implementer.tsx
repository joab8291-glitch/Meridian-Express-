import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/join-as-implementer")({
  beforeLoad: () => { throw redirect({ to: "/join-our-team" }); },
});