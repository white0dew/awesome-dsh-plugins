import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteDescription, siteName, siteUrl } from "@/lib/site";
import "artalk/Artalk.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: "Awesome DSH Plugins | Direct GitHub tool directory",
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "DeepSeek Harness tools",
    "DSH plugins",
    "GitHub tool directory",
  ],
  alternates: {
    canonical: "/",
    languages: {
      en: "/?lang=en",
      "zh-CN": "/?lang=zh",
    },
  },
  icons: {
    icon: [{ url: "/deepseek-icon.ico", type: "image/x-icon" }],
    shortcut: "/deepseek-icon.ico",
    apple: "/deepseek-icon.ico",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: "Awesome DSH Plugins | Direct GitHub tool directory",
    description: siteDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Awesome DSH Plugins",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Awesome DSH Plugins | Direct GitHub tool directory",
    description: siteDescription,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
