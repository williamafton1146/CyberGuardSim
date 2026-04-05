"use client";

import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  CreditCard,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  QrCode,
  Shield,
  ShieldAlert,
  Smartphone,
  Wifi,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { DecisionPanel } from "@/components/scenario/DecisionPanel";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getScenarios, getStats, startSession, submitAnswer } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { connectSessionSocket } from "@/lib/ws";
import type { AnswerResult, ScenarioProgress, ScenarioStep, ScenarioSummary, SessionState } from "@/types";

import styles from "./MissionExperience.module.css";

type MissionSlug = "office" | "home" | "public-wifi";
type ConsequenceAnimation = "encrypt" | "disappear" | "leak" | null;
type LockedCompletion = {
  score: number;
  maxScore: number;
};

const missionMeta: Record<
  MissionSlug,
  {
    eyebrow: string;
    title: string;
    description: string;
    environment: string;
  }
> = {
  office: {
    eyebrow: "Офис",
    title: "Офисная почта и служебные сообщения",
    description: "Рабочее письмо, поддельный портал, запрос кода и корректное завершение инцидента в одном офисном маршруте.",
    environment: "Почта и служебные сообщения"
  },
  home: {
    eyebrow: "Дом",
    title: "Домашние аккаунты и смарт-устройства",
    description: "Уведомление о входе, повторный пароль, фальшивая защита и восстановление контроля над домашней средой.",
    environment: "Домашняя панель безопасности"
  },
  "public-wifi": {
    eyebrow: "Общественная сеть",
    title: "Public Wi‑Fi и поддельные маршруты входа",
    description: "Точка доступа, captive portal, предупреждение браузера и QR-ловушка в одном коротком сценарии.",
    environment: "Сети, портал и браузер"
  }
};

function getAnimationFromAction(optionText: string, feedback: AnswerResult): ConsequenceAnimation {
  const lowerText = optionText.toLowerCase();
  if (lowerText.includes("скачать") || lowerText.includes("вложение") || lowerText.includes("файл") || lowerText.includes("прилож")) {
    return "encrypt";
  }
  if (lowerText.includes("парол") || lowerText.includes("код") || lowerText.includes("войти") || lowerText.includes("кар")) {
    return "leak";
  }
  if (lowerText.includes("ссылка") || lowerText.includes("перейти") || lowerText.includes("qr") || lowerText.includes("портал")) {
    return "disappear";
  }
  if (!feedback.is_correct && feedback.severity === "critical") {
    return "encrypt";
  }
  return null;
}

function getThreatChecklist(threatType?: string | null) {
  const threat = threatType?.toLowerCase() ?? "";

  if (threat.includes("phishing") || threat.includes("spoofed") || threat.includes("фиш")) {
    return ["Проверить домен и адрес отправителя", "Не переходить по ссылке из письма без независимой проверки", "Открыть сервис только по известному маршруту"];
  }
  if (threat.includes("social") || threat.includes("соц")) {
    return ["Не действовать под давлением срочности", "Подтвердить личность через другой канал", "Никому не передавать коды и второй фактор"];
  }
  if (threat.includes("wifi") || threat.includes("portal") || threat.includes("captive") || threat.includes("middle")) {
    return ["Проверить имя сети и домен портала", "Не вводить рабочие данные на публичном экране", "При предупреждении о сертификате сменить сеть"];
  }
  if (threat.includes("password") || threat.includes("credential")) {
    return ["Проверить, не повторяется ли пароль в других сервисах", "Завершить чужие сессии", "Создать уникальные пароли и включить второй фактор"];
  }
  if (threat.includes("app")) {
    return ["Проверить издателя приложения", "Оценить запрашиваемые разрешения", "Не ставить «защитные» инструменты по подозрительным ссылкам"];
  }

  return ["Проверить источник запроса", "Не торопиться с действием", "Возвращаться в сервис только через официальный маршрут"];
}

function buildModalNarrative(feedback: AnswerResult, threatType?: string | null) {
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
      text: feedback.hint || "Остановить действие, проверить источник и вернуться в сервис только по официальному маршруту."
    },
    {
      title: "Что запомнить",
      text: getThreatChecklist(threatType).join(". ") + "."
    }
  ];
}

function getScoreEncouragement(score: number, maxScore: number, status: string) {
  if (status === "failed") {
    return "Сценарий прерван, но именно на таких точках и формируется внимательность к реальным атакам.";
  }
  if (score >= maxScore) {
    return "Максимальный результат зафиксирован. Такой паттерн уже можно считать устойчивым.";
  }
  if (score >= Math.round(maxScore * 0.75)) {
    return "Ещё чуть-чуть — одно перепрохождение может довести эту среду до максимума.";
  }
  return "Ну, тренировка не помешает: перепройдите среду ещё раз и соберите максимум.";
}

