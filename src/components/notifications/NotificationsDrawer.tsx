import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Bell,
  Check,
  CheckCheck,
  Trophy,
  Shield,
  Coins,
  Sparkles,
  MessageCircle,
  ExternalLink,
  Trash2,
  Clock,
  Inbox,
} from "lucide-react";
import { useSquad, NavTab } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string; // 'tournament' | 'clan' | 'reward' | 'shop' | 'system' | 'chat'
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, setActiveTab, openAuthModal, refreshNotificationsCount } = useSquad();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "tournaments" | "clan">("all");
  const [isLoading, setIsLoading] = useState(false);
  const hasSeededRef = useRef(false);

  // Fetch notifications for currentUser
  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setNotifications(data as NotificationItem[]);
      } else if (!hasSeededRef.current) {
        hasSeededRef.current = true;
        // If brand new user with no notifications, seed initial welcome notifications
        const initialSeed = [
          {
            user_id: currentUser.id,
            title: "Benvenuto su SquadUP! 🎮",
            message: "La tua postazione da combattimento è pronta. Esplora i tornei e unisciti a un Clan!",
            type: "system",
            link_url: "tournaments",
            is_read: false,
          },
          {
            user_id: currentUser.id,
            title: "Nuovo Shop Centrale Attivo 🛍️",
            message: "Scopri il nuovo Shop dedicato: Pass Pro, pacchetti SCoin, cornici e banner esclusivi.",
            type: "shop",
            link_url: "shop",
            is_read: false,
          },
        ];

        const { data: inserted } = await supabase
          .from("notifications")
          .insert(initialSeed)
          .select();

        if (inserted) {
          setNotifications(inserted as NotificationItem[]);
        }
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      console.warn("[Notifications] Errore caricamento:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      fetchNotifications();
    }
  }, [isOpen, currentUser?.id, fetchNotifications]);

  // Real-time listener for new notifications while open
  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;

    const channel = supabase
      .channel(`realtime:notifs:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          fetchNotifications();
          refreshNotificationsCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, currentUser?.id, fetchNotifications, refreshNotificationsCount]);

  if (!isOpen) return null;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUser.id);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast({
        title: "Tutte le notifiche lette",
        description: "Lo stato di lettura è stato aggiornato.",
      });
    } catch (err: any) {
      toast({
        title: "Errore aggiornamento",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from("notifications").delete().eq("id", id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.is_read) {
      handleMarkAsRead(n.id);
    }
    if (n.link_url) {
      const validTabs: NavTab[] = [
        "home",
        "tournaments",
        "voice",
        "messages",
        "clan",
        "shop",
        "profile",
      ];
      if (validTabs.includes(n.link_url as NavTab)) {
        setActiveTab(n.link_url as NavTab);
        onClose();
      }
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "tournaments") return n.type === "tournament";
    if (filter === "clan") return n.type === "clan";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "tournament":
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case "clan":
        return <Shield className="w-4 h-4 text-cyan-400" />;
      case "reward":
      case "shop":
        return <Coins className="w-4 h-4 text-emerald-400" />;
      case "chat":
        return <MessageCircle className="w-4 h-4 text-purple-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Proprio ora";
    if (minutes < 60) return `${minutes}m fa`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h fa`;
    const days = Math.floor(hours / 24);
    return `${days}g fa`;
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0f1322] border border-purple-500/40 p-4 shadow-[0_0_35px_rgba(139,92,246,0.25)] overflow-hidden max-h-[85vh] flex flex-col mt-12 sm:mt-16">
        {/* Subtle Top Ambient Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-r from-purple-600/30 via-cyan-500/30 to-amber-500/20 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Bell className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-white">Notifiche</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400">Attività tornei, clan e wallet</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                title="Segna tutte come lette"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/60 transition-colors cursor-pointer text-[10px] flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lette</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900/80 rounded-2xl border border-zinc-800 my-2.5 overflow-x-auto">
          <button
            onClick={() => setFilter("all")}
            className={`py-1 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === "all"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Tutte ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`py-1 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === "unread"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Non lette ({unreadCount})
          </button>
          <button
            onClick={() => setFilter("tournaments")}
            className={`py-1 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === "tournaments"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Tornei
          </button>
          <button
            onClick={() => setFilter("clan")}
            className={`py-1 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === "clan"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Clan
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
          {!currentUser ? (
            <div className="text-center py-8 space-y-2">
              <Inbox className="w-8 h-8 text-zinc-500 mx-auto" />
              <p className="text-xs text-zinc-400">Accedi per visualizzare le tue notifiche personali.</p>
              <button
                onClick={() => {
                  onClose();
                  openAuthModal("login");
                }}
                className="py-1.5 px-3 rounded-xl bg-purple-600 text-white font-bold text-xs"
              >
                Accedi a SquadUP
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <Bell className="w-5 h-5 opacity-40" />
              </div>
              <p className="text-xs text-zinc-400 font-semibold">Nessuna notifica presente</p>
              <span className="text-[10px] text-zinc-500 block">
                {filter === "unread" ? "Tutte le notifiche sono state lette." : "Sarai avvisato non appena ci saranno novità."}
              </span>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                  n.is_read
                    ? "bg-zinc-900/50 border-zinc-800/70 hover:border-zinc-700"
                    : "bg-[#14182e] border-purple-500/40 hover:border-purple-400 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                }`}
              >
                {/* Type Icon */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    n.is_read
                      ? "bg-zinc-800/80 border-zinc-700"
                      : "bg-purple-950/80 border-purple-500/50"
                  }`}
                >
                  {getTypeIcon(n.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4
                      className={`text-xs truncate ${
                        n.is_read ? "font-semibold text-zinc-200" : "font-extrabold text-white"
                      }`}
                    >
                      {n.title}
                    </h4>
                    <span className="text-[9px] text-zinc-500 shrink-0">
                      {formatTimestamp(n.created_at)}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>

                  {/* Actions & Link Indicator */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-800/60">
                    <div className="flex items-center gap-1.5">
                      {n.link_url && (
                        <span className="text-[9px] font-bold text-cyan-400 flex items-center gap-0.5 hover:underline">
                          <ExternalLink className="w-2.5 h-2.5" />
                          Vai a {n.link_url}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!n.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          title="Segna come letta"
                          className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteNotification(n.id, e)}
                        title="Elimina notifica"
                        className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Unread indicator dot */}
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1 shadow-[0_0_6px_#22d3ee]" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
