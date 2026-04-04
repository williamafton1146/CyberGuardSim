"use client";

import Link from "next/link";
import { CheckCircle2, ShieldCheck, ShieldX } from "lucide-react";
import { useEffect, useState } from "react";

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
            <div className="certificate-verify-icon certificate-verify-icon-error">
              <ShieldX size={28} />
            </div>
            <p className="eyebrow">Проверка сертификата</p>
            <h1 className="mt-4 text-3xl font-semibold text-[var(--color-text-primary)]">Сертификат не найден</h1>
            <p className="body-copy mt-4 max-w-2xl">{error}</p>
            <Link href="/" className="secondary-button mt-8">
              Вернуться на главную
            </Link>
          </>
        ) : certificate ? (
          <>
            <div className="certificate-verify-icon">
              <CheckCircle2 size={28} />
            </div>
            <p className="eyebrow">Проверка сертификата</p>
            <h1 className="mt-4 text-3xl font-semibold text-[var(--color-text-primary)]">Сертификат действителен</h1>
            <p className="body-copy mt-4 max-w-2xl">
              Этот сертификат подтверждает, что пользователь завершил текущую программу сценарного обучения цифровой устойчивости в CyberSim.
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

            <div className="mt-8 flex flex-wrap gap-4">
              <a href={certificate.verify_url} className="secondary-button">
                Открыть публичную ссылку
              </a>
              <Link href="/" className="primary-button">
                На главную
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="certificate-verify-icon">
              <ShieldCheck size={28} />
            </div>
            <p className="eyebrow">Проверка сертификата</p>
            <h1 className="mt-4 text-3xl font-semibold text-[var(--color-text-primary)]">Проверяем сертификат</h1>
            <p className="body-copy mt-4 max-w-2xl">Загружаем данные и подтверждаем публичную верификацию сертификата.</p>
          </>
        )}
      </div>
    </div>
  );
}
