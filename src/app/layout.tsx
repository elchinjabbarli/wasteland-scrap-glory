import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/query-provider";
import { DirProvider } from "@/components/game/dir-provider";
import { NotificationOverlay } from "@/components/game/notification-overlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pixelFont = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wasteland: Scrap & Glory",
  description: "Post-apokaliptik Telegram Mini App RPG. Hayatta kal, savaş, çöplüğü fethet.",
  keywords: ["wasteland", "rpg", "telegram", "pixel art", "apocalypse"],
  authors: [{ name: "Scrap & Glory Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Wasteland: Scrap & Glory",
    description: "Post-apokaliptik Telegram Mini App RPG",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1a1a16",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <QueryProvider>
          <DirProvider />
          <NotificationOverlay />
          {children}
          <Toaster />
          <Sonner />
        </QueryProvider>
      </body>
    </html>
  );
}
