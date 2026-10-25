import axios, { isAxiosError } from "axios";
import { normalizeApiError } from "./api-client-error";

export function createHttpClient (
  visitorId: string,
  getToken: () => string | null,
  onUnauthorized: (token: string) => void = () => undefined,
) {
  const configuredBaseUrl: unknown = import.meta.env.VITE_API_BASE_URL
  const baseURL = typeof configuredBaseUrl === "string" && configuredBaseUrl ? configuredBaseUrl : "/api"
  const client = axios.create({ baseURL, timeout: 10_000 });

  client.interceptors.request.use((config) => {
    const token = getToken();

    config.headers.set("X-Visitor-Id", visitorId);
    if (token && !config.headers.has("Authorization")) config.headers.set("Authorization", "Bearer " + token);
    return config
  });

  client.interceptors.response.use((response) => response, (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      const path = error.config?.url
      const authorization: unknown = error.config?.headers.get("Authorization");

      if (path !== "/auth/login" && path !== "/auth/register"
        && typeof authorization === "string" && authorization.startsWith("Bearer ")) {
        onUnauthorized(authorization.slice(7));
      }
    }

    return Promise.reject(normalizeApiError(error));
  });

  return client
}
