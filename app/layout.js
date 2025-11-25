// app/layout.js

import { Inter } from "next/font/google";
import "./globals.css";
import "./scrollbar.css";
import AuthProvider from "@/components/AuthProvider"; // <--- 1. Import component provider
import OverlaysRoot from "./ui/OverlaysRoot.client";
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Client App",
  description: "Client app to test OAuth provider",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col` }>
        {/* 2. Bao bọc children bằng AuthProvider */}
        <AuthProvider>
          {children}
          <OverlaysRoot />
        </AuthProvider>
      </body>
    </html>
  );
}
