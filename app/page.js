// app/page.js
"use client"; // Chuyển thành Client Component để dùng hooks

import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import Loading from '@/components/ui/loading'

export default function HomePage() {
  const { data: session, status } = useSession();
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("my-provider");
    }
  }, [status]);
  if (status === "loading") {
    return (
      <Loading open={true} message="Đang đăng nhập" theme="dark" />
    );
  }
  console.log(session);
  
  if (session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
        <div className="text-center p-10 bg-white rounded-lg shadow-xl">
          <h1 className="text-4xl font-bold mb-6">Chào mừng đến Ứng dụng Client</h1>
          <p className="text-lg mb-4">
            Bạn đã đăng nhập với tài khoản: <strong>{session.user.name}</strong>
          </p>
          <div className="flex justify-center items-center space-x-4 mt-6">
            <Link href="/dashboard" className="text-blue-600 hover:underline font-semibold">
              Đi tới Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </main>
    );
  }
  return (
    <Loading open={true} message="Đang đăng nhập" theme="dark" />
  );
}