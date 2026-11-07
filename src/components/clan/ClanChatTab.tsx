import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Loader2, User, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { ClanMember } from "@/data/mockData";

interface ClanChatTabProps {
  clanId: string;
  clanTag: string;
  currentUser: any;
  clanMembers: ClanMember[];
}

interface ClanMessageItem {
  id: string;
  clan_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export const ClanChatTab: React.FC<ClanChatTabProps> = ({
  clanId,
  clanTag,
  currentUser,
  clanMembers,
}) => {
  const [messages, setMessages] = useState<ClanMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Map user ID to member custom role if available
  const getMemberRoleBadge = (userId: string) => {
    const mem = clanMembers.find((m) => m.userId === userId || m.id === userId);
    if (!mem) return null;
    return mem.customRoleTitle || mem.role;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let isMounted = true;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("clan_messages")
          .select(`
            id,
            clan_id,
            author_id,
            body,
            created_at,
            profiles:author_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq("clan_id", clanId)
          .order("created_at", { ascending: true })
          .limit(100);

        if (error) throw error;
        if (isMounted) {
          setMessages((data as any) || []);
        }
      } catch (err: any) {
        console.error("[ClanChatTab] Errore caricamento messaggi:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMessages();

    // Setup Supabase Realtime channel
    const channel = supabase
      .channel(`clan_chat_${clanId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "clan_messages",
          filter: `clan_id=eq.${clanId}`,
        },
        async (payload) => {
          const newMsgId = payload.new.id;
          // Fetch full message with profile
          const { data: fullMsg } = await supabase
            .from("clan_messages")
            .select(`
              id,
              clan_id,
              author_id,
              body,
              created_at,
              profiles:author_id (
                id,
                username,
                display_name,
                avatar_url
              )
            `)
            .eq("id", newMsgId)
            .single();

          if (fullMsg) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === fullMsg.id)) return prev;
              return [...prev, fullMsg as any];
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [clanId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({
        title: "Accesso Richiesto",
        description: "Accedi per scrivere nella chat del clan.",
        variant: "destructive",
      });
      return;
    }

    const trimmed = inputText.trim();
    if (!trimmed) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("clan_messages").insert({
        clan_id: clanId,
        author_id: currentUser.id,
        body: trimmed,
        media_type: "none",
      });

      if (error) throw error;
      setInputText("");
    } catch (err: any) {
      console.error("[ClanChatTab] Errore invio messaggio:", err);
      toast({
        title: "Errore Invio",
        description: err.message || "Impossibile inviare il messaggio nella chat del clan.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl flex flex-col h-[460px] shadow-xl overflow-hidden">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-[#151a32] border-b border-purple-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-cyan-300">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-white tracking-wide">
                CHAT DI GRUPPO CLAN
              </h4>
              <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-purple-900/80 text-purple-300 border border-purple-500/40">
                [{clanTag}]
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">Canale riservato e sicuro per i membri del clan</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-zinc-300 font-semibold">Live</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 scrollbar-thin">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-white">Nessun messaggio recente</p>
            <p className="text-[11px] text-zinc-400 max-w-xs">
              Sii il primo a rompere il ghiaccio! Organizza drop, tattiche o tornei con i tuoi compagni di clan.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentUser && msg.author_id === currentUser.id;
            const authorProf = msg.profiles;
            const authorName = authorProf?.display_name || authorProf?.username || "Gamer";
            const roleBadge = getMemberRoleBadge(msg.author_id);

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${
                  isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Author Avatar */}
                <div className="shrink-0 mt-0.5">
                  {authorProf?.avatar_url ? (
                    <img
                      src={authorProf.avatar_url}
                      alt={authorName}
                      className="w-7 h-7 rounded-lg object-cover border border-purple-500/40"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-purple-950 flex items-center justify-center border border-purple-700/40 text-purple-300 font-bold text-[10px]">
                      {authorName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className="space-y-1">
                  <div
                    className={`flex items-center gap-1.5 ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-zinc-300">{authorName}</span>
                    {roleBadge && (
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-600/40">
                        {roleBadge}
                      </span>
                    )}
                    <span className="text-[9px] text-zinc-500">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    className={`rounded-2xl px-3 py-2 text-xs break-words leading-relaxed ${
                      isMe
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-md"
                        : "bg-[#181e36] text-zinc-200 border border-zinc-800 rounded-tl-none"
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="p-2.5 bg-[#151a32] border-t border-purple-900/40 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Scrivi un messaggio al clan [${clanTag}]...`}
          className="flex-1 bg-[#101426] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 text-white disabled:opacity-40 shadow-md cursor-pointer transition-all"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
};
