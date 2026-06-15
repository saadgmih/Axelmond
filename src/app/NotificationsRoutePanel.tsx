import { Suspense } from "react";
import { LazyNotificationsView, RouteChunkFallback } from "../lazyViews";
import { usePlatformNotificationsContext } from "./platform-notification-context";

export function NotificationsRoutePanel() {
  const {
    notifications,
    notificationsLoading,
    notificationsError,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    handleNotificationNavigate,
    pushStatus,
    pushStatusKind,
    subscribePushNotifications,
  } = usePlatformNotificationsContext();

  return (
    <Suspense fallback={<RouteChunkFallback label="Chargement des notifications…" />}>
      <div className="p-4 md:p-8">
        <LazyNotificationsView
          notifications={notifications}
          loading={notificationsLoading}
          error={notificationsError}
          onReload={loadNotifications}
          onMarkRead={markNotificationRead}
          onMarkAllRead={markAllNotificationsRead}
          onNavigate={handleNotificationNavigate}
          pushStatus={pushStatus}
          pushStatusKind={pushStatusKind}
          onEnablePush={subscribePushNotifications}
        />
      </div>
    </Suspense>
  );
}
