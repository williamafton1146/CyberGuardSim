import Link from "next/link";

import "./globals.css";

export const metadata = {
  title: "CyberSim",
  description: "Образовательный симулятор защиты личных данных"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <div className="relative overflow-hidden">
          <header className="border-b border-white/10 backdrop-blur">
            <div className="shell flex items-center justify-between py-6">
              <Link href="/" className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-safe/40 bg-safe/10 text-lg font-semibold text-safe">
                  CS
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-skyglass/55">cyber simulator</p>
                  <p className="text-lg font-semibold text-white">Лаборатория цифровой устойчивости</p>
                </div>
              </Link>

              <nav className="flex items-center gap-6 text-sm text-skyglass/75">
                <Link href="/dashboard">Кабинет</Link>
                <Link href="/simulator">Симулятор</Link>
                <Link href="/leaderboard">Лидерборд</Link>
                <Link href="/login" className="rounded-full border border-white/10 px-4 py-2 text-white">
                  Вход
                </Link>
              </nav>
            </div>
          </header>
          <main className="pb-16">{children}</main>
        </div>
      </body>
    </html>
  );
}

