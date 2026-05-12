/**
 * UTM-tracked URL builder for the ZeroEntropy dashboard CTA. Adrian (Head of
 * Growth) uses these to attribute signups to notslop.
 */

import { VERSION } from "./version.js";

export type TouchPoint =
  | "readme"
  | "init-wizard"
  | "output-footer"
  | "debug-output"
  | "comparison-demo"
  | "error-message"
  | "missing-key";

const DASHBOARD_BASE = "https://dashboard.zeroentropy.dev";

export function zeDashboardUrl(touchPoint: TouchPoint): string {
  const params = new URLSearchParams({
    utm_source: "notslop-cli",
    utm_medium: touchPoint,
    utm_campaign: `v${VERSION}`,
  });
  return `${DASHBOARD_BASE}?${params.toString()}`;
}

export const BRIGHTDATA_SIGNUP_URL = "https://brightdata.com/products/datasets/twitter";
