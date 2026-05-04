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
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { markAllRead as reduxMarkAllRead } from "../../redux/notificationSlice.js";
import { NotificationSkeleton } from "../../components/Skeletons.jsx";
import { EmptyNotificationsState } from "../../components/EmptyStates.jsx";
import { formatTime } from "../../components/CommonUI.jsx";

const ICONS = {
  message: { icon: MessageCircle, color: "var(--color-accent)", bg: "rgba(34,211,238,0.15)" },
  like: { icon: Heart, color: "var(--color-like)", bg: "rgba(255,85,119,0.15)" },
  follow: { icon: UserPlus, color: "var(--color-success)", bg: "rgba(74,222,128,0.15)" },
  comment: { icon: MessageCircle, color: "var(--color-primary)", bg: "rgba(139,124,255,0.15)" },
  mention: { icon: AtSign, color: "var(--color-warning)", bg: "rgba(251,191,36,0.15)" },
  share: { icon: Megaphone, color: "var(--color-accent-2, #f472b6)", bg: "rgba(244,114,182,0.15)" },
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
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Notifications
              {unread > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-primary text-white">
                  {unread}
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Stay in the loop</p>
          </div>
          {unread > 0 && (
            <button onClick={handleMarkAllRead} className="btn btn-glass">
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
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                filter === f.id
                  ? "bg-gradient-primary text-white glow-primary-soft"
                  : "bg-glass text-muted-foreground hover:text-foreground"
              }`}
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
                  className={`card p-3.5 flex items-start gap-3 transition-all hover-lift ${
                    n.read ? "opacity-75" : "border-glass-border-strong"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar src={n.actor?.profilepic} name={n.actor?.firstname || n.title || "·"} size={42} />
                    <div
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full grid place-items-center border-2 border-background"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      <Icon className="w-2.5 h-2.5" style={{ color: cfg.color }} fill={n.type === "like" ? "currentColor" : "none"} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{n.content || n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatTime(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-primary mt-2 glow-primary-soft flex-shrink-0" />
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
