"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Eye, Radar, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ScenarioCard } from "@/components/scenario/ScenarioCard";
import { getToken } from "@/lib/auth";
import { scenarioCatalog } from "@cyber-sim/shared";

export const dynamic = "force-dynamic";

const heroSlides = [
  {
    eyebrow: "Фишинговая сцена",
    title: "Письмо выглядит правдоподобно, но домен выдает атаку.",
    body: "Пользователь проходит через письмо, ссылку, чат и финальное безопасное действие, а интерфейс мгновенно показывает последствия выбора."
  },
  {
    eyebrow: "Security HP",
    title: "Ошибки стоят дорого, но обучение остается понятным и игровым.",
    body: "Вместо сухого теста человек видит динамику риска, объяснение и понятный паттерн поведения на каждом шаге."
  },
  {
    eyebrow: "Личный прогресс",
    title: "Рейтинг, лига и история ошибок превращают знание в мотивацию.",
    body: "Платформа фиксирует прогресс и помогает возвращаться к реальным уязвимым привычкам, а не к теории в вакууме."
  }
];

const valueCards = [
  {
    icon: ShieldCheck,
    title: "Обучение через сценарии",
    description: "Вместо сухих инструкций платформа прогоняет пользователя через последовательность угроз и защитных решений."
  },
  {
    icon: Radar,
    title: "Мгновенная обратная связь",
    description: "Каждая ошибка показывает не только правильный ответ, но и конкретное последствие для цифровой устойчивости."
  },
  {
    icon: Trophy,
    title: "Мотивация и прогресс",
    description: "Лиги, рейтинг и личная статистика удерживают интерес и дают понятную картину роста навыков."
  }
];

const processCards = [
  {
    step: "01",
    title: "Войти и выбрать ветку",
    text: "Пользователь попадает в сценарий, который визуально напоминает настоящий цифровой инцидент."
  },
  {
    step: "02",
    title: "Принять решение",
    text: "Система предлагает несколько вариантов действий и сразу фиксирует влияние на Security HP и итоговый score."
  },
  {
    step: "03",
    title: "Закрепить паттерн",
    text: "После завершения миссии остаются статистика, рейтинг и список ошибок, к которым можно вернуться."
  }
];

