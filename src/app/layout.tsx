import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastContainer } from "@/components/ToastContainer";
import { AuthProvider } from "@/features/auth/AuthProvider";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "infiniteMDBoard",
  description: "Infinite canvas markdown board",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased font-sans">
        <AuthProvider>
          <ErrorBoundary>
            {children}
            <ToastContainer />
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
