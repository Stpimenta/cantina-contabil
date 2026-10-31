import type { Metadata } from "next";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";

export const metadata: Metadata = {
  title: {
    default: "Ministério Contábil",
    template: "%s · Ministério Contábil",
  },
  description: "Gestão de caixas e eventos",
  icons: {
    icon: { url: "/brand/mc-icon.png", type: "image/png", sizes: "32x32" },
    apple: {
      url: "/brand/mc-apple-icon.png",
      type: "image/png",
      sizes: "180x180",
    },
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
