"use client";

import Link from "next/link";

import type { ScenarioSummary } from "@/types";

type ScenarioCardProps = {
  scenario: ScenarioSummary;
  onStart?: (slug: string) => void;
  actionHref?: string;
  actionLabel?: string;
};

export function ScenarioCard({ scenario, onStart, actionHref, actionLabel }: ScenarioCardProps) {
  const label = actionLabel ?? (scenario.is_playable ? "Начать миссию" : "Скоро откроется");

  return (
    <article className="glass-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-accent)]">{scenario.theme}</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--color-text-primary)]">{scenario.title}</h3>
        </div>
        <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          {scenario.difficulty}
        </span>
      </div>

      <p className="mt-4 min-h-20 text-sm leading-7 text-[var(--color-text-muted)]">{scenario.description}</p>

      <div className="mt-6 flex items-center justify-between text-sm text-[var(--color-text-muted)]">
        <span>{scenario.step_count} шагов</span>
        <span>{scenario.is_playable ? "Доступно сейчас" : "Скоро"}</span>
      </div>

      {actionHref ? (
        <Link href={actionHref} className={`mt-6 flex w-full justify-center ${scenario.is_playable ? "primary-button" : "secondary-button opacity-70"}`}>
          {label}
        </Link>
      ) : (
        <button
          className="primary-button mt-6 w-full disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onStart?.(scenario.slug)}
          disabled={!scenario.is_playable}
        >
          {label}
        </button>
      )}
    </article>
  );
}
