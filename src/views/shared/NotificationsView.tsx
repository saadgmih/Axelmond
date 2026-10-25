import React, { memo, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Loader2, Radio, Volume2, VolumeX, Sparkles, Video, MessageSquare, BookOpen } from "lucide-react";
import type { AppNotification } from "../../types/messaging";
import { VirtualList } from "../../components/VirtualList";
import { scheduleUi } from "../teacher/schedule-theme";
import { playNotificationSound, isSoundEnabled, setSoundEnabled } from "../../utils/notification-sound";
import { useIsNativeApp } from "../../hooks/useIsNativeApp";

interface NotificationsViewProps {
  notifications: AppNotification[];
  loading: boolean;
  error: string;
  onReload: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate?: (notification: AppNotification) => void;
  pushStatus?: string;
  pushStatusKind?: "idle" | "success" | "error" | "info";
  onEnablePush?: () => void;
}

type NotificationCategoryFilter = "ALL" | "UNREAD" | "ACADEMIC" | "LIVE" | "MESSAGES";

function typeLabel(type: string) {
  switch (type) {
    case "NEW_MESSAGE":
      return "Message";
    case "NEW_COURSE":
      return "Module";
    case "COURSE_UPDATED":
      return "Mise à jour";
    case "NEW_MODULE":
      return "Contenu";
    case "NEW_CHAPTER":
      return "Chapitre";
    case "NEW_SECTION":
      return "Section";
    case "NEW_CONTENT":
      return "Ressource";
    case "LIVE_REPLAY_AVAILABLE":
      return "Rediffusion";
    case "LIVE_STARTED":
      return "Live";
    case "LIVE_FINISHED":
      return "Live terminé";
    case "LIVE_SOON":
      return "Live bientôt";
    case "NEW_QUIZ":
      return "Quiz";
    case "NEW_HOMEWORK":
      return "Devoir";
    default:
      return "Alerte";
  }
}

const NotificationListItem = memo(function NotificationListItem({
  notification,
  onMarkRead,
  onNavigate,
}: {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onNavigate?: (notification: AppNotification) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (!notification.isRead) onMarkRead(notification.id);
          if (notification.actionUrl && onNavigate) onNavigate(notification);
        }}
        className={`flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03] ${notification.isRead ? "opacity-70" : "bg-emerald-500/5"}`}
      >
        <div
          className={`mt-1 flex h-10 w-10 items-center justify-center rounded-2xl ${notification.isRead ? "bg-slate-800" : "bg-emerald-600/20"}`}
        >
          <Bell className={`h-4 w-4 ${notification.isRead ? "text-slate-400" : "text-emerald-300"}`} />
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
    </div>
  );
});

