"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, KeyRound, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";

import { loginUser, registerUser } from "@/lib/api";
import { getToken, saveToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    if (getToken()) {
      router.replace(resolveNextPath());
    }
  }, [router]);

  const title = useMemo(
    () => (mode === "register" ? "Создайте профиль и откройте программу обучения" : "Войдите и продолжите работу в CyberSim"),
    [mode]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload =
        mode === "register"
          ? await registerUser({ email, password, display_name: displayName || "Новый аналитик" })
          : await loginUser({ email, password });

      saveToken(payload.access_token);
      router.replace(resolveNextPath());
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
          <p className="eyebrow">CyberSim access</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-[var(--color-text-primary)]">{title}</h1>
          <p className="body-copy mt-4 max-w-xl">
            После авторизации доступны сценарии, личная статистика, рейтинг цифровой устойчивости и выпуск сертификата
            по завершении программы.
          </p>

          <div className="mt-8 grid gap-4">
            <article className="soft-tile">
              <div className="feature-icon">
                <ShieldCheck size={18} />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Сценарии и прогресс</h2>
              <p className="body-copy mt-2 text-sm">Пройденные миссии, ошибки и накопленный security rating сохраняются в личном кабинете.</p>
            </article>

            <article className="soft-tile">
              <div className="feature-icon">
                <BadgeCheck size={18} />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Сертификат и верификация</h2>
              <p className="body-copy mt-2 text-sm">После завершения всех доступных сценариев пользователь может выпустить верифицируемый сертификат.</p>
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
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm text-[var(--color-text-muted)]">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.ru"
                className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-[var(--color-text-muted)]">
              Пароль
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Минимум 8 символов"
                className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                required
                minLength={8}
              />
            </label>
          </div>

          {error ? (
            <p className="mt-5 rounded-[1.2rem] border border-[rgba(255,114,92,0.28)] bg-[var(--color-alert-soft)] px-4 py-3 text-sm text-[var(--color-alert)]">
              {error}
            </p>
          ) : null}

          <button type="submit" className="primary-button mt-8 w-full" disabled={loading}>
            {loading ? "Обработка..." : mode === "register" ? "Создать профиль" : "Войти"}
            {!loading ? <ArrowRight size={16} /> : null}
          </button>
        </form>
      </div>
    </div>
  );
}
