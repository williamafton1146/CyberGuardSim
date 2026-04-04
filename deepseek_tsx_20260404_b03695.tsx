"use client";

import {
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Mail,
  MessageCircle,
  Wifi,
  Lock,
  Download,
  Eye,
  Send,
  AlertCircle,
  Shield,
  CheckCircle,
  XCircle,
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
import type { AnswerResult, ScenarioSummary, SessionState } from "@/types";

export const dynamic = "force-dynamic";

// Расширенный тип анимаций последствий
type ConsequenceAnimation = "encrypt" | "disappear" | "leak" | "ransomware" | null;

// Функция определения анимации с учётом типа угрозы
function getAnimationFromAction(
  optionText: string,
  feedback: AnswerResult,
  threatType?: string
): ConsequenceAnimation {
  const lowerText = optionText.toLowerCase();
  const isPhishing = threatType?.toLowerCase().includes("phishing");

  // Для фишинговых ссылок — специальная анимация взлома
  if (isPhishing && (lowerText.includes("ссылка") || lowerText.includes("перейти") || lowerText.includes("qr"))) {
    return "ransomware";
  }

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

// Компонент имитации входящего сообщения (мессенджер/почта)
function IncomingMessage({ step, threatType }: { step: SessionState['current_step']; threatType: string }) {
  const getSenderInfo = () => {
    const prompt = step?.prompt || "";
    if (threatType.includes("phishing") || threatType.includes("фишинг")) {
      return { name: "Служба безопасности", avatar: <ShieldAlert size={20} />, color: "text-red-400" };
    }
    if (threatType.includes("social") || threatType.includes("соц")) {
      return { name: "Анна Иванова (отдел кадров)", avatar: <MessageCircle size={20} />, color: "text-blue-400" };
    }
    if (threatType.includes("wifi") || threatType.includes("Wi-Fi")) {
      return { name: "Public Wi-Fi Portal", avatar: <Wifi size={20} />, color: "text-yellow-400" };
    }
    return { name: "Коллега", avatar: <Mail size={20} />, color: "text-gray-400" };
  };

  const sender = getSenderInfo();
  const isEmail = threatType.includes("phishing") || threatType.includes("email");
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });

  return (
    <div className="incoming-message">
      <div className="flex items-start gap-3">
        <div className={`message-avatar ${sender.color} bg-[var(--color-bg-elevated)] p-2 rounded-full`}>
          {sender.avatar}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <span className="font-semibold text-[var(--color-text-primary)]">{sender.name}</span>
            <span className="text-xs text-[var(--color-text-muted)]">{time}</span>
          </div>
          <div className="mt-2 p-3 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border-weak)]">
            <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{step?.prompt}</p>
            {isEmail && (
              <div className="mt-2 pt-2 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border-weak)]">
                ⚠️ Внешнее письмо • Будьте осторожны с вложениями
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Улучшенный компонент анимации последствий (без авто-закрытия, управляется извне)
function ConsequenceAnimationOverlay({ type }: { type: ConsequenceAnimation }) {
  if (!type) return null;

  if (type === "ransomware") {
    return (
      <div className="consequence-overlay">
        <div className="consequence-content">
          <Lock size={46} className="text-[var(--color-alert)] animate-pulse" />
          <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">Ваши файлы зашифрованы</h3>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Данные карты отправлены на сервер злоумышленника.
          </p>
          <div className="mt-5 h-1.5 w-36 overflow-hidden rounded-full bg-[var(--color-surface)]">
            <div className="encrypt-progress-bar h-full rounded-full bg-[var(--color-alert)]" />
          </div>
        </div>
      </div>
    );
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

// Вспомогательная функция для построения ленты последствий в модальном окне
function buildModalNarrative(feedback: AnswerResult) {
  const steps = [
    {
      title: "Что произошло",
      text: feedback.consequence_text,
    },
    {
      title: "Почему это опасно",
      text: feedback.explanation,
    },
  ];
  if (feedback.hint) {
    steps.push({
      title: "Как избежать в будущем",
      text: feedback.hint,
    });
  }
  return steps;
}

// Модальное окно с детальным разбором ошибки
function FeedbackModal({
  feedback,
  threatType,
  onClose,
}: {
  feedback: AnswerResult;
  threatType?: string;
  onClose: () => void;
}) {
  const timeline = buildModalNarrative(feedback);
  const isPhishing = threatType?.toLowerCase().includes("phishing");

  const enhancedTimeline = isPhishing
    ? [
        ...timeline,
        {
          title: "Почему это случилось?",
          text: "Смотри на URL: поддельный адрес отличается от официального. Всегда проверяйте домен перед вводом данных.",
        },
      ]
    : timeline;

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
          {enhancedTimeline.map((step, index) => (
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
  const [feedback, setFeedback] = useState<AnswerResult | null>(null); // только для правильных ответов (краткий блок)
  const [criticalPhase, setCriticalPhase] = useState<"idle" | "breaking" | "impact">("idle");
  const [animationType, setAnimationType] = useState<ConsequenceAnimation>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<AnswerResult | null>(null);
  const [pendingCriticalFeedback, setPendingCriticalFeedback] = useState<AnswerResult | null>(null);
  const [criticalThreatType, setCriticalThreatType] = useState<string | null>(null);
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

  // Обработка критических ошибок: анимация -> модальное окно
  useEffect(() => {
    if (!pendingCriticalFeedback) return;

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

  async function launchScenario(slug: string) {
    if (!token) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    setModalFeedback(null);
    setPendingCriticalFeedback(null);
    setCriticalPhase("idle");
    setAnimationType(null);
    setCriticalThreatType(null);
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
    if (!token || !session) return;

    const selectedOption = session.current_step?.options.find((option) => option.id === optionId);
    const currentThreatType = session.current_step?.threat_type;

    setLoading(true);
    setError(null);
    setAnimationType(null);
    setFeedback(null);

    try {
      const result = await submitAnswer(token, session.session_id, optionId);
      setSession(result);

      if (!result.is_correct) {
        if (result.severity === "critical") {
          const animation = getAnimationFromAction(selectedOption?.label ?? "", result, currentThreatType);
          setAnimationType(animation);
          setCriticalThreatType(currentThreatType ?? null);
          setPendingCriticalFeedback(result);
        } else {
          // Некритическая ошибка – показываем модальное окно без анимации
          setModalFeedback(result);
          setCriticalThreatType(currentThreatType ?? null);
        }
      } else {
        // Правильный ответ – показываем краткий блок с подтверждением
        setFeedback(result);
        setCriticalThreatType(null);
      }
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : "Не удалось отправить решение");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <div className="desktop-shell min-h-screen bg-[url('/grid.svg')] bg-repeat">
        <div className="container mx-auto px-4 py-6">
          {/* Верхняя панель рабочего стола */}
          <div className="desktop-taskbar mb-6 flex items-center justify-between p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-cyan-400" size={24} />
              <span className="text-sm font-mono text-white/80">КИБЕРПОЛИГОН • РЕЖИМ ТРЕНИРОВКИ</span>
            </div>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
          </div>

          <SectionTitle
            eyebrow="Интерактивный тренажер"
            title="Симулятор киберугроз"
            description="Вы — сотрудник компании. Принимайте решения в смоделированных рабочих ситуациях."
          />

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-6">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
            {/* Левая колонка: выбор сценария */}
            <div className="space-y-6">
              {scenariosLoading && (
                <div className="glass-card p-6 text-sm text-[var(--color-text-muted)]">Загрузка миссий...</div>
              )}
              {scenarios.map((scenario) => (
                <ScenarioCard key={scenario.slug} scenario={scenario} onStart={launchScenario} />
              ))}
              {!scenariosLoading && !scenarios.length && !error && (
                <div className="glass-card p-6 text-sm text-[var(--color-text-muted)]">
                  Нет доступных сценариев. Ожидайте обновления.
                </div>
              )}
            </div>

            {/* Правая колонка: рабочий стол с активным сценарием */}
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
                    <div className="window-titlebar flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        {session.current_step?.threat_type?.includes("phishing") ? <Mail size={16} /> : 
                         session.current_step?.threat_type?.includes("social") ? <MessageCircle size={16} /> : 
                         <Shield size={16} />}
                        <span className="text-xs font-mono">
                          {session.current_step?.threat_type === "phishing" ? "📧 Входящие" :
                           session.current_step?.threat_type === "social" ? "💬 Корпоративный чат" :
                           session.current_step?.threat_type === "wifi" ? "📡 Сеть Wi-Fi" :
                           "Рабочий стол"}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      </div>
                    </div>

                    <div className="window-content p-5 min-h-[320px]">
                      {session.current_step ? (
                        <div className="space-y-5">
                          <IncomingMessage step={session.current_step} threatType={session.current_step.threat_type} />
                          <div className="action-buttons-grid mt-6">
                            <DecisionPanel 
                              options={session.current_step.options} 
                              disabled={loading || criticalPhase === "breaking" || !!animationType || !!modalFeedback} 
                              onSelect={(id) => handleAnswer(id)} 
                            />
                          </div>
                          {session.current_step.hint && (
                            <div className="text-xs text-amber-400/70 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                              💡 Подсказка: {session.current_step.hint}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="soft-tile mt-5 text-center">
                          <CheckCircle size={40} className="mx-auto text-green-500 mb-3" />
                          <h3 className="text-2xl font-semibold text-[var(--color-text-primary)]">Миссия выполнена</h3>
                          <p className="text-sm mt-2">Вы успешно завершили сценарий и закрепили навыки безопасного поведения.</p>
                        </div>
                      )}
                    </div>

                    {criticalPhase === "breaking" && (
                      <>
                        <div className="simulator-voxel-overlay" aria-hidden="true" />
                        <div className="simulator-voxel-overlay simulator-voxel-overlay-secondary" aria-hidden="true" />
                      </>
                    )}
                  </div>

                  {/* Краткий блок для правильного ответа */}
                  {feedback && feedback.is_correct && (
                    <div className="glass-card p-5 correct-feedback">
                      <div className="flex items-start gap-3">
                        <CheckCircle size={22} className="text-green-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">{feedback.consequence_text}</p>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{feedback.explanation}</p>
                          {feedback.hint && <p className="text-xs text-[var(--color-text-muted)] mt-2">💡 {feedback.hint}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Заглушка, когда ещё не было ответа */}
                  {!feedback && !modalFeedback && !pendingCriticalFeedback && session.current_step && (
                    <div className="glass-card p-6 text-center text-sm text-[var(--color-text-muted)]">
                      <MessageCircle size={28} className="mx-auto mb-2 opacity-40" />
                      Выберите действие. После этого вы увидите последствия и объяснение.
                    </div>
                  )}
                </>
              ) : (
                <div className="glass-card p-8 text-center">
                  <Sparkles size={32} className="mx-auto mb-4 text-cyan-400" />
                  <h3 className="text-2xl font-semibold">Выберите сценарий слева</h3>
                  <p className="text-sm mt-2 max-w-md mx-auto">В этом окне появится рабочая среда: сообщение в мессенджере или письмо, а также варианты действий.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Анимация последствий (оверлей) */}
        <ConsequenceAnimationOverlay type={animationType} />

        {/* Модальное окно с детальным разбором ошибки */}
        {modalFeedback && (
          <FeedbackModal
            feedback={modalFeedback}
            threatType={criticalThreatType ?? undefined}
            onClose={() => {
              setModalFeedback(null);
              setCriticalThreatType(null);
            }}
          />
        )}
      </div>
    </RequireAuth>
  );
}