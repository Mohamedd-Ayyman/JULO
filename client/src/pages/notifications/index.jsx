import React, { useState, useEffect } from "react";
import AppLayout from "../../components/appLayout.jsx";
import Avatar from "../../components/Avatar.jsx";
import { getNotifications, markAllRead as apiMarkAllRead } from "../../apiCalls/notification.js";
import {
  Bell,
  MessageCircle,
  Heart,
  UserPlus,
  Check,
  AtSign,
  Megaphone,
} from "lucide-react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { markAllRead as reduxMarkAllRead } from "../../redux/notificationSlice.js";
import { NotificationSkeleton } from "../../components/Skeletons.jsx";
import { EmptyNotificationsState } from "../../components/EmptyStates.jsx";
import { formatTime } from "../../components/CommonUI.jsx";

const ICONS = {
  message: { icon: MessageCircle, color: "var(--acid)", bg: "var(--riso-blue)" },
  like: { icon: Heart, color: "var(--riso-red)", bg: "var(--riso-red)" },
  follow: { icon: UserPlus, color: "var(--mood-cozy)", bg: "var(--mood-cozy)" },
  comment: { icon: MessageCircle, color: "var(--ink)", bg: "var(--acid)" },
  mention: { icon: AtSign, color: "var(--ink)", bg: "var(--riso-yellow)" },
  share: { icon: Megaphone, color: "var(--paper)", bg: "var(--riso-pink)" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getNotifications();
      if (cancelled) return;
      if (res.success) setNotifications(res.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleMarkAllRead = async () => {
    const res = await apiMarkAllRead();
    if (res.success) {
      setNotifications((list) => list.map((n) => ({ ...n, read: true })));
      dispatch(reduxMarkAllRead());
      toast.success("All caught up");
    }
  };

  const filtered = notifications.filter((n) => filter === "all" || n.type === filter);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <AppLayout title="Notifications">
      <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-5 animate-fade-in-down">
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: "var(--ink)" }}>
              <Bell className="w-6 h-6" strokeWidth={2.5} />
              Notifications
              {unread > 0 && (
                <span
                  className="font-mono text-[11px] font-bold px-2 py-0.5"
                  style={{ background: "var(--riso-red)", color: "var(--paper)", border: "2px solid var(--ink)" }}
                >
                  {unread}
                </span>
              )}
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-widest mt-0.5" style={{ color: "var(--muted-2)" }}>
              Stay in the loop
            </p>
          </div>
          {unread > 0 && (
            <button onClick={handleMarkAllRead} className="brutal-btn brutal-btn-sm">
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3 animate-fade-in">
          {[
            { id: "all", label: "All" },
            { id: "like", label: "Likes" },
            { id: "comment", label: "Comments" },
            { id: "share", label: "Echoes" },
            { id: "follow", label: "Follows" },
            { id: "mention", label: "Mentions" },
            { id: "message", label: "Messages" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="flex-shrink-0 font-mono text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 border-2 transition-all"
              style={{
                background: filter === f.id ? "var(--ink)" : "var(--paper)",
                color: filter === f.id ? "var(--paper)" : "var(--ink)",
                borderColor: "var(--ink)",
                borderRadius: "var(--r-pill)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            <NotificationSkeleton /><NotificationSkeleton /><NotificationSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyNotificationsState />
        ) : (
          <div className="space-y-2 stagger">
            {filtered.map((n) => {
              const cfg = ICONS[n.type] || ICONS.like;
              const Icon = cfg.icon;
              return (
                <div
                  key={n._id}
                  className={`brutal-card p-3.5 flex items-start gap-3 transition-all ${n.read ? "opacity-60" : ""}`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar src={n.actor?.profilepic} name={n.actor?.firstname || n.title || "·"} size={42} />
                    <div
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full grid place-items-center border-2 border-ink"
                      style={{ backgroundColor: cfg.bg }}
                    >
                      <Icon className="w-2.5 h-2.5" style={{ color: cfg.color }} strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug font-display font-bold" style={{ color: "var(--ink)" }}>
                      {n.content || n.message}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "var(--muted-2)" }}>
                      {formatTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0" style={{ background: "var(--riso-red)" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}