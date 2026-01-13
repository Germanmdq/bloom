import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bloom Cafe - Premium Experience",
  description: "Specialty coffee and exquisite tastes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900 bg-canvas">
        {children}
      </body>
    </html>
  );
}
