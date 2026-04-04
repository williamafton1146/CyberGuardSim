"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname !== "/") {
    return null;
  }

  return (
    <footer className="shell pb-12 pt-2">
      <div className="glass-card footer-card">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <p className="eyebrow">Coffee &amp; Inconsistent</p>
            <h2 className="section-heading">CyberSim для UMIRHack</h2>
            <p className="body-copy max-w-2xl">
              Прототип образовательной платформы, которая превращает правила цифровой безопасности в игровые сценарии с
              обратной связью, личным прогрессом и измеримыми последствиями решений.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-[var(--color-text-muted)] sm:grid-cols-2">
            <div className="soft-tile">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-accent)]">Команда</p>
              <p className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">Coffee &amp; Inconsistent</p>
            </div>
            <div className="soft-tile">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-accent)]">Хакатон</p>
              <p className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">UMIRHack 2026</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
