"use client";

import Link from "next/link";
import { ArrowRight, LogOut, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { clearToken, getAuthEventName, getStoredUser, getToken } from "@/lib/auth";
import type { UserProfile } from "@/types";

const APP_PATHS = new Set(["/simulator", "/dashboard", "/leaderboard", "/admin", "/for-users"]);

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "CS";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [storedUser, setStoredUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setToken(getToken());
    setStoredUser(getStoredUser<UserProfile>());

    const syncToken = () => {
      setToken(getToken());
      setStoredUser(getStoredUser<UserProfile>());
    };
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
  const isAdmin = storedUser?.role === "admin";

  function handleLogout() {
    clearToken();
    setToken(null);
    setStoredUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="shell header-shell">
        <Link href={isAuthed ? (isAdmin ? "/admin" : "/simulator") : "/"} className="brand-lockup">
          <div>
            <p className="brand-kicker">платформа цифровой устойчивости</p>
            <p className="brand-title">CyberSim</p>
          </div>
        </Link>

        <div className="header-actions">
          <div className="header-primary-actions">
            {isAuthed && isAppRoute ? (
              <nav className="nav-pills">
                {isAdmin ? (
                  <Link href="/admin" className="nav-pill">
                    Админка
                  </Link>
                ) : null}
                <Link href="/simulator" className="nav-pill">
                  Симулятор
                </Link>
                <Link href="/dashboard" className="nav-pill">
                  Кабинет
                </Link>
                <Link href="/leaderboard" className="nav-pill">
                  Лидерборд
                </Link>
                <Link href="/for-users" className="nav-pill">
                  Для пользователей
                </Link>
              </nav>
            ) : null}

            {!isAuthed && !isLanding ? (
              <Link href="/" className="nav-pill">
                На главную
              </Link>
            ) : null}

            {!isAuthed || !isAppRoute ? (
              <Link href="/for-users" className="nav-pill">
                Для пользователей
              </Link>
            ) : null}
          </div>

          <div className="header-secondary-actions">
            <ThemeToggle />

            {isAuthed && storedUser ? (
              <div className="header-identity-cluster">
                <div className="header-avatar-chip">
                  <div className="header-avatar-badge">{getInitials(storedUser.display_name)}</div>
                  <div className="header-avatar-meta">
                    <p className="header-avatar-name">{storedUser.display_name}</p>
                    <p className="header-avatar-league">
                      <UserRound size={13} />
                      {isAdmin ? "Администратор" : storedUser.league}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {isAuthed && isLanding ? (
              <Link href={isAdmin ? "/admin" : "/simulator"} className="primary-button">
                {isAdmin ? "Открыть админку" : "Открыть симулятор"}
                <ArrowRight size={16} />
              </Link>
            ) : null}

            {isAuthed && !isLanding ? (
              <button type="button" className="secondary-button header-logout-button" onClick={handleLogout}>
                <LogOut size={16} />
                Выйти
              </button>
            ) : isLogin ? (
              <Link href="/" className="secondary-button header-top-action">
                О проекте
              </Link>
            ) : (
              <Link href="/login" className="primary-button header-top-action">
                Войти
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
