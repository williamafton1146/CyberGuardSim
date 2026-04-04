"use client";

import Link from "next/link";
import { ArrowRight, LogOut, Shield } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { clearToken, getAuthEventName, getToken } from "@/lib/auth";

const APP_PATHS = new Set(["/simulator", "/dashboard", "/leaderboard"]);

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());

    const syncToken = () => setToken(getToken());
    window.addEventListener("storage", syncToken);
    window.addEventListener(getAuthEventName(), syncToken);

    return () => {
      window.removeEventListener("storage", syncToken);
      window.removeEventListener(getAuthEventName(), syncToken);
    };
  }, []);

  const isAppRoute = useMemo(() => APP_PATHS.has(pathname), [pathname]);
  const isLanding = pathname === "/";
  const isLogin = pathname === "/login";
  const isAuthed = Boolean(token);

  function handleLogout() {
    clearToken();
    setToken(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="shell header-shell">
        <Link href={isAuthed ? "/simulator" : "/"} className="brand-lockup">
          <div className="brand-mark">
            <Shield size={18} />
          </div>
          <div>
            <p className="brand-kicker">платформа цифровой устойчивости</p>
            <p className="brand-title">CyberSim</p>
          </div>
        </Link>

        <div className="header-actions">
          {isAuthed && isAppRoute ? (
            <nav className="nav-pills">
              <Link href="/simulator" className="nav-pill">
                Симулятор
              </Link>
              <Link href="/dashboard" className="nav-pill">
                Кабинет
              </Link>
              <Link href="/leaderboard" className="nav-pill">
                Лидерборд
              </Link>
            </nav>
          ) : null}

          {!isAuthed && !isLanding ? (
            <Link href="/" className="nav-pill">
              На главную
            </Link>
          ) : null}

          <ThemeToggle />

          {isAuthed && isLanding ? (
            <Link href="/simulator" className="primary-button">
              Открыть симулятор
              <ArrowRight size={16} />
            </Link>
          ) : null}

          {isAuthed && !isLanding ? (
            <button type="button" className="secondary-button inline-flex items-center gap-2" onClick={handleLogout}>
              <LogOut size={16} />
              Выйти
            </button>
          ) : isLogin ? (
            <Link href="/" className="secondary-button">
              О проекте
            </Link>
          ) : (
            <Link href="/login" className="primary-button">
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
