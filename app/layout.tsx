import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteDescription, siteName, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Awesome DSH Plugins | DeepSeek Harness Plugin Directory",
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: "Awesome DSH Plugins | DeepSeek Harness Plugin Directory",
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
    title: "Awesome DSH Plugins | DeepSeek Harness Plugin Directory",
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
