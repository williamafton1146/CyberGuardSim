"use client";

import { CheckCircle2, QrCode, ShieldCheck } from "lucide-react";

type CertificatePrintableProps = {
  title: string;
  subtitle: string;
  displayName: string;
  league: string;
  securityRating: number;
  issuedAt: string;
  code: string;
  verifyUrl: string;
  qrSrc?: string | null;
  statusLabel?: string;
};

function formatIssuedAt(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export function CertificatePrintable({
  title,
  subtitle,
  displayName,
  league,
  securityRating,
  issuedAt,
  code,
  verifyUrl,
  qrSrc,
  statusLabel = "Действителен"
}: CertificatePrintableProps) {
  return (
    <div className="certificate-print-shell">
      <div className="certificate-print-sheet">
        <div className="certificate-print-head">
          <div className="certificate-print-brand">
            <div className="certificate-print-brand-icon">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="certificate-print-kicker">CyberGuardSim</p>
              <p className="certificate-print-brand-copy">Верифицируемый сертификат программы цифровой устойчивости</p>
            </div>
          </div>
          <div className="certificate-print-status">
            <CheckCircle2 size={16} />
            <span>{statusLabel}</span>
          </div>
        </div>

        <div className="certificate-print-hero">
          <div>
            <p className="certificate-print-title">{title}</p>
            <p className="certificate-print-subtitle">{subtitle}</p>
          </div>
          <div className="certificate-print-person">
            <span className="certificate-print-label">Владелец</span>
            <strong>{displayName}</strong>
          </div>
        </div>

        <div className="certificate-print-grid">
          <div className="certificate-print-meta">
            <div className="certificate-print-metric">
              <span className="certificate-print-label">Лига</span>
              <strong>{league}</strong>
            </div>
            <div className="certificate-print-metric">
              <span className="certificate-print-label">Рейтинг</span>
              <strong>{securityRating}</strong>
            </div>
            <div className="certificate-print-metric">
              <span className="certificate-print-label">Дата выпуска</span>
              <strong>{formatIssuedAt(issuedAt)}</strong>
            </div>
            <div className="certificate-print-metric">
              <span className="certificate-print-label">Код сертификата</span>
              <strong className="certificate-print-code">{code}</strong>
            </div>
          </div>

          <div className="certificate-print-qr-panel">
            <div className="certificate-print-qr-frame">
              {qrSrc ? (
                <img src={qrSrc} alt="QR-код сертификата" className="certificate-print-qr-image" />
              ) : (
                <div className="certificate-print-qr-placeholder">
                  <QrCode size={28} />
                  <span>QR генерируется</span>
                </div>
              )}
            </div>
            <p className="certificate-print-verify-label">Публичная проверка</p>
            <p className="certificate-print-verify-url">{verifyUrl}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
