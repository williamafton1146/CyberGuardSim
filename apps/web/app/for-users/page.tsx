"use client";

import { AlertTriangle, ShieldCheck, Smartphone, Wifi, X } from "lucide-react";
import { useMemo, useState } from "react";

import { SectionTitle } from "@/components/ui/SectionTitle";

type GuideCard = {
  id: string;
  title: string;
  kicker: string;
  summary: string;
  safeAction: string;
  riskResult: string;
};

const guideCards: GuideCard[] = [
  {
    id: "sms-code",
    kicker: "Коды и звонки",
    title: "Не сообщайте коды из SMS и push",
    summary: "Если у вас просят код подтверждения, значит кто-то пытается войти в ваш аккаунт вместо вас.",
    safeAction: "Никому не передавайте код, завершите разговор и зайдите в сервис только через официальный сайт или приложение.",
    riskResult: "Переданный код может дать злоумышленнику доступ к почте, банку, маркетплейсу или Госуслугам."
  },
  {
    id: "safe-account",
    kicker: "Телефонное мошенничество",
    title: "Не верьте в “безопасный счёт”",
    summary: "Настоящие сотрудники банка или госорганов не переводят людей на “резервные” счета по телефону.",
    safeAction: "Прервите разговор и сами перезвоните в банк или организацию по номеру с официального сайта или карты.",
    riskResult: "Перевод на “защищённый счёт” — это обычная передача денег мошенникам без шанса откатить операцию."
  },
  {
    id: "phishing-link",
    kicker: "Письма и ссылки",
    title: "Проверяйте адрес сайта до входа",
    summary: "Фишинговые страницы часто выглядят почти как настоящие, но отличаются доменом, текстом или странной срочностью.",
    safeAction: "Открывайте важные сервисы только по своим закладкам или вручную набранному адресу, а не по ссылке из письма или чата.",
    riskResult: "Если ввести пароль на поддельном сайте, учётные данные уйдут атакующему сразу после отправки формы."
  },
  {
    id: "unique-passwords",
    kicker: "Парольная гигиена",
    title: "Не повторяйте один и тот же пароль",
    summary: "Одна утечка превращается в цепочку взломов, если одинаковый пароль используется в почте, магазинах и соцсетях.",
    safeAction: "Используйте длинные уникальные пароли и храните их в менеджере паролей.",
    riskResult: "После утечки на одном сервисе злоумышленник может автоматически зайти в другие ваши аккаунты."
  },
  {
    id: "public-wifi",
    kicker: "Публичный интернет",
    title: "Осторожнее с открытым Wi‑Fi",
    summary: "Поддельные точки доступа и странные captive portal особенно опасны, если они просят лишние данные.",
    safeAction: "Проверяйте название сети у сотрудников заведения и не вводите пароли, рабочую почту или карту на сомнительных формах входа.",
    riskResult: "Через фальшивый Wi‑Fi или подменённый портал можно украсть пароли, реквизиты карты и содержимое сессии."
  },
  {
    id: "suspicious-app",
    kicker: "Приложения",
    title: "Проверяйте, какие права просит приложение",
    summary: "Поддельные “полезные” приложения часто хотят доступ к SMS, файлам и специальным возможностям без реальной причины.",
    safeAction: "Смотрите на издателя, источник установки и набор разрешений до скачивания.",
    riskResult: "Лишние разрешения могут превратить приложение в инструмент для кражи сообщений, фото, кодов и учётных данных."
  },
  {
    id: "qr-codes",
    kicker: "QR и платежи",
    title: "Не сканируйте случайные QR-коды",
    summary: "QR-код может вести не на меню и не на Wi‑Fi, а на фишинговую или платёжную подмену.",
    safeAction: "Сканируйте QR только из проверенного контекста и внимательно читайте адрес до подтверждения перехода или оплаты.",
    riskResult: "Поддельная QR-страница может отправить вас на фишинг или незаметно втянуть в оплату мошенникам."
  },
  {
    id: "incident-response",
    kicker: "После инцидента",
    title: "Если заметили взлом, не тяните",
    summary: "Подозрительный вход, чужая сессия или неожиданный код — это не повод “проверить потом”, а сигнал действовать сразу.",
    safeAction: "Смените пароль, завершите активные сессии, включите 2FA и проверьте связанные сервисы.",
    riskResult: "Если отложить реакцию, злоумышленник успеет закрепиться и использовать один доступ для атаки на другие аккаунты."
  }
];

