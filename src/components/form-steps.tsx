import { Check } from "lucide-react";
import { Icon } from "@/components/icon";

type FormStepsProps = {
  steps: readonly string[];
  current: number;
};

export function FormSteps({ steps, current }: FormStepsProps) {
  return (
    <ol aria-label="Etapas do formulário" className="flex w-full select-none items-start">
      {steps.map((label, index) => {
        const state = index === current ? "current" : index < current ? "complete" : "upcoming";
        const markerClass =
          state === "current"
            ? "bg-primary-container font-semibold text-on-primary ring-4 ring-primary-fixed"
            : state === "complete"
              ? "bg-primary-container text-on-primary"
              : "border border-border-strong bg-surface-card text-on-surface-variant";
        const labelClass =
          state === "current"
            ? "font-semibold text-primary-container"
            : state === "complete"
              ? "text-on-surface"
              : "text-on-surface-variant";

        return (
          <li
            key={label}
            className="flex min-w-0 flex-1 flex-col items-center gap-sm"
            aria-current={state === "current" ? "step" : undefined}
          >
            <div className="flex w-full items-center">
              <span
                aria-hidden="true"
                className={`h-0.5 flex-1 ${
                  index === 0 ? "bg-transparent" : index <= current ? "bg-primary-container" : "bg-border-strong"
                }`}
              />
              <span
                aria-hidden="true"
                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-body-sm tabular-nums ${markerClass}`}
              >
                {state === "complete" ? <Icon icon={Check} size="sm" /> : index + 1}
              </span>
              <span
                aria-hidden="true"
                className={`h-0.5 flex-1 ${
                  index === steps.length - 1
                    ? "bg-transparent"
                    : index < current
                      ? "bg-primary-container"
                      : "bg-border-strong"
                }`}
              />
            </div>
            <span className="sr-only">
              {state === "complete" ? "Concluída. " : state === "current" ? "Atual. " : "Pendente. "}
            </span>
            <span className={`max-w-full px-xs text-center text-body-sm leading-tight ${labelClass}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
