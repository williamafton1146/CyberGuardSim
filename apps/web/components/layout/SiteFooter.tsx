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
        <span>Coffee &amp; Inconsistent</span>
        <span>UMIRHack</span>
        <span>2026</span>
      </div>
      <p className="landing-footer-copy">Создано командой Coffee &amp; Inconsistent для UMIRHack 2026 в треке цифровой безопасности.</p>
    </footer>
  );
}
