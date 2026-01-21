// Global type declarations for the application

interface Window {
  __TAURI__?: {
    invoke: (cmd: string, args?: any) => Promise<any>;
    // Add other Tauri API properties as needed
  };
}
