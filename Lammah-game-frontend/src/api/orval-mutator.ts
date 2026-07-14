import type { AxiosRequestConfig } from "axios";
import apiClient from "@/lib/api/client";

/**
 * Orval transport adapter. It deliberately returns the documented HTTP body,
 * including any API envelope, and delegates auth/error behavior to apiClient.
 */
export async function orvalMutator<T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.request<T>({
    ...config,
    ...options,
    headers: {
      ...config.headers,
      ...options?.headers,
    },
  });

  return response.data;
}
