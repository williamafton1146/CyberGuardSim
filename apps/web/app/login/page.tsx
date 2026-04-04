"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, KeyRound, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";

import { loginUser, registerUser } from "@/lib/api";
import { getToken, saveToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/simulator");
    }
  }, [router]);

  const title = useMemo(
    () => (mode === "register" ? "Создай профиль и сразу войди в симулятор" : "Войди и продолжи миссии"),
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
      router.replace("/simulator");
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
          <p className="eyebrow">Access portal</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-[var(--color-text-primary)]">{title}</h1>
          <p className="body-copy mt-4 max-w-xl">
            После входа пользователь сразу попадает в `/simulator`, где уже доступны миссия, live-обновление состояния,
            Security HP и обратная связь по каждому решению.
          </p>

          <div className="mt-8 grid gap-4">
            <article className="soft-tile">
              <div className="feature-icon">
                <ShieldCheck size={18} />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Один стиль от landing до dashboard</h2>
              <p className="body-copy mt-2 text-sm">Единый visual language, theme toggle и согласованная навигация по всему продукту.</p>
            </article>

            <article className="soft-tile">
              <div className="feature-icon">
                <BadgeCheck size={18} />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Регистрация без потери контекста</h2>
              <p className="body-copy mt-2 text-sm">Созданный токен сразу сохраняется, после чего пользователь попадает в защищенную часть приложения.</p>
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
                  placeholder="Например, Security Owl"
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
            {loading ? "Обработка..." : mode === "register" ? "Создать профиль и открыть симулятор" : "Войти в симулятор"}
            {!loading ? <ArrowRight size={16} /> : null}
          </button>
        </form>
      </div>
    </div>
  );
}
