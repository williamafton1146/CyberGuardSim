"use client";

import { ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getToken } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "ready" | "redirecting">("checking");

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setStatus("redirecting");
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setStatus("ready");
  }, [pathname, router]);

  if (status !== "ready") {
    return (
      <div className="shell py-16">
        <div className="glass-card mx-auto max-w-2xl p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <ShieldAlert size={24} />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-[var(--color-text-primary)]">
            {status === "redirecting" ? "Перенаправляем на вход" : "Проверяем доступ"}
          </h1>
          <p className="body-copy mx-auto mt-3 max-w-lg">
            {status === "redirecting"
              ? "Для этой страницы требуется авторизация. Подготавливаем переход на страницу входа."
              : "Готовим защищенную сессию и проверяем сохраненный токен пользователя."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
