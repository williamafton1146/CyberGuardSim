"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, ShieldCheck, Sparkles, Trophy, Waypoints } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getScenarios } from "@/lib/api";
import { getStoredUser, getToken } from "@/lib/auth";
import type { ScenarioSummary, UserProfile } from "@/types";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [storedUser, setStoredUser] = useState<UserProfile | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  const [scenariosError, setScenariosError] = useState<string | null>(null);

  useEffect(() => {
    setIsAuthed(Boolean(getToken()));
    setStoredUser(getStoredUser<UserProfile>());
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
    { label: "Рейтинг", value: "Лучший результат по каждому кейсу" },
    { label: "Симулятор", value: "Пошаговые решения и разбор ошибок" },
    { label: "Сертификат", value: "Публичная верификация по QR" }
  ];

  const heroHref = isAuthed ? (storedUser?.role === "admin" ? "/admin" : "/simulator") : "/login";
  const heroActionLabel = isAuthed
    ? storedUser?.role === "admin"
      ? "Открыть админку"
      : "Открыть симулятор"
    : "Войти и начать";

  return (
    <div className="landing-page">
      <section className="shell shell-wide landing-hero">
        <div className="landing-hero-surface">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="eyebrow">Цифровая устойчивость без перегруза</p>
              <h1 className="landing-title landing-title-balanced">
                CyberGuard<wbr />Sim
              </h1>
              <p className="landing-tagline">Интерактивная платформа, которая учит замечать атаку до того, как ошибка превращается в реальный инцидент.</p>
              <p className="landing-lead">
                Пользователь проходит знакомые рабочие и бытовые ситуации как понятный маршрут: видит контекст, выбирает действие, получает объяснение последствий и закрепляет безопасный паттерн.
              </p>
              <div className="landing-actions landing-actions-hero">
                <Link href={heroHref} className="primary-button">
                  {heroActionLabel}
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="landing-hero-notes">
                <div className="landing-note-card">
                  <Sparkles size={16} />
                  <span>Живой симулятор вместо сухого теста</span>
                </div>
                <div className="landing-note-card">
                  <ShieldCheck size={16} />
                  <span>Разбор причин ошибки и безопасного действия</span>
                </div>
              </div>
            </div>

            <div className="landing-hero-stage">
              <div className="landing-hero-asset-shell">
                <div className="landing-hero-asset-copy">
                  <span className="landing-hero-asset-kicker">Интерфейс тренировки</span>
                  <strong>Письма, сообщения, QR и public Wi-Fi в одном маршруте.</strong>
                  <span>Пользователь видит риск, а не угадывает правильный ответ в отрыве от контекста.</span>
                </div>
                <div className="landing-hero-asset-frame">
                  <div className="landing-hero-asset-stack">
                    <Image
                      src="/hero-cyber-event.svg"
                      alt="Интерфейс CyberGuardSim с устройством, сценарными карточками и защитными действиями"
                      width={1600}
                      height={1200}
                      priority
                      className="landing-hero-asset-image landing-hero-asset-image-dark"
                    />
                    <Image
                      src="/hero-cyber-event-light.svg"
                      alt="Интерфейс CyberGuardSim с устройством, сценарными карточками и защитными действиями"
                      width={1600}
                      height={1200}
                      priority
                      className="landing-hero-asset-image landing-hero-asset-image-light"
                    />
                  </div>
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
