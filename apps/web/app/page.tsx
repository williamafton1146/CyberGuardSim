"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Trophy, Waypoints } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ScenarioCard } from "@/components/scenario/ScenarioCard";
import { getToken } from "@/lib/auth";
import { scenarioCatalog } from "@cyber-sim/shared";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setIsAuthed(Boolean(getToken()));
  }, []);

  const showcase = useMemo(
    () =>
      scenarioCatalog.map((scenario) => ({
        slug: scenario.slug,
        title: scenario.title,
        theme: scenario.theme,
        difficulty: scenario.difficulty,
        description:
          scenario.slug === "office"
            ? "Цепочка решений вокруг фишингового письма, подмены ссылки, запроса одноразового кода и фиксации инцидента."
            : scenario.slug === "home"
              ? "Сценарий о повторном использовании паролей, подозрительных уведомлениях и защите домашней цифровой среды."
              : "Миссия про поддельные точки доступа, фальшивые captive portal и безопасную работу в общественной сети.",
        is_playable: scenario.isPlayable,
        step_count: 4
      })),
    []
  );

  const highlights = [
    {
      icon: ShieldCheck,
      title: "Обучение через действие",
      description: "Пользователь проходит знакомые цифровые ситуации как связный сценарий, а не как набор отвлеченных тестовых вопросов."
    },
    {
      icon: Waypoints,
      title: "Понятная фиксация прогресса",
      description: "Каждое решение влияет на Security HP, статистику ошибок, рейтинг и готовность к выпуску сертификата."
    },
    {
      icon: Trophy,
      title: "Единый продуктовый контур",
      description: "Сценарии, кабинет, лидерборд и сертификат работают как одна платформа цифровой устойчивости."
    }
  ];

  return (
    <div className="landing-page">
      <section className="shell shell-wide landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">CyberSim</p>
          <h1 className="landing-title">Платформа обучения цифровой устойчивости для реальных пользовательских сценариев.</h1>
        </div>

        <div className="landing-aside">
          <p className="landing-lead">
            CyberSim моделирует рабочую почту, домашние сервисы и публичные сети так, чтобы пользователь отрабатывал
            безопасные реакции в знакомом цифровом контексте. Ошибка не прячется в сухую отметку, а превращается в
            объяснение последствий и правильный алгоритм действий.
          </p>
          <div className="landing-actions">
            <Link href={isAuthed ? "/simulator" : "/login"} className="primary-button">
              {isAuthed ? "Открыть симулятор" : "Войти"}
              <ArrowRight size={16} />
            </Link>
            <a href="#capabilities" className="secondary-button">
              Возможности платформы
            </a>
          </div>
          <p className="landing-inline-note">
            В платформе доступны сценарии, личный кабинет, лидерборд и сертификат с публичной верификацией.
          </p>
        </div>

        <div className="landing-visual" aria-hidden="true">
          <div className="landing-visual-grid" />
          <div className="landing-visual-orb landing-visual-orb-left" />
          <div className="landing-visual-orb landing-visual-orb-right" />
          <div className="landing-visual-wave" />
          <div className="landing-visual-wave landing-visual-wave-secondary" />
          <div className="landing-visual-caption">
            <span>3 narrative scenarios</span>
            <span>Security HP + feedback</span>
            <span>Leaderboard + certificate</span>
          </div>
        </div>
      </section>

      <section id="capabilities" className="shell shell-wide landing-section landing-scenarios">
        <div className="landing-section-heading">
          <p className="eyebrow">Ключевые возможности</p>
          <h2 className="section-subheading">Платформа показывает не только контент обучения, но и измеримый путь пользователя от первого риска до закреплённого паттерна.</h2>
        </div>

        <div className="landing-capability-grid">
          {highlights.map(({ icon: Icon, title, description }) => (
            <article key={title} className="glass-card landing-capability-card">
              <div className="feature-icon">
                <Icon size={18} />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-[var(--color-text-primary)]">{title}</h3>
              <p className="body-copy mt-3 text-sm">{description}</p>
            </article>
          ))}
        </div>

        <div className="landing-section-heading landing-section-heading-tight">
          <p className="eyebrow">Сценарии</p>
          <h2 className="section-subheading">Каждая миссия выглядит как реальная цифровая ситуация, где решение сразу связано с последствиями и обратной связью.</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {showcase.map((scenario) => (
            <ScenarioCard
              key={scenario.slug}
              scenario={scenario}
              actionHref={scenario.is_playable ? (isAuthed ? "/simulator" : "/login") : undefined}
              actionLabel={scenario.is_playable ? (isAuthed ? "Открыть миссию" : "Войти и начать") : undefined}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
