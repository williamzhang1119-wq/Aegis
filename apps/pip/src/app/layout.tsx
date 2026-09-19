import { Fredoka, Nunito } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const display = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Pip — a kid-safe AI tutor",
  description:
    "Pip is a Socratic AI tutor for kids: hints and questions that guide learning without giving answers away.",
  openGraph: {
    title: "Pip — a kid-safe AI tutor",
    description:
      "Homework help that teaches thinking — Pip guides with hints, never spoils the answer.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
