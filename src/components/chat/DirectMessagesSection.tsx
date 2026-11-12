import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Search,
  User,
  ArrowLeft,
  Sparkles,
  MessageCircle,
  Plus,
  Loader2,
  Check,
  CheckCheck,
  Gamepad2,
  Shield,
  Smile,
  X,
  Users,
  Crown,
  Lock,
  MessageSquare,
  Flame,
  Radio,
  Filter,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  canUserManageClanDirectChat,
  getStoredClanDirectMessages,
  storeClanDirectMessages,
  sendClanDirectMessage,
  ClanDirectMessage,
} from "@/services/clanDirectChatService";

interface DMMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface ChatEntity {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  clan_tag?: string;
  activision_id?: string;
  is_clan?: boolean;
  tier?: string;
  level?: number;
  game_mode?: string;
}

interface ConversationThread {
  partnerId: string;
  partner: ChatEntity;
  lastMessage: string;
  lastMessageAt: string;
  isClanThread?: boolean;
  unreadCount?: number;
}

export const DirectMessagesSection: React.FC = () => {
  const { currentUser, userProfile, openAuthModal, clanData, clanMembers } = useSquad();

  // Mode: "personal" (Personal 1-1 DMs) or "clan" (Clan Direct Messages Inbox)
  const [activeTabMode, setActiveTabMode] = useState<"personal" | "clan">("personal");

  // Threads & Active Partner
  const [personalThreads, setPersonalThreads] = useState<ConversationThread[]>([]);
  const [clanThreads, setClanThreads] = useState<ConversationThread[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<ChatEntity | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // In-list quick filter query
  const [threadFilter, setThreadFilter] = useState("");

  // Search Modal for New Chat (Operators & Clans)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchFilterCategory, setSearchFilterCategory] = useState<"all" | "operators" | "clans">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [operatorResults, setOperatorResults] = useState<ChatEntity[]>([]);
  const [clanResults, setClanResults] = useState<ChatEntity[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check clan chat permission
  const clanAccess = canUserManageClanDirectChat(currentUser, clanData, clanMembers);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Check for incoming session target chat (e.g. from Clan Detail or Public Profile)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("squadup_target_chat");
      if (stored) {
        sessionStorage.removeItem("squadup_target_chat");
        const parsed = JSON.parse(stored);
        if (parsed?.id) {
          setSelectedPartner(parsed);
          if (parsed.is_clan) {
            setActiveTabMode("personal");
          }
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // 2. Fetch Personal Threads
  const fetchPersonalThreads = async () => {
    if (!currentUser) {
      setIsLoadingThreads(false);
      return;
    }

    try {
      setIsLoadingThreads(true);
      const { data: dmData, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const partnerIds = new Set<string>();
      const latestMessageMap: Record<string, DMMessage> = {};

      (dmData || []).forEach((msg: DMMessage) => {
        const partnerId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
        if (!partnerIds.has(partnerId)) {
          partnerIds.add(partnerId);
          latestMessageMap[partnerId] = msg;
        }
      });

      const partnerIdsArray = Array.from(partnerIds);
      if (partnerIdsArray.length > 0) {
        // Fetch profiles
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, clan_tag, activision_id")
          .in("id", partnerIdsArray);

        // Also check if any partner is a clan (if contacted a clan)
        const { data: clansData } = await supabase
          .from("clans")
          .select("id, name, tag, avatar_url, tier, level, game_mode")
          .in("id", partnerIdsArray);

        const profilesMap = new Map<string, ChatEntity>();
        profilesData?.forEach((p) =>
          profilesMap.set(p.id, {
            ...p,
            is_clan: false,
          })
        );
        clansData?.forEach((c) =>
          profilesMap.set(c.id, {
            id: c.id,
            display_name: c.name,
            username: c.tag,
            avatar_url: c.avatar_url,
            clan_tag: c.tag,
            is_clan: true,
            tier: c.tier,
            level: c.level,
            game_mode: c.game_mode,
          })
        );

        const builtThreads: ConversationThread[] = partnerIdsArray.map((id) => {
          const profile =
            profilesMap.get(id) || {
              id,
              display_name: "Operatore",
              username: "player",
              is_clan: false,
            };
          const msg = latestMessageMap[id];
          return {
            partnerId: id,
            partner: profile,
            lastMessage: msg.content.replace(/^\[CLAN:[^\]]+\]\s*/, ""),
            lastMessageAt: msg.created_at,
            isClanThread: profile.is_clan,
          };
        });

        // Also merge any cached clan direct messages sent by the user to clans
        try {
          const userClanThreadsRaw = localStorage.getItem(`squadup_user_clan_threads_${currentUser.id}`);
          if (userClanThreadsRaw) {
            const cachedClanThreads: ConversationThread[] = JSON.parse(userClanThreadsRaw);
            cachedClanThreads.forEach((ct) => {
              if (!builtThreads.find((t) => t.partnerId === ct.partnerId)) {
                builtThreads.unshift(ct);
              }
            });
          }
        } catch {
          // ignore
        }

        setPersonalThreads(builtThreads);
      } else {
        setPersonalThreads([]);
      }
    } catch (err) {
      console.warn("[DM] Errore caricamento conversazioni:", err);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  // 3. Fetch Clan Threads (Dedicated Clan Inbox)
  const fetchClanThreads = async () => {
    if (!currentUser || !clanData) return;

    try {
      const storedMsgs = getStoredClanDirectMessages(clanData.id);

      // Group by partner (who wrote to the clan or whom the clan wrote to)
      const threadMap = new Map<string, ConversationThread>();

      storedMsgs.forEach((msg) => {
        const isFromClan = msg.is_from_clan;
        const partnerId = isFromClan ? msg.receiver_id : msg.sender_id;
        const partnerName = isFromClan ? msg.receiver_name : msg.sender_name;
        const partnerAvatar = isFromClan ? msg.receiver_avatar : msg.sender_avatar;
        const partnerClanTag = isFromClan ? msg.receiver_clan_tag : msg.sender_clan_tag;
        const partnerIsClan = isFromClan ? (msg.receiver_is_clan ?? false) : Boolean(msg.sender_clan_tag && msg.sender_clan_tag !== clanData.tag);

        if (!threadMap.has(partnerId)) {
          threadMap.set(partnerId, {
            partnerId,
            partner: {
              id: partnerId,
              display_name: partnerName,
              username: partnerClanTag || partnerName,
              avatar_url: partnerAvatar,
              clan_tag: partnerClanTag,
              is_clan: partnerIsClan,
            },
            lastMessage: msg.content,
            lastMessageAt: msg.created_at,
            isClanThread: true,
          });
        }
      });

      setClanThreads(Array.from(threadMap.values()));
    } catch (err) {
      console.warn("[Clan DM] Errore caricamento thread clan:", err);
    }
  };

  useEffect(() => {
    fetchPersonalThreads();
    if (clanData) {
      fetchClanThreads();
    }
  }, [currentUser, clanData]);

  // 4. Fetch Messages for Selected Partner
  const fetchMessages = async (partner: ChatEntity) => {
    if (!currentUser) return;

    setIsLoadingMessages(true);
    try {
      if (activeTabMode === "clan" && clanData) {
        // Clan Mode: load from clan direct messages store
        const clanMsgs = getStoredClanDirectMessages(clanData.id);
        const relevant = clanMsgs.filter(
          (m) =>
            (m.sender_id === partner.id && m.clan_id === clanData.id) ||
            (m.receiver_id === partner.id && m.clan_id === clanData.id)
        );
        setMessages(relevant);
      } else if (partner.is_clan) {
        // Personal Mode but chatting with a Clan
        const clanMsgs = getStoredClanDirectMessages(partner.id);
        const relevant = clanMsgs.filter(
          (m) =>
            (m.sender_id === currentUser.id && m.clan_id === partner.id) ||
            (m.receiver_id === currentUser.id && m.clan_id === partner.id)
        );

        if (relevant.length > 0) {
          setMessages(relevant);
        } else {
          // Check standard direct_messages
          const { data } = await supabase
            .from("direct_messages")
            .select("*")
            .or(
              `and(sender_id.eq.${currentUser.id},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${currentUser.id})`
            )
            .order("created_at", { ascending: true });
          setMessages(data || []);
        }
      } else {
        // Personal 1-on-1 with another operator
        const { data, error } = await supabase
          .from("direct_messages")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${currentUser.id})`
          )
          .order("created_at", { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      }

      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.warn("[DM] Errore caricamento messaggi:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedPartner) {
      fetchMessages(selectedPartner);

      // Setup Realtime channels
      let dmChannel: any = null;
      let clanDmChannel: any = null;

      if (!selectedPartner.is_clan && activeTabMode === "personal") {
        dmChannel = supabase
          .channel(`dm_${selectedPartner.id}_${currentUser?.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "direct_messages",
            },
            (payload) => {
              const newMsg = payload.new as DMMessage;
              if (
                (newMsg.sender_id === selectedPartner.id && newMsg.receiver_id === currentUser?.id) ||
                (newMsg.sender_id === currentUser?.id && newMsg.receiver_id === selectedPartner.id)
              ) {
                setMessages((prev) => [...prev, newMsg]);
                setTimeout(scrollToBottom, 50);
              }
            }
          )
          .subscribe();
      }

      // Clan realtime broadcast channel
      const targetClanId = activeTabMode === "clan" ? clanData?.id : selectedPartner.is_clan ? selectedPartner.id : null;
      if (targetClanId) {
        clanDmChannel = supabase
          .channel(`clan_dm_${targetClanId}`)
          .on("broadcast", { event: "new_clan_dm" }, (payload) => {
            const newMsg = payload.payload as ClanDirectMessage;
            if (
              (newMsg.sender_id === selectedPartner.id || newMsg.receiver_id === selectedPartner.id) &&
              newMsg.clan_id === targetClanId
            ) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              setTimeout(scrollToBottom, 50);
            }
          })
          .subscribe();
      }

      return () => {
        if (dmChannel) supabase.removeChannel(dmChannel);
        if (clanDmChannel) supabase.removeChannel(clanDmChannel);
      };
    }
  }, [selectedPartner, currentUser, activeTabMode, clanData]);

  // 5. Search Operators & Clans for New Chat
  const handleSearchEntities = async (query: string) => {
    setSearchQuery(query);
    const clean = query.trim().replace(/^[@#]/, "");
    if (!clean) {
      setOperatorResults([]);
      setClanResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // 1. Search Operators (Profiles)
      if (searchFilterCategory === "all" || searchFilterCategory === "operators") {
        const { data: operatorsData } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, clan_tag, activision_id")
          .neq("id", currentUser?.id || "")
          .or(
            `username.ilike.%${clean}%,display_name.ilike.%${clean}%,activision_id.ilike.%${clean}%,clan_tag.ilike.%${clean}%`
          )
          .limit(12);

        setOperatorResults(
          (operatorsData || []).map((op) => ({
            ...op,
            is_clan: false,
          }))
        );
      } else {
        setOperatorResults([]);
      }

      // 2. Search Clans
      if (searchFilterCategory === "all" || searchFilterCategory === "clans") {
        const { data: clansData } = await supabase
          .from("clans")
          .select("id, name, tag, avatar_url, tier, level, game_mode, description, is_recruiting")
          .neq("id", clanData?.id || "")
          .or(`name.ilike.%${clean}%,tag.ilike.%${clean}%,game_mode.ilike.%${clean}%`)
          .limit(10);

        setClanResults(
          (clansData || []).map((c) => ({
            id: c.id,
            display_name: c.name,
            username: c.tag,
            avatar_url: c.avatar_url,
            clan_tag: c.tag,
            is_clan: true,
            tier: c.tier,
            level: c.level,
            game_mode: c.game_mode,
          }))
        );
      } else {
        setClanResults([]);
      }
    } catch (err) {
      console.warn("[DM] Errore ricerca entità:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Re-run search when category tab changes
  useEffect(() => {
    if (searchQuery) {
      handleSearchEntities(searchQuery);
    }
  }, [searchFilterCategory]);

  // 6. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedPartner || !currentUser) return;

    const content = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      if (activeTabMode === "clan" && clanData) {
        // Message sent BY THE CLAN (delegated by Leader or authorized role)
        const myName = userProfile.name || currentUser.email?.split("@")[0] || "Operatore";
        const roleTitle = clanAccess.roleTitle;

        const sentMsg = await sendClanDirectMessage({
          clanId: clanData.id,
          senderId: currentUser.id,
          senderName: myName,
          senderAvatar: userProfile.avatar,
          senderClanTag: clanData.tag,
          senderRoleTitle: roleTitle,
          receiverId: selectedPartner.id,
          receiverName: selectedPartner.display_name || selectedPartner.username || "Destinatario",
          receiverAvatar: selectedPartner.avatar_url,
          receiverClanTag: selectedPartner.clan_tag,
          receiverIsClan: selectedPartner.is_clan,
          content,
          isFromClan: true,
        });

        setMessages((prev) => [...prev, sentMsg]);
        fetchClanThreads();
        setTimeout(scrollToBottom, 50);
      } else if (selectedPartner.is_clan) {
        // Message sent TO A CLAN by the user
        const myName = userProfile.name || currentUser.email?.split("@")[0] || "Operatore";

        const sentMsg = await sendClanDirectMessage({
          clanId: selectedPartner.id,
          senderId: currentUser.id,
          senderName: myName,
          senderAvatar: userProfile.avatar,
          senderClanTag: userProfile.clanTag?.replace(/[\[\]]/g, "") || undefined,
          senderRoleTitle: "Operatore",
          receiverId: selectedPartner.id,
          receiverName: selectedPartner.display_name || selectedPartner.username || "Clan",
          receiverAvatar: selectedPartner.avatar_url,
          receiverClanTag: selectedPartner.clan_tag,
          receiverIsClan: true,
          content,
          isFromClan: false,
        });

        setMessages((prev) => [...prev, sentMsg]);

        // Cache in personal threads
        const userClanThreadsKey = `squadup_user_clan_threads_${currentUser.id}`;
        try {
          const raw = localStorage.getItem(userClanThreadsKey);
          const currentList: ConversationThread[] = raw ? JSON.parse(raw) : [];
          const updated = currentList.filter((t) => t.partnerId !== selectedPartner.id);
          updated.unshift({
            partnerId: selectedPartner.id,
            partner: selectedPartner,
            lastMessage: content,
            lastMessageAt: new Date().toISOString(),
            isClanThread: true,
          });
          localStorage.setItem(userClanThreadsKey, JSON.stringify(updated));
        } catch {
          // ignore
        }

        fetchPersonalThreads();
        setTimeout(scrollToBottom, 50);
      } else {
        // Standard User-to-User DM
        const { data, error } = await supabase
          .from("direct_messages")
          .insert({
            sender_id: currentUser.id,
            receiver_id: selectedPartner.id,
            content,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setMessages((prev) => [...prev, data]);
          fetchPersonalThreads();
          setTimeout(scrollToBottom, 50);
        }
      }
    } catch (err: any) {
      console.error("[DM] Errore invio messaggio:", err);
      toast({
        title: "Errore invio messaggio",
        description: err.message || "Impossibile consegnare il messaggio.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Not logged in view
  if (!currentUser) {
    return (
      <div className="pb-24 pt-4 w-full max-w-4xl mx-auto px-2 sm:px-4 space-y-4 animate-fade-in">
        <div className="bg-[#121628]/95 border border-purple-500/40 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg">
            <div className="w-full h-full bg-[#0e1220] rounded-[14px] flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-cyan-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-white">Direct Messages & Chat Clan</h3>
            <p className="text-xs text-zinc-300 break-words max-w-xs mx-auto leading-relaxed">
              Comunica in privato con qualsiasi operatore, contatta altri clan per organizzare scrim o alleanze, e gestisci i messaggi del tuo clan!
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => openAuthModal("signup")}
              className="py-2.5 px-6 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Registrati o Accedi per Chattare
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered threads list for display
  const activeThreads = activeTabMode === "personal" ? personalThreads : clanThreads;
  const filteredThreads = activeThreads.filter((t) => {
    if (!threadFilter.trim()) return true;
    const term = threadFilter.toLowerCase();
    const nameMatch = (t.partner.display_name || "").toLowerCase().includes(term);
    const userMatch = (t.partner.username || "").toLowerCase().includes(term);
    const tagMatch = (t.partner.clan_tag || "").toLowerCase().includes(term);
    return nameMatch || userMatch || tagMatch;
  });

  return (
    <div className="pb-24 pt-2 w-full max-w-4xl mx-auto px-2 sm:px-4 space-y-3 animate-fade-in">
      {/* CASE A: CONVERSATION ACTIVE WITH PARTNER */}
      {selectedPartner ? (
        <div className="bg-[#101426] border border-purple-900/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[76vh]">
          {/* Header with Partner Info */}
          <div className="p-3 bg-[#0d101f] border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setSelectedPartner(null)}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="relative shrink-0">
                <div
                  className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center font-bold text-xs ${
                    selectedPartner.is_clan
                      ? "bg-cyan-950 border border-cyan-500/60 text-cyan-300"
                      : "bg-purple-950 border border-purple-500/50 text-purple-300"
                  }`}
                >
                  {selectedPartner.avatar_url ? (
                    <img
                      src={selectedPartner.avatar_url}
                      alt={selectedPartner.display_name || selectedPartner.username}
                      className="w-full h-full object-cover"
                    />
                  ) : selectedPartner.is_clan ? (
                    <Shield className="w-5 h-5 text-cyan-400" />
                  ) : (
                    (selectedPartner.display_name || selectedPartner.username || "P")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0d101f]" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-white truncate max-w-[140px]">
                    {selectedPartner.display_name || selectedPartner.username}
                  </span>
                  {selectedPartner.clan_tag && (
                    <span
                      className={`text-[9px] font-bold px-1 rounded ${
                        selectedPartner.is_clan
                          ? "bg-cyan-900/60 text-cyan-300 border border-cyan-500/40"
                          : "bg-purple-900/60 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      [{selectedPartner.clan_tag}]
                    </span>
                  )}
                  {selectedPartner.is_clan && (
                    <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                      CLAN
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-emerald-400 block font-medium">
                  {selectedPartner.is_clan ? "Canale Diretto Clan" : "Attivo ora"}
                </span>
              </div>
            </div>

            {/* Context Badge */}
            <div className="flex items-center gap-1.5">
              {activeTabMode === "clan" && clanData ? (
                <div className="text-right">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-cyan-400" />
                    Per conto di [{clanData.tag}]
                  </span>
                </div>
              ) : selectedPartner.activision_id ? (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 shrink-0">
                  COD: {selectedPartner.activision_id}
                </span>
              ) : null}
            </div>
          </div>

          {/* Clan delegation notice banner */}
          {activeTabMode === "clan" && clanData && (
            <div className="bg-cyan-950/40 border-b border-cyan-500/20 px-3 py-1.5 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5 text-cyan-200">
                <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                <span>
                  Stai rispondendo come <strong>{clanAccess.roleTitle}</strong> del Clan [{clanData.tag}]
                </span>
              </div>
              <span className="text-[9px] text-cyan-400/80 font-semibold">Ufficiale</span>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs">
            {isLoadingMessages ? (
              <div className="py-12 text-center text-zinc-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>Caricamento messaggi...</span>
              </div>
            ) : messages.length > 0 ? (
              messages.map((msg, idx) => {
                const isMe =
                  activeTabMode === "clan"
                    ? msg.is_from_clan === true || msg.sender_id === currentUser.id
                    : msg.sender_id === currentUser.id;

                const authorName = msg.sender_name || (isMe ? "Tu" : selectedPartner.display_name || selectedPartner.username);
                const roleBadge = msg.sender_role_title;

                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {/* Header info on message */}
                    {(roleBadge || (msg.is_from_clan && !isMe)) && (
                      <span className="text-[9px] text-cyan-400 mb-0.5 px-1 font-semibold flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        {authorName} {roleBadge ? `(${roleBadge})` : ""}
                      </span>
                    )}

                    <div
                      className={`max-w-[80%] px-3.5 py-2 rounded-2xl break-words leading-relaxed text-xs shadow-md ${
                        isMe
                          ? activeTabMode === "clan"
                            ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-xs"
                            : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs"
                          : "bg-[#181d36] border border-zinc-800 text-zinc-100 rounded-bl-xs"
                      }`}
                    >
                      {typeof msg.content === "string" ? msg.content.replace(/^\[CLAN:[^\]]+\]\s*/, "") : msg.body || ""}
                    </div>
                    <span className="text-[9px] text-zinc-500 mt-0.5 px-1">
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Adesso"}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-zinc-400 space-y-2">
                {selectedPartner.is_clan ? (
                  <Shield className="w-9 h-9 text-cyan-400/50 mx-auto" />
                ) : (
                  <MessageCircle className="w-8 h-8 text-purple-400/50 mx-auto" />
                )}
                <p className="text-xs">
                  {selectedPartner.is_clan
                    ? `Inizia la chat ufficiale con il Clan [${selectedPartner.clan_tag || ""}] ${selectedPartner.display_name}!`
                    : `Inizia la conversazione con ${selectedPartner.display_name || selectedPartner.username}!`}
                </p>
                <div className="flex justify-center gap-1.5 pt-1 flex-wrap">
                  {selectedPartner.is_clan
                    ? ["Cerchiamo scrim 4v4", "Reclutamenti aperti?", "GG per il torneo!", "Proposta di alleanza"].map(
                        (quick) => (
                          <button
                            key={quick}
                            onClick={() => setInputText(quick)}
                            className="text-[10px] bg-zinc-900 border border-cyan-800/40 hover:border-cyan-400 text-cyan-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            {quick}
                          </button>
                        )
                      )
                    : ["GG!", "Ci sei per un Warzone?", "Recon pronto", "Invita in lobby"].map((quick) => (
                        <button
                          key={quick}
                          onClick={() => setInputText(quick)}
                          className="text-[10px] bg-zinc-900 border border-zinc-800 hover:border-purple-500 text-zinc-300 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          {quick}
                        </button>
                      ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-[#0d101f] border-t border-zinc-800 flex items-center gap-2">
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeTabMode === "clan" && clanData
                    ? `Rispondi per conto di [${clanData.tag}] ${clanData.name}...`
                    : selectedPartner.is_clan
                    ? `Scrivi un messaggio al Clan [${selectedPartner.clan_tag || ""}]...`
                    : "Invia un messaggio..."
                }
                className="w-full bg-zinc-900 text-zinc-200 text-xs rounded-2xl pl-3.5 pr-8 py-2.5 border border-zinc-800 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setInputText((prev) => prev + " 🔥")}
                className="absolute right-2.5 text-zinc-400 hover:text-amber-400 transition-colors"
              >
                🔥
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className={`p-2.5 rounded-2xl flex items-center justify-center transition-all shadow-md cursor-pointer shrink-0 text-white disabled:opacity-40 ${
                activeTabMode === "clan"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500"
                  : "bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500"
              }`}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      ) : (
        /* CASE B: CONVERSATION LIST & TAB SWITCHER */
        <div className="space-y-3">
          {/* Main Top Header */}
          <div className="bg-[#121628]/95 border border-purple-900/40 rounded-3xl p-3.5 sm:p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-md">
                  <div className="w-full h-full bg-[#0d1020] rounded-[14px] flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    Centro Messaggi SquadUP
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Direct personali tra operatori e canale ufficiale Clan
                  </p>
                </div>
              </div>

              {/* SEARCH OPERATOR / CLAN BUTTON */}
              <button
                onClick={() => {
                  setIsSearchModalOpen(true);
                  setSearchQuery("");
                  setOperatorResults([]);
                  setClanResults([]);
                }}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-all shrink-0 active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Cerca Operatore / Clan</span>
              </button>
            </div>

            {/* TAB SELECTOR: Direct Personali VS Direct Clan */}
            <div className="grid grid-cols-2 gap-2 bg-[#0d101f] p-1 rounded-2xl border border-zinc-800">
              <button
                onClick={() => setActiveTabMode("personal")}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTabMode === "personal"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Direct Personali</span>
                {personalThreads.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 font-extrabold border border-purple-500/30">
                    {personalThreads.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTabMode("clan")}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                  activeTabMode === "clan"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Direct Clan</span>
                {clanData ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 font-extrabold border border-cyan-500/40">
                    [{clanData.tag}]
                  </span>
                ) : (
                  <Lock className="w-3 h-3 text-zinc-500" />
                )}
                {clanThreads.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse absolute top-1.5 right-2" />
                )}
              </button>
            </div>

            {/* Search / Filter in-list */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={threadFilter}
                onChange={(e) => setThreadFilter(e.target.value)}
                placeholder={
                  activeTabMode === "clan"
                    ? "Filtra messaggi ricevuti dal clan..."
                    : "Filtra conversazioni attive..."
                }
                className="w-full bg-[#0d1020] text-zinc-200 text-xs rounded-xl pl-8 pr-8 py-2 border border-zinc-800 focus:outline-none focus:border-purple-500"
              />
              {threadFilter && (
                <button
                  onClick={() => setThreadFilter("")}
                  className="absolute right-2.5 top-2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* PERMISSION CHECK FOR CLAN DIRECT TAB */}
          {activeTabMode === "clan" && !clanData ? (
            /* User does not belong to any clan */
            <div className="bg-[#121628]/95 border border-purple-900/40 rounded-3xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-extrabold text-white">Nessun Clan Attivo</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Non fai parte di alcun Clan. Fondane uno o unisciti a una squadra per sbloccare la casella messaggi ufficiale del clan.
              </p>
              <button
                onClick={() => {
                  const exploreClanTab = document.querySelector('[data-tab="clan"]');
                  (exploreClanTab as HTMLElement)?.click();
                }}
                className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Esplora o Fonda un Clan
              </button>
            </div>
          ) : activeTabMode === "clan" && !clanAccess.authorized ? (
            /* User is in clan but lacks Leader or Chat Delegation Role */
            <div className="bg-[#121628]/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl animate-fade-in">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                <Lock className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-black text-white">
                  Accesso Riservato alla Dirigenza di [{clanData?.tag}] {clanData?.name}
                </h4>
                <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                  Solo il <strong>Leader</strong> o i membri con il ruolo{" "}
                  <strong className="text-cyan-400">"Gestione Chat Clan"</strong> definito dal Leader
                  possono visualizzare e inviare messaggi per conto della squadra.
                </p>
              </div>

              <div className="p-3 bg-zinc-900/80 rounded-2xl border border-zinc-800 max-w-sm mx-auto text-left text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Il tuo ruolo nel clan:</span>
                  <span className="font-bold text-white bg-zinc-800 px-2 py-0.5 rounded">
                    {clanAccess.roleTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Permesso Chat Clan:</span>
                  <span className="font-bold text-rose-400">Non Attivo ✕</span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                Chiedi al Leader del tuo clan di assegnarti un ruolo personalizzato con il permesso
                <strong> "Gestione Chat & Direct Clan"</strong> nella scheda Ruoli del Clan.
              </p>
            </div>
          ) : (
            /* CONVERSATIONS LIST (PERSONAL OR CLAN INBOX) */
            <div className="space-y-2">
              {/* Clan Mode banner for authorized leaders */}
              {activeTabMode === "clan" && clanData && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-blue-950/40 border border-cyan-500/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Casella Direct Clan [{clanData.tag}] {clanData.name}
                      </span>
                      <span className="text-[10px] text-cyan-300">
                        {clanAccess.reason} ({clanAccess.roleTitle})
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-400/30">
                    {clanThreads.length} messaggi
                  </span>
                </div>
              )}

              {isLoadingThreads ? (
                <div className="py-12 text-center text-zinc-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span className="text-xs">Caricamento conversazioni...</span>
                </div>
              ) : filteredThreads.length > 0 ? (
                filteredThreads.map((thread) => (
                  <div
                    key={thread.partnerId}
                    onClick={() => setSelectedPartner(thread.partner)}
                    className="p-3 rounded-2xl bg-[#121628]/90 hover:bg-[#151a32] border border-purple-900/30 hover:border-purple-700/50 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-md group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div
                          className={`w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center font-bold text-sm ${
                            thread.partner.is_clan
                              ? "bg-cyan-950 border-2 border-cyan-500/50 text-cyan-300"
                              : "bg-purple-950 border-2 border-purple-500/50 text-purple-300"
                          }`}
                        >
                          {thread.partner.avatar_url ? (
                            <img
                              src={thread.partner.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : thread.partner.is_clan ? (
                            <Shield className="w-6 h-6 text-cyan-400" />
                          ) : (
                            (thread.partner.display_name || thread.partner.username || "P")
                              .slice(0, 2)
                              .toUpperCase()
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#121628]" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white truncate max-w-[140px] group-hover:text-purple-300 transition-colors">
                            {thread.partner.display_name || thread.partner.username}
                          </h4>
                          {thread.partner.clan_tag && (
                            <span
                              className={`text-[9px] font-bold px-1 rounded ${
                                thread.partner.is_clan
                                  ? "bg-cyan-900/60 text-cyan-300 border border-cyan-500/40"
                                  : "bg-purple-900/60 text-purple-300"
                              }`}
                            >
                              [{thread.partner.clan_tag}]
                            </span>
                          )}
                          {thread.partner.is_clan && (
                            <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                              CLAN
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-zinc-400 truncate max-w-[190px] mt-0.5">
                          {thread.lastMessage}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-zinc-500 block">
                        {thread.lastMessageAt
                          ? new Date(thread.lastMessageAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-[#121628]/95 border border-purple-900/30 rounded-3xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
                    {activeTabMode === "clan" ? (
                      <Shield className="w-6 h-6 text-cyan-400" />
                    ) : (
                      <MessageCircle className="w-6 h-6" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white">
                    {activeTabMode === "clan"
                      ? "Nessun messaggio ricevuto dal Clan"
                      : "Nessuna conversazione attiva"}
                  </h4>
                  <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                    {activeTabMode === "clan"
                      ? "I messaggi inviati da altri operatori o altri clan alla tua squadra appariranno qui."
                      : "Avvia una chat con un operatore o scrivi direttamente a un clan per organizzare match o alleanze."}
                  </p>
                  <button
                    onClick={() => {
                      setIsSearchModalOpen(true);
                      setSearchQuery("");
                      setOperatorResults([]);
                      setClanResults([]);
                    }}
                    className="py-2 px-4 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    Avvia Nuova Chat
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SEARCH OPERATOR / CLAN MODAL */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0e1224] border border-cyan-500/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-3.5 bg-[#0d1020] border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Avvia Nuova Chat
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Cerca un operatore o un Clan con cui messaggiare
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs: Tutti | Operatori | Clan */}
            <div className="p-3 bg-[#0d1020]/50 border-b border-zinc-800/80 space-y-2.5">
              <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSearchFilterCategory("all")}
                  className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    searchFilterCategory === "all"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Tutti
                </button>
                <button
                  type="button"
                  onClick={() => setSearchFilterCategory("operators")}
                  className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    searchFilterCategory === "operators"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <User className="w-3 h-3" />
                  Operatori
                </button>
                <button
                  type="button"
                  onClick={() => setSearchFilterCategory("clans")}
                  className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    searchFilterCategory === "clans"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Shield className="w-3 h-3 text-cyan-300" />
                  Clan
                </button>
              </div>

              {/* Search input field */}
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => handleSearchEntities(e.target.value)}
                  placeholder={
                    searchFilterCategory === "operators"
                      ? "Cerca operatore per username, display name o Activision ID..."
                      : searchFilterCategory === "clans"
                      ? "Cerca Clan per nome clan o tag clan..."
                      : "Cerca operatore o clan (es. Ghost, #SHDW, Alpha)..."
                  }
                  className="w-full bg-[#121628] text-zinc-100 text-xs rounded-xl pl-3.5 pr-8 py-2.5 border border-cyan-500/30 focus:outline-none focus:border-cyan-400"
                />
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin absolute right-2.5 top-2.5" />
                ) : searchQuery ? (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setOperatorResults([]);
                      setClanResults([]);
                    }}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Results Area */}
            <div className="overflow-y-auto p-3 space-y-3 flex-1 min-h-[220px]">
              {/* No query typed yet */}
              {!searchQuery.trim() && (
                <div className="py-10 text-center text-zinc-400 space-y-2">
                  <Search className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs">
                    Digita il nome di un operatore o il tag di un clan per iniziare.
                  </p>
                </div>
              )}

              {/* OPERATORS SECTION */}
              {operatorResults.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3 text-purple-400" />
                    Operatori Trovati ({operatorResults.length})
                  </span>
                  <div className="space-y-1.5">
                    {operatorResults.map((op) => (
                      <div
                        key={op.id}
                        onClick={() => {
                          setSelectedPartner(op);
                          setIsSearchModalOpen(false);
                        }}
                        className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-purple-500/40 flex items-center justify-between gap-2 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                            {op.avatar_url ? (
                              <img
                                src={op.avatar_url}
                                alt=""
                                className="w-full h-full object-cover rounded-xl"
                              />
                            ) : (
                              (op.display_name || op.username || "P").slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white block truncate group-hover:text-purple-300 transition-colors">
                                {op.display_name || op.username}
                              </span>
                              {op.clan_tag && (
                                <span className="text-[9px] font-bold px-1 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                                  [{op.clan_tag}]
                                </span>
                              )}
                            </div>
                            {op.activision_id && (
                              <span className="text-[10px] text-cyan-400 block truncate">
                                COD: {op.activision_id}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-white px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors shrink-0">
                          💬 Messaggia
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CLANS SECTION */}
              {clanResults.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3 text-cyan-400" />
                    Clan Trovati ({clanResults.length})
                  </span>
                  <div className="space-y-1.5">
                    {clanResults.map((clan) => (
                      <div
                        key={clan.id}
                        onClick={() => {
                          setSelectedPartner(clan);
                          setIsSearchModalOpen(false);
                        }}
                        className="p-2.5 rounded-xl bg-cyan-950/30 hover:bg-cyan-950/60 border border-cyan-800/40 hover:border-cyan-400/60 flex items-center justify-between gap-2 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-950 to-blue-950 border border-cyan-500/60 flex items-center justify-center text-xs font-bold text-cyan-300 shrink-0">
                            {clan.avatar_url ? (
                              <img
                                src={clan.avatar_url}
                                alt=""
                                className="w-full h-full object-cover rounded-xl"
                              />
                            ) : (
                              <Shield className="w-5 h-5 text-cyan-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white block truncate group-hover:text-cyan-300 transition-colors">
                                {clan.display_name}
                              </span>
                              <span className="text-[9px] font-black px-1 rounded bg-cyan-900/80 text-cyan-300 border border-cyan-500/50">
                                [{clan.clan_tag}]
                              </span>
                              {clan.tier === "elite" ? (
                                <span className="text-[8px] font-bold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  ELITE
                                </span>
                              ) : clan.tier === "pro" ? (
                                <span className="text-[8px] font-bold px-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                  PRO
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[10px] text-zinc-400 block truncate">
                              {clan.game_mode || "Warzone"} • Liv. {clan.level || 1}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-white px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 transition-all shrink-0 flex items-center gap-1 shadow-sm">
                          <Shield className="w-3 h-3" />
                          Scrivi al Clan
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results found */}
              {searchQuery.trim() &&
                !isSearching &&
                operatorResults.length === 0 &&
                clanResults.length === 0 && (
                  <div className="py-8 text-center text-zinc-400 space-y-1">
                    <p className="text-xs font-bold text-white">Nessun risultato per "{searchQuery}"</p>
                    <p className="text-[11px] text-zinc-500">
                      Verifica lo spelling dell'operatore o del clan.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