export default function NotificationsView({
  notifications,
  loading,
  error,
  onReload,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
  pushStatus,
  pushStatusKind = "info",
  onEnablePush,
}: NotificationsViewProps) {
  const isApp = useIsNativeApp();
  const [filter, setFilter] = useState<NotificationCategoryFilter>("ALL");
  const [soundActive, setSoundActive] = useState<boolean>(() => isSoundEnabled());

  useEffect(() => {
    onReload();
  }, [onReload]);

  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    if (next) {
      playNotificationSound("alert");
    }
  };

  const handleTestSound = () => {
    playNotificationSound("message");
  };

  const counts = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead).length;
    const academic = notifications.filter((n) =>
      ["NEW_COURSE", "COURSE_UPDATED", "NEW_MODULE", "NEW_CHAPTER", "NEW_SECTION", "NEW_CONTENT", "NEW_QUIZ", "NEW_HOMEWORK"].includes(n.type)
    ).length;
    const live = notifications.filter((n) =>
      ["LIVE_STARTED", "LIVE_FINISHED", "LIVE_SOON", "LIVE_REPLAY_AVAILABLE"].includes(n.type)
    ).length;
    const messages = notifications.filter((n) => n.type === "NEW_MESSAGE").length;

    return {
      all: notifications.length,
      unread,
      academic,
      live,
      messages,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case "UNREAD":
        return notifications.filter((n) => !n.isRead);
      case "ACADEMIC":
        return notifications.filter((n) =>
          ["NEW_COURSE", "COURSE_UPDATED", "NEW_MODULE", "NEW_CHAPTER", "NEW_SECTION", "NEW_CONTENT", "NEW_QUIZ", "NEW_HOMEWORK"].includes(n.type)
        );
      case "LIVE":
        return notifications.filter((n) =>
          ["LIVE_STARTED", "LIVE_FINISHED", "LIVE_SOON", "LIVE_REPLAY_AVAILABLE"].includes(n.type)
        );
      case "MESSAGES":
        return notifications.filter((n) => n.type === "NEW_MESSAGE");
      default:
        return notifications;
    }
  }, [notifications, filter]);

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
          <div className="flex flex-wrap items-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleToggleSound}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                soundActive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
              title={soundActive ? "Sons activés (cliquer pour couper)" : "Sons coupés (cliquer pour activer)"}
            >
              {soundActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span>{soundActive ? "Sons activés" : "Sons coupés"}</span>
            </button>

            {soundActive && (
              <button
                type="button"
                onClick={handleTestSound}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                title="Tester le carillon audio Web Audio API"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Tester le son</span>
              </button>
            )}

            {!isApp && onEnablePush && (
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

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#07241e]/90 p-2 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            filter === "ALL"
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "text-slate-300 hover:bg-white/5"
          }`}
        >
          <span>Toutes</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${filter === "ALL" ? "bg-slate-900/20 text-slate-950" : "bg-white/10 text-slate-400"}`}>
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("UNREAD")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            filter === "UNREAD"
              ? "bg-red-500 text-white shadow-md shadow-red-500/20"
              : "text-slate-300 hover:bg-white/5"
          }`}
        >
          <span>Non lues</span>
          {counts.unread > 0 && (
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${filter === "UNREAD" ? "bg-white/20 text-white" : "bg-red-500/20 text-red-300"}`}>
              {counts.unread}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilter("ACADEMIC")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            filter === "ACADEMIC"
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "text-slate-300 hover:bg-white/5"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Pédagogie</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${filter === "ACADEMIC" ? "bg-slate-900/20 text-slate-950" : "bg-white/10 text-slate-400"}`}>
            {counts.academic}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("LIVE")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            filter === "LIVE"
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "text-slate-300 hover:bg-white/5"
          }`}
        >
          <Video className="h-3.5 w-3.5" />
          <span>Direct & Live</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${filter === "LIVE" ? "bg-slate-900/20 text-slate-950" : "bg-white/10 text-slate-400"}`}>
            {counts.live}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("MESSAGES")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            filter === "MESSAGES"
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "text-slate-300 hover:bg-white/5"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Messagerie</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${filter === "MESSAGES" ? "bg-slate-900/20 text-slate-950" : "bg-white/10 text-slate-400"}`}>
            {counts.messages}
          </span>
        </button>
      </div>

      {!isApp && pushStatus && (
        <div className={pushStatusKind === "error" ? scheduleUi.alertError : scheduleUi.alertSuccess}>{pushStatus}</div>
      )}
      {error && <div className={scheduleUi.alertError}>{error}</div>}

      <div className="rounded-3xl border border-white/[0.08] bg-[#0b241f]/80 shadow-2xl shadow-black/30">
        {loading ? (
          <div className="flex items-center justify-center p-10 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center text-slate-500">
            <Bell className="h-10 w-10 text-slate-600 opacity-50" />
            <p className="text-sm font-semibold text-red-400/80">
              Une erreur est survenue lors de la récupération des notifications.
            </p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center text-slate-500">
            <Bell className="h-10 w-10 text-slate-600" />
            <p className="text-sm font-semibold">
              {filter === "UNREAD"
                ? "Toutes vos notifications sont à jour !"
                : filter === "ACADEMIC"
                ? "Aucune notification pédagogique pour le moment."
                : filter === "LIVE"
                ? "Aucun direct ou rediffusion récente."
                : filter === "MESSAGES"
                ? "Aucune notification de message."
                : "Aucune notification pour le moment."}
            </p>
          </div>
        ) : isApp ? (
          <div className="flex flex-col divide-y divide-white/[0.06] p-1">
            {filteredNotifications.map((notification) => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                onMarkRead={onMarkRead}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : (
          <VirtualList
            items={filteredNotifications}
            estimateSize={96}
            minItemsToVirtualize={18}
            getKey={(notification) => notification.id}
            renderItem={(notification) => (
              <NotificationListItem notification={notification} onMarkRead={onMarkRead} onNavigate={onNavigate} />
            )}
          />
        )}
      </div>
    </div>
  );
}