function ConsequenceAnimationOverlay({ type }: { type: ConsequenceAnimation }) {
  if (!type) {
    return null;
  }

  if (type === "encrypt") {
    return (
      <div className={styles.consequenceOverlay}>
        <div className={styles.consequenceContent}>
          <Lock size={46} className="animate-pulse text-[var(--color-alert)]" />
          <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">Атака получила развитие</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Неверное действие дало злоумышленнику время закрепиться и перейти к следующему этапу.
          </p>
          <div className={styles.consequenceBar}>
            <span className={styles.consequenceBarFill} />
          </div>
        </div>
      </div>
    );
  }

  if (type === "disappear") {
    return (
      <div className={styles.consequenceOverlay}>
        <div className={styles.consequenceContent}>
          <AlertTriangle size={46} className="text-[#ffba49]" />
          <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">Маршрут подключения подменён</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            Фальшивый портал или страница перевели атаку в активную фазу до настоящей проверки безопасности.
          </p>
          <div className={styles.consequenceBar}>
            <span className={styles.consequenceBarFill} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.consequenceOverlay}>
      <div className={styles.consequenceContent}>
        <AlertCircle size={46} className="text-[#ff9b54]" />
        <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">Чувствительные данные утекли</h3>
        <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
          Код, пароль или платёжные данные ушли туда, куда не должны были попасть.
        </p>
        <div className={styles.consequenceBar}>
          <span className={styles.consequenceBarFill} />
        </div>
      </div>
    </div>
  );
}

function ScenarioFeedbackOverlay({
  feedback,
  threatType,
  onClose
}: {
  feedback: AnswerResult;
  threatType?: string | null;
  onClose: () => void;
}) {
  const timeline = buildModalNarrative(feedback, threatType);

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.feedbackModal}>
        <div className={styles.feedbackHead}>
          <div className={`feature-icon ${feedback.severity === "critical" ? styles.feedbackIconCritical : ""}`}>
            {feedback.severity === "critical" ? <AlertTriangle size={18} /> : <ShieldAlert size={18} />}
          </div>
          <div>
            <p className="eyebrow">{feedback.severity === "critical" ? "Критическая ошибка" : "Разбор шага"}</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
              {feedback.severity === "critical" ? "Сначала остановите развитие атаки" : "Разберите опасное действие перед продолжением"}
            </h3>
          </div>
        </div>

        <div className={styles.feedbackChips}>
          <span>{feedback.severity === "critical" ? "Продолжение заблокировано до подтверждения" : "Подтвердите разбор и вернитесь в среду"}</span>
        </div>

        <div className="mt-6 space-y-3">
          {timeline.map((item, index) => (
            <div key={item.title} className={`soft-tile ${styles.feedbackTimelineCard}`}>
              <span className={styles.feedbackTimelineIndex}>0{index + 1}</span>
              <div>
                <p className={styles.feedbackTimelineTitle}>{item.title}</p>
                <p className={styles.feedbackTimelineCopy}>{item.text}</p>
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

function ScenarioDecisionOverlay({
  currentStep,
  scenarioTitle,
  totalSteps,
  loading,
  onClose,
  onSelect
}: {
  currentStep: ScenarioStep;
  scenarioTitle: string;
  totalSteps: number;
  loading: boolean;
  onClose: () => void;
  onSelect: (optionId: number) => void;
}) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.decisionModal}>
        <div className={styles.feedbackHead}>
          <div className="feature-icon">
            <Shield size={18} />
          </div>
          <div>
            <p className="eyebrow">{scenarioTitle}</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">Выберите следующее действие</h3>
          </div>
        </div>

        <div className={styles.feedbackChips}>
          <span>Шаг {currentStep.step_order} из {totalSteps}</span>
          <span>Решение засчитывается сразу после выбора</span>
        </div>

        <div className={styles.decisionPromptCard}>
          <p className={styles.decisionPrompt}>{currentStep.prompt}</p>
        </div>

        <div className="mt-6">
          <DecisionPanel options={currentStep.options} disabled={loading} onSelect={onSelect} />
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>
            Вернуться к среде
          </button>
        </div>
      </div>
    </div>
  );
}

type EnvironmentProps = {
  step: ScenarioStep;
  locked: boolean;
  onHotspot: () => void;
};

function SmsIllustration() {
  return (
    <div className={styles.sceneIllustration}>
      <svg viewBox="0 0 320 180" className={styles.sceneIllustrationSvg} aria-hidden="true">
        <rect x="90" y="10" width="140" height="160" rx="22" fill="var(--color-bg-soft)" stroke="var(--color-border)" />
        <rect x="110" y="28" width="100" height="14" rx="7" fill="var(--color-accent-soft)" />
        <rect x="104" y="58" width="104" height="34" rx="12" fill="var(--color-surface-strong)" />
        <rect x="122" y="69" width="68" height="8" rx="4" fill="var(--color-text-muted)" opacity="0.5" />
        <rect x="136" y="102" width="70" height="28" rx="14" fill="var(--color-accent-soft)" />
        <rect x="148" y="113" width="46" height="6" rx="3" fill="var(--color-accent)" opacity="0.65" />
        <rect x="114" y="136" width="92" height="18" rx="9" fill="rgba(255,123,103,0.14)" stroke="rgba(255,123,103,0.28)" />
      </svg>
    </div>
  );
}

