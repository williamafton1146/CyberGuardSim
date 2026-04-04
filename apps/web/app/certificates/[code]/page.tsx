"use client";

import Link from "next/link";
import { CheckCircle2, ShieldCheck, ShieldX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { downloadNodeAsPdf } from "@/lib/pdf";
import { verifyCertificate } from "@/lib/api";
import type { CertificateVerification } from "@/types";

export const dynamic = "force-dynamic";

function formatIssuedAt(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export default function CertificatePage({ params }: { params: { code: string } }) {
  const [certificate, setCertificate] = useState<CertificateVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    verifyCertificate(params.code)
      .then((payload) => {
        setCertificate(payload);
        setError(null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Не удалось проверить сертификат");
      });
  }, [params.code]);

  return (
    <div className="shell py-12">
      <div className="glass-card certificate-verify-card">
        {error ? (
          <>
            <div ref={exportRef} className="certificate-export-surface">
              <div className="certificate-verify-icon certificate-verify-icon-error">
                <ShieldX size={28} />
              </div>
              <p className="eyebrow">Проверка сертификата</p>
              <h1 className="mt-4 text-3xl font-semibold text-[var(--color-text-primary)]">Сертификат не найден</h1>
              <p className="body-copy mt-4 max-w-2xl">{error}</p>
            </div>
            <Link href="/" className="secondary-button mt-8">
              Вернуться на главную
            </Link>
          </>
        ) : certificate ? (
          <>
            <div ref={exportRef} className="certificate-export-surface">
              <div className="certificate-verify-icon">
                <CheckCircle2 size={28} />
              </div>
              <p className="eyebrow">Проверка сертификата</p>
              <h1 className="mt-4 text-3xl font-semibold text-[var(--color-text-primary)]">Сертификат действителен</h1>
              <p className="body-copy mt-4 max-w-2xl">
                Этот сертификат подтверждает, что пользователь завершил текущую программу сценарного обучения цифровой устойчивости в CyberGuardSim.
              </p>

              <div className="certificate-verify-grid">
                <div className="soft-tile">
                  <p className="certificate-meta-label">Владелец</p>
                  <p className="certificate-meta-value">{certificate.display_name}</p>
                </div>
                <div className="soft-tile">
                  <p className="certificate-meta-label">Лига</p>
                  <p className="certificate-meta-value">{certificate.league}</p>
                </div>
                <div className="soft-tile">
                  <p className="certificate-meta-label">Рейтинг</p>
                  <p className="certificate-meta-value">{certificate.security_rating}</p>
                </div>
                <div className="soft-tile">
                  <p className="certificate-meta-label">Дата выпуска</p>
                  <p className="certificate-meta-value">{formatIssuedAt(certificate.issued_at)}</p>
                </div>
                <div className="soft-tile">
                  <p className="certificate-meta-label">Код сертификата</p>
                  <p className="certificate-meta-value">{certificate.code}</p>
                </div>
                <div className="soft-tile">
                  <p className="certificate-meta-label">Статус</p>
                  <p className="certificate-meta-value">
                    <ShieldCheck size={16} />
                    {certificate.status}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 no-print">
              <a href={certificate.verify_url} className="secondary-button">
                Открыть публичную ссылку
              </a>
              <button
                type="button"
                className="secondary-button"
                disabled={downloadingPdf}
                onClick={async () => {
                  if (!exportRef.current) {
                    return;
                  }
                  setDownloadingPdf(true);
                  try {
                    await downloadNodeAsPdf(exportRef.current, `cyberguardsim-certificate-${certificate.code}.pdf`);
                  } finally {
                    setDownloadingPdf(false);
                  }
                }}
              >
                {downloadingPdf ? "Готовим PDF..." : "Скачать в PDF"}
              </button>
              <Link href="/" className="primary-button">
                На главную
              </Link>
            </div>
          </>
        ) : (
          <>
            <div ref={exportRef} className="certificate-export-surface">
              <div className="certificate-verify-icon">
                <ShieldCheck size={28} />
              </div>
              <p className="eyebrow">Проверка сертификата</p>
              <h1 className="mt-4 text-3xl font-semibold text-[var(--color-text-primary)]">Проверяем сертификат</h1>
              <p className="body-copy mt-4 max-w-2xl">Загружаем данные и подтверждаем публичную верификацию сертификата.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
