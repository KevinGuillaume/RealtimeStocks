export interface ApiConfig {
  baseUrl: string;
}

export const defaultApiConfig: ApiConfig = {
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
};
