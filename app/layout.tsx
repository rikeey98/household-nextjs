import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Household Budget",
  description: "Next.js, Vercel, Supabase 기반 가계부",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

