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

// favicon.ico and apple-icon.png in this directory are picked up automatically,
// as is manifest.ts.

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables must live on <html>: Tailwind v4 emits its @theme
    // tokens (--font-sans, --font-mono, …) on :root, and those reference these
    // next/font variables. Scoped to <body> they are out of reach from :root,
    // which silently drops every family back to the system stack.
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
