import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dasher — DoorDash Earnings Analyzer",
  description: "Upload DoorDash dash screenshots to track hourly rates, mileage, and the best times to dash."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
