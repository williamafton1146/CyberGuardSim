import Link from "next/link";

import { ScenarioCard } from "@/components/scenario/ScenarioCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { scenarioCatalog } from "@cyber-sim/shared";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const showcase = scenarioCatalog.map((scenario) => ({
    slug: scenario.slug,
    title: scenario.title,
    theme: scenario.theme,
    difficulty: scenario.difficulty,
    description: scenario.isPlayable
      ? "Проиграйте реальную атаку через письма, URL и поддельные запросы кода подтверждения."
      : "Каркас ветки готов для масштабирования на домашние и публичные цифровые сценарии.",
    is_playable: scenario.isPlayable,
    step_count: scenario.isPlayable ? 4 : 1
  }));

  return (
    <div className="shell space-y-20 py-14">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="space-y-8">
          <div className="inline-flex items-center rounded-full border border-safe/25 bg-safe/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-safe">
            Hackathon Prototype
          </div>
          <div className="space-y-6">
            <h1 className="max-w-4xl text-5xl font-semibold leading-tight text-white md:text-6xl">
              Учим реагировать на реальные цифровые угрозы через сюжет и последствия.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-skyglass/80">
              CyberSim превращает скучные инструкции в короткие игровые миссии: письмо, чат, код подтверждения, инцидент и
              правильный алгоритм защиты.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/simulator" className="rounded-2xl bg-safe px-6 py-4 text-sm font-semibold text-ink">
              Открыть демо-миссию
            </Link>
            <Link href="/dashboard" className="rounded-2xl border border-white/10 px-6 py-4 text-sm font-semibold text-white">
              Посмотреть кабинет
            </Link>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-ambient backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-alert">Почему это работает</p>
          <div className="mt-8 space-y-6">
            {[
              "Неверное действие сразу показывает последствия, а не только 'ошибку'.",
              "Шкала Security HP превращает безопасное поведение в понятный личный прогресс.",
              "Каркас модульный: к офисной ветке легко добавить дом и общественный Wi-Fi."
            ].map((point) => (
              <div key={point} className="rounded-2xl border border-white/10 bg-ink/40 p-4 text-sm leading-7 text-skyglass/80">
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <SectionTitle
          eyebrow="Narrative paths"
          title="Сюжетные линии для обучения через действие"
          description="Одна ветка уже полностью играбельна, еще две подготовлены как масштабируемые модули для следующего спринта."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {showcase.map((scenario) => (
            <ScenarioCard key={scenario.slug} scenario={scenario} />
          ))}
        </div>
      </section>
    </div>
  );
}
