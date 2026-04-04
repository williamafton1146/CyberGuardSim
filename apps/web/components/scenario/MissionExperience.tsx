"use client";

import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CheckCircle,
  CircleGauge,
  CreditCard,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  QrCode,
  Shield,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Wifi,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { DecisionPanel } from "@/components/scenario/DecisionPanel";
import { HPMeter } from "@/components/scenario/HPMeter";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getScenarios, startSession, submitAnswer } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { connectSessionSocket } from "@/lib/ws";
import type { AnswerResult, ScenarioStep, ScenarioSummary, SessionState } from "@/types";

import styles from "./MissionExperience.module.css";

type MissionSlug = "office" | "home" | "public-wifi";
type ConsequenceAnimation = "encrypt" | "disappear" | "leak" | null;

const missionMeta: Record<
  MissionSlug,
  {
    eyebrow: string;
    title: string;
    description: string;
    environment: string;
    runtimeHint: string;
    hotspotHints: Record<number, string>;
  }
> = {
  office: {
    eyebrow: "Office mission",
    title: "Офисная почта и служебные сообщения",
    description: "Письмо, поддельная ссылка, срочный запрос кода и безопасное завершение инцидента — всё внутри привычной рабочей среды.",
    environment: "Почтовый клиент и служебные уведомления",
    runtimeHint: "Смотрите на источник, домен и давление срочностью. В этой среде опасность маскируется под рабочую рутину.",
    hotspotHints: {
      1: "Откройте новое письмо во входящих.",
      2: "Нажмите на подозрительную кнопку внутри письма.",
      3: "Откройте всплывшее сообщение от «руководителя».",
      4: "Запустите панель восстановления и завершения инцидента."
    }
  },
  home: {
    eyebrow: "Home mission",
    title: "Домашние аккаунты и смарт-устройства",
    description: "Уведомления о входах, повторное использование пароля, фальшивое защитное приложение и восстановление контроля над домашной средой.",
    environment: "Security dashboard и магазин приложений",
    runtimeHint: "Домашние сервисы тоже требуют ИБ-дисциплины: уведомления, пароли и разрешения приложений связаны между собой.",
    hotspotHints: {
      1: "Откройте тревожное уведомление о новом входе.",
      2: "Перейдите в блок проверки повторно используемых паролей.",
      3: "Откройте карточку подозрительного «защитного» приложения.",
      4: "Запустите локальный recovery-center для завершения инцидента."
    }
  },
  "public-wifi": {
    eyebrow: "Public Wi‑Fi mission",
    title: "Общественная сеть и поддельные маршруты входа",
    description: "Подозрительная точка доступа, captive portal, предупреждение о сертификате и QR-платёжная ловушка собираются в короткий реалистичный маршрут.",
    environment: "Сети, браузер и public portal",
    runtimeHint: "В общественной сети опасность часто начинается раньше ввода логина: уже сам маршрут подключения может быть подменён.",
    hotspotHints: {
      1: "Выберите подозрительную сеть из списка точек доступа.",
      2: "Откройте captive portal с лишними запросами данных.",
      3: "Нажмите на опасное продолжение соединения в браузере.",
      4: "Откройте QR-экран с привязкой карты."
    }
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
      title: "На что смотреть в этом типе атаки",
      text: getThreatChecklist(threatType).join(". ") + "."
    }
  ];
}

function getScoreEncouragement(score: number, maxScore: number, status: string) {
  if (status === "failed") {
    return "Сценарий прерван, но именно в таких точках и формируется внимательность к реальным атакам.";
  }
  if (score >= maxScore) {
    return "Максимальный результат зафиксирован. Такой паттерн уже можно считать устойчивым.";
  }
  if (score >= Math.round(maxScore * 0.75)) {
    return "Ещё чуть-чуть — одно перепрохождение может довести этот сценарий до максимума.";
  }
  return "Ну, тренировка не помешает: перепройдите среду ещё раз и соберите максимум.";
}

function getHotspotHint(slug: MissionSlug, stepNumber: number) {
  return missionMeta[slug].hotspotHints[stepNumber] ?? "Найдите активный объект среды и откройте его.";
}

