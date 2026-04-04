"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { StatsOverview } from "@/components/stats/StatsOverview";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getMe, getScenarios, getStats, demoStats } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { ScenarioSummary, UserProfile, UserStats } from "@/types";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>(demoStats);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      return;
    }

    Promise.all([getMe(token), getStats(token), getScenarios()])
      .then(([me, statsPayload, scenariosPayload]) => {
        setProfile(me);
        setStats(statsPayload);
        setScenarios(scenariosPayload);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить кабинет"));
  }, []);

  return (
    <RequireAuth>
      <div className="shell space-y-10 py-12">
        <SectionTitle
          eyebrow="Dashboard"
          title={profile ? `Добро пожаловать, ${profile.display_name}` : "Личный кабинет защитника"}
          description="Здесь собраны текущая лига, сценарный прогресс и последние ошибки, чтобы пользователь видел не только баллы, но и реальные зоны риска."
        />

        {profile ? (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="glass-card p-6">
              <p className="eyebrow">Профиль</p>
              <p className="mt-4 text-3xl font-semibold text-[var(--color-text-primary)]">{profile.display_name}</p>
              <div className="mt-6 grid gap-3 text-sm text-[var(--color-text-muted)]">
                <div className="soft-tile">
                  Лига: <span className="font-semibold text-[var(--color-text-primary)]">{profile.league}</span>
                </div>
                <div className="soft-tile">
                  Security Rating: <span className="font-semibold text-[var(--color-text-primary)]">{profile.security_rating}</span>
                </div>
                <div className="soft-tile">
                  Email: <span className="font-semibold text-[var(--color-text-primary)]">{profile.email}</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <p className="eyebrow">Следующие шаги</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {scenarios.map((scenario) => (
                  <div key={scenario.slug} className="soft-tile">
                    <p className="font-medium text-[var(--color-text-primary)]">{scenario.title}</p>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">{scenario.theme}</p>
                    <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]">
                      {scenario.is_playable ? "Доступно сейчас" : "Заготовка"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link href="/simulator" className="primary-button">
                  Перейти к миссии
                </Link>
                <Link href="/leaderboard" className="secondary-button">
                  Открыть рейтинг
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-[1.2rem] border border-[rgba(255,114,92,0.28)] bg-[var(--color-alert-soft)] px-4 py-3 text-sm text-[var(--color-alert)]">
            {error}
          </p>
        ) : null}

        <StatsOverview stats={stats} />
      </div>
    </RequireAuth>
  );
}
