"use client";

import { useEffect, useRef, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { DecisionPanel } from "@/components/scenario/DecisionPanel";
import { HPMeter } from "@/components/scenario/HPMeter";
import { ScenarioCard } from "@/components/scenario/ScenarioCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getScenarios, startSession, submitAnswer } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { connectSessionSocket } from "@/lib/ws";
import type { AnswerResult, ScenarioSummary, SessionState } from "@/types";

export const dynamic = "force-dynamic";

export default function SimulatorPage() {
  const [token, setToken] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [session, setSession] = useState<SessionState | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const currentToken = getToken();
    setToken(currentToken);
    getScenarios().then(setScenarios);

    return () => socketRef.current?.close();
  }, []);

  async function launchScenario(slug: string) {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null);
    socketRef.current?.close();

    try {
      const newSession = await startSession(token, slug);
      setSession(newSession);
      socketRef.current = connectSessionSocket(newSession.session_id, (payload) => {
        setSession((current) => (current?.session_id === payload.session_id ? payload : current));
      });
    } catch (launchError) {
      setError(launchError instanceof Error ? launchError.message : "Не удалось запустить сценарий");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(optionId: number) {
    if (!token || !session) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await submitAnswer(token, session.session_id, optionId);
      setFeedback(result);
      setSession(result);
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : "Не удалось отправить решение");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <div className="shell space-y-10 py-12">
        <SectionTitle
          eyebrow="Live simulator"
          title="Сценарный симулятор цифровой устойчивости"
          description="Запускай миссию, проходи шаги последовательно, отслеживай Security HP и получай объяснение после каждого решения."
        />

        {error ? (
          <p className="rounded-[1.2rem] border border-[rgba(255,114,92,0.28)] bg-[var(--color-alert-soft)] px-4 py-3 text-sm text-[var(--color-alert)]">
            {error}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-6">
            {scenarios.map((scenario) => (
              <ScenarioCard key={scenario.slug} scenario={scenario} onStart={launchScenario} />
            ))}
          </div>

          <div className="space-y-6">
            {session ? (
              <>
                <HPMeter
                  hp={session.hp_left}
                  score={session.score}
                  stepNumber={Math.min(session.step_number, session.total_steps)}
                  totalSteps={session.total_steps}
                />

                <div className="glass-card p-6">
                  <p className="eyebrow">{session.scenario_title}</p>
                  {session.current_step ? (
                    <>
                      <h3 className="mt-4 text-2xl font-semibold text-[var(--color-text-primary)]">{session.current_step.prompt}</h3>
                      <p className="mt-3 text-sm uppercase tracking-[0.25em] text-[var(--color-text-muted)]">{session.current_step.threat_type}</p>
                      <div className="mt-6">
                        <DecisionPanel options={session.current_step.options} disabled={loading} onSelect={handleAnswer} />
                      </div>
                    </>
                  ) : (
                    <div className="soft-tile mt-5">
                      <p className="text-sm uppercase tracking-[0.25em] text-[var(--color-accent)]">Миссия завершена</p>
                      <h3 className="mt-3 text-2xl font-semibold text-[var(--color-text-primary)]">Безопасный паттерн зафиксирован</h3>
                      <p className="body-copy mt-4 text-sm">
                        Сценарий завершен. Пользователь увидел полный цикл атаки и закрепил корректный алгоритм реакции.
                      </p>
                    </div>
                  )}
                </div>

                {feedback ? (
                  <div
                    className={`glass-card p-6 ${
                      feedback.is_correct
                        ? "border-[var(--color-border-strong)] bg-[linear-gradient(180deg,var(--color-accent-soft),var(--color-bg-elevated))]"
                        : "border-[rgba(255,114,92,0.28)] bg-[linear-gradient(180deg,var(--color-alert-soft),var(--color-bg-elevated))]"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
                      {feedback.is_correct ? "Правильное действие" : "Рискованный выбор"}
                    </p>
                    <p className="mt-4 text-lg font-medium text-[var(--color-text-primary)]">{feedback.consequence_text}</p>
                    <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)]">{feedback.explanation}</p>
                    {feedback.hint ? <p className="mt-4 text-sm text-[var(--color-text-muted)]">Подсказка: {feedback.hint}</p> : null}
                  </div>
                ) : (
                  <div className="glass-card p-6 text-sm leading-7 text-[var(--color-text-muted)]">
                    После выбора действия здесь появятся последствия и объяснение, почему решение было безопасным или опасным.
                  </div>
                )}
              </>
            ) : (
              <div className="glass-card p-8">
                <p className="eyebrow">Ready state</p>
                <h3 className="mt-4 text-3xl font-semibold text-[var(--color-text-primary)]">Выберите сценарий слева</h3>
                <p className="body-copy mt-4 max-w-xl text-sm">
                  Доступны три игровые ветки. После запуска справа появятся текущая угроза, варианты действий, шкала
                  HP и обратная связь по каждому решению.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
