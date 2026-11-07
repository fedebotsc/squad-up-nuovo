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
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface DMMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface PartnerProfile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  clan_tag?: string;
  activision_id?: string;
}

interface ConversationThread {
  partnerId: string;
  partner: PartnerProfile;
  lastMessage: string;
  lastMessageAt: string;
}

export const DirectMessagesSection: React.FC = () => {
  const { currentUser, userProfile, openAuthModal } = useSquad();

  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerProfile | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // New Chat Search Modal
  const [isSearchingNewChat, setIsSearchingNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PartnerProfile[]>([]);
  const [isSearchingPlayers, setIsSearchingPlayers] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch Conversations
  const fetchThreads = async () => {
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

      if (!dmData || dmData.length === 0) {
        setThreads([]);
        setIsLoadingThreads(false);
        return;
      }

      // Group by other user ID
      const partnerIds = new Set<string>();
      const latestMessageMap: Record<string, DMMessage> = {};

      dmData.forEach((msg: DMMessage) => {
        const partnerId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
        if (!partnerIds.has(partnerId)) {
          partnerIds.add(partnerId);
          latestMessageMap[partnerId] = msg;
        }
      });

      // Fetch profiles of all partners
      const partnerIdsArray = Array.from(partnerIds);
      if (partnerIdsArray.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, clan_tag, activision_id")
          .in("id", partnerIdsArray);

        const profilesMap = new Map<string, PartnerProfile>();
        profilesData?.forEach((p) => profilesMap.set(p.id, p));

        const builtThreads: ConversationThread[] = partnerIdsArray.map((id) => {
          const profile = profilesMap.get(id) || {
            id,
            display_name: "Operatore",
            username: "player",
          };
          const msg = latestMessageMap[id];
          return {
            partnerId: id,
            partner: profile,
            lastMessage: msg.content,
            lastMessageAt: msg.created_at,
          };
        });

        setThreads(builtThreads);
      } else {
        setThreads([]);
      }
    } catch (err) {
      console.warn("[DM] Errore caricamento conversazioni:", err);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [currentUser]);

  // 2. Fetch Messages for Selected Partner
  const fetchMessages = async (partnerId: string) => {
    if (!currentUser) return;

    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.warn("[DM] Errore caricamento messaggi:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedPartner) {
      fetchMessages(selectedPartner.id);

      // Realtime subscription for incoming DMs
      const channel = supabase
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

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedPartner, currentUser]);

  // 3. Search Players for New Chat
  const handleSearchPlayers = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearchingPlayers(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, clan_tag, activision_id")
        .neq("id", currentUser?.id || "")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,activision_id.ilike.%${query}%`)
        .limit(10);

      setSearchResults(data || []);
    } catch (err) {
      console.warn("[DM] Errore ricerca profili:", err);
    } finally {
      setIsSearchingPlayers(false);
    }
  };

  // 4. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedPartner || !currentUser) return;

    const content = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
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
        setTimeout(scrollToBottom, 50);
        // Refresh conversation list preview
        fetchThreads();
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
      <div className="pb-24 pt-4 max-w-md mx-auto px-3.5 space-y-4">
        <div className="bg-[#121628]/95 border border-purple-500/40 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg">
            <div className="w-full h-full bg-[#0e1220] rounded-[14px] flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-cyan-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-white">Direct Messages SquadUP</h3>
            <p className="text-xs text-zinc-300 break-words max-w-xs mx-auto leading-relaxed">
              Comunica in privato con i tuoi compagni di squadra, organizza match e scambia strategie in tempo reale.
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

  return (
    <div className="pb-24 pt-2 max-w-md mx-auto px-3.5 space-y-3">
      {/* CASE A: CONVERSATION ACTIVE WITH PARTNER */}
      {selectedPartner ? (
        <div className="bg-[#101426] border border-purple-900/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[75vh]">
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
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-purple-950 border border-purple-500/50 flex items-center justify-center font-bold text-xs text-purple-300">
                  {selectedPartner.avatar_url ? (
                    <img
                      src={selectedPartner.avatar_url}
                      alt={selectedPartner.display_name || selectedPartner.username}
                      className="w-full h-full object-cover"
                    />
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
                    <span className="text-[9px] font-bold px-1 rounded bg-purple-900/60 text-purple-300 border border-purple-500/30">
                      [{selectedPartner.clan_tag}]
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-emerald-400 block font-medium">Attivo ora</span>
              </div>
            </div>

            {selectedPartner.activision_id && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 shrink-0">
                COD: {selectedPartner.activision_id}
              </span>
            )}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs">
            {isLoadingMessages ? (
              <div className="py-12 text-center text-zinc-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>Caricamento messaggi...</span>
              </div>
            ) : messages.length > 0 ? (
              messages.map((msg) => {
                const isMe = msg.sender_id === currentUser.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[78%] px-3.5 py-2 rounded-2xl break-words leading-relaxed text-xs shadow-md ${
                        isMe
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs"
                          : "bg-[#181d36] border border-zinc-800 text-zinc-100 rounded-bl-xs"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-zinc-500 mt-0.5 px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-zinc-400 space-y-2">
                <MessageCircle className="w-8 h-8 text-purple-400/50 mx-auto" />
                <p className="text-xs">Inizia la conversazione con {selectedPartner.display_name || selectedPartner.username}!</p>
                <div className="flex justify-center gap-1.5 pt-1">
                  {["GG!", "Ci sei per un Warzone?", "Recon pronto", "Invita in lobby"].map(
                    (quick) => (
                      <button
                        key={quick}
                        onClick={() => setInputText(quick)}
                        className="text-[10px] bg-zinc-900 border border-zinc-800 hover:border-purple-500 text-zinc-300 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        {quick}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-[#0d101f] border-t border-zinc-800 flex items-center gap-2"
          >
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Invia un messaggio..."
                className="w-full bg-zinc-900 text-zinc-200 text-xs rounded-2xl pl-3.5 pr-8 py-2.5 border border-zinc-800 focus:outline-none focus:border-purple-500"
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
              className="p-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-all shadow-md cursor-pointer shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      ) : (
        /* CASE B: THREADS LIST (INSTAGRAM STYLE) */
        <div className="space-y-3">
          {/* Top Bar */}
          <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-3.5 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <MessageCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Direct Messages</h3>
                <span className="text-[10px] text-zinc-400">
                  {threads.length} conversazioni attive
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsSearchingNewChat(true)}
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuova Chat</span>
            </button>
          </div>

          {/* New Chat Modal / Search Drawer */}
          {isSearchingNewChat && (
            <div className="bg-[#121629] border border-cyan-500/40 rounded-2xl p-3.5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  Cerca Operatore per Messaggiare
                </span>
                <button
                  onClick={() => {
                    setIsSearchingNewChat(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => handleSearchPlayers(e.target.value)}
                  placeholder="Cerca per username o Activision ID..."
                  className="w-full bg-zinc-900 text-zinc-200 text-xs rounded-xl pl-3 pr-8 py-2 border border-zinc-800 focus:outline-none focus:border-cyan-500"
                />
                {isSearchingPlayers && (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin absolute right-2.5 top-2.5" />
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {searchResults.map((player) => (
                    <div
                      key={player.id}
                      onClick={() => {
                        setSelectedPartner(player);
                        setIsSearchingNewChat(false);
                      }}
                      className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                          {player.avatar_url ? (
                            <img
                              src={player.avatar_url}
                              alt=""
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            (player.display_name || player.username || "P").slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {player.display_name || player.username}
                          </span>
                          {player.activision_id && (
                            <span className="text-[10px] text-cyan-400 block truncate">
                              COD: {player.activision_id}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-purple-400 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30">
                        Apri Chat
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conversations List */}
          <div className="space-y-2">
            {isLoadingThreads ? (
              <div className="py-12 text-center text-zinc-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-xs">Caricamento conversazioni...</span>
              </div>
            ) : threads.length > 0 ? (
              threads.map((thread) => (
                <div
                  key={thread.partnerId}
                  onClick={() => setSelectedPartner(thread.partner)}
                  className="p-3 rounded-2xl bg-[#121628]/90 hover:bg-[#151a32] border border-purple-900/30 hover:border-purple-700/50 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-md group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-purple-950 border-2 border-purple-500/50 flex items-center justify-center font-bold text-sm text-purple-300">
                        {thread.partner.avatar_url ? (
                          <img
                            src={thread.partner.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
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
                          <span className="text-[9px] font-bold px-1 rounded bg-purple-900/60 text-purple-300">
                            [{thread.partner.clan_tag}]
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-zinc-400 truncate max-w-[180px] mt-0.5">
                        {thread.lastMessage}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-zinc-500 block">
                      {new Date(thread.lastMessageAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-[#121628]/95 border border-purple-900/30 rounded-2xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-white">Nessuna conversazione attiva</h4>
                <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                  Crea una nuova chat per inviare un messaggio diretto a qualsiasi operatore della community.
                </p>
                <button
                  onClick={() => setIsSearchingNewChat(true)}
                  className="py-1.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Avvia Nuova Chat
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
