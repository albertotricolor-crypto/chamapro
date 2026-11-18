import type { RequestStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<RequestStatus, string> = {
  sent: "border-transparent bg-info-bg text-info",
  quoted: "border-transparent bg-gold-bg text-gold-dark",
  accepted: "border-transparent bg-info-bg text-primary",
  paid: "border-transparent bg-success-bg text-success",
  in_progress: "border-transparent bg-info-bg text-primary",
  done_pending_confirmation: "border-transparent bg-gold-bg text-gold-dark",
  completed: "border-transparent bg-success-bg text-success",
  cancelled: "border-transparent bg-muted text-muted-foreground",
  disputed: "border-transparent bg-danger-bg text-destructive",
  refunded: "border-transparent bg-warning-bg text-warning",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge
      className={cn(
        "h-6 rounded-full px-2 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
      aria-label={`Status: ${STATUS_LABEL[status]}`}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}
