import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "CyberSim",
  description: "Образовательный симулятор цифровой устойчивости и реагирования на реальные угрозы"
};

const themeInitScript = `
  (() => {
    try {
      const savedTheme = localStorage.getItem('cyber-sim-theme');
      const theme = savedTheme === 'light' ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.style.colorScheme = 'dark';
    }
  })();
`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <div className="site-frame">
            <div className="site-noise" />
            <div className="site-gradient site-gradient-one" />
            <div className="site-gradient site-gradient-two" />
            <SiteHeader />
            <main className="pb-16">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