export const dynamic = "force-dynamic";

export default function ForUsersPage() {
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const activeGuide = useMemo(() => guideCards.find((card) => card.id === activeGuideId) || null, [activeGuideId]);

  return (
    <div className="shell shell-wide space-y-10 py-12">
      <SectionTitle
        eyebrow="Для пользователей"
        title="Короткие правила цифровой безопасности без перегруза и бюрократии"
        description="Этот раздел собран по мотивам пользовательских рекомендаций Kaspersky Resource Center и публичной антифрод-кампании «Клади трубку». Здесь только понятные бытовые правила и последствия нарушения."
      />

      <div className="guide-hero-card">
        <div className="feature-icon">
          <ShieldCheck size={18} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Что стоит запомнить в первую очередь</h2>
          <p className="body-copy mt-3 max-w-3xl">
            Если вас торопят, просят код, предлагают “безопасный счёт”, подсовывают чужую ссылку, случайный QR или странное приложение, это уже повод остановиться. Нажмите на карточку ниже, чтобы увидеть безопасное действие и понятное последствие ошибки.
          </p>
        </div>
      </div>

      <div className="guide-card-grid">
        {guideCards.map((card, index) => (
          <button key={card.id} type="button" className="guide-card" onClick={() => setActiveGuideId(card.id)}>
            <div className="guide-card-top">
              <span className="guide-card-index">0{index + 1}</span>
              <span className="guide-card-kicker">{card.kicker}</span>
            </div>
            <h3 className="guide-card-title">{card.title}</h3>
            <p className="guide-card-summary">{card.summary}</p>
          </button>
        ))}
      </div>

      {activeGuide ? (
        <div className="guide-modal-backdrop" onClick={() => setActiveGuideId(null)}>
          <div className="guide-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="icon-button guide-modal-close" onClick={() => setActiveGuideId(null)}>
              <X size={18} />
            </button>
            <p className="eyebrow">{activeGuide.kicker}</p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--color-text-primary)]">{activeGuide.title}</h2>
            <p className="body-copy mt-4 text-sm">{activeGuide.summary}</p>

            <div className="guide-modal-grid">
              <article className="soft-tile guide-modal-tile">
                <div className="feature-icon">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Как действовать</h3>
                <p className="body-copy mt-3 text-sm">{activeGuide.safeAction}</p>
              </article>

              <article className="soft-tile guide-modal-tile guide-modal-tile-alert">
                <div className="feature-icon guide-modal-alert-icon">
                  <AlertTriangle size={18} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Что произойдёт при нарушении</h3>
                <p className="body-copy mt-3 text-sm">{activeGuide.riskResult}</p>
              </article>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="soft-tile">
          <div className="feature-icon">
            <Smartphone size={18} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Телефон и мессенджеры</h3>
          <p className="body-copy mt-2 text-sm">Не продолжайте разговор, если вас торопят, запугивают или требуют код и деньги прямо сейчас.</p>
        </div>
        <div className="soft-tile">
          <div className="feature-icon">
            <Wifi size={18} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Сети и устройства</h3>
          <p className="body-copy mt-2 text-sm">Сомнения в точке доступа, сертификате или приложении всегда лучше трактовать в пользу безопасности.</p>
        </div>
        <div className="soft-tile">
          <div className="feature-icon">
            <ShieldCheck size={18} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Пароли и аккаунты</h3>
          <p className="body-copy mt-2 text-sm">Длинные уникальные пароли и 2FA по-прежнему остаются одной из самых дешёвых и сильных мер защиты.</p>
        </div>
      </div>
    </div>
  );
}
