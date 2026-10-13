import type { Metadata } from "next";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/600.css";
import "@fontsource/noto-sans-thai/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบสร้างแฟ้มสะสมผลงาน",
  description: "ระบบเว็บแอปพลิเคชันสำหรับสร้างแฟ้มสะสมผลงานอัตโนมัติ ใช้งานง่าย จัดหน้าให้เอง โหลดเป็น PDF ได้ทันที",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
