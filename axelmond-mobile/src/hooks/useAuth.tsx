import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AppUser, UserRole } from "../types";
import { api } from "../services/api";
import { getFreshAccessToken, onSessionInvalidated } from "../services/api/client";
import {
  getStoredUser,
  saveAuthSession,
  updateStoredUser,
} from "../services/authStorage";

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    filiere?: string;
    professorInviteCode?: string;
  }) => Promise<{ verificationRequired?: boolean; email?: string; message?: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedUser = await getStoredUser();
        if (!storedUser) return;

        const freshToken = await getFreshAccessToken();
        if (!freshToken) {
          setUser(null);
          return;
        }

        setUser(storedUser);
        try {
          const freshUser = await api.me();
          setUser(freshUser);
          await updateStoredUser(freshUser);
        } catch {
          // Transient network errors: keep restored session until the next API call fails.
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => onSessionInvalidated(() => setUser(null)), []);

  const login = useCallback(async (email: string, password: string, role: UserRole) => {
    const session = await api.login(email.trim(), password, role);
    await saveAuthSession(session);
    setUser(session.user);
  }, []);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    filiere?: string;
    professorInviteCode?: string;
  }) => api.register(data), []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const session = await api.verifyEmail(email.trim(), code.trim());
    await saveAuthSession(session);
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const freshUser = await api.me();
    setUser(freshUser);
    await updateStoredUser(freshUser);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, verifyEmail, logout, refreshUser }),
    [user, loading, login, register, verifyEmail, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function isTeacherRole(role?: UserRole) {
  return role === "PROFESSOR" || role === "RESEARCHER" || role === "ADMIN";
}
