/**
 * Runtime Environment Variables Loader
 * Loads NEXT_PUBLIC_* variables from server at runtime
 * This allows .env files to work in standalone builds
 */

let runtimeEnv: Record<string, string> = {};
let loaded = false;

export async function loadRuntimeEnv() {
  if (loaded) return runtimeEnv;

  try {
    const response = await fetch('/__ENV__');
    if (response.ok) {
      runtimeEnv = await response.json();

      // Inject into process.env for compatibility
      if (typeof window !== 'undefined') {
        (window as any).__RUNTIME_ENV__ = runtimeEnv;
      }

      loaded = true;
      console.log('✅ Runtime environment variables loaded');
    }
  } catch (err) {
    console.warn('Failed to load runtime env, using build-time values');
  }

  return runtimeEnv;
}

export function getRuntimeEnv(key: string): string | undefined {
  // Try runtime env first
  if (runtimeEnv[key]) {
    return runtimeEnv[key];
  }

  // Fall back to build-time env
  if (typeof process !== 'undefined' && process.env[key]) {
    return process.env[key];
  }

  // Try window global
  if (typeof window !== 'undefined' && (window as any).__RUNTIME_ENV__?.[key]) {
    return (window as any).__RUNTIME_ENV__[key];
  }

  return undefined;
}

// Auto-load on client side
if (typeof window !== 'undefined') {
  loadRuntimeEnv();
}
