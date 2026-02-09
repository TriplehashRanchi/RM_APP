import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { getToken, removeToken, setToken } from "../utils/token";
import { router, useSegments } from "expo-router";

const AuthContext = createContext(null);

const ROLE_HOME_MAP = {
  SUPER_ADMIN: "/(superadmin)/dashboard",
  HR_ADMIN: "/(hr)/dashboard",
  EMPLOYEE: "/(employee)/dashboard",
};

const normalizeRole = (role) => String(role || "").trim().toUpperCase();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments(); // tells which route group you're in

  const logout = useCallback(async () => {
    await removeToken();
    setUser(null);
    router.replace("/(auth)/login");
  }, []);

  const initAuth = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const { data } = await api.get("/auth/me");
      if (data?.success) {
        setUser(data.user);
      } else {
        await logout();
      }
    } catch (_error) {
      await logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Route guard (like your web “layout protection”)
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (user && inAuthGroup) {
      const target = ROLE_HOME_MAP[normalizeRole(user.role)] || "/(employee)/dashboard";
      router.replace(target);
    }
  }, [user, loading, segments]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });

      if (data?.success) {
        if (!data?.token || !data?.user?.role) {
          return { success: false, message: "Invalid login response from server." };
        }

        await setToken(data.token);
        setUser(data.user);

        const target = ROLE_HOME_MAP[normalizeRole(data.user.role)] || "/(employee)/dashboard";
        router.replace(target);

        return { success: true };
      }

      return { success: false, message: "Login failed" };
    } catch (err) {
      if (!err.response) {
        return {
          success: false,
          message: "Cannot reach API server. Check EXPO_PUBLIC_API_URL and backend status.",
        };
      }
      const message = err.response?.data?.message || "Login failed. Please try again.";
      return { success: false, message };
    }
  };

  const checkPermission = useCallback((allowedRoles) => {
    if (!user) return false;
    const currentRole = normalizeRole(user.role);
    return allowedRoles.map(normalizeRole).includes(currentRole);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      checkPermission,
    }),
    [user, loading, logout, checkPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
