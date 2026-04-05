"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import type { ScenarioSummary } from "@/types";

type ScenarioCardProps = {
  scenario: ScenarioSummary;
  onStart?: (slug: string) => void;
  actionHref?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  statusText?: string;
  progressNote?: string;
  visualIcon?: LucideIcon;
  visualTitle?: string;
  visualDescription?: string;
};

export function ScenarioCard({
  scenario,
  onStart,
  actionHref,
  actionLabel,
  actionDisabled,
  statusText,
  progressNote,
  visualIcon: VisualIcon,
  visualTitle,
  visualDescription
}: ScenarioCardProps) {
  const label = actionLabel ?? (scenario.is_playable ? "Начать миссию" : "Скоро откроется");
  const disabled = actionDisabled ?? !scenario.is_playable;

  return (
    <article className="glass-card h-full p-6">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-accent)]">{scenario.theme}</p>
            <h3 className="mt-3 text-2xl font-semibold leading-tight text-[var(--color-text-primary)]">{scenario.title}</h3>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {scenario.difficulty}
          </span>
        </div>

        <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">{scenario.description}</p>

        {visualTitle || visualDescription ? (
          <div className="mt-5 rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-4">
            <div className="flex items-start gap-3">
              {VisualIcon ? (
                <div className="feature-icon shrink-0">
                  <VisualIcon size={18} />
                </div>
              ) : null}
              <div className="min-w-0">
                {visualTitle ? <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-accent)]">{visualTitle}</p> : null}
                {visualDescription ? <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">{visualDescription}</p> : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between gap-3 text-sm text-[var(--color-text-muted)]">
            <span>{scenario.step_count} шагов</span>
            <span className="text-right">{statusText ?? (scenario.is_playable ? "Доступно сейчас" : "Скоро")}</span>
          </div>

          {progressNote ? <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">{progressNote}</p> : null}

          {actionHref && !disabled ? (
            <Link href={actionHref} className="primary-button mt-6 flex w-full justify-center">
              {label}
            </Link>
          ) : (
            <button
              className="secondary-button mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => onStart?.(scenario.slug)}
              disabled={disabled}
            >
              {label}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
