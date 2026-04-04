"use client";

import Link from "next/link";
import { ArrowRight, Award, Shield, ShieldCheck, Trophy, Waypoints } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getScenarios } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { ScenarioSummary } from "@/types";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  const [scenariosError, setScenariosError] = useState<string | null>(null);

  useEffect(() => {
    setIsAuthed(Boolean(getToken()));
    getScenarios()
      .then((payload) => {
        setScenarios(payload);
        setScenariosError(null);
      })
      .catch((loadError) => {
        setScenarios([]);
        setScenariosError(loadError instanceof Error ? loadError.message : "Не удалось загрузить список сценариев");
      })
      .finally(() => setScenariosLoading(false));
  }, []);

  const showcase = useMemo(
    () =>
      scenarios.map((scenario) => ({
        slug: scenario.slug,
        title: scenario.title,
        theme: scenario.theme,
        difficulty: scenario.difficulty,
        hook:
          scenario.slug === "office"
            ? "Почта, мессенджер, подтверждение доступа"
            : scenario.slug === "home"
              ? "Аккаунты, бытовые сервисы, контроль устройств"
              : "Публичный Wi-Fi, фальшивые порталы, открытая сеть",
        description:
          scenario.slug === "office"
            ? "Цепочка решений вокруг фишингового письма, подмены ссылки, запроса одноразового кода и фиксации инцидента."
            : scenario.slug === "home"
              ? "Сценарий о повторном использовании паролей, подозрительных уведомлениях и защите домашней цифровой среды."
              : "Миссия про поддельные точки доступа, фальшивые captive portal и безопасную работу в общественной сети.",
        is_playable: scenario.is_playable,
        step_count: scenario.step_count
      })),
    [scenarios]
  );

  const workflow = [
    {
      icon: ShieldCheck,
      title: "Запуск сценария",
      description: "Пользователь начинает миссию в знакомом цифровом контексте и сразу видит, какие сигналы риска нельзя пропустить."
    },
    {
      icon: Waypoints,
      title: "Решения и последствия",
      description: "Каждый выбор меняет Security HP, открывает пояснения и фиксирует ошибки так, чтобы обучение не распадалось на сухие тесты."
    },
    {
      icon: Trophy,
      title: "Рейтинг и сертификат",
      description: "После завершения сценариев пользователь получает обновлённый рейтинг и может выпустить сертификат с QR-верификацией."
    }
  ];

  const signalCards = [
    { label: "3 сценария", value: "Офис, дом и публичная сеть" },
    { label: "Лидерборд", value: "Общий рейтинг цифровой устойчивости" },
    { label: "Симулятор", value: "Пошаговые решения и последствия" },
    { label: "Сертификат", value: "Публичная верификация по QR" }
  ];

  return (
    <div className="landing-page">
      <section className="shell shell-wide landing-hero">
        <div className="landing-hero-surface">
          <div className="landing-hero-bar">
            <p className="landing-hero-bar-title">Цифровая платформа</p>
            <div className="landing-hero-bar-actions">
              <Link href="/for-users" className="landing-hero-bar-button">
                Навигатор
              </Link>
              <span className="landing-hero-bar-orb" aria-hidden="true">
                <Shield size={16} />
              </span>
              <Link href={isAuthed ? "/simulator" : "/login"} className="landing-hero-bar-button landing-hero-bar-button-strong">
                {isAuthed ? "Симулятор" : "Войти"}
              </Link>
            </div>
          </div>

          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <div className="landing-hero-topline">
                <span className="landing-hero-pill">Cybersecurity simulator</span>
                <span className="landing-hero-note">Финтех-эстетика, сценарии и проверяемый прогресс</span>
              </div>
              <h1 className="landing-title">KiberSim</h1>
              <p className="landing-tagline">Минималистичная платформа для тренировки цифровой устойчивости в бытовых и рабочих сценариях.</p>
              <p className="landing-lead">
                Пользователь проходит кибер-инциденты как понятный маршрут: принимает решения, видит последствия, повышает рейтинг и закрепляет безопасный паттерн.
              </p>
              <div className="landing-actions landing-actions-hero">
                <Link href={isAuthed ? "/simulator" : "/login"} className="landing-hero-chip-button">
                  {isAuthed ? "Открыть миссии" : "Начать"}
                  <ArrowRight size={16} />
                </Link>
                <a href="#scenarios" className="landing-hero-chip-button">
                  Сценарии
                </a>
                <Link href="/for-users" className="landing-hero-chip-button">
                  Гайды
                </Link>
              </div>
            </div>

            <div className="landing-hero-stage">
              <div className="landing-stage-frame landing-stage-frame-device">
                <div className="landing-device-grid" aria-hidden="true" />
                <div className="landing-device-monitor">
                  <div className="landing-device-screen">
                    <div className="landing-device-screen-top">
                      <span className="landing-device-dot" />
                      <span className="landing-device-dot" />
                      <span className="landing-device-dot" />
                    </div>
                    <div className="landing-device-screen-body">
                      <div className="landing-device-panel">
                        <span className="landing-device-panel-kicker">Realtime check</span>
                        <strong>Threat score 96%</strong>
                        <span>Подозрительный запрос на код подтверждения</span>
                      </div>
                      <div className="landing-device-shield-cluster">
                        <div className="landing-device-shield-ring">
                          <div className="landing-device-shield-core">
                            <ShieldCheck size={50} />
                          </div>
                        </div>
                      </div>
                      <div className="landing-device-sidecards">
                        <div className="landing-device-sidecard">
                          <span className="landing-device-sidecard-label">Firewall</span>
                          <span className="landing-device-sidecard-value">Secure</span>
                        </div>
                        <div className="landing-device-sidecard">
                          <span className="landing-device-sidecard-label">Session</span>
                          <span className="landing-device-sidecard-value">Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="landing-device-stand" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell shell-wide landing-rail">
        {signalCards.map((item) => (
          <article key={item.label} className="landing-rail-card">
            <span className="landing-rail-label">{item.label}</span>
            <strong className="landing-rail-value">{item.value}</strong>
          </article>
        ))}
      </section>

      <section id="scenarios" className="shell shell-wide landing-section">
        <div className="landing-section-heading">
          <p className="eyebrow">Сценарии</p>
          <h2 className="section-subheading">Три ветки, в которых угрозы выглядят как привычные рабочие и бытовые эпизоды.</h2>
          <p className="body-copy landing-section-copy">
            Вместо абстрактных вопросов платформа проводит пользователя через связные инциденты. В каждой ветке есть понятный контекст,
            момент риска и последствия неверных решений.
          </p>
        </div>

        <div className="landing-scenario-grid">
          {scenariosError ? (
            <article className="landing-scenario-card">
              <h3 className="landing-scenario-title">Сценарии временно недоступны</h3>
              <p className="landing-scenario-description">
                Не удалось получить список миссий с сервера. Это состояние больше не маскируется пустым экраном: проверьте доступность API и повторите запрос.
              </p>
            </article>
          ) : null}
          {scenariosLoading ? (
            <article className="landing-scenario-card">
              <h3 className="landing-scenario-title">Загружаем сценарии</h3>
              <p className="landing-scenario-description">
                Получаем актуальные игровые ветки и их статус публикации, чтобы показать только реальные доступные миссии.
              </p>
            </article>
          ) : null}
          {showcase.map((scenario) => (
            <article key={scenario.slug} className="landing-scenario-card">
              <div className="landing-scenario-head">
                <span className="landing-scenario-theme">{scenario.theme}</span>
                <span className="landing-scenario-difficulty">{scenario.difficulty}</span>
              </div>
              <h3 className="landing-scenario-title">{scenario.title}</h3>
              <p className="landing-scenario-hook">{scenario.hook}</p>
              <p className="landing-scenario-description">{scenario.description}</p>
              <div className="landing-scenario-meta">
                <span>{scenario.step_count} шага</span>
                <span>{scenario.is_playable ? "Доступно сейчас" : "Скоро"}</span>
              </div>
              <Link href={scenario.is_playable ? (isAuthed ? "/simulator" : "/login") : "/login"} className="secondary-button landing-scenario-action">
                {scenario.is_playable ? (isAuthed ? "Открыть миссию" : "Войти и начать") : "Смотреть подробнее"}
              </Link>
            </article>
          ))}
          {!scenariosLoading && !scenariosError && !showcase.length ? (
            <article className="landing-scenario-card">
              <h3 className="landing-scenario-title">Пока нет опубликованных сценариев</h3>
              <p className="landing-scenario-description">
                Как только администратор опубликует новую ветку обучения, она появится здесь вместе с её статусом и структурой прохождения.
              </p>
            </article>
          ) : null}
        </div>
      </section>

      <section id="capabilities" className="shell shell-wide landing-section landing-flow">
        <div className="landing-section-heading">
          <p className="eyebrow">Как работает платформа</p>
          <h2 className="section-subheading">Один маршрут от первого рискованного действия до рейтинга и верифицируемого результата.</h2>
        </div>

        <div className="landing-flow-grid">
          <div className="landing-flow-list">
            {workflow.map(({ icon: Icon, title, description }) => (
              <article key={title} className="landing-flow-step">
                <div className="feature-icon">
                  <Icon size={18} />
                </div>
                <div>
                  <h3 className="landing-flow-step-title">{title}</h3>
                  <p className="body-copy landing-flow-step-copy">{description}</p>
                </div>
              </article>
            ))}
          </div>
          <article className="landing-highlight-card">
            <div className="feature-icon">
              <Award size={18} />
            </div>
            <p className="landing-highlight-kicker">Итог обучения</p>
            <h3 className="landing-highlight-title">Сертификат с QR-верификацией</h3>
            <p className="body-copy landing-highlight-copy">
              После завершения всех доступных сценариев пользователь получает сертификат, который можно открыть по прямой ссылке
              и проверить через публичную страницу верификации.
            </p>
            <div className="landing-highlight-points">
              <span>Личный кабинет</span>
              <span>Публичная проверка</span>
              <span>QR на verify-route</span>
            </div>
          </article>
        </div>
      </section>

      <section className="shell shell-wide landing-section">
        <div className="landing-section-heading">
          <p className="eyebrow">Для пользователей</p>
          <h2 className="section-subheading">Памятки и карточки действий для тех, кто хочет быстро проверить бытовые правила безопасности.</h2>
          <p className="body-copy landing-section-copy">
            В разделе собраны короткие бытовые рекомендации: коды подтверждения, фишинг, публичный Wi‑Fi, подозрительные приложения и QR-коды с объяснением последствий ошибки.
          </p>
        </div>

        <div className="mt-8">
          <Link href="/for-users" className="primary-button">
            Открыть раздел для пользователей
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
