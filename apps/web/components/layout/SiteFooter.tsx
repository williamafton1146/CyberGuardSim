"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname !== "/") {
    return null;
  }

  return (
    <footer className="shell shell-wide landing-footer">
      <div className="landing-footer-line" />
      <div className="landing-footer-meta">
        <span>CyberGuardSim</span>
        <span>Платформа цифровой устойчивости</span>
        <span>UMIRHack 2026</span>
      </div>
      <p className="landing-footer-copy">
        Разработано командой Coffee &amp; Inconsistent в рамках UMIRHack 2026. Основной интерфейс и сценарии оформлены как продуктовая обучающая платформа.
      </p>
    </footer>
  );
}
