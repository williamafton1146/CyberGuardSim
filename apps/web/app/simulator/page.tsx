"use client";

import Link from "next/link";
import { ArrowRight, Mail, Shield, Smartphone, Wifi } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { ScenarioCard } from "@/components/scenario/ScenarioCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getScenarios, getStats } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { ScenarioSummary, UserStats } from "@/types";

export const dynamic = "force-dynamic";

const missionVisuals: Record<
  string,
  {
    icon: typeof Mail;
    route: string;
    environment: string;
    description: string;
  }
> = {
  office: {
    icon: Mail,
    route: "/simulator/office",
    environment: "Почтовый клиент и рабочие уведомления",
    description: "Откройте входящие, разберите письмо, проверьте подозрительную ссылку и не дайте социальной инженерии обойти защиту."
  },
  home: {
    icon: Smartphone,
    route: "/simulator/home",
    environment: "Домашний кабинет устройств и магазин приложений",
    description: "Проверьте входы, разорвите цепочку повторного использования пароля и не дайте фальшивой защите захватить устройство."
  },
  "public-wifi": {
    icon: Wifi,
    route: "/simulator/public-wifi",
    environment: "Сети, captive portal и публичные платежные экраны",
    description: "Разберите ловушки общественного Wi‑Fi: фальшивые точки доступа, поддельные порталы и опасные QR‑сценарии."
  }
};

export default function SimulatorHubPage() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      return;
    }

    Promise.allSettled([getScenarios(), getStats(token)])
      .then(([scenarioPayload, statsPayload]) => {
        if (scenarioPayload.status === "fulfilled") {
          setScenarios(scenarioPayload.value);
        } else {
          setScenarios([]);
          throw scenarioPayload.reason;
        }

        if (statsPayload.status === "fulfilled") {
          setStats(statsPayload.value);
        } else {
          setStats(null);
        }

        setError(null);
      })
      .catch((loadError) => {
        setScenarios([]);
        setStats(null);
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить каталог миссий");
      })
      .finally(() => setLoading(false));
  }, []);

  const progressBySlug = useMemo(
    () =>
      new Map(
        (stats?.scenario_progress ?? []).map((progress) => [
          progress.slug,
          progress
        ]),
      ),
    [stats]
  );

  const enrichedScenarios = useMemo(
    () =>
      scenarios.map((scenario) => {
        const progress = progressBySlug.get(scenario.slug);
        const bestScore = progress?.best_score ?? 0;
        const hasProgress = Boolean(progress) && (bestScore > 0 || progress?.status !== "not_started");
        const perfectRun = Boolean(progress) && progress?.status === "completed" && bestScore >= scenario.max_score;

        return {
          ...scenario,
          progress,
          bestScore,
          hasProgress,
          perfectRun,
          visual: missionVisuals[scenario.slug]
        };
      }),
    [progressBySlug, scenarios]
  );

  return (
    <RequireAuth>
      <div className="shell shell-wide space-y-10 py-12">
        <SectionTitle
          eyebrow="Симулятор"
          title="Каталог интерактивных сред"
          description="Каждая миссия запускается в знакомом цифровом интерфейсе: почта, домашняя панель устройств или public Wi‑Fi. Откройте среду и разберите атаку в привычном контексте."
        />

        {error ? (
          <p className="rounded-[1.2rem] border border-[rgba(255,114,92,0.28)] bg-[var(--color-alert-soft)] px-4 py-3 text-sm text-[var(--color-alert)]">
            {error}
          </p>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="glass-card p-6 md:p-7">
            <p className="eyebrow">Среды</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-text-primary)]">Выберите миссию и откройте нужную среду</h2>
            <p className="body-copy mt-4 max-w-3xl">
              Внутри каждой ветки пользователь видит бытовой интерфейс и один считываемый активный объект на шаг. Остальные элементы формируют привычный контекст, но не превращают прохождение в слепой квест.
            </p>

            <div className="mt-8 grid gap-5 xl:grid-cols-3">
              {loading ? (
                <div className="soft-tile xl:col-span-3 text-sm text-[var(--color-text-muted)]">
                  Загружаем миссии, их статус публикации и маршруты запуска.
                </div>
              ) : enrichedScenarios.length ? (
                enrichedScenarios.map((scenario) => (
                  <div key={scenario.slug} className="space-y-4">
                    <div className="soft-tile flex items-start gap-3">
                      <div className="feature-icon shrink-0">
                        <scenario.visual.icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]">{scenario.visual.environment}</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">{scenario.visual.description}</p>
                      </div>
                    </div>
                    <ScenarioCard
                      scenario={scenario}
                      actionHref={scenario.perfectRun ? undefined : scenario.visual.route}
                      actionLabel={
                        !scenario.is_playable
                          ? "Скоро откроется"
                          : scenario.perfectRun
                            ? "Пройдено"
                            : scenario.hasProgress
                              ? "Перепройти"
                              : "Пройти"
                      }
                      actionDisabled={!scenario.is_playable || scenario.perfectRun}
                      statusText={
                        scenario.perfectRun
                          ? "Максимальный результат"
                          : scenario.hasProgress
                            ? "Есть сохранённый прогресс"
                            : scenario.is_playable
                              ? "Готово к запуску"
                              : "Скоро"
                      }
                      progressNote={
                        scenario.hasProgress || scenario.perfectRun
                          ? `Лучший результат: ${scenario.bestScore} из ${scenario.max_score} очков`
                          : `Максимум за миссию: ${scenario.max_score} очков`
                      }
                    />
                  </div>
                ))
              ) : (
                <div className="soft-tile xl:col-span-3 text-sm text-[var(--color-text-muted)]">
                  Сейчас нет доступных миссий. Когда администратор опубликует новую ветку, она появится в этом каталоге.
                </div>
              )}
            </div>
          </section>

          <aside className="glass-card p-6 md:p-7">
            <p className="eyebrow">Как это устроено</p>
            <div className="mt-6 space-y-4">
              <div className="soft-tile">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">1. Вход в привычную среду</p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">
                  Миссия открывается как знакомый интерфейс: почта, домашняя панель безопасности или страница подключения к сети.
                </p>
              </div>
              <div className="soft-tile">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">2. Один значимый интерактивный объект</p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">
                  Нужный объект выделяется естественно: новым письмом, служебным сообщением, подозрительной сетью или recovery-действием.
                </p>
              </div>
              <div className="soft-tile">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">3. Разбор последствий без потери контекста</p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">
                  После выбора решение, ошибки и финальный результат показываются прямо внутри среды, чтобы безопасный паттерн запоминался через действие.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/for-users" className="primary-button">
                Открыть материалы
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="soft-tile mt-6">
              <div className="flex items-start gap-3">
                <div className="feature-icon shrink-0">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Безопасная симуляция</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">
                    Все среды и переходы работают только как локальные учебные макеты. Приложение не открывает реальные опасные ссылки и не использует настоящие внешние сервисы.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </RequireAuth>
  );
}
