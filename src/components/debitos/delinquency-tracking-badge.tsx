"use client";

import { Badge } from "@/components/badge";
import {
  delinquencyTrackingStatusLabel,
  type DelinquencyTrackingStatus,
} from "@/lib/inadimplencia/delinquency-tracking";

function variantForStatus(status: DelinquencyTrackingStatus): "secondary" | "error" | "success" {
  switch (status) {
    case "near_term_limit":
      return "secondary";
    case "term_reached":
    case "term_exceeded":
      return "error";
    case "within_term":
      return "success";
    default:
      return "success";
  }
}

type DelinquencyTrackingBadgeProps = {
  status: DelinquencyTrackingStatus;
  className?: string;
};

export function DelinquencyTrackingBadge({ status, className }: DelinquencyTrackingBadgeProps) {
  if (status === "no_arrears") return null;
  return (
    <Badge variant={variantForStatus(status)} className={className}>
      {delinquencyTrackingStatusLabel(status)}
    </Badge>
  );
}
