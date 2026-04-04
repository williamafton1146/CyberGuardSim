"use client";

import { MoonStar, SunMedium } from "lucide-react";

import { useTheme } from "@/components/layout/ThemeProvider";

export function ThemeToggle() {
  const { mounted, theme, toggleTheme } = useTheme();
  const nextLabel = theme === "dark" ? "Светлая тема" : "Темная тема";
  const Icon = theme === "dark" ? SunMedium : MoonStar;

  return (
    <button
      type="button"
      className="icon-button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
    >
      <Icon size={18} />
      <span className="sr-only">{mounted ? nextLabel : "Переключить тему"}</span>
    </button>
  );
}
