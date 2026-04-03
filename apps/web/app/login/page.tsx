"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { loginUser, registerUser } from "@/lib/api";
import { saveToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const title = useMemo(
    () => (mode === "register" ? "Создайте профиль и начните миссию" : "Войдите и продолжите тренировку"),
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
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось выполнить запрос");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell py-14">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.35em] text-safe">Access</p>
          <h1 className="mt-5 text-4xl font-semibold text-white">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-skyglass/75">
            После входа откроются личный кабинет, статистика и играбельная офисная миссия с live-обновлением статуса.
          </p>

          <div className="mt-8 rounded-3xl border border-white/10 bg-ink/40 p-5 text-sm text-skyglass/75">
            <p className="font-medium text-white">Что уже есть в демо</p>
            <ul className="mt-3 space-y-2">
              <li>Аутентификация и JWT</li>
              <li>Прогресс, лидерборд и статистика</li>
              <li>Офисный сценарий на 4 шага</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-ambient">
          <div className="flex gap-3">
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm ${mode === "register" ? "bg-safe text-ink" : "border border-white/10 text-skyglass/70"}`}
              onClick={() => setMode("register")}
            >
              Регистрация
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm ${mode === "login" ? "bg-safe text-ink" : "border border-white/10 text-skyglass/70"}`}
              onClick={() => setMode("login")}
            >
              Вход
            </button>
          </div>

          <div className="mt-8 grid gap-5">
            {mode === "register" ? (
              <label className="grid gap-2 text-sm text-skyglass/75">
                Отображаемое имя
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Например, Security Owl"
                  className="rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-white outline-none ring-0 placeholder:text-skyglass/35"
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm text-skyglass/75">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.ru"
                className="rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-white outline-none placeholder:text-skyglass/35"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-skyglass/75">
              Пароль
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Минимум 8 символов"
                className="rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-white outline-none placeholder:text-skyglass/35"
                required
                minLength={8}
              />
            </label>
          </div>

          {error ? <p className="mt-5 rounded-2xl border border-alert/30 bg-alert/10 px-4 py-3 text-sm text-alert">{error}</p> : null}

          <button
            type="submit"
            className="mt-8 w-full rounded-2xl bg-safe px-5 py-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Обработка..." : mode === "register" ? "Создать профиль" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
