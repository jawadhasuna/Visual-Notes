import type { Metadata, Viewport } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Visual Notes",
  description:
    "Visual Notes — narrative critical-care nursing documentation restructured into a source-verifiable body-system chart. New England CareFlow LLC.",
  applicationName: "Visual Notes",
  authors: [{ name: "New England CareFlow LLC" }],
  openGraph: {
    title: "Visual Notes",
    description:
      "Narrative critical-care nursing documentation, restructured into a source-verifiable body-system chart.",
    siteName: "Visual Notes",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#04121f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${inter.variable} ${jetbrains.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
