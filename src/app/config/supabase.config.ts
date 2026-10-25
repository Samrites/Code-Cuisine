/** Public browser configuration. Never put a service_role or secret key here. */
declare global {
  interface Window {
    __CODE_CUISINE_SUPABASE__?: { url?: string; anonKey?: string };
  }
}
export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const config = typeof window === 'undefined' ? undefined : window.__CODE_CUISINE_SUPABASE__;
  const url = config?.url?.trim().replace(/\/$/, '') ?? '';
  const anonKey = config?.anonKey?.trim() ?? '';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || !anonKey) return null;
  return { url, anonKey };
}
