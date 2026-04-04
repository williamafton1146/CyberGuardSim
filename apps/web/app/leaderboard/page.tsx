"use client";

import { useEffect, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getLeaderboard } from "@/lib/api";
import type { LeaderboardEntry } from "@/types";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    getLeaderboard().then(setEntries);
  }, []);

  return (
    <RequireAuth>
      <div className="shell space-y-10 py-12">
        <SectionTitle
          eyebrow="Leaderboard"
          title="Рейтинг цифровой устойчивости"
          description="Геймификация усиливает мотивацию: пользователи видят лигу, накопленный рейтинг и количество пройденных миссий."
        />

        <div className="glass-card p-6">
          <div className="grid grid-cols-[80px_1fr_150px_120px] gap-4 border-b border-[var(--color-border)] px-4 pb-4 text-xs uppercase tracking-[0.25em] text-[var(--color-text-muted)] md:grid-cols-[90px_1fr_180px_180px]">
            <p>Место</p>
            <p>Игрок</p>
            <p>Лига</p>
            <p>Рейтинг</p>
          </div>

          <div className="mt-4 space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.rank}
                className="grid grid-cols-[80px_1fr_150px_120px] gap-4 rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-4 text-sm text-[var(--color-text-secondary)] md:grid-cols-[90px_1fr_180px_180px]"
              >
                <p className="font-semibold text-[var(--color-accent)]">#{entry.rank}</p>
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">{entry.display_name}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{entry.completed_sessions} завершенных миссий</p>
                </div>
                <p>{entry.league}</p>
                <p className="font-semibold text-[var(--color-text-primary)]">{entry.security_rating}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
