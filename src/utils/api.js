import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getToken, removeToken } from "./token";
import { router } from "expo-router";

function resolveApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (envUrl) {
    const isLocalhost = /:\/\/(localhost|127\.0\.0\.1)(?::|\/)/i.test(envUrl);
    if (!isLocalhost || Platform.OS === "web") {
      return envUrl;
    }
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    "";
  const metroHost = hostUri.split(":")[0];

  if (metroHost) {
    return `http://${metroHost}:5050/api`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5050/api";
  }

  return "http://localhost:5050/api";
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await removeToken();
      router.replace("/(auth)/login?error=session_expired");
    }
    return Promise.reject(error);
  }
);

export default api;
