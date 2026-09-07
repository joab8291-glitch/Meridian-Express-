import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { setReferralCode } from "@/lib/referral";

export const Route = createFileRoute("/ref/$code")({
  component: RefCapture,
});

function RefCapture() {
  const { code } = Route.useParams();
  useEffect(() => { setReferralCode(code); }, [code]);
  return <Navigate to="/" />;
}