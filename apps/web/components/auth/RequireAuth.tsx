"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getToken } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="shell py-16">
        <div className="glass-card mx-auto max-w-2xl text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <ShieldAlert size={24} />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-[var(--color-text-primary)]">Проверяем доступ</h1>
          <p className="body-copy mx-auto mt-3 max-w-lg">
            Готовим защищенную сессию и перенаправляем на страницу входа, если токен еще не найден.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
