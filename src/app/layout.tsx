'use client'

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {Providers} from "@/lib/providers";
import Header from "@/src/app/layout/header";
import { usePathname } from "next/navigation";
import AdminHeader from "@/src/app/layout/admin-header";
import {Suspense} from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  return (
    <html lang="en">
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
      />
    </head>
    <body
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
    <Providers>
      <Suspense>
        {isAdmin ? (
          <AdminHeader />
        ) : (
          <Header />
        )}
        {children}
      </Suspense>
    </Providers>
    </body>
    </html>
  );
}
