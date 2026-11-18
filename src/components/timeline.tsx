import { Check } from "lucide-react";
import type { RequestStatus } from "@/lib/types";
import { STATUS_LABEL, STATUS_STEPS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Timeline({ current }: { current: RequestStatus }) {
  const currentIndex = STATUS_STEPS.indexOf(current);
  const inSteps = currentIndex >= 0;

  return (
    <div>
      <ol aria-label="Andamento da solicitação" className="space-y-0">
        {STATUS_STEPS.map((step, i) => {
          const done = inSteps && i < currentIndex;
          const isCurrent = inSteps && i === currentIndex;
          const isLast = i === STATUS_STEPS.length - 1;
          return (
            <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-3 top-6 h-full w-0.5",
                    done || isCurrent ? "bg-success" : "bg-border",
                  )}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  done && "bg-success text-white",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-info-bg",
                  !done && !isCurrent && "bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : (
                  <span className="text-[11px] font-semibold">{i + 1}</span>
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-sm",
                    isCurrent
                      ? "font-semibold text-foreground"
                      : done
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {STATUS_LABEL[step]}
                </p>
                {isCurrent && step === "done_pending_confirmation" && (
                  <p className="mt-1 inline-block rounded-md bg-gold-bg px-2 py-0.5 text-xs font-medium text-gold-dark">
                    Aguardando você
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {!inSteps && (
        <p className="mt-4 text-sm text-muted-foreground">
          Status atual:{" "}
          <span className="font-medium text-foreground">
            {STATUS_LABEL[current]}
          </span>
        </p>
      )}
    </div>
  );
}
