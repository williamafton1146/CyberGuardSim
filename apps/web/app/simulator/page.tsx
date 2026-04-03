"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
      setError("Для запуска миссии нужен вход. Сначала авторизуйтесь.");
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
    <div className="shell space-y-10 py-14">
      <SectionTitle
        eyebrow="Live simulator"
        title="Офисная миссия: защита от фишинга и социнженерии"
        description="Пользователь проходит цепочку решений, получает последствия ошибки и учится правильному паттерну поведения вместо формального теста."
      />

      {!token ? (
        <div className="rounded-[30px] border border-alert/30 bg-alert/10 p-6 text-sm text-alert">
          Для старта миссии требуется авторизация. Перейдите на <Link href="/login" className="underline">страницу входа</Link>.
        </div>
      ) : null}

      {error ? <p className="rounded-2xl border border-alert/30 bg-alert/10 px-4 py-3 text-sm text-alert">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
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

              <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-ambient">
                <p className="text-xs uppercase tracking-[0.3em] text-safe">{session.scenario_title}</p>
                {session.current_step ? (
                  <>
                    <h3 className="mt-4 text-2xl font-semibold text-white">{session.current_step.prompt}</h3>
                    <p className="mt-3 text-sm uppercase tracking-[0.25em] text-skyglass/55">{session.current_step.threat_type}</p>
                    <div className="mt-6">
                      <DecisionPanel
                        options={session.current_step.options}
                        disabled={loading}
                        onSelect={handleAnswer}
                      />
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-[28px] border border-safe/20 bg-safe/10 p-6">
                    <p className="text-sm uppercase tracking-[0.25em] text-safe">Миссия завершена</p>
                    <h3 className="mt-3 text-2xl font-semibold text-white">Безопасный паттерн зафиксирован</h3>
                    <p className="mt-4 text-sm leading-7 text-skyglass/80">
                      Сценарий завершен. Пользователь увидел полный цикл атаки и отработал корректный алгоритм реакции.
                    </p>
                  </div>
                )}
              </div>

              {feedback ? (
                <div
                  className={`rounded-[28px] border p-6 shadow-ambient ${
                    feedback.is_correct ? "border-safe/30 bg-safe/10" : "border-alert/30 bg-alert/10"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-white/75">
                    {feedback.is_correct ? "Правильное действие" : "Рискованный выбор"}
                  </p>
                  <p className="mt-4 text-lg font-medium text-white">{feedback.consequence_text}</p>
                  <p className="mt-4 text-sm leading-7 text-skyglass/85">{feedback.explanation}</p>
                  {feedback.hint ? <p className="mt-4 text-sm text-skyglass/80">Подсказка: {feedback.hint}</p> : null}
                </div>
              ) : (
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-sm leading-7 text-skyglass/75">
                  После выбора действия здесь появятся последствия и объяснение, почему решение было безопасным или опасным.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-8 shadow-ambient">
              <p className="text-xs uppercase tracking-[0.3em] text-safe">Ready state</p>
              <h3 className="mt-4 text-3xl font-semibold text-white">Выберите сценарий слева</h3>
              <p className="mt-4 max-w-xl text-sm leading-7 text-skyglass/75">
                Для демо уже доступна полноценная офисная ветка на 4 шага. После запуска справа появится текущая угроза, варианты действий,
                шкала HP и обратная связь по каждому решению.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
