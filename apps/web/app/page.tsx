"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, ShieldCheck, Trophy, Waypoints } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getScenarios } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { ScenarioSummary } from "@/types";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);

  useEffect(() => {
    setIsAuthed(Boolean(getToken()));
    getScenarios().then(setScenarios);
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
        <div className="landing-hero-copy">
          <div className="landing-hero-topline">
            <span className="landing-hero-pill">CyberSim Platform</span>
            <span className="landing-hero-note">Интерактивная подготовка к цифровым инцидентам</span>
          </div>
          <h1 className="landing-title">CyberSim</h1>
          <p className="landing-tagline">Тренировка цифровой устойчивости через реалистичные сценарии, рейтинг и подтверждаемый результат.</p>
          <p className="landing-lead">
            Платформа показывает, как пользователь действует внутри настоящих бытовых и рабочих атак: от фишинговых писем и кодов
            подтверждения до небезопасных общественных сетей. Всё обучение собирается в единый маршрут с кабинетом, лидербордом и сертификатом.
          </p>
          <div className="landing-actions">
            <Link href={isAuthed ? "/simulator" : "/login"} className="primary-button">
              {isAuthed ? "Открыть симулятор" : "Войти"}
              <ArrowRight size={16} />
            </Link>
            <a href="#scenarios" className="secondary-button">
              Посмотреть сценарии
            </a>
            <Link href="/for-users" className="secondary-button">
              Для пользователей
            </Link>
          </div>
        </div>

        <div className="landing-hero-stage">
          <div className="landing-stage-frame">
            <Image
              src="/hero-cyber-event.svg"
              alt="Иллюстрация с цифровой сценой, защитными панелями и интерфейсом киберсимулятора"
              fill
              priority
              sizes="(max-width: 1080px) 100vw, 52vw"
              className="landing-stage-image"
            />
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
          {!showcase.length ? (
            <article className="landing-scenario-card">
              <h3 className="landing-scenario-title">Сценарии загружаются</h3>
              <p className="landing-scenario-description">
                Как только backend ответит, здесь появятся актуальные игровые ветки и их текущий статус публикации.
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
          <h2 className="section-subheading">Понятные бытовые рекомендации без длинных инструкций и сухих памяток.</h2>
          <p className="body-copy landing-section-copy">
            Внутри раздела собраны короткие карточки о кодах подтверждения, фишинге, публичном Wi‑Fi, подозрительных приложениях и QR-кодах с объяснением последствий ошибки.
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
