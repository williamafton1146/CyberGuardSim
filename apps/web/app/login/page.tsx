"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Eye, EyeOff, KeyRound, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";

import { loginUser, registerUser } from "@/lib/api";
import { getStoredUser, getToken, saveAuthSession } from "@/lib/auth";
import { evaluatePassword, type PasswordStrength } from "@/lib/password-strength";
import type { UserProfile } from "@/types";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resolveNextPath() {
    if (typeof window === "undefined") {
      return "/simulator";
    }

    return new URLSearchParams(window.location.search).get("next") || "/simulator";
  }

  function resolveMode() {
    if (typeof window === "undefined") {
      return "login" as const;
    }

    return new URLSearchParams(window.location.search).get("mode") === "register" ? "register" : "login";
  }

  useEffect(() => {
    setMode(resolveMode());

    const token = getToken();
    const storedUser = getStoredUser<UserProfile>();
    if (token && storedUser) {
      router.replace(storedUser.role === "admin" ? "/admin" : resolveNextPath());
    }
  }, [router]);

  const title = useMemo(
    () => (mode === "register" ? "Создайте профиль и откройте программу обучения" : "Войдите и продолжите работу в CyberGuardSim"),
    [mode]
  );
  const passwordStrength = useMemo(
    () => evaluatePassword(password, { identifier, displayName }),
    [displayName, identifier, password]
  );
  const registrationBlocked = mode === "register" && Boolean(passwordStrength.blockReason);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "register" && passwordStrength.blockReason) {
        setError(passwordStrength.blockReason);
        return;
      }

      const payload =
        mode === "register"
          ? await registerUser({ email: identifier, password, display_name: displayName || "Новый аналитик" })
          : await loginUser({ identifier, password });

      saveAuthSession(payload.access_token, payload.user);

      if (payload.user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace(resolveNextPath() || payload.redirect_to);
      }
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось выполнить запрос");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell py-12">
      <div className="auth-layout">
        <section className="glass-card landing-surface">
          <p className="eyebrow">CyberGuardSim access</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-[var(--color-text-primary)]">{title}</h1>
          <p className="body-copy mt-4 max-w-xl">
            После авторизации доступны сценарии, личная статистика, рейтинг цифровой устойчивости, раздел с пользовательскими материалами и выпуск сертификата.
          </p>

          <div className="mt-8 grid gap-4">
            <article className="soft-tile">
              <div className="feature-icon">
                <ShieldCheck size={18} />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Сценарии и прогресс</h2>
              <p className="body-copy mt-2 text-sm">Пройденные миссии, лучший результат по каждому кейсу и накопленный рейтинг сохраняются в кабинете.</p>
            </article>

            <article className="soft-tile">
              <div className="feature-icon">
                <BadgeCheck size={18} />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Сертификат и материалы</h2>
              <p className="body-copy mt-2 text-sm">После прохождения программы можно выпустить сертификат и открыть раздел с понятными пользовательскими рекомендациями.</p>
            </article>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="glass-card landing-surface">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={mode === "register" ? "primary-button" : "secondary-button"}
              onClick={() => setMode("register")}
            >
              <UserRoundPlus size={16} />
              Регистрация
            </button>
            <button
              type="button"
              className={mode === "login" ? "primary-button" : "secondary-button"}
              onClick={() => setMode("login")}
            >
              <KeyRound size={16} />
              Вход
            </button>
          </div>

          <div className="mt-8 grid gap-5">
            {mode === "register" ? (
              <label className="grid gap-2 text-sm text-[var(--color-text-muted)]">
                Отображаемое имя
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Например, Анна Смирнова"
                  className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                  maxLength={32}
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm text-[var(--color-text-muted)]">
              {mode === "register" ? "Email" : "Email или логин"}
              <input
                type={mode === "register" ? "email" : "text"}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={mode === "register" ? "you@company.ru" : "you@company.ru или Admin"}
                className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                required
                maxLength={32}
              />
            </label>

            <label className="grid gap-2 text-sm text-[var(--color-text-muted)]">
              Пароль
              <div className="password-field-shell">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Минимум 8 символов"
                  className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 pr-14 text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                  required
                  minLength={8}
                  maxLength={32}
                />
                <button
                  type="button"
                  className="password-visibility-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === "register" && password ? (
                <div className="password-strength-block">
                  <div className="password-strength-track">
                    <div className={`password-strength-fill password-strength-${passwordStrength.tone}`} style={{ width: `${passwordStrength.width}%` }} />
                  </div>
                  <p className={`password-strength-label password-strength-label-${passwordStrength.tone}`}>{passwordStrength.label}</p>
                  <p className="password-strength-advice">{passwordStrength.advice}</p>
                </div>
              ) : null}
            </label>
          </div>

          {error ? (
            <p className="mt-5 rounded-[1.2rem] border border-[rgba(255,114,92,0.28)] bg-[var(--color-alert-soft)] px-4 py-3 text-sm text-[var(--color-alert)]">
              {error}
            </p>
          ) : null}

          <button type="submit" className="primary-button mt-8 w-full" disabled={loading || registrationBlocked}>
            {loading ? "Обработка..." : mode === "register" ? "Создать профиль" : "Войти"}
            {!loading ? <ArrowRight size={16} /> : null}
          </button>
        </form>
      </div>
    </div>
  );
}