function getPositiveLabel(feedback: AnswerResult | null) {
  if (!feedback || !feedback.is_correct) {
    return null;
  }
  return feedback.completed ? "Сценарий завершён" : "Безопасный паттерн закреплён";
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
            <p className="eyebrow">{feedback.severity === "critical" ? "Критическая ошибка" : "Нужна корректировка"}</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
              {feedback.severity === "critical" ? "Атаку нужно срочно останавливать" : "Сначала разберите опасный шаг"}
            </h3>
          </div>
        </div>

        <div className={styles.feedbackChips}>
          <span>{feedback.severity === "critical" ? "Прохождение временно заблокировано" : "Разбор шага открыт поверх среды"}</span>
          <span>{threatType ?? "Контекст атаки требует проверки"}</span>
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
  loading,
  onClose,
  onSelect
}: {
  currentStep: ScenarioStep;
  scenarioTitle: string;
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

        <div className={styles.decisionThreatRow}>
          <span className={styles.decisionThreatChip}>{currentStep.threat_type}</span>
          <span className={styles.decisionStepMarker}>Шаг {currentStep.step_order}</span>
        </div>

        <div className={styles.decisionPromptCard}>
          <p className={styles.decisionPrompt}>{currentStep.prompt}</p>
        </div>

        <div className="mt-6">
          <DecisionPanel options={currentStep.options} disabled={loading} onSelect={onSelect} />
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <div className={styles.decisionChecklist}>
            {getThreatChecklist(currentStep.threat_type).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
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

function OfficeEnvironment({ step, locked, onHotspot }: EnvironmentProps) {
  const [view, setView] = useState<"inbox" | "email" | "portal" | "chat" | "recovery">(
    step.step_order === 1 ? "inbox" : step.step_order === 2 ? "email" : step.step_order === 3 ? "email" : "recovery"
  );

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
          <span>Workspace Mail</span>
        </div>
        <div className={styles.environmentToolbarMeta}>
          <span>Входящие</span>
          <span>Безопасность</span>
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
            className={`${styles.mailRow} ${styles.mailRowActive} ${step.step_order === 1 ? styles.hotspotPulse : ""}`}
            onClick={() => activate("email")}
            disabled={locked || step.step_order !== 1}
          >
            <span className={styles.mailUnreadDot} />
            <div className={styles.mailRowCopy}>
              <strong>IT Support Team</strong>
              <span>Срочный сброс пароля</span>
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
              Откройте входящее письмо, чтобы увидеть содержимое и решить, как действовать дальше.
            </div>
          ) : null}

          {view === "email" ? (
            <div className={styles.mailMessageCard}>
              <div className={styles.mailMessageHead}>
                <div>
                  <p className={styles.mailMessageSubject}>Срочный сброс пароля</p>
                  <p className={styles.mailMessageMeta}>От: IT Support Team &lt;alerts@corp-mail-support.security&gt;</p>
                </div>
                <span className={styles.mailSecurityBadge}>new</span>
              </div>
              <p className={styles.mailBody}>
                Для восстановления доступа к рабочей почте перейдите по ссылке и подтвердите логин в течение 10 минут.
              </p>

              {step.step_order === 2 ? (
                <button
                  type="button"
                  className={`${styles.sceneActionButton} ${styles.hotspotPulse}`}
                  onClick={() => activate("portal")}
                  disabled={locked}
                >
                  Проверить аккаунт
                </button>
              ) : (
                <div className={styles.mailFooterLine}>
                  <span>Сначала проверьте отправителя и маршрут перехода.</span>
                </div>
              )}
            </div>
          ) : null}

          {view === "portal" ? (
            <div className={styles.browserFrame}>
              <div className={styles.browserAddressBar}>https://portal-company-security-login.co/reset</div>
              <div className={styles.portalCard}>
                <p className={styles.portalTitle}>Подтверждение корпоративного аккаунта</p>
                <div className={styles.portalField}>Введите рабочий логин</div>
                <div className={styles.portalField}>Введите пароль</div>
                <div className={styles.portalDangerHint}>Портал выглядит как авторизация, но домен и маршрут подозрительны.</div>
              </div>
            </div>
          ) : null}

          {view === "chat" ? (
            <div className={styles.chatCard}>
              <div className={styles.chatHeader}>
                <MessageCircle size={16} />
                <span>Корпоративный чат</span>
              </div>
              <div className={styles.chatMessageMine}>Есть минутка? Проверь письмо от ИТ.</div>
              <div className={styles.chatMessageIncoming}>Срочно нужен код из SMS, чтобы разблокировать почту перед созвоном.</div>
            </div>
          ) : null}

          {view === "recovery" ? (
            <div className={styles.securityCenterCard}>
              <p className={styles.portalTitle}>Security Center</p>
              <div className={styles.securityChecklist}>
                <span>Сменить пароль через официальный портал</span>
                <span>Завершить активные сессии</span>
                <span>Оформить инцидент в ИБ</span>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {step.step_order === 3 ? (
        <button
          type="button"
          className={`${styles.chatToast} ${styles.hotspotPulse}`}
          onClick={() => activate("chat")}
          disabled={locked}
        >
          <BellRing size={16} />
          <div>
            <strong>Новое сообщение от Руководителя</strong>
            <span>“Скиньте код из SMS прямо сейчас”</span>
          </div>
        </button>
      ) : null}

      {step.step_order === 4 ? (
        <button
          type="button"
          className={`${styles.inlineMissionBanner} ${styles.hotspotPulse}`}
          onClick={() => activate("recovery")}
          disabled={locked}
        >
          <ShieldAlert size={16} />
          Завершить инцидент через Security Center
        </button>
      ) : null}
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
          <span>Home Security Center</span>
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

          {step.step_order === 1 ? (
            <button type="button" className={`${styles.alertTile} ${styles.hotspotPulse}`} onClick={() => activate("incident")} disabled={locked}>
              <ShieldAlert size={18} />
              <div>
                <strong>Новый вход в аккаунт камеры из другого города</strong>
                <span>Нажмите, чтобы открыть детали и решить, как реагировать.</span>
              </div>
            </button>
          ) : null}

          {step.step_order === 2 ? (
            <button type="button" className={`${styles.alertTile} ${styles.hotspotPulse}`} onClick={() => activate("password")} disabled={locked}>
              <KeyRound size={18} />
              <div>
                <strong>Повторный пароль найден в нескольких сервисах</strong>
                <span>Откройте аудит паролей и разберите риск цепной компрометации.</span>
              </div>
            </button>
          ) : null}

          {step.step_order === 3 ? (
            <button type="button" className={`${styles.appCard} ${styles.hotspotPulse}`} onClick={() => activate("app")} disabled={locked}>
              <div className={styles.appCardHead}>
                <span className={styles.appStoreBadge}>New</span>
                <span className={styles.appStoreRating}>4.9 ★</span>
              </div>
              <strong>Home Device Booster</strong>
              <span>Защитит все устройства за 30 секунд</span>
              <p>Просит доступ к SMS, экрану, файлам и специальным возможностям.</p>
            </button>
          ) : null}

          {step.step_order === 4 ? (
            <button type="button" className={`${styles.alertTile} ${styles.hotspotPulse}`} onClick={() => activate("recovery")} disabled={locked}>
              <CheckCircle size={18} />
              <div>
                <strong>Recovery Center: завершить инцидент</strong>
                <span>Откройте финальную панель восстановления доступа и закрепите безопасный алгоритм.</span>
              </div>
            </button>
          ) : null}
        </section>

        <aside className={styles.homeSidePanel}>
          {view === "dashboard" ? <div className={styles.scenePlaceholder}>Выберите тревожный объект, чтобы открыть нужный эпизод внутри домашней среды.</div> : null}

          {view === "incident" ? (
            <div className={styles.sidePaneCard}>
              <p className={styles.portalTitle}>Детали входа</p>
              <div className={styles.securityChecklist}>
                <span>Локация: другой город</span>
                <span>Устройство: неизвестный браузер</span>
                <span>Время: 2 минуты назад</span>
              </div>
            </div>
          ) : null}

          {view === "password" ? (
            <div className={styles.sidePaneCard}>
              <p className={styles.portalTitle}>Password health</p>
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
                <span>Проверить связанный email и устройства</span>
              </div>
            </div>
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
          <span>Public Wi‑Fi Access</span>
        </div>
        <div className={styles.environmentToolbarMeta}>
          <span>Сети</span>
          <span>Порталы</span>
          <span>Платежи</span>
        </div>
      </div>

      {view === "wifi" || view === "connect" ? (
        <div className={styles.wifiStage}>
          <section className={styles.wifiListCard}>
            <p className={styles.portalTitle}>Доступные сети</p>
            <div className="mt-4 space-y-3">
              <div className={styles.wifiRow}>
                <span>COFFEE_GUEST</span>
                <span>официальная</span>
              </div>
              <button type="button" className={`${styles.wifiRow} ${styles.hotspotPulse}`} onClick={() => activate("connect")} disabled={locked || step.step_order !== 1}>
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
                <div className={styles.portalField}>QR для быстрого подключения</div>
                <div className={styles.portalDangerHint}>Сеть выглядит удобной, но не подтверждена заведением.</div>
              </div>
            ) : (
              <div className={styles.scenePlaceholder}>Выберите сеть, чтобы открыть следующий шаг подключения.</div>
            )}
          </section>
        </div>
      ) : null}

      {view === "portal" ? (
        <div className={styles.browserFrame}>
          <div className={styles.browserAddressBar}>guest-login.network-access.local</div>
          <div className={styles.portalCard}>
            <p className={styles.portalTitle}>Подтверждение гостя</p>
            <div className={styles.portalField}>Корпоративная почта</div>
            <div className={styles.portalField}>Банковская карта для проверки гостя</div>
            <button type="button" className={`${styles.sceneActionButton} ${styles.hotspotPulse}`} onClick={() => activate("portal")} disabled={locked}>
              Продолжить через портал
            </button>
          </div>
        </div>
      ) : null}

      {view === "warning" ? (
        <div className={styles.browserWarningFrame}>
          <div className={styles.browserAddressBar}>http://login.workspace.example</div>
          <div className={styles.browserWarningCard}>
            <AlertTriangle size={28} className="text-[var(--color-alert)]" />
            <div>
              <p className={styles.portalTitle}>Соединение не защищено</p>
              <p className={styles.warningCopy}>Сертификат не подтверждён, а страница логина открывается по HTTP.</p>
            </div>
            <button type="button" className={`${styles.sceneActionButton} ${styles.hotspotPulse}`} onClick={() => activate("warning")} disabled={locked}>
              Всё равно продолжить
            </button>
          </div>
        </div>
      ) : null}

      {view === "payment" ? (
        <div className={styles.qrStage}>
          <section className={styles.qrCard}>
            <div className={styles.qrMock}>
              <QrCode size={90} />
            </div>
            <p className={styles.portalTitle}>Premium Wi‑Fi без ограничений</p>
            <p className={styles.warningCopy}>Сканируйте код и привяжите карту для “технической проверки”.</p>
          </section>
          <section className={styles.paymentPanel}>
            <button type="button" className={`${styles.paymentCard} ${styles.hotspotPulse}`} onClick={() => activate("payment")} disabled={locked}>
              <CreditCard size={18} />
              <div>
                <strong>Открыть привязку карты</strong>
                <span>Форма выглядит аккуратно, но сама схема не подтверждена заведением.</span>
              </div>
            </button>
          </section>
        </div>
      ) : null}

      {step.step_order === 2 && view !== "portal" ? (
        <button type="button" className={`${styles.inlineMissionBanner} ${styles.hotspotPulse}`} onClick={() => activate("portal")} disabled={locked}>
          <Wifi size={16} />
          Открыть captive portal
        </button>
      ) : null}
      {step.step_order === 3 && view !== "warning" ? (
        <button type="button" className={`${styles.inlineMissionBanner} ${styles.hotspotPulse}`} onClick={() => activate("warning")} disabled={locked}>
          <AlertTriangle size={16} />
          Открыть предупреждение браузера
        </button>
      ) : null}
      {step.step_order === 4 && view !== "payment" ? (
        <button type="button" className={`${styles.inlineMissionBanner} ${styles.hotspotPulse}`} onClick={() => activate("payment")} disabled={locked}>
          <QrCode size={16} />
          Открыть QR-платёжный экран
        </button>
      ) : null}
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
      return;
    }

    let mounted = true;

    getScenarios()
      .then((items) => {
        if (!mounted) {
          return;
        }
        setScenarioSummary(items.find((item) => item.slug === slug) ?? null);
      })
      .catch(() => {
        if (mounted) {
          setScenarioSummary(null);
        }
      });

    void launchScenario(currentToken, slug);

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
    socketRef.current?.close();

    try {
      const newSession = await startSession(activeToken, scenarioSlug);
      setSession(newSession);
      socketRef.current = connectSessionSocket(newSession.session_id, activeToken, (payload) => {
        setSession((current) => (current?.session_id === payload.session_id ? payload : current));
      });
    } catch (launchError) {
      setSession(null);
      setError(launchError instanceof Error ? launchError.message : "Не удалось запустить миссию");
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
  const positiveFeedbackLabel = useMemo(() => getPositiveLabel(feedback), [feedback]);
  const checklist = getThreatChecklist(currentStep?.threat_type);

  return (
    <RequireAuth>
      <div className="shell shell-wide space-y-10 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/simulator" className="secondary-button">
            <ArrowLeft size={16} />
            Назад к миссиям
          </Link>
          <div className={styles.routeBadge}>{meta.environment}</div>
        </div>

        <SectionTitle eyebrow={meta.eyebrow} title={scenarioSummary?.title ?? meta.title} description={meta.description} />

        {error ? (
          <p className="rounded-[1.2rem] border border-[rgba(255,114,92,0.28)] bg-[var(--color-alert-soft)] px-4 py-3 text-sm text-[var(--color-alert)]">
            {error}
          </p>
        ) : null}

        <div className={styles.missionLayout}>
          <div className={styles.missionStageColumn}>
            {loading && !session ? (
              <div className="glass-card p-8 text-sm text-[var(--color-text-muted)]">
                Подготавливаем среду, запускаем новую игровую сессию и собираем актуальный контекст миссии.
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
                  <div className="mt-4 flex flex-wrap gap-3">
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
            ) : !loading ? (
              <div className="glass-card p-8">
                <AlertCircle size={28} className="mb-4 text-[var(--color-alert)]" />
                <h3 className="text-2xl font-semibold text-[var(--color-text-primary)]">Среда не запустилась</h3>
                <p className="body-copy mt-3 max-w-2xl">
                  Если сценарий ещё не опубликован или временно недоступен, запустить его нельзя. Вернитесь в каталог миссий и выберите другую среду.
                </p>
              </div>
            ) : null}
          </div>

          <aside className={styles.missionRail}>
            {session ? (
              <HPMeter
                hp={session.hp_left}
                score={session.score}
                stepNumber={Math.min(session.step_number, session.total_steps)}
                totalSteps={session.total_steps}
              />
            ) : (
              <div className="glass-card p-6">
                <p className="eyebrow">Состояние</p>
                <p className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Ожидание запуска</p>
                <p className="body-copy mt-3 text-sm">После старта миссии здесь появятся HP, очки и текущий прогресс сценария.</p>
              </div>
            )}

            <div className="glass-card p-6">
              <p className="eyebrow">Подсказка среды</p>
              <h3 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">
                {session?.current_step ? getHotspotHint(slug, session.current_step.step_order) : "Выберите активный объект миссии"}
              </h3>
              <p className="body-copy mt-3 text-sm">{meta.runtimeHint}</p>
              <div className="mt-5 space-y-3">
                {checklist.map((item) => (
                  <div key={item} className={`soft-tile ${styles.railChecklistItem}`}>
                    <Shield size={14} className="shrink-0 text-[var(--color-accent)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {feedback && feedback.is_correct ? (
              <div className="glass-card p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle size={22} className={`mt-0.5 shrink-0 ${styles.successIcon}`} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{positiveFeedbackLabel}</p>
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
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                      {feedback.severity === "critical" ? "Критическая ошибка" : "Разбор открыт"}
                    </p>
                    <p className="mt-3 font-medium text-[var(--color-text-primary)]">{feedback.consequence_text}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                      Сначала разберите ошибку в модальном окне, затем вернитесь к среде и примите следующее решение.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 text-sm text-[var(--color-text-muted)]">
                После клика по активному объекту среды откроется decision overlay с вариантами действий и разбором последствий.
              </div>
            )}

            <div className="glass-card p-6">
              <p className="eyebrow">Маршрут</p>
              <div className="mt-5 space-y-3">
                <div className={`soft-tile ${styles.progressMarker}`}>
                  <CircleGauge size={16} />
                  <span>{session ? `Шаг ${Math.min(session.step_number, session.total_steps)} из ${session.total_steps}` : "Сессия готовится"}</span>
                </div>
                <div className={`soft-tile ${styles.progressMarker}`}>
                  <Sparkles size={16} />
                  <span>{session?.current_step ? session.current_step.threat_type : "Ожидаем активный шаг"}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <ConsequenceAnimationOverlay type={animationType} />

        {decisionOpen && currentStep ? (
          <ScenarioDecisionOverlay
            currentStep={currentStep}
            scenarioTitle={session?.scenario_title ?? meta.title}
            loading={loading}
            onClose={() => setDecisionOpen(false)}
            onSelect={handleAnswer}
          />
        ) : null}

        {modalFeedback ? (
          <ScenarioFeedbackOverlay
            feedback={modalFeedback}
            threatType={feedbackThreatType ?? session?.current_step?.threat_type}
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
