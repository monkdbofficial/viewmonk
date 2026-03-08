'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import KeyboardShortcuts from './KeyboardShortcuts';
import { useRouter, usePathname } from 'next/navigation';

const MonkDBAssistant = dynamic(() => import('./assistant/MonkDBAssistant'), { ssr: false });

const Navigation = dynamic(() => import('./Navigation'), { ssr: false });

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check if current page is an auth page (login/register) or embed page
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isEmbedPage = pathname?.includes('/embed');

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      // Keyboard Shortcuts: ?
      if (e.key === '?' && !commandPaletteOpen) {
        e.preventDefault();
        setShortcutsModalOpen(true);
      }
      // Close on Escape
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setShortcutsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen]);

  // If it's an auth page or embed page, render without sidebar and navigation
  if (isAuthPage || isEmbedPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-100 dark:bg-[#0A1929]">
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(tab) => {
          router.push(`/${tab}`);
          setCommandPaletteOpen(false);
        }}
      />

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Navigation */}
      <Navigation />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0D1B2A]">
          <div className="mx-auto max-w-[1800px] p-8">{children}</div>
        </main>
      </div>

      {/* AI Assistant — floats above all content */}
      <MonkDBAssistant />
    </div>
  );
}
