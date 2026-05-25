/**
 * Detect which "side" of the dual-domain deployment a request is coming from.
 * Used by API routes that serve both audiences but need to filter the
 * response (e.g. redact closer-private fields for the freelancer).
 */

import { headers } from "next/headers";

export type ReportContext = "closer" | "freelancer";

export async function detectContext(): Promise<ReportContext> {
  const h = await headers();
  const host = h.get("host") || "";
  const domain = process.env.FREELANCER_DOMAIN;
  if (!domain) return "closer";

  const cleanHost = host.split(":")[0].toLowerCase();
  const cleanDomain = domain.split(":")[0].toLowerCase();
  const onFreelancer =
    cleanHost === cleanDomain || cleanHost.endsWith("." + cleanDomain);
  return onFreelancer ? "freelancer" : "closer";
}
