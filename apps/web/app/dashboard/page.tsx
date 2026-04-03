"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
      setError("Для просмотра кабинета нужен вход. Откройте страницу авторизации.");
      getScenarios().then(setScenarios);
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
    <div className="shell space-y-10 py-14">
      <SectionTitle
        eyebrow="Dashboard"
        title={profile ? `Добро пожаловать, ${profile.display_name}` : "Личный кабинет защитника"}
        description="Здесь собраны текущая лига, сценарный прогресс и последние ошибки, чтобы пользователь видел не только баллы, но и реальные зоны риска."
      />

      {profile ? (
        <div className="grid gap-6 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-ambient lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[28px] border border-white/10 bg-ink/40 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-safe">Профиль</p>
            <p className="mt-4 text-3xl font-semibold text-white">{profile.display_name}</p>
            <div className="mt-6 grid gap-3 text-sm text-skyglass/75">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Лига: <span className="text-white">{profile.league}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Security Rating: <span className="text-white">{profile.security_rating}</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Email: <span className="text-white">{profile.email}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-ink/40 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-safe">Следующие шаги</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {scenarios.map((scenario) => (
                <div key={scenario.slug} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-medium text-white">{scenario.title}</p>
                  <p className="mt-2 text-sm text-skyglass/70">{scenario.theme}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.2em] text-safe">
                    {scenario.is_playable ? "Доступно сейчас" : "Заготовка"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-4">
              <Link href="/simulator" className="rounded-2xl bg-safe px-5 py-3 text-sm font-semibold text-ink">
                Перейти к миссии
              </Link>
              <Link href="/leaderboard" className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white">
                Открыть рейтинг
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="rounded-2xl border border-alert/30 bg-alert/10 px-4 py-3 text-sm text-alert">{error}</p> : null}

      <StatsOverview stats={stats} />
    </div>
  );
}
