"use client";

import { useEffect, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getLeaderboard } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { LeaderboardEntry } from "@/types";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      return;
    }

    getLeaderboard(token)
      .then((payload) => {
        setEntries(payload);
        setError(null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить рейтинг");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <RequireAuth>
      <div className="shell space-y-10 py-12">
        <SectionTitle
          eyebrow="Рейтинг"
          title="Рейтинг цифровой устойчивости"
          description="Рейтинг отражает накопленный рейтинг безопасности, текущую лигу и количество завершённых сценариев у каждого участника."
        />

        <div className="glass-card leaderboard-card p-6">
          <div className="leaderboard-scroll-region">
            {error ? (
              <div className="soft-tile admin-empty-state border-[rgba(255,114,92,0.28)] bg-[var(--color-alert-soft)] text-[var(--color-alert)]">
                {error}
              </div>
            ) : loading ? (
              <div className="soft-tile admin-empty-state">Загружаем актуальный рейтинг и показатели участников.</div>
            ) : entries.length ? (
              <>
                <div className="leaderboard-mobile-list">
                  {entries.map((entry) => (
                    <article key={`mobile-${entry.rank}`} className="soft-tile leaderboard-mobile-entry">
                      <div className="leaderboard-mobile-head">
                        <span className="leaderboard-mobile-rank">#{entry.rank}</span>
                        <span className="leaderboard-mobile-rating">{entry.security_rating}</span>
                      </div>
                      <p className="leaderboard-mobile-name">{entry.display_name}</p>
                      <div className="leaderboard-mobile-meta">
                        <span>{entry.league}</span>
                        <span>{entry.completed_sessions} миссий</span>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="leaderboard-table-shell">
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th>Место</th>
                        <th>Игрок</th>
                        <th>Лига</th>
                        <th>Рейтинг</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.rank} className="leaderboard-row">
                          <td className="leaderboard-rank">#{entry.rank}</td>
                          <td>
                            <div className="leaderboard-player">
                              <p className="leaderboard-player-name">{entry.display_name}</p>
                              <p className="leaderboard-player-meta">{entry.completed_sessions} завершенных миссий</p>
                            </div>
                          </td>
                          <td>{entry.league}</td>
                          <td className="leaderboard-rating">{entry.security_rating}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="soft-tile admin-empty-state">Рейтинг пока пуст. Он заполнится после первых завершенных миссий.</div>
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