function DeviceIllustration() {
  return (
    <div className={styles.sceneIllustration}>
      <svg viewBox="0 0 320 180" className={styles.sceneIllustrationSvg} aria-hidden="true">
        <rect x="28" y="34" width="124" height="84" rx="14" fill="var(--color-bg-soft)" stroke="var(--color-border)" />
        <rect x="40" y="48" width="62" height="10" rx="5" fill="var(--color-accent-soft)" />
        <rect x="40" y="66" width="88" height="8" rx="4" fill="var(--color-text-muted)" opacity="0.4" />
        <rect x="40" y="82" width="72" height="8" rx="4" fill="var(--color-text-muted)" opacity="0.3" />
        <rect x="190" y="16" width="90" height="148" rx="18" fill="var(--color-bg-soft)" stroke="var(--color-border)" />
        <rect x="206" y="34" width="58" height="58" rx="14" fill="var(--color-accent-soft)" />
        <rect x="214" y="112" width="42" height="10" rx="5" fill="var(--color-text-muted)" opacity="0.4" />
        <rect x="206" y="128" width="58" height="10" rx="5" fill="rgba(255,123,103,0.14)" />
      </svg>
    </div>
  );
}

function PortalIllustration() {
  return (
    <div className={styles.sceneIllustration}>
      <svg viewBox="0 0 320 180" className={styles.sceneIllustrationSvg} aria-hidden="true">
        <rect x="24" y="24" width="272" height="132" rx="18" fill="var(--color-bg-soft)" stroke="var(--color-border)" />
        <rect x="44" y="42" width="184" height="14" rx="7" fill="var(--color-surface-strong)" />
        <rect x="44" y="72" width="232" height="18" rx="9" fill="var(--color-accent-soft)" />
        <rect x="44" y="100" width="156" height="18" rx="9" fill="var(--color-surface-strong)" />
        <rect x="44" y="128" width="92" height="12" rx="6" fill="rgba(255,123,103,0.16)" />
      </svg>
    </div>
  );
}

