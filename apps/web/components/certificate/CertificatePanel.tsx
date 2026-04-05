"use client";

import Link from "next/link";
import { Award, QrCode, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CertificatePrintable } from "@/components/certificate/CertificatePrintable";
import { downloadNodeAsPdf } from "@/lib/pdf";
import type { CertificateStatus } from "@/types";

type CertificatePanelProps = {
  status: CertificateStatus | null;
  issuing: boolean;
  onIssue: () => void;
};

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
      <div className="glass-card certificate-card">
        <div ref={exportRef} className="certificate-export-surface">
          <CertificatePrintable
            title="Сертификат программы уже выпущен"
            subtitle="Сертификат подтверждает завершение текущей программы обучения и проверяется по публичной ссылке с QR-верификацией."
            displayName={certificate.display_name}
            league={certificate.league}
            securityRating={certificate.security_rating}
            issuedAt={certificate.issued_at}
            code={certificate.code}
            verifyUrl={certificate.verify_url}
            qrSrc={qrSrc}
            statusLabel="Выдан"
          />
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
          Все доступные сценарии пройдены. Теперь можно выпустить верифицируемый сертификат и сохранить его в чистом печатном формате.
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
