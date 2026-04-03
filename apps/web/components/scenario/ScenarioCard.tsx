"use client";

import type { ScenarioSummary } from "@/types";

type ScenarioCardProps = {
  scenario: ScenarioSummary;
  onStart?: (slug: string) => void;
};

export function ScenarioCard({ scenario, onStart }: ScenarioCardProps) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-ambient backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-safe">{scenario.theme}</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{scenario.title}</h3>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-skyglass/75">
          {scenario.difficulty}
        </span>
      </div>

      <p className="mt-4 min-h-20 text-sm leading-7 text-skyglass/80">{scenario.description}</p>

      <div className="mt-6 flex items-center justify-between text-sm text-skyglass/65">
        <span>{scenario.step_count} шагов</span>
        <span>{scenario.is_playable ? "Играбельно" : "Coming soon"}</span>
      </div>

      <button
        className="mt-6 w-full rounded-2xl border border-safe/40 bg-safe/15 px-4 py-3 text-sm font-semibold text-safe transition hover:bg-safe/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-skyglass/40"
        onClick={() => onStart?.(scenario.slug)}
        disabled={!scenario.is_playable}
      >
        {scenario.is_playable ? "Начать миссию" : "Скоро откроется"}
      </button>
    </article>
  );
}