function OfficeEnvironment({ step, locked, onHotspot }: EnvironmentProps) {
  const [view, setView] = useState<"inbox" | "email" | "portal" | "chat" | "recovery">(
    step.step_order === 1 ? "inbox" : step.step_order === 2 ? "portal" : step.step_order === 3 ? "chat" : "recovery"
  );

  useEffect(() => {
    setView(step.step_order === 1 ? "inbox" : step.step_order === 2 ? "portal" : step.step_order === 3 ? "chat" : "recovery");
  }, [step.step_order]);

  function activate(nextView: "email" | "portal" | "chat" | "recovery") {
    if (locked) {
      return;
    }
    setView(nextView);
    onHotspot();
  }

  return (
    <div className={styles.environmentShell}>
      <div className={styles.environmentToolbar}>
        <div className={styles.environmentToolbarTitle}>
          <Mail size={16} />
          <span>Рабочая почта</span>
        </div>
        <div className={styles.environmentToolbarMeta}>
          <span>Входящие</span>
          <span>Уведомления</span>
          <span>Поддержка</span>
        </div>
      </div>

      <div className={styles.mailLayout}>
        <aside className={styles.mailSidebar}>
          <div className={styles.mailCompose}>Новое письмо</div>
          <div className={styles.mailFolder}>Входящие</div>
          <div className={styles.mailFolderMuted}>Помеченные</div>
          <div className={styles.mailFolderMuted}>Черновики</div>
          <div className={styles.mailFolderMuted}>Архив</div>
        </aside>

        <section className={styles.mailList}>
          <button
            type="button"
            className={`${styles.mailRow} ${step.step_order === 1 ? styles.mailRowInteractive : styles.mailRowActive}`}
            onClick={() => activate("email")}
            disabled={locked || step.step_order !== 1}
          >
            <span className={styles.mailUnreadDot} />
            <div className={styles.mailRowCopy}>
              <strong>IT Support Team</strong>
              <span>Срочный сброс пароля перед созвоном</span>
            </div>
            <span className={styles.mailRowTime}>10:14</span>
          </button>
          <div className={styles.mailRow}>
            <div className={styles.mailRowCopy}>
              <strong>HR digest</strong>
              <span>План на неделю</span>
            </div>
            <span className={styles.mailRowTime}>09:07</span>
          </div>
          <div className={styles.mailRow}>
            <div className={styles.mailRowCopy}>
              <strong>Design review</strong>
              <span>Материалы к созвону</span>
            </div>
            <span className={styles.mailRowTime}>Вчера</span>
          </div>
        </section>

        <section className={styles.mailPreview}>
          {view === "inbox" ? (
            <div className={styles.scenePlaceholder}>
              Откройте непрочитанное письмо во входящих, чтобы увидеть содержимое и принять решение в привычном почтовом контексте.
            </div>
          ) : null}

          {view === "email" ? (
            <div className={styles.mailMessageCard}>
              <div className={styles.mailMessageHead}>
                <div>
                  <p className={styles.mailMessageSubject}>Срочный сброс пароля</p>
                  <p className={styles.mailMessageMeta}>От: IT Support Team &lt;alerts@corp-mail-support.security&gt;</p>
                </div>
                <span className={styles.mailSecurityBadge}>новое</span>
              </div>
              <p className={styles.mailBody}>
                Для восстановления доступа к рабочей почте перейдите по кнопке ниже и подтвердите учётную запись в течение 10 минут.
              </p>
              <div className={styles.mailFooterLine}>Письмо выглядит срочным и служебным, поэтому особенно важно проверить маршрут перехода, а не действовать автоматически.</div>
            </div>
          ) : null}

          {view === "portal" ? (
            <div className={styles.browserFrame}>
              <div className={styles.browserAddressBar}>https://portal-company-security-login.co/reset</div>
              <div className={styles.portalCard}>
                <p className={styles.portalTitle}>Подтверждение корпоративного аккаунта</p>
                <div className={styles.portalField}>Рабочий логин</div>
                <div className={styles.portalField}>Текущий пароль</div>
                <div className={styles.portalDangerHint}>Страница похожа на авторизацию, но домен не совпадает с привычным маршрутом компании.</div>
                <button type="button" className={styles.sceneActionButton} onClick={() => activate("portal")} disabled={locked || step.step_order !== 2}>
                  Проверить маршрут входа
                </button>
              </div>
            </div>
          ) : null}

          {view === "chat" ? (
            <div className={styles.chatCard}>
              <div className={styles.chatHeader}>
                <MessageCircle size={16} />
                <span>Служебный чат</span>
              </div>
              <SmsIllustration />
              <div className={styles.chatMessageMine}>Проверяю письмо от ИТ, разбираюсь с доступом.</div>
              <div className={styles.chatMessageIncoming}>Скиньте код из SMS прямо сейчас, иначе сорвётся вход перед созвоном.</div>
              <div className={styles.mailFooterLine}>Запрос выглядит срочным, но просит одноразовый код через сторонний канал. Такие действия нельзя выполнять без независимого подтверждения.</div>
              <button type="button" className={styles.sceneActionButton} onClick={() => activate("chat")} disabled={locked || step.step_order !== 3}>
                Разобрать запрос кода
              </button>
            </div>
          ) : null}

          {view === "recovery" ? (
            <div className={styles.securityCenterCard}>
              <p className={styles.portalTitle}>Security Center</p>
              <div className={styles.securityChecklist}>
                <span>Сменить пароль через официальный портал</span>
                <span>Завершить активные сессии</span>
                <span>Сообщить об инциденте в ИБ</span>
              </div>
              <button type="button" className={styles.sceneActionButton} onClick={() => activate("recovery")} disabled={locked || step.step_order !== 4}>
                Завершить инцидент безопасно
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function HomeEnvironment({ step, locked, onHotspot }: EnvironmentProps) {
  const [view, setView] = useState<"dashboard" | "incident" | "password" | "app" | "recovery">(
    step.step_order === 1 ? "dashboard" : step.step_order === 2 ? "password" : step.step_order === 3 ? "app" : "recovery"
  );

  function activate(nextView: "incident" | "password" | "app" | "recovery") {
    if (locked) {
      return;
    }
    setView(nextView);
    onHotspot();
  }

  return (
    <div className={styles.environmentShell}>
      <div className={styles.environmentToolbar}>
        <div className={styles.environmentToolbarTitle}>
          <Smartphone size={16} />
          <span>Домашний центр безопасности</span>
        </div>
        <div className={styles.environmentToolbarMeta}>
          <span>Устройства</span>
          <span>Пароли</span>
          <span>Приложения</span>
        </div>
      </div>

      <div className={styles.homeGrid}>
        <section className={styles.homeMainBoard}>
          <div className={styles.homeStatRow}>
            <div className={styles.homeStatCard}>
              <span>Устройств онлайн</span>
              <strong>5</strong>
            </div>
            <div className={styles.homeStatCard}>
              <span>Подключения</span>
              <strong>2 новых</strong>
            </div>
            <div className={styles.homeStatCard}>
              <span>Сигналы риска</span>
              <strong>1 критический</strong>
            </div>
          </div>

          <button
            type="button"
            className={`${styles.alertTile} ${step.step_order === 1 ? styles.alertTileInteractive : ""}`}
            onClick={() => activate("incident")}
            disabled={locked || step.step_order !== 1}
          >
            <ShieldAlert size={18} />
            <div>
              <strong>Новый вход в аккаунт камеры из другого города</strong>
              <span>Откройте карточку инцидента и решите, как действовать с доступом прямо сейчас.</span>
            </div>
          </button>

          <button
            type="button"
            className={`${styles.alertTile} ${step.step_order === 2 ? styles.alertTileInteractive : ""}`}
            onClick={() => activate("password")}
            disabled={locked || step.step_order !== 2}
          >
            <KeyRound size={18} />
            <div>
              <strong>Повторный пароль найден в нескольких сервисах</strong>
              <span>Откройте аудит паролей и разберите риск цепной компрометации.</span>
            </div>
          </button>

          <button
            type="button"
            className={`${styles.appCard} ${step.step_order === 3 ? styles.appCardInteractive : ""}`}
            onClick={() => activate("app")}
            disabled={locked || step.step_order !== 3}
          >
            <div className={styles.appCardHead}>
              <span className={styles.appStoreBadge}>новое</span>
              <span className={styles.appStoreRating}>4.9 ★</span>
            </div>
            <strong>Home Device Booster</strong>
            <span>Защитит все устройства за 30 секунд</span>
            <p>Просит доступ к SMS, экрану, файлам и специальным возможностям.</p>
          </button>
        </section>

        <aside className={styles.homeSidePanel}>
          {view === "dashboard" ? (
            <div className={styles.scenePlaceholder}>
              В домашней среде важные действия тоже выглядят обыденно: нужная карточка уже находится на панели, без скрытых кликов и лишних шагов.
            </div>
          ) : null}

          {view === "incident" ? (
            <div className={styles.sidePaneCard}>
              <p className={styles.portalTitle}>Детали нового входа</p>
              <DeviceIllustration />
              <div className={styles.securityChecklist}>
                <span>Локация: другой город</span>
                <span>Устройство: неизвестный браузер</span>
                <span>Время: 2 минуты назад</span>
              </div>
            </div>
          ) : null}

          {view === "password" ? (
            <div className={styles.sidePaneCard}>
              <p className={styles.portalTitle}>Аудит паролей</p>
              <div className={styles.securityChecklist}>
                <span>Почта — тот же пароль</span>
                <span>Камера — тот же пароль</span>
                <span>Smart home — тот же пароль</span>
              </div>
            </div>
          ) : null}

          {view === "app" ? (
            <div className={styles.sidePaneCard}>
              <p className={styles.portalTitle}>Разрешения приложения</p>
              <div className={styles.securityChecklist}>
                <span>Чтение SMS и уведомлений</span>
                <span>Доступ к экрану и special access</span>
                <span>Полный доступ к файлам устройства</span>
              </div>
            </div>
          ) : null}

          {view === "recovery" ? (
            <div className={styles.sidePaneCard}>
              <p className={styles.portalTitle}>Recovery Center</p>
              <div className={styles.securityChecklist}>
                <span>Сменить пароли</span>
                <span>Завершить активные сессии</span>
                <span>Проверить связанные устройства и почту</span>
              </div>
            </div>
          ) : null}

          {step.step_order === 4 ? (
            <button type="button" className={`${styles.alertTile} ${styles.alertTileInteractive}`} onClick={() => activate("recovery")} disabled={locked}>
              <CheckCircle size={18} />
              <div>
                <strong>Recovery Center: завершить инцидент</strong>
                <span>Закрепите безопасный алгоритм восстановления контроля над домашней средой.</span>
              </div>
            </button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function PublicWifiEnvironment({ step, locked, onHotspot }: EnvironmentProps) {
  const [view, setView] = useState<"wifi" | "connect" | "portal" | "warning" | "payment">(
    step.step_order === 1 ? "wifi" : step.step_order === 2 ? "portal" : step.step_order === 3 ? "warning" : "payment"
  );

  function activate(nextView: "connect" | "portal" | "warning" | "payment") {
    if (locked) {
      return;
    }
    setView(nextView);
    onHotspot();
  }

  return (
    <div className={styles.environmentShell}>
      <div className={styles.environmentToolbar}>
        <div className={styles.environmentToolbarTitle}>
          <Wifi size={16} />
          <span>Public Wi‑Fi</span>
        </div>
        <div className={styles.environmentToolbarMeta}>
          <span>Сети</span>
          <span>Портал</span>
          <span>Платёжная форма</span>
        </div>
      </div>

      {(view === "wifi" || view === "connect") && (
        <div className={styles.wifiStage}>
          <section className={styles.wifiListCard}>
            <p className={styles.portalTitle}>Доступные сети</p>
            <PortalIllustration />
            <div className="mt-4 space-y-3">
              <div className={styles.wifiRow}>
                <span>COFFEE_GUEST</span>
                <span>официальная</span>
              </div>
              <button
                type="button"
                className={`${styles.wifiRow} ${step.step_order === 1 ? styles.wifiRowInteractive : ""}`}
                onClick={() => activate("connect")}
                disabled={locked || step.step_order !== 1}
              >
                <span>Cafe_Free_Fast</span>
                <span>без ограничений</span>
              </button>
              <div className={styles.wifiRow}>
                <span>Airport Open</span>
                <span>слабый сигнал</span>
              </div>
            </div>
          </section>

          <section className={styles.wifiPanelCard}>
            {view === "connect" ? (
              <div className={styles.portalCard}>
                <p className={styles.portalTitle}>Подключение к Cafe_Free_Fast</p>
                <div className={styles.portalField}>QR для быстрого доступа</div>
                <div className={styles.portalDangerHint}>Сеть выглядит удобной, но не подтверждена заведением и просит нестандартный маршрут входа.</div>
              </div>
            ) : (
              <div className={styles.scenePlaceholder}>Выберите сеть из списка, чтобы увидеть следующий шаг подключения в реальном контексте public Wi‑Fi.</div>
            )}
          </section>
        </div>
      )}

      {view === "portal" && (
        <div className={styles.browserFrame}>
          <div className={styles.browserAddressBar}>guest-login.network-access.local</div>
          <div className={styles.portalCard}>
            <p className={styles.portalTitle}>Подтверждение гостя</p>
            <div className={styles.portalField}>Корпоративная почта</div>
            <div className={styles.portalField}>Банковская карта для проверки гостя</div>
            <div className={styles.portalDangerHint}>Captive portal запрашивает лишние рабочие и платёжные данные, которых обычный доступ к сети не требует.</div>
            <button type="button" className={styles.sceneActionButton} onClick={() => activate("portal")} disabled={locked}>
              Продолжить через портал
            </button>
          </div>
        </div>
      )}

      {view === "warning" && (
        <div className={styles.browserWarningFrame}>
          <div className={styles.browserAddressBar}>https://login.workspace.example</div>
          <div className={styles.browserWarningCard}>
            <div className={styles.browserWarningLead}>
              <div className={styles.browserWarningIcon}>
                <XCircle size={26} />
              </div>
              <div>
                <p className={styles.portalTitle}>Подключение не защищено</p>
                <p className={styles.warningCopy}>
                  Злоумышленники могут пытаться похитить ваши пароли, сообщения или данные карты с сайта login.workspace.example.
                </p>
              </div>
            </div>
            <div className={styles.browserWarningCode}>NET::ERR_CERT_AUTHORITY_INVALID</div>
            <div className={styles.browserWarningFacts}>
              <span>Сертификат для этого сайта недействителен или выдан недоверенным центром.</span>
              <span>Браузер не может подтвердить, что вы действительно открыли нужный портал входа.</span>
            </div>
            <button type="button" className={styles.sceneActionButton} onClick={() => activate("warning")} disabled={locked}>
              Игнорировать предупреждение
            </button>
          </div>
        </div>
      )}

      {view === "payment" && (
        <div className={styles.qrStage}>
          <section className={styles.qrCard}>
            <div className={styles.qrMock}>
              <QrCode size={90} />
            </div>
            <p className={styles.portalTitle}>Premium Wi‑Fi без ограничений</p>
            <p className={styles.warningCopy}>Сканируйте код и привяжите карту для “технической проверки”.</p>
          </section>
          <section className={styles.paymentPanel}>
            <button type="button" className={`${styles.paymentCard} ${styles.paymentCardInteractive}`} onClick={() => activate("payment")} disabled={locked}>
              <CreditCard size={18} />
              <div>
                <strong>Открыть привязку карты</strong>
                <span>Форма выглядит аккуратно, но сама схема не подтверждена заведением и начинается с случайного QR-кода.</span>
              </div>
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function MissionEnvironment({
  slug,
  currentStep,
  locked,
  onHotspot
}: {
  slug: MissionSlug;
  currentStep: ScenarioStep;
  locked: boolean;
  onHotspot: () => void;
}) {
  if (slug === "office") {
    return <OfficeEnvironment key={`${slug}-${currentStep.id}`} step={currentStep} locked={locked} onHotspot={onHotspot} />;
  }
  if (slug === "home") {
    return <HomeEnvironment key={`${slug}-${currentStep.id}`} step={currentStep} locked={locked} onHotspot={onHotspot} />;
  }
  return <PublicWifiEnvironment key={`${slug}-${currentStep.id}`} step={currentStep} locked={locked} onHotspot={onHotspot} />;
}

export function MissionExperience({ slug }: { slug: MissionSlug }) {
  const meta = missionMeta[slug];
  const socketRef = useRef<WebSocket | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [scenarioSummary, setScenarioSummary] = useState<ScenarioSummary | null>(null);
  const [scenarioProgress, setScenarioProgress] = useState<ScenarioProgress | null>(null);
  const [lockedCompletion, setLockedCompletion] = useState<LockedCompletion | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [criticalPhase, setCriticalPhase] = useState<"idle" | "breaking" | "impact">("idle");
  const [animationType, setAnimationType] = useState<ConsequenceAnimation>(null);
  const [pendingCriticalFeedback, setPendingCriticalFeedback] = useState<AnswerResult | null>(null);
  const [modalFeedback, setModalFeedback] = useState<AnswerResult | null>(null);
  const [feedbackThreatType, setFeedbackThreatType] = useState<string | null>(null);

  useEffect(() => {
    const currentToken = getToken();
    setToken(currentToken);

    if (!currentToken) {
      setLoading(false);
      return;
    }

    const activeToken = currentToken;

    let mounted = true;

    async function bootstrapMission() {
      setLoading(true);
      setError(null);
      setFeedback(null);
      setDecisionOpen(false);
      setModalFeedback(null);
      setPendingCriticalFeedback(null);
      setCriticalPhase("idle");
      setAnimationType(null);
      setFeedbackThreatType(null);
      setSession(null);
      setLockedCompletion(null);
      socketRef.current?.close();

      try {
        const [scenarioItemsResult, statsPayloadResult] = await Promise.allSettled([getScenarios(), getStats(activeToken)]);
        if (!mounted) {
          return;
        }

        if (scenarioItemsResult.status !== "fulfilled") {
          throw scenarioItemsResult.reason;
        }

        const scenarioItems = scenarioItemsResult.value;
        const statsPayload = statsPayloadResult.status === "fulfilled" ? statsPayloadResult.value : null;

        const summary = scenarioItems.find((item) => item.slug === slug) ?? null;
        const progress = statsPayload?.scenario_progress.find((item) => item.slug === slug) ?? null;

        setScenarioSummary(summary);
        setScenarioProgress(progress);

        if (summary && progress && progress.status === "completed" && progress.best_score >= summary.max_score) {
          setLockedCompletion({
            score: progress.best_score,
            maxScore: summary.max_score
          });
          setLoading(false);
          return;
        }

        let newSession: SessionState;
        try {
          newSession = await startSession(activeToken, slug);
        } catch (launchError) {
          const message = launchError instanceof Error ? launchError.message : "Не удалось запустить миссию";
          if (summary && message.toLowerCase().includes("максималь")) {
            setLockedCompletion({
              score: progress?.best_score ?? summary.max_score,
              maxScore: summary.max_score
            });
            setLoading(false);
            return;
          }
          throw launchError;
        }
        if (!mounted) {
          return;
        }

        setSession(newSession);
        socketRef.current = connectSessionSocket(newSession.session_id, activeToken, (payload) => {
          setSession((current) => (current?.session_id === payload.session_id ? payload : current));
        });
      } catch (launchError) {
        if (!mounted) {
          return;
        }
        setSession(null);
        setError(launchError instanceof Error ? launchError.message : "Не удалось запустить миссию");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void bootstrapMission();

    return () => {
      mounted = false;
      socketRef.current?.close();
    };
  }, [slug]);

  useEffect(() => {
    if (!pendingCriticalFeedback) {
      return;
    }

    setCriticalPhase("breaking");
    const impactTimer = window.setTimeout(() => setCriticalPhase("impact"), 900);
    const modalTimer = window.setTimeout(() => {
      setModalFeedback(pendingCriticalFeedback);
      setPendingCriticalFeedback(null);
      setAnimationType(null);
      setCriticalPhase("idle");
    }, 6100);

    return () => {
      window.clearTimeout(impactTimer);
      window.clearTimeout(modalTimer);
    };
  }, [pendingCriticalFeedback]);

  async function launchScenario(activeToken: string, scenarioSlug: MissionSlug) {
    setLoading(true);
    setError(null);
    setFeedback(null);
    setDecisionOpen(false);
    setModalFeedback(null);
    setPendingCriticalFeedback(null);
    setCriticalPhase("idle");
    setAnimationType(null);
    setFeedbackThreatType(null);
    setLockedCompletion(null);
    socketRef.current?.close();

    try {
      const newSession = await startSession(activeToken, scenarioSlug);
      setSession(newSession);
      socketRef.current = connectSessionSocket(newSession.session_id, activeToken, (payload) => {
        setSession((current) => (current?.session_id === payload.session_id ? payload : current));
      });
    } catch (launchError) {
      const message = launchError instanceof Error ? launchError.message : "Не удалось запустить миссию";
      if (scenarioSummary && message.toLowerCase().includes("максималь")) {
        setLockedCompletion({
          score: scenarioProgress?.best_score ?? scenarioSummary.max_score,
          maxScore: scenarioSummary.max_score
        });
        setSession(null);
        return;
      }
      setSession(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(optionId: number) {
    if (!token || !session || !session.current_step) {
      return;
    }

    const selectedOption = session.current_step.options.find((option) => option.id === optionId);
    const currentThreatType = session.current_step.threat_type ?? null;
    setLoading(true);
    setError(null);

    try {
      const result = await submitAnswer(token, session.session_id, optionId);
      setFeedback(result);
      setSession(result);
      setDecisionOpen(false);

      if (!result.is_correct) {
        if (result.severity === "critical") {
          setAnimationType(getAnimationFromAction(selectedOption?.label ?? "", result));
          setFeedbackThreatType(currentThreatType);
          setPendingCriticalFeedback(result);
        } else {
          setFeedbackThreatType(currentThreatType);
          setModalFeedback(result);
        }
      } else {
        setFeedbackThreatType(null);
      }
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : "Не удалось отправить решение");
    } finally {
      setLoading(false);
    }
  }

  const currentStep = session?.current_step ?? null;
  const stageLocked = loading || Boolean(modalFeedback) || Boolean(pendingCriticalFeedback) || criticalPhase !== "idle";
  const scenarioTitle = scenarioSummary?.title ?? meta.title;
  const summaryScore = lockedCompletion?.score ?? session?.score ?? scenarioProgress?.best_score ?? 0;
  const summaryMaxScore = lockedCompletion?.maxScore ?? session?.max_score ?? scenarioSummary?.max_score ?? 0;

  return (
    <RequireAuth>
      <div className="shell shell-wide space-y-8 py-12">
        <div className={styles.pageTopBar}>
          <Link href="/simulator" className="secondary-button">
            <ArrowLeft size={16} />
            К миссиям
          </Link>
        </div>

        <SectionTitle eyebrow={meta.eyebrow} title={scenarioTitle} description={meta.description} />

        {error && !lockedCompletion ? (
          <p className="rounded-[1.2rem] border border-[rgba(255,114,92,0.28)] bg-[var(--color-alert-soft)] px-4 py-3 text-sm text-[var(--color-alert)]">
            {error}
          </p>
        ) : null}

        <div className={styles.runtimeStack}>
          <div className={`glass-card ${styles.statusStrip}`}>
            <div className={styles.statusMetric}>
              <span className={styles.statusMetricLabel}>Security HP</span>
              <strong className={styles.statusMetricValue}>{session?.hp_left ?? 100}</strong>
            </div>
            <div className={styles.statusMetric}>
              <span className={styles.statusMetricLabel}>Очки</span>
              <strong className={styles.statusMetricValue}>{summaryScore}</strong>
              {summaryMaxScore ? <span className={styles.statusMetricMeta}>из {summaryMaxScore}</span> : null}
            </div>
            <div className={styles.statusMetric}>
              <span className={styles.statusMetricLabel}>Прогресс</span>
              <strong className={styles.statusMetricValue}>
                {session ? `${Math.min(session.step_number, session.total_steps)} / ${session.total_steps}` : lockedCompletion ? "Максимум" : "Подготовка"}
              </strong>
            </div>
          </div>

          {loading && !session && !lockedCompletion ? (
            <div className="glass-card p-8 text-sm text-[var(--color-text-muted)]">
              Подготавливаем среду, запускаем игровую сессию и собираем контекст миссии.
            </div>
          ) : null}

          {lockedCompletion ? (
            <div className={`glass-card ${styles.summaryShell}`}>
              <p className={styles.summaryKicker}>Сценарий уже закрыт</p>
              <h3 className={styles.summaryTitle}>Максимальный результат уже зафиксирован</h3>
              <div className={styles.summaryScoreRow}>
                <span className={styles.summaryScore}>{lockedCompletion.score}</span>
                <span className={styles.summaryScoreMeta}>из {lockedCompletion.maxScore} очков</span>
              </div>
              <p className={styles.summaryCopy}>Эта миссия уже пройдена на максимум, поэтому новая игровая сессия не запускается повторно.</p>
              <div className={styles.summaryActions}>
                <Link href="/simulator" className="secondary-button">
                  Вернуться к миссиям
                </Link>
              </div>
            </div>
          ) : null}

          {session ? (
            currentStep ? (
              <MissionEnvironment slug={slug} currentStep={currentStep} locked={stageLocked || decisionOpen} onHotspot={() => setDecisionOpen(true)} />
            ) : (
              <div className={`glass-card ${styles.summaryShell}`}>
                <p className={styles.summaryKicker}>{session.status === "completed" ? "Сценарий завершён" : "Сценарий остановлен"}</p>
                <h3 className={styles.summaryTitle}>{session.status === "completed" ? "Итог зафиксирован" : "Нужна ещё одна попытка"}</h3>
                <div className={styles.summaryScoreRow}>
                  <span className={styles.summaryScore}>{session.score}</span>
                  <span className={styles.summaryScoreMeta}>из {session.max_score} очков</span>
                </div>
                <p className={styles.summaryCopy}>{getScoreEncouragement(session.score, session.max_score, session.status)}</p>
                <div className={styles.summaryActions}>
                  {session.score < session.max_score && token ? (
                    <button type="button" className="primary-button" onClick={() => launchScenario(token, slug)}>
                      Перепройти
                    </button>
                  ) : null}
                  <Link href="/simulator" className="secondary-button">
                    Вернуться к миссиям
                  </Link>
                </div>
              </div>
            )
          ) : !loading && !lockedCompletion ? (
            <div className="glass-card p-8">
              <AlertCircle size={28} className="mb-4 text-[var(--color-alert)]" />
              <h3 className="text-2xl font-semibold text-[var(--color-text-primary)]">Среда не запустилась</h3>
              <p className="body-copy mt-3 max-w-2xl">
                Если сценарий ещё не опубликован или временно недоступен, запустить его нельзя. Вернитесь в каталог миссий и выберите другую среду.
              </p>
            </div>
          ) : null}

          {feedback && feedback.is_correct && session?.current_step ? (
            <div className={`glass-card ${styles.feedbackNotice}`}>
              <CheckCircle size={20} className={styles.successIcon} />
              <div>
                <p className={styles.feedbackNoticeTitle}>Безопасный паттерн закреплён</p>
                <p className={styles.feedbackNoticeCopy}>{feedback.explanation}</p>
              </div>
            </div>
          ) : null}
        </div>

        <ConsequenceAnimationOverlay type={animationType} />

        {decisionOpen && currentStep ? (
          <ScenarioDecisionOverlay
            currentStep={currentStep}
            scenarioTitle={scenarioTitle}
            totalSteps={session?.total_steps ?? 0}
            loading={loading}
            onClose={() => setDecisionOpen(false)}
            onSelect={handleAnswer}
          />
        ) : null}

        {modalFeedback ? (
          <ScenarioFeedbackOverlay
            feedback={modalFeedback}
            threatType={feedbackThreatType}
            onClose={() => {
              setModalFeedback(null);
              setFeedbackThreatType(null);
            }}
          />
        ) : null}
      </div>
    </RequireAuth>
  );
}
