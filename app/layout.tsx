import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bloom Cafe - Experiencia Premium",
  description: "Café de especialidad y sabores exquisitos.",
};

import Providers from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased text-gray-900 bg-canvas" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
