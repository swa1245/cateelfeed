const rawApiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const env = {
  appName: import.meta.env.VITE_APP_NAME || "CatelFeed",
  appEnv: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
  /** Empty in local dev → requests go through Vite `/api` proxy. */
  apiUrl: rawApiUrl,
} as const;

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!env.apiUrl) return normalized;
  return `${env.apiUrl}${normalized}`;
}
