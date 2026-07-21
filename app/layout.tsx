import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/authContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dasher — DoorDash Earnings Analyzer",
  description: "Upload DoorDash dash screenshots to track hourly rates, mileage, and the best times to dash.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#eb1700"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
