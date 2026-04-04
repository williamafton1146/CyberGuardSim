"use client";

import { AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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

function buildImpactTimeline(feedback: AnswerResult) {
  return [
    {
      title: "Что пошло не так",
      text: feedback.consequence_text
    },
    {
      title: "Почему атака опасна",
      text: feedback.explanation
    },
    {
      title: "Как действовать правильно",
      text: feedback.hint || "Остановить действие, проверить источник запроса и вернуться к сервису только через официальный канал."
    }
  ];
}

export default function SimulatorPage() {
  const [token, setToken] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  const [session, setSession] = useState<SessionState | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [criticalPhase, setCriticalPhase] = useState<"idle" | "breaking" | "impact">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const currentToken = getToken();
    setToken(currentToken);
    getScenarios()
      .then((payload) => {
        setScenarios(payload);
        setError(null);
      })
      .catch((loadError) => {
        setScenarios([]);
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить сценарии");
      })
      .finally(() => setScenariosLoading(false));

    return () => socketRef.current?.close();
  }, []);

  useEffect(() => {
    if (!feedback || feedback.is_correct || feedback.severity !== "critical") {
      setCriticalPhase("idle");
      return;
    }

    setCriticalPhase("breaking");
    const timer = window.setTimeout(() => setCriticalPhase("impact"), 720);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const impactTimeline = useMemo(() => (feedback && feedback.severity === "critical" ? buildImpactTimeline(feedback) : []), [feedback]);

  async function launchScenario(slug: string) {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null);
    setCriticalPhase("idle");
    socketRef.current?.close();

    try {
      const newSession = await startSession(token, slug);
      setSession(newSession);
      socketRef.current = connectSessionSocket(newSession.session_id, token, (payload) => {
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
            {scenariosLoading ? (
              <div className="glass-card p-6 text-sm text-[var(--color-text-muted)]">Загружаем игровые миссии и их текущий статус публикации.</div>
            ) : null}
            {scenarios.map((scenario) => (
              <ScenarioCard key={scenario.slug} scenario={scenario} onStart={launchScenario} />
            ))}
            {!scenariosLoading && !scenarios.length && !error ? (
              <div className="glass-card p-6 text-sm text-[var(--color-text-muted)]">
                Сейчас нет доступных сценариев. Когда администратор опубликует новую ветку, она появится в этом списке.
              </div>
            ) : null}
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

                <div className={`glass-card p-6 simulator-stage ${criticalPhase === "breaking" ? "simulator-stage-breaking" : ""}`}>
                  <div className="simulator-stage-content">
                    <p className="eyebrow">{session.scenario_title}</p>
                    {session.current_step ? (
                      <>
                        <h3 className="mt-4 text-2xl font-semibold text-[var(--color-text-primary)]">{session.current_step.prompt}</h3>
                        <p className="mt-3 text-sm uppercase tracking-[0.25em] text-[var(--color-text-muted)]">{session.current_step.threat_type}</p>
                        <div className="mt-6">
                          <DecisionPanel options={session.current_step.options} disabled={loading || criticalPhase === "breaking"} onSelect={handleAnswer} />
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

                  {criticalPhase === "breaking" ? (
                    <>
                      <div className="simulator-voxel-overlay" aria-hidden="true" />
                      <div className="simulator-voxel-overlay simulator-voxel-overlay-secondary" aria-hidden="true" />
                    </>
                  ) : null}
                </div>

                {feedback && criticalPhase === "impact" && feedback.severity === "critical" && !feedback.is_correct ? (
                  <div className="glass-card simulator-impact-panel">
                    <div className="simulator-impact-head">
                      <div className="feature-icon simulator-impact-icon">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <p className="eyebrow">Критическая ошибка</p>
                        <h3 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">Атака получает развитие</h3>
                      </div>
                    </div>

                    <p className="body-copy mt-4 text-sm">
                      Неверный алгоритм не просто снижает HP. Он запускает реальную цепочку последствий, из-за которой злоумышленник получает время,
                      доступ или доверие.
                    </p>

                    <div className="mt-6 space-y-3">
                      {impactTimeline.map((step, index) => (
                        <div key={step.title} className="soft-tile simulator-impact-step">
                          <span className="simulator-impact-step-index">0{index + 1}</span>
                          <div>
                            <p className="simulator-impact-step-title">{step.title}</p>
                            <p className="simulator-impact-step-copy">{step.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <button type="button" className="secondary-button" onClick={() => setCriticalPhase("idle")}>
                        Продолжить миссию
                      </button>
                    </div>
                  </div>
                ) : feedback ? (
                  <div
                    className={`glass-card p-6 ${
                      feedback.is_correct
                        ? "border-[var(--color-border-strong)] bg-[linear-gradient(180deg,var(--color-accent-soft),var(--color-bg-elevated))]"
                        : "border-[rgba(255,114,92,0.28)] bg-[linear-gradient(180deg,var(--color-alert-soft),var(--color-bg-elevated))]"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
                      {feedback.is_correct ? "Правильное действие" : feedback.severity === "critical" ? "Критическая ошибка" : "Рискованный выбор"}
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
                  Доступны три игровые ветки. После запуска справа появятся текущая угроза, варианты действий, шкала HP и обратная связь по каждому решению.
                </p>
                <div className="mt-6 soft-tile simulator-ready-note">
                  <Sparkles size={18} />
                  <span>Критические ошибки запускают расширенный пост-фидбек с визуальным разрушением интерфейсного блока и разбором последствий.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
