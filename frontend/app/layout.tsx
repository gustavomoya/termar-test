import type { Metadata, Viewport } from "next";
import { SerwistProvider } from "@serwist/turbopack/react";
import { SyncProvider } from "@/components/sync/SyncProvider";
import "./globals.css";

const APP_NAME = "Termar Servicios";
const APP_DESCRIPTION = "Field worksheet — technician's day";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: "Today · Termar Servicios",
    template: "%s · Termar Servicios",
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2f5bea",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-dvh flex flex-col">
        <SerwistProvider swUrl="/serwist/sw.js">
          <SyncProvider />
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
