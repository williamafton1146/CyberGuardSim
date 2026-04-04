"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Lock,
  Mail,
  MessageCircle,
  Shield,
  ShieldAlert,
  Sparkles,
  Wifi,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { DecisionPanel } from "@/components/scenario/DecisionPanel";
import { HPMeter } from "@/components/scenario/HPMeter";
import { ScenarioCard } from "@/components/scenario/ScenarioCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getScenarios, startSession, submitAnswer } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { connectSessionSocket } from "@/lib/ws";
import type { AnswerResult, ScenarioStep, ScenarioSummary, SessionState } from "@/types";

export const dynamic = "force-dynamic";

type ConsequenceAnimation = "encrypt" | "disappear" | "leak" | null;

function getAnimationFromAction(optionText: string, feedback: AnswerResult): ConsequenceAnimation {
  const lowerText = optionText.toLowerCase();
  if (lowerText.includes("скачать") || lowerText.includes("вложение") || lowerText.includes("файл")) {
    return "encrypt";
  }
  if (lowerText.includes("парол") || lowerText.includes("код") || lowerText.includes("войти") || lowerText.includes("ввести")) {
    return "leak";
  }
  if (lowerText.includes("ссылка") || lowerText.includes("перейти") || lowerText.includes("qr")) {
    return "disappear";
  }
  if (!feedback.is_correct && feedback.severity === "critical") {
    return "encrypt";
  }
  return null;
}

function getWorkspaceMeta(step: ScenarioStep | null) {
  const threat = step?.threat_type.toLowerCase() ?? "";
  if (threat.includes("phishing") || threat.includes("фиш")) {
    return {
      icon: <Mail size={16} />,
      label: "Входящие",
      sender: "Служба безопасности",
      note: "Внешнее письмо требует срочной реакции"
    };
  }
  if (threat.includes("social") || threat.includes("соц")) {
    return {
      icon: <MessageCircle size={16} />,
      label: "Корпоративный чат",
      sender: "Внутренний мессенджер",
      note: "Запрос выглядит как обычное рабочее сообщение"
    };
  }
  if (threat.includes("wifi") || threat.includes("portal") || threat.includes("captive")) {
    return {
      icon: <Wifi size={16} />,
      label: "Сеть и портал",
      sender: "Public Wi-Fi",
      note: "Подключение к общественной сети и captive portal"
    };
  }
  return {
    icon: <Shield size={16} />,
    label: "Рабочий контекст",
    sender: "CyberSim",
    note: "Контекст миссии и сигналы риска"
  };
}

function buildModalNarrative(feedback: AnswerResult) {
  return [
    {
      title: "Что произошло",
      text: feedback.consequence_text
    },
    {
      title: "Почему это опасно",
      text: feedback.explanation
    },
    {
      title: "Как действовать правильно",
      text: feedback.hint || "Остановить действие, проверить источник запроса и вернуться к сервису только через официальный канал."
    }
  ];
}

function getScoreEncouragement(score: number, maxScore: number, status: string) {
  if (status === "failed") {
    return "Сценарий прерван, но именно на таких точках тренировка приносит больше всего пользы.";
  }
  if (score >= maxScore) {
    return "Максимальный результат зафиксирован. Такой паттерн уже можно считать устойчивым.";
  }
  if (score >= Math.round(maxScore * 0.75)) {
    return "Еще чуть-чуть — одно перепрохождение может довести результат до максимума.";
  }
  return "Ну, тренировка не помешает — попробуйте пройти сценарий еще раз и собрать максимум.";
}

