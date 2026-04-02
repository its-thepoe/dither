import type { Metadata } from "next";
import "./globals.css";
import { AgentationDev } from "@/components/agentation-dev";
import { DialKitProvider } from "./dialkit-provider";

export const metadata: Metadata = {
  title: "Dither Playground",
  description:
    "Upload a logo and watch it come alive as interactive dithered particles. Hover to push, click to explode.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Dither Playground",
    description: "Interactive dithered particles from any image.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dither Playground",
    description: "Interactive dithered particles from any image.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <DialKitProvider>{children}</DialKitProvider>
        <AgentationDev />
      </body>
    </html>
  );
}
