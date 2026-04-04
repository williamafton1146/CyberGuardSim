"use client";

import { AlertTriangle, ShieldAlert, Sparkles, Mail, MessageCircle, Wifi, Lock, Download, Eye, Send, AlertCircle, Shield, CheckCircle, XCircle } from "lucide-react";
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

// Типы анимаций последствий
type ConsequenceAnimation = "encrypt" | "disappear" | "leak" | null;

// Функция для определения типа анимации на основе выбранного действия
function getAnimationFromAction(optionText: string, feedback: AnswerResult): ConsequenceAnimation {
  const lowerText = optionText.toLowerCase();
  if (lowerText.includes("скачать") || lowerText.includes("вложение") || lowerText.includes("открыть файл")) {
    return "encrypt";
  }
  if (lowerText.includes("пароль") || lowerText.includes("войти") || lowerText.includes("ввести")) {
    return "leak";
  }
  if (lowerText.includes("перейти") || lowerText.includes("ссылка")) {
    return "disappear";
  }
  if (!feedback.is_correct && feedback.severity === "critical") {
    return "encrypt"; // по умолчанию для критических ошибок
  }
  return null;
}

// Компонент имитации входящего сообщения (мессенджер/почта)
function IncomingMessage({ step, threatType }: { step: SessionState['current_step']; threatType: string }) {
  // Эмуляция данных отправителя и текста на основе prompt и типа угрозы
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

// Компонент анимации последствий
function ConsequenceAnimationOverlay({ type, onClose }: { type: ConsequenceAnimation; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  if (!type) return null;
  
  if (type === "encrypt") {
    return (
      <div className="consequence-overlay encrypt-overlay">
        <div className="consequence-content">
          <Lock size={48} className="animate-pulse text-red-500" />
          <h3 className="text-xl font-bold mt-4">Данные шифруются!</h3>
          <p className="text-sm text-center mt-2">Злоумышленник заблокировал ваш рабочий стол. Все файлы зашифрованы.</p>
          <div className="mt-4 w-32 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div className="encrypt-progress-bar h-full bg-red-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (type === "disappear") {
    return (
      <div className="consequence-overlay disappear-overlay">
        <div className="consequence-content">
          <AlertTriangle size={48} className="text-yellow-500" />
          <h3 className="text-xl font-bold mt-4">Файлы исчезли!</h3>
          <p className="text-sm text-center mt-2">Важные документы удалены. Доступ к рабочей папке потерян.</p>
        </div>
      </div>
    );
  }
  
  if (type === "leak") {
    return (
      <div className="consequence-overlay leak-overlay">
        <div className="consequence-content">
          <AlertCircle size={48} className="text-orange-500" />
          <h3 className="text-xl font-bold mt-4">Кража данных!</h3>
          <p className="text-sm text-center mt-2">Пароли и личные данные отправлены злоумышленнику.</p>
        </div>
      </div>
    );
  }
  
  return null;
}

export default function SimulatorPage() {
  const [token, setToken] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  const [session, setSession] = useState<SessionState | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [criticalPhase, setCriticalPhase] = useState<"idle" | "breaking" | "impact">("idle");
  const [animationType, setAnimationType] = useState<ConsequenceAnimation>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSelectedOptionText, setLastSelectedOptionText] = useState<string>("");
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

  // Обработка критических ошибок и анимации
  useEffect(() => {
    if (!feedback || feedback.is_correct) {
      if (criticalPhase !== "idle") setCriticalPhase("idle");
      return;
    }
    
    // Показываем анимацию последствий на основе действия
    const anim = getAnimationFromAction(lastSelectedOptionText, feedback);
    if (anim) {
      setAnimationType(anim);
    }
    
    if (feedback.severity === "critical") {
      setCriticalPhase("breaking");
      const timer = window.setTimeout(() => setCriticalPhase("impact"), 720);
      return () => window.clearTimeout(timer);
    } else {
      setCriticalPhase("idle");
    }
  }, [feedback, lastSelectedOptionText, criticalPhase]);

  async function launchScenario(slug: string) {
    if (!token) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
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

  async function handleAnswer(optionId: number, optionText: string) {
    if (!token || !session) return;
    setLoading(true);
    setError(null);
    setLastSelectedOptionText(optionText);
    setAnimationType(null);
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

  const handleAnimationClose = () => setAnimationType(null);

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
                    {/* Заголовок окна */}
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

                    {/* Содержимое окна: имитация сообщения */}
                    <div className="window-content p-5 min-h-[320px]">
                      {session.current_step ? (
                        <div className="space-y-5">
                          <IncomingMessage step={session.current_step} threatType={session.current_step.threat_type} />
                          
                          <div className="action-buttons-grid mt-6">
                            <DecisionPanel 
                              options={session.current_step.options} 
                              disabled={loading || criticalPhase === "breaking" || !!animationType} 
                              onSelect={(id, text) => handleAnswer(id, text)} 
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

                    {/* Эффект разрушения при критической ошибке */}
                    {criticalPhase === "breaking" && (
                      <>
                        <div className="simulator-voxel-overlay" aria-hidden="true" />
                        <div className="simulator-voxel-overlay simulator-voxel-overlay-secondary" aria-hidden="true" />
                      </>
                    )}
                  </div>

                  {/* Обратная связь и разбор последствий */}
                  {feedback && criticalPhase === "impact" && feedback.severity === "critical" && !feedback.is_correct ? (
                    <div className="glass-card simulator-impact-panel">
                      <div className="simulator-impact-head">
                        <div className="feature-icon simulator-impact-icon">
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <p className="eyebrow">Критическая ошибка</p>
                          <h3 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">Атака развивается</h3>
                        </div>
                      </div>
                      <p className="body-copy mt-4 text-sm">{feedback.consequence_text}</p>
                      <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)]">{feedback.explanation}</p>
                      {feedback.hint && <p className="mt-4 text-sm text-[var(--color-text-muted)]">Подсказка: {feedback.hint}</p>}
                      <div className="mt-6">
                        <button type="button" className="secondary-button" onClick={() => setCriticalPhase("idle")}>
                          Продолжить миссию
                        </button>
                      </div>
                    </div>
                  ) : feedback ? (
                    <div className={`glass-card p-5 ${feedback.is_correct ? "correct-feedback" : "wrong-feedback"}`}>
                      <div className="flex items-start gap-3">
                        {feedback.is_correct ? <CheckCircle size={22} className="text-green-400 shrink-0 mt-0.5" /> : <XCircle size={22} className="text-red-400 shrink-0 mt-0.5" />}
                        <div>
                          <p className="font-medium">{feedback.consequence_text}</p>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{feedback.explanation}</p>
                          {feedback.hint && <p className="text-xs text-[var(--color-text-muted)] mt-2">💡 {feedback.hint}</p>}
                        </div>
                      </div>
                    </div>
                  ) : (
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
        <ConsequenceAnimationOverlay type={animationType} onClose={handleAnimationClose} />
      </div>
    </RequireAuth>
  );
}