export default function HomePage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    const token = getToken();

    if (token) {
      router.replace("/simulator");
      return;
    }

    setCheckedAuth(true);
  }, [router]);

  const showcase = useMemo(
    () =>
      scenarioCatalog.map((scenario) => ({
        slug: scenario.slug,
        title: scenario.title,
        theme: scenario.theme,
        difficulty: scenario.difficulty,
        description: scenario.isPlayable
          ? "Играбельная ветка с письмом от поддельной ИТ-поддержки, spoofed URL, кодом подтверждения и финальным incident response."
          : "Подготовленный модуль для масштабирования платформы на домашние устройства и публичные сети.",
        is_playable: scenario.isPlayable,
        step_count: scenario.isPlayable ? 4 : 1
      })),
    []
  );

  if (!checkedAuth) {
    return (
      <div className="shell py-16">
        <div className="glass-card mx-auto max-w-3xl p-10 text-center">
          <p className="eyebrow">CyberSim</p>
          <h1 className="mt-5 text-3xl font-semibold text-[var(--color-text-primary)]">Проверяем защищенную сессию</h1>
          <p className="body-copy mt-4">Если пользователь уже вошел в систему, мы сразу перенаправим его в симулятор.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shell space-y-12 pb-2 pt-10">
      <section className="hero-grid">
        <div className="glass-card landing-surface">
          <div className="max-w-3xl space-y-7">
            <div className="metric-badge">
              <Sparkles size={16} />
              <span>Платформа обучения цифровой устойчивости через сюжет и последствия</span>
            </div>

            <div className="space-y-5">
              <p className="eyebrow">Premium cyber-glass platform</p>
              <h1 className="section-heading">
                Учим распознавать реальные цифровые угрозы так, будто они уже произошли.
              </h1>
              <p className="body-copy max-w-2xl text-lg">
                CyberSim превращает фишинг, поддельные чаты, spoofed URL и ошибки повседневной цифровой гигиены в
                красивый интерактивный опыт с измеримым прогрессом, личной статистикой и визуально понятной логикой
                последствий.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href="/login" className="primary-button">
                Войти и начать миссию
                <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="secondary-button">
                Открыть демо доступа
              </Link>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="metric-badge">
                <BadgeCheck size={16} />
                <span>1 играбельная ветка уже доступна</span>
              </div>
              <div className="metric-badge">
                <Eye size={16} />
                <span>Live feedback и WebSocket-обновления</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card landing-surface visual-stage">
          {heroSlides.map((slide) => (
            <article key={slide.eyebrow} className="visual-card">
              <div className="visual-card-header">
                <p className="eyebrow">{slide.eyebrow}</p>
                <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  Scenario View
                </span>
              </div>

              <div className="visual-card-body">
                <h2 className="text-2xl font-semibold leading-tight text-[var(--color-text-primary)]">{slide.title}</h2>
                <p className="body-copy mt-4 text-sm">{slide.body}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="visual-stat">
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-muted)]">Security HP</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">84</p>
                  </div>
                  <div className="visual-stat">
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-muted)]">Mission status</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-accent)]">Active</p>
                  </div>
                </div>
              </div>
            </article>
          ))}

          <div className="floating-chip" style={{ left: "1rem", top: "1rem" }}>
            <ShieldCheck size={15} />
            <span>Готово для демонстрации жюри</span>
          </div>
          <div className="floating-chip" style={{ right: "1rem", bottom: "1rem", animationDelay: "1.4s" }}>
            <Trophy size={15} />
            <span>Личный рейтинг и сценарный прогресс</span>
          </div>
        </div>
      </section>

      <section className="page-section space-y-7">
        <div className="space-y-3">
          <p className="eyebrow">Почему это работает</p>
          <h2 className="section-subheading">Платформа не объясняет угрозы отвлеченно, а ставит пользователя внутрь решения.</h2>
        </div>

        <div className="feature-grid">
          {valueCards.map(({ icon: Icon, title, description }) => (
            <article key={title} className="glass-card feature-card">
              <div className="feature-icon">
                <Icon size={20} />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-[var(--color-text-primary)]">{title}</h3>
              <p className="body-copy mt-3 text-sm">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="glass-card p-7">
          <p className="eyebrow">Как проходит обучение</p>
          <h2 className="mt-4 text-3xl font-semibold text-[var(--color-text-primary)]">От первого письма до финального safe decision.</h2>
          <p className="body-copy mt-4">
            Внутри CyberSim нет абстрактных вопросов “что бы вы сделали?”. Пользователь получает конкретный инцидент и
            проходит его как цепочку реальных действий, где каждая ошибка влияет на итог.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {processCards.map((item) => (
            <article key={item.step} className="glass-card p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-accent)]">{item.step}</p>
              <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">{item.title}</h3>
              <p className="body-copy mt-3 text-sm">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section space-y-8">
        <div className="space-y-3">
          <p className="eyebrow">Narrative catalog</p>
          <h2 className="section-subheading">Сценарные ветки, которые превращают цифровую безопасность в понятный продукт.</h2>
          <p className="body-copy max-w-3xl">
            Играбельная офисная ветка уже демонстрирует вертикальный срез платформы, а домашние сценарии и общественный
            Wi-Fi подготовлены как следующий расширяемый слой.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {showcase.map((scenario) => (
            <ScenarioCard
              key={scenario.slug}
              scenario={scenario}
              actionHref={scenario.is_playable ? "/login" : undefined}
              actionLabel={scenario.is_playable ? "Войти и открыть ветку" : undefined}
            />
          ))}
        </div>
      </section>

      <section className="page-section pb-8">
        <div className="glass-card landing-surface">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <p className="eyebrow">Ready for launch</p>
              <h2 className="section-subheading">Покажи пользователю красивый продукт, а не просто тест с вопросами.</h2>
              <p className="body-copy max-w-2xl">
                Вход открывает личный кабинет, симулятор, прогресс по веткам и рейтинг. Вся публичная часть ведет в один
                и тот же визуальный язык продукта, чтобы маркетинг и само приложение выглядели как единая система.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 lg:justify-end">
              <Link href="/login" className="primary-button">
                Войти
              </Link>
              <Link href="/login" className="secondary-button">
                Перейти к регистрации
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
