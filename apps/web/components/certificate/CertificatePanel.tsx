"use client";

import Link from "next/link";
import { Award, CheckCircle2, QrCode, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { downloadNodeAsPdf } from "@/lib/pdf";
import type { CertificateStatus } from "@/types";

type CertificatePanelProps = {
  status: CertificateStatus | null;
  issuing: boolean;
  onIssue: () => void;
};

function formatIssuedAt(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export function CertificatePanel({ status, issuing, onIssue }: CertificatePanelProps) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    async function renderQrCode() {
      if (!status?.certificate?.verify_url) {
        setQrSrc(null);
        return;
      }

      try {
        const { default: QRCode } = await import("qrcode");
        const encoded = await QRCode.toDataURL(status.certificate.verify_url, {
          width: 180,
          margin: 1,
          color: {
            dark: "#0c1724",
            light: "#f4fbff"
          }
        });
        if (active) {
          setQrSrc(encoded);
        }
      } catch {
        if (active) {
          setQrSrc(null);
        }
      }
    }

    renderQrCode();

    return () => {
      active = false;
    };
  }, [status?.certificate?.verify_url]);

  if (!status) {
    return (
      <div className="glass-card certificate-card">
        <p className="eyebrow">Сертификат</p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-text-primary)]">Проверяем статус программы</h2>
        <p className="body-copy mt-4 max-w-2xl text-sm">
          Загружаем данные о завершенных сценариях и доступности верифицируемого сертификата.
        </p>
      </div>
    );
  }

  if (status.status === "issued" && status.certificate) {
    const certificate = status.certificate;

    async function handleDownloadPdf() {
      if (!exportRef.current) {
        return;
      }

      setDownloadingPdf(true);
      try {
        await downloadNodeAsPdf(exportRef.current, `cyberguardsim-certificate-${certificate.code}.pdf`);
      } finally {
        setDownloadingPdf(false);
      }
    }

    return (
      <div className="glass-card certificate-card certificate-card-issued">
        <div ref={exportRef} className="certificate-export-surface">
          <p className="eyebrow">Сертификат</p>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--color-text-primary)]">Сертификат программы уже выпущен</h2>
          <p className="body-copy mt-4 max-w-2xl text-sm">
            Сертификат подтверждает завершение текущей обучающей программы и открывается по публичной ссылке с QR-верификацией.
          </p>

          <div className="certificate-meta-list">
            <div className="soft-tile">
              <p className="certificate-meta-label">Статус</p>
              <p className="certificate-meta-value">
                <CheckCircle2 size={16} />
                Выдан
              </p>
            </div>
            <div className="soft-tile">
              <p className="certificate-meta-label">Дата выпуска</p>
              <p className="certificate-meta-value">{formatIssuedAt(certificate.issued_at)}</p>
            </div>
            <div className="soft-tile">
              <p className="certificate-meta-label">Рейтинг на момент выпуска</p>
              <p className="certificate-meta-value">{certificate.security_rating}</p>
            </div>
            <div className="soft-tile">
              <p className="certificate-meta-label">Лига</p>
              <p className="certificate-meta-value">{certificate.league}</p>
            </div>
          </div>
        </div>

        <div className="certificate-qr-card">
          <div className="certificate-qr-frame">
            {qrSrc ? (
              <img src={qrSrc} alt="QR-код для верификации сертификата" className="certificate-qr-image" />
            ) : (
              <div className="certificate-qr-fallback">
                <QrCode size={22} />
                <span>QR генерируется</span>
              </div>
            )}
          </div>
          <p className="certificate-code">ID: {certificate.code}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 no-print">
          <Link href={`/certificates/${certificate.code}`} className="primary-button">
            <Award size={16} />
            Открыть сертификат
          </Link>
          <a href={certificate.verify_url} className="secondary-button">
            <QrCode size={16} />
            Публичная ссылка
          </a>
          <button type="button" className="secondary-button" onClick={handleDownloadPdf} disabled={downloadingPdf}>
            {downloadingPdf ? "Готовим PDF..." : "Скачать в PDF"}
          </button>
        </div>
      </div>
    );
  }

  if (status.status === "eligible") {
    return (
      <div className="glass-card certificate-card">
        <p className="eyebrow">Сертификат</p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-text-primary)]">Программа завершена, сертификат доступен</h2>
        <p className="body-copy mt-4 max-w-2xl text-sm">
          Все доступные сценарии пройдены. Можно выпустить публично верифицируемый сертификат и использовать его в рабочем пользовательском потоке.
        </p>

        <div className="certificate-progress">
          <div className="soft-tile">
            <p className="certificate-meta-label">Пройдено сценариев</p>
            <p className="certificate-meta-value">
              <ShieldCheck size={16} />
              {status.completed_scenarios} из {status.required_scenarios}
            </p>
          </div>
        </div>

        <button type="button" className="primary-button mt-6" onClick={onIssue} disabled={issuing}>
          <Award size={16} />
          {issuing ? "Выпускаем сертификат..." : "Получить сертификат"}
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card certificate-card">
      <p className="eyebrow">Сертификат</p>
      <h2 className="mt-4 text-2xl font-semibold text-[var(--color-text-primary)]">Сначала завершите программу обучения</h2>
      <p className="body-copy mt-4 max-w-2xl text-sm">
        Сертификат станет доступен автоматически после прохождения всех игровых сценариев, отмеченных как доступные в симуляторе.
      </p>

      <div className="certificate-progress">
        <div className="soft-tile">
          <p className="certificate-meta-label">Прогресс программы</p>
          <p className="certificate-meta-value">
            <ShieldCheck size={16} />
            {status.completed_scenarios} из {status.required_scenarios}
          </p>
        </div>
      </div>
    </div>
  );
}
