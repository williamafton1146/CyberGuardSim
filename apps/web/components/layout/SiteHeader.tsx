"use client";

import Link from "next/link";
import { ArrowRight, LogOut, Menu, UserRound, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { clearToken, getAuthEventName, getStoredUser, getToken } from "@/lib/auth";
import type { UserProfile } from "@/types";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, token]);

  const isLanding = pathname === "/";
  const isLogin = pathname === "/login";
  const isAuthed = Boolean(token);
  const isAdmin = storedUser?.role === "admin";
  const identityHref = isAdmin ? "/admin" : "/dashboard";
  const brandHref = isAuthed ? (isAdmin ? "/admin" : "/simulator") : "/";
  const navItems = useMemo(() => {
    if (isAuthed) {
      return [
        ...(isAdmin ? [{ href: "/admin", label: "Админка" }] : []),
        { href: "/simulator", label: "Симулятор" },
        { href: "/leaderboard", label: "Лидерборд" },
        { href: "/for-users", label: "Для пользователей" }
      ];
    }

    return [{ href: "/for-users", label: "Для пользователей" }];
  }, [isAdmin, isAuthed]);

  function handleLogout() {
    clearToken();
    setToken(null);
    setStoredUser(null);
    setMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="shell header-shell">
        <Link href={brandHref} className="brand-lockup">
          <div>
            <p className="brand-kicker">платформа цифровой устойчивости</p>
            <p className="brand-title">CyberSim</p>
          </div>
        </Link>

        <div className="header-actions">
          <nav className="nav-pills header-desktop-nav">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="nav-pill">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-secondary-actions header-desktop-actions">
            <ThemeToggle />

            {isAuthed && storedUser ? (
              <Link href={identityHref} className="header-avatar-chip">
                <div className="header-avatar-badge">{getInitials(storedUser.display_name)}</div>
                <div className="header-avatar-meta">
                  <p className="header-avatar-name">{storedUser.display_name}</p>
                  <p className="header-avatar-league">
                    <UserRound size={13} />
                    {isAdmin ? "Администратор" : storedUser.league}
                  </p>
                </div>
              </Link>
            ) : null}

            {isAuthed ? (
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

          <div className="header-mobile-controls">
            <ThemeToggle />
            {isAuthed && storedUser ? (
              <Link href={identityHref} className="header-avatar-chip header-avatar-chip-compact">
                <div className="header-avatar-badge">{getInitials(storedUser.display_name)}</div>
                <div className="header-avatar-meta">
                  <p className="header-avatar-name">{storedUser.display_name}</p>
                </div>
              </Link>
            ) : null}
            <button
              type="button"
              className="icon-button header-menu-button"
              aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="shell header-mobile-panel-shell">
          <div className="header-mobile-panel">
            <nav className="header-mobile-nav">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="nav-pill header-mobile-nav-pill">
                  {item.label}
                </Link>
              ))}
              {!isAuthed && !isLanding ? (
                <Link href="/" className="nav-pill header-mobile-nav-pill">
                  На главную
                </Link>
              ) : null}
            </nav>

            <div className="header-mobile-panel-actions">
              {isAuthed && storedUser ? (
                <Link href={identityHref} className="header-avatar-chip header-mobile-profile-link">
                  <div className="header-avatar-badge">{getInitials(storedUser.display_name)}</div>
                  <div className="header-avatar-meta">
                    <p className="header-avatar-name">{storedUser.display_name}</p>
                    <p className="header-avatar-league">
                      <UserRound size={13} />
                      {isAdmin ? "Администратор" : storedUser.league}
                    </p>
                  </div>
                </Link>
              ) : null}

              {isAuthed ? (
                <>
                  {isLanding ? (
                    <Link href={isAdmin ? "/admin" : "/simulator"} className="primary-button header-mobile-cta">
                      {isAdmin ? "Открыть админку" : "Открыть симулятор"}
                      <ArrowRight size={16} />
                    </Link>
                  ) : null}
                  <button type="button" className="secondary-button header-mobile-logout" onClick={handleLogout}>
                    <LogOut size={16} />
                    Выйти
                  </button>
                </>
              ) : isLogin ? (
                <Link href="/" className="secondary-button header-mobile-cta">
                  О проекте
                </Link>
              ) : (
                <Link href="/login" className="primary-button header-mobile-cta">
                  Войти
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