function IncomingMessage({ step }: { step: ScenarioStep | null }) {
  const meta = getWorkspaceMeta(step);
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="incoming-message">
      <div className="flex items-start gap-3">
        <div className="message-avatar">
          {meta.icon}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold text-[var(--color-text-primary)]">{meta.sender}</span>
            <span className="text-xs text-[var(--color-text-muted)]">{time}</span>
          </div>
          <div className="mt-2 rounded-[1.15rem] border border-[var(--color-border-weak)] bg-[var(--color-bg-soft)] p-4">
            <p className="text-sm leading-7 text-[var(--color-text-secondary)] whitespace-pre-wrap">{step?.prompt}</p>
            <div className="incoming-message-note">
              <span>{meta.label}</span>
              <span>{meta.note}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsequenceAnimationOverlay({ type }: { type: ConsequenceAnimation }) {
  if (!type) {
    return null;
  }

  if (type === "encrypt") {
    return (
      <div className="consequence-overlay">
        <div className="consequence-content">
          <Lock size={46} className="text-[var(--color-alert)] animate-pulse" />
          <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">Атака получила развитие</h3>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Неверное действие дало злоумышленнику время закрепиться и развернуть следующий этап.</p>
          <div className="mt-5 h-1.5 w-36 overflow-hidden rounded-full bg-[var(--color-surface)]">
            <div className="encrypt-progress-bar h-full rounded-full bg-[var(--color-alert)]" />
          </div>
        </div>
      </div>
    );
  }

  if (type === "disappear") {
    return (
      <div className="consequence-overlay">
        <div className="consequence-content">
          <AlertTriangle size={46} className="text-[#ffba49]" />
          <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">Контроль над сессией потерян</h3>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Поддельный портал или ссылка переключили атаку в активную фазу.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="consequence-overlay">
      <div className="consequence-content">
        <AlertCircle size={46} className="text-[#ff9b54]" />
        <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">Утечка данных</h3>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Код, пароль или служебные данные ушли туда, куда не должны были попасть.</p>
      </div>
    </div>
  );
}

function FeedbackModal({ feedback, onClose }: { feedback: AnswerResult; onClose: () => void }) {
  const timeline = buildModalNarrative(feedback);
  return (
    <div className="simulator-feedback-modal-backdrop" onClick={(event) => event.stopPropagation()}>
      <div className="simulator-feedback-modal">
        <div className="simulator-feedback-modal-head">
          <div className={`feature-icon ${feedback.severity === "critical" ? "simulator-impact-icon" : ""}`}>
            {feedback.severity === "critical" ? <AlertTriangle size={18} /> : <ShieldAlert size={18} />}
          </div>
          <div>
            <p className="eyebrow">{feedback.severity === "critical" ? "Критическая ошибка" : "Рискованный выбор"}</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
              {feedback.severity === "critical" ? "Атаку нужно срочно останавливать" : "Решение требует корректировки"}
            </h3>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {timeline.map((step, index) => (
            <div key={step.title} className="soft-tile simulator-impact-step">
              <span className="simulator-impact-step-index">0{index + 1}</span>
              <div>
                <p className="simulator-impact-step-title">{step.title}</p>
                <p className="simulator-impact-step-copy">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" className="primary-button" onClick={onClose}>
            Далее
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SimulatorPage() {
  const [token, setToken] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  const [session, setSession] = useState<SessionState | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [criticalPhase, setCriticalPhase] = useState<"idle" | "breaking" | "impact">("idle");
  const [animationType, setAnimationType] = useState<ConsequenceAnimation>(null);
  const [pendingCriticalFeedback, setPendingCriticalFeedback] = useState<AnswerResult | null>(null);
  const [modalFeedback, setModalFeedback] = useState<AnswerResult | null>(null);
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
    if (!pendingCriticalFeedback) {
      return;
    }

    setCriticalPhase("breaking");
    const impactTimer = window.setTimeout(() => setCriticalPhase("impact"), 720);
    const modalTimer = window.setTimeout(() => {
      setModalFeedback(pendingCriticalFeedback);
      setPendingCriticalFeedback(null);
      setAnimationType(null);
      setCriticalPhase("idle");
    }, 2100);

    return () => {
      window.clearTimeout(impactTimer);
      window.clearTimeout(modalTimer);
    };
  }, [pendingCriticalFeedback]);

  const stageLocked = loading || Boolean(modalFeedback) || Boolean(pendingCriticalFeedback) || criticalPhase !== "idle";

  const positiveFeedbackLabel = useMemo(() => {
    if (!feedback || !feedback.is_correct) {
      return null;
    }
    return feedback.completed ? "Сценарий завершён" : "Безопасное решение";
  }, [feedback]);

  async function launchScenario(slug: string) {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null);
    setModalFeedback(null);
    setPendingCriticalFeedback(null);
    setCriticalPhase("idle");
    setAnimationType(null);
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

    const selectedOption = session.current_step?.options.find((option) => option.id === optionId);
    setLoading(true);
    setError(null);

    try {
      const result = await submitAnswer(token, session.session_id, optionId);
      setFeedback(result);
      setSession(result);

      if (!result.is_correct) {
        if (result.severity === "critical") {
          setAnimationType(getAnimationFromAction(selectedOption?.label ?? "", result));
          setPendingCriticalFeedback(result);
        } else {
          setModalFeedback(result);
        }
      }
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : "Не удалось отправить решение");
    } finally {
      setLoading(false);
    }
  }

  const currentStep = session?.current_step ?? null;
  const workspaceMeta = getWorkspaceMeta(currentStep);

  return (
    <RequireAuth>
      <div className="desktop-shell min-h-screen bg-[url('/grid.svg')] bg-repeat">
        <div className="shell space-y-10 py-12">
          <div className="desktop-taskbar">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-[var(--color-accent)]" size={22} />
              <span className="text-sm font-mono text-[var(--color-text-secondary)]">КИБЕРПОЛИГОН • РЕЖИМ ТРЕНИРОВКИ</span>
            </div>
          </div>

          <SectionTitle
            eyebrow="Интерактивный тренажёр"
            title="Симулятор киберугроз"
            description="Запускайте миссию, принимайте решения в знакомом цифровом контексте и разбирайте последствия до устойчивого безопасного паттерна."
          />

          {error ? (
            <p className="rounded-[1.2rem] border border-[rgba(255,114,92,0.28)] bg-[var(--color-alert-soft)] px-4 py-3 text-sm text-[var(--color-alert)]">
              {error}
            </p>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-6">
              {scenariosLoading ? (
                <div className="glass-card p-6 text-sm text-[var(--color-text-muted)]">Загружаем миссии и их актуальный статус публикации.</div>
              ) : null}
              {scenarios.map((scenario) => (
                <ScenarioCard key={scenario.slug} scenario={scenario} onStart={launchScenario} />
              ))}
              {!scenariosLoading && !scenarios.length && !error ? (
                <div className="glass-card p-6 text-sm text-[var(--color-text-muted)]">Сейчас нет доступных сценариев. Когда администратор опубликует новую ветку, она появится здесь.</div>
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

                  <div className={`desktop-window glass-card overflow-hidden ${criticalPhase === "breaking" ? "window-breaking" : ""}`}>
                    <div className="window-titlebar">
                      <div className="flex items-center gap-2">
                        {workspaceMeta.icon}
                        <span className="text-xs font-mono">{workspaceMeta.label}</span>
                      </div>
                    </div>

                    <div className="window-content">
                      {currentStep ? (
                        <div className={`simulator-stage-content ${criticalPhase === "breaking" ? "simulator-stage-content-muted" : ""}`}>
                          <IncomingMessage step={currentStep} />
                          <div className="mt-6 rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="eyebrow">{session.scenario_title}</p>
                                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-text-primary)]">Выберите следующее действие</h3>
                              </div>
                              <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                                {currentStep.threat_type}
                              </span>
                            </div>
                            <div className="action-buttons-grid mt-6">
                              <DecisionPanel options={currentStep.options} disabled={stageLocked} onSelect={handleAnswer} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="simulator-summary-card">
                          <p className="simulator-summary-kicker">{session.status === "completed" ? "Сценарий завершён" : "Сценарий остановлен"}</p>
                          <h3 className="simulator-summary-title">
                            {session.status === "completed" ? "Итог зафиксирован" : "Нужна ещё одна попытка"}
                          </h3>
                          <div className="simulator-summary-score">
                            <span className="simulator-summary-score-value">{session.score}</span>
                            <span className="simulator-summary-score-meta">из {session.max_score} очков</span>
                          </div>
                          <p className="simulator-summary-copy">{getScoreEncouragement(session.score, session.max_score, session.status)}</p>
                          {session.score < session.max_score ? (
                            <button type="button" className="primary-button mt-2" onClick={() => launchScenario(session.scenario_slug)}>
                              Перепройти
                            </button>
                          ) : null}
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

                  {feedback && feedback.is_correct ? (
                    <div className="glass-card p-5">
                      <div className="flex items-start gap-3">
                        <CheckCircle size={22} className="mt-0.5 shrink-0 text-[var(--color-safe)]" />
                        <div>
                          <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-text-muted)]">{positiveFeedbackLabel}</p>
                          <p className="mt-3 font-medium text-[var(--color-text-primary)]">{feedback.consequence_text}</p>
                          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">{feedback.explanation}</p>
                        </div>
                      </div>
                    </div>
                  ) : feedback && !feedback.is_correct ? (
                    <div className="glass-card p-5">
                      <div className="flex items-start gap-3">
                        <XCircle size={22} className="mt-0.5 shrink-0 text-[var(--color-alert)]" />
                        <div>
                          <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-text-muted)]">
                            {feedback.severity === "critical" ? "Критическая ошибка" : "Нужна корректировка"}
                          </p>
                          <p className="mt-3 font-medium text-[var(--color-text-primary)]">{feedback.consequence_text}</p>
                          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                            Разбор открыт в модальном окне и блокирует прохождение, пока вы не подтвердите следующий шаг.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="glass-card p-6 text-center text-sm text-[var(--color-text-muted)]">
                      <MessageCircle size={28} className="mx-auto mb-2 opacity-40" />
                      Выберите действие. После этого появятся последствия и объяснение, почему решение было безопасным или опасным.
                    </div>
                  )}
                </>
              ) : (
                <div className="glass-card p-8">
                  <Sparkles size={32} className="mx-auto mb-4 text-[var(--color-accent)]" />
                  <h3 className="text-2xl font-semibold text-[var(--color-text-primary)]">Выберите сценарий слева</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                    В этом окне появится рабочая среда: письмо, сообщение, фальшивый портал или другой привычный цифровой контекст вместе с вариантами действий.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <ConsequenceAnimationOverlay type={animationType} />
        {modalFeedback ? <FeedbackModal feedback={modalFeedback} onClose={() => setModalFeedback(null)} /> : null}
      </div>
    </RequireAuth>
  );
}
