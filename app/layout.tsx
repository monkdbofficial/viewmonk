import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { ToastProvider } from "./components/ToastContext";
import ToastContainer from "./components/ToastContainer";
import AppLayout from "./components/AppLayout";
import { MonkDBProvider } from "./lib/monkdb-context";
import { SchemaProvider } from "./contexts/schema-context";
import { QueryTabsProvider } from "./lib/query-tabs-context";
import { NotificationProvider } from "./lib/notification-context";
import { SavedViewsProvider } from "./lib/saved-views-context";
import { BlobProvider } from "./lib/blob-context";
import { UserProvider } from "./lib/user-context";
import ErrorBoundary from "./components/ErrorBoundary";

export const metadata: Metadata = {
  title: "MonkDB Workbench - Professional Database Management",
  description: "A professional workbench for MonkDB database management and development",
  icons: {
    icon: '/image.png',
    shortcut: '/image.png',
    apple: '/image.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply dark class synchronously before React hydrates — eliminates white flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||((!t)&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();` }} />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <ThemeProvider>
            <UserProvider>
              <NotificationProvider>
                <MonkDBProvider>
                  <SchemaProvider>
                    <BlobProvider>
                      <SavedViewsProvider>
                        <QueryTabsProvider>
                          <ToastProvider>
                            <AppLayout>{children}</AppLayout>
                            <ToastContainer />
                          </ToastProvider>
                        </QueryTabsProvider>
                      </SavedViewsProvider>
                    </BlobProvider>
                  </SchemaProvider>
                </MonkDBProvider>
              </NotificationProvider>
            </UserProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
