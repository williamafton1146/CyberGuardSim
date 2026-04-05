"use client";

import Link from "next/link";
import { ShieldCheck, ShieldX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CertificatePrintable } from "@/components/certificate/CertificatePrintable";
import { downloadNodeAsPdf } from "@/lib/pdf";
import { verifyCertificate } from "@/lib/api";
import type { CertificateVerification } from "@/types";

export const dynamic = "force-dynamic";

export default function CertificatePage({ params }: { params: { code: string } }) {
  const [certificate, setCertificate] = useState<CertificateVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
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

  useEffect(() => {
    let active = true;

    async function renderQrCode() {
      if (!certificate?.verify_url) {
        setQrSrc(null);
        return;
      }

      try {
        const { default: QRCode } = await import("qrcode");
        const encoded = await QRCode.toDataURL(certificate.verify_url, {
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
  }, [certificate?.verify_url]);

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
              <CertificatePrintable
                title="Сертификат действителен"
                subtitle="Документ подтверждает завершение программы сценарного обучения цифровой устойчивости в CyberGuardSim."
                displayName={certificate.display_name}
                league={certificate.league}
                securityRating={certificate.security_rating}
                issuedAt={certificate.issued_at}
                code={certificate.code}
                verifyUrl={certificate.verify_url}
                qrSrc={qrSrc}
                statusLabel={certificate.status}
              />
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
