import type { Metadata } from "next";
import { SyncProvider } from "@/components/sync/SyncProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Today · Termar Servicios",
  description: "Field worksheet — technician's day",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-dvh flex flex-col">
        <SyncProvider />
        {children}
      </body>
    </html>
  );
}
