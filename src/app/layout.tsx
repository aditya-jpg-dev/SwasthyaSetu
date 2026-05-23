import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n/LangContext";

export const metadata: Metadata = {
  title: "SwasthyaSetu - Doctor in 10 Minutes",
  description: "Connect rural patients with specialist doctors via video or phone consultation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
