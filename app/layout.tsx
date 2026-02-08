import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "flux-embeds",
    template: "%s · flux-embeds",
  },
  description:
    "A host for small, iframe-safe UI surfaces used across Flux.",

  applicationName: "flux-embeds",

  openGraph: {
    title: "flux-embeds",
    description:
      "A host for small, iframe-safe UI surfaces used across Flux.",
    type: "website",
    images: [
      {
        url: "/horizontal_logo.webp",
        width: 1200,
        height: 630,
        alt: "flux-embeds",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "flux-embeds",
    description:
      "A host for small, iframe-safe UI surfaces used across Flux.",
    images: ["/wordmark.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#161d21",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
