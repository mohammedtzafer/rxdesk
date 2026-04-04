import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "RxDesk — Know your prescribers. Grow your scripts.",
  description:
    "SaaS platform for independent pharmacies. Prescriber relationship management, drug rep tracking, and prescription analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
