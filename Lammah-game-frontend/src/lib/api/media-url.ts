import { runtimeConfig } from "@/config/runtime-config";

export function getMediaUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${runtimeConfig.apiBaseUrl}${url}`;
  return url;
}
