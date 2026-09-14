import type { Metadata } from 'next';
import './platform/platform.css';

export const metadata: Metadata = {
  title: 'API 密钥 — Moss API',
  description: 'Moss API 企业控制台：API Key、模型授权、用量与积分。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
