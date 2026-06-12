import React, { useEffect } from "react";
import { Bell, CheckCheck, Loader2, Radio } from "lucide-react";
import type { AppNotification } from "../../types/messaging";
import { scheduleUi } from "../teacher/schedule-theme";

interface NotificationsViewProps {
  notifications: AppNotification[];
  loading: boolean;
  error: string;
  onReload: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate?: (notification: AppNotification) => void;
  pushStatus?: string;
  onEnablePush?: () => void;
}

function typeLabel(type: string) {
  switch (type) {
    case "NEW_MESSAGE": return "Message";
    case "NEW_CHAPTER": return "Chapitre";
    case "LIVE_STARTED": return "Live";
    case "LIVE_SOON": return "Live bientôt";
    case "NEW_QUIZ": return "Quiz";
    case "NEW_HOMEWORK": return "Devoir";
    default: return "Alerte";
  }
}

export default function NotificationsView({
  notifications,
  loading,
  error,
  onReload,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
  pushStatus,
  onEnablePush,
}: NotificationsViewProps) {
  useEffect(() => {
    onReload();
  }, [onReload]);

  return (
    <div className={scheduleUi.page}>
      <section className={scheduleUi.hero}>
        <div className={scheduleUi.heroGradient} />
        <div className={scheduleUi.heroInner}>
          <div>
            <h1 className={scheduleUi.heroTitle}>Notifications</h1>
            <p className={scheduleUi.heroSubtitle}>
              Restez informé des nouveaux contenus, lives, messages et devoirs sans spam.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {onEnablePush && (
              <button type="button" className={scheduleUi.editBtn} onClick={onEnablePush}>
                <Radio className="mr-2 inline h-4 w-4" />
                Activer les push
              </button>
            )}
            <button type="button" className={scheduleUi.addBtn} onClick={onMarkAllRead}>
              <CheckCheck className="h-4 w-4" />
              Tout marquer comme lu
            </button>
          </div>
        </div>
      </section>

      {pushStatus && <div className={scheduleUi.alertSuccess}>{pushStatus}</div>}
      {error && <div className={scheduleUi.alertError}>{error}</div>}

      <div className="rounded-3xl border border-white/[0.08] bg-[#0f172a]/80 shadow-2xl shadow-black/30">
        {loading ? (
          <div className="flex items-center justify-center p-10 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center text-slate-500">
            <Bell className="h-10 w-10 text-slate-600" />
            <p className="text-sm font-semibold">Aucune notification pour le moment.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!notification.isRead) onMarkRead(notification.id);
                    if (notification.actionUrl && onNavigate) onNavigate(notification);
                  }}
                  className={`flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03] ${notification.isRead ? "opacity-70" : "bg-indigo-500/5"}`}
                >
                  <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-2xl ${notification.isRead ? "bg-slate-800" : "bg-indigo-600/20"}`}>
                    <Bell className={`h-4 w-4 ${notification.isRead ? "text-slate-400" : "text-indigo-300"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-white">{notification.title}</p>
                      <span className={scheduleUi.typeBadge}>{typeLabel(notification.type)}</span>
                      {!notification.isRead && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Non lue" />}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{notification.body}</p>
                    <p className="mt-2 text-[11px] font-semibold text-slate-500">
                      {new Date(notification.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
