export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  // No sidebar, no header - just the map
  return <>{children}</>;
}
