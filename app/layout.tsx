import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, Raleway, Open_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-opensans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Bloom Cafe | Experiencia Premium",
  description: "Donde cada taza florece.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f5ef",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${raleway.variable} ${openSans.variable} ${playfair.variable} ${inter.variable} antialiased text-neutral-900 bg-[#fffdf8]`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
