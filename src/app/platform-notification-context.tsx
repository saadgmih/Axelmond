import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AppNotification } from "../types/messaging";

export interface PlatformNotificationContextValue {
  notifications: AppNotification[];
  notificationUnreadCount: number;
  notificationsLoading: boolean;
  notificationsError: string;
  loadNotifications: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  handleNotificationNavigate: (notification: AppNotification) => void;
  pushStatus: string;
  pushStatusKind: "idle" | "success" | "error" | "info";
  subscribePushNotifications: () => void;
}

const PlatformNotificationContext = createContext<PlatformNotificationContextValue | null>(null);

export function PlatformNotificationProvider({
  value,
  children,
}: {
  value: PlatformNotificationContextValue;
  children: ReactNode;
}) {
  const memoized = useMemo(
    () => value,
    [
      value.notifications,
      value.notificationUnreadCount,
      value.notificationsLoading,
      value.notificationsError,
      value.loadNotifications,
      value.markNotificationRead,
      value.markAllNotificationsRead,
      value.handleNotificationNavigate,
      value.pushStatus,
      value.pushStatusKind,
      value.subscribePushNotifications,
    ],
  );

  return <PlatformNotificationContext.Provider value={memoized}>{children}</PlatformNotificationContext.Provider>;
}

export function usePlatformNotificationsContext(): PlatformNotificationContextValue {
  const value = useContext(PlatformNotificationContext);
  if (!value) {
    throw new Error("usePlatformNotificationsContext must be used within PlatformNotificationProvider");
  }
  return value;
}
