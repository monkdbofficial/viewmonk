import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { ToastProvider } from "./components/ToastContext";
import ToastContainer from "./components/ToastContainer";
import AppLayout from "./components/AppLayout";
import { MonkDBProvider } from "./lib/monkdb-context";
import { QueryTabsProvider } from "./lib/query-tabs-context";
import { DockerProvider } from "./lib/docker-context";
import { NotificationProvider } from "./lib/notification-context";
import ErrorBoundary from "./components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MonkDB Workbench - Professional Database Management",
  description: "A professional workbench for MonkDB database management and development",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider>
            <NotificationProvider>
              <MonkDBProvider>
                <DockerProvider>
                  <QueryTabsProvider>
                    <ToastProvider>
                      <AppLayout>{children}</AppLayout>
                      <ToastContainer />
                    </ToastProvider>
                  </QueryTabsProvider>
                </DockerProvider>
              </MonkDBProvider>
            </NotificationProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
