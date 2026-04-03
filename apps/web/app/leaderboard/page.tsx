"use client";

import { useEffect, useState } from "react";

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
    <div className="shell space-y-10 py-14">
      <SectionTitle
        eyebrow="Leaderboard"
        title="Рейтинг цифровой устойчивости"
        description="Геймификация усиливает мотивацию: пользователи видят лигу, накопленный рейтинг и количество пройденных миссий."
      />

      <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-ambient">
        <div className="grid grid-cols-[90px_1fr_180px_180px] gap-4 border-b border-white/10 px-4 pb-4 text-xs uppercase tracking-[0.25em] text-skyglass/55">
          <p>Место</p>
          <p>Игрок</p>
          <p>Лига</p>
          <p>Рейтинг</p>
        </div>

        <div className="mt-4 space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.rank}
              className="grid grid-cols-[90px_1fr_180px_180px] gap-4 rounded-2xl border border-white/10 bg-ink/40 px-4 py-4 text-sm text-skyglass/85"
            >
              <p className="font-semibold text-safe">#{entry.rank}</p>
              <div>
                <p className="font-medium text-white">{entry.display_name}</p>
                <p className="mt-1 text-xs text-skyglass/60">{entry.completed_sessions} завершенных миссий</p>
              </div>
              <p>{entry.league}</p>
              <p className="font-semibold text-white">{entry.security_rating}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
