import { useCallback, useEffect, useState } from "react";
import { getClientErrorMessage } from "../client-errors";
import { api, getFreshSessionToken } from "../api";
import type { AppNotification } from "../types/messaging";

export function useNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshUnreadCount = useCallback(async () => {
    if (!enabled) return;
    try {
      const token = await getFreshSessionToken();
      if (!token) return;
      const payload = await api.getNotificationUnreadCount();
      setUnreadCount(Number(payload?.count || 0));
    } catch {
      /* ignore transient errors */
    }
  }, [enabled]);

  const loadNotifications = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      const rows = await api.getNotifications();
      setNotifications(Array.isArray(rows) ? rows : []);
      await refreshUnreadCount();
    } catch (err: any) {
      setError(getClientErrorMessage(err, "Impossible de charger les notifications"));
    } finally {
      setLoading(false);
    }
  }, [enabled, refreshUnreadCount]);

  const markRead = useCallback(async (id: string) => {
    setError("");
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item)),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err: any) {
      setError(getClientErrorMessage(err, "Impossible de marquer la notification comme lue"));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setError("");
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch (err: any) {
      setError(getClientErrorMessage(err, "Impossible de marquer toutes les notifications comme lues"));
    }
  }, []);

  const pushNotification = useCallback((notification: AppNotification) => {
    setNotifications((prev) => [notification, ...prev.filter((item) => item.id !== notification.id)]);
    if (!notification.isRead) setUnreadCount((count) => count + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const pollUnreadCount = () => {
      if (document.visibilityState === "hidden") return;
      void refreshUnreadCount();
    };

    pollUnreadCount();
    const timer = window.setInterval(pollUnreadCount, 120_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshUnreadCount();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, refreshUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    refreshUnreadCount,
    markRead,
    markAllRead,
    pushNotification,
  };
}
