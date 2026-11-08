import React, { useState, useEffect } from "react";
import {
  Target,
  Sparkles,
  Coins,
  CheckCircle2,
  Clock,
  Shield,
  MessageSquare,
  Radio,
  Gamepad2,
  Loader2,
  Flame,
  Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { ClanData } from "@/data/mockData";

interface DailyQuestsTabProps {
  clanData: ClanData;
  currentUser: any;
  userProfile: any;
  onRefresh: () => Promise<void>;
}

interface QuestDefinition {
  key: string;
  category: "player" | "clan";
  title: string;
  description: string;
  reward: number; // 0.10 SC
  icon: any;
}

const PLAYER_QUESTS: QuestDefinition[] = [
  {
    key: "player_daily_post",
    category: "player",
    title: "Post del Giorno",
    description: "Condividi un post, clip o annuncio nel feed della community SquadUP.",
    reward: 0.1,
    icon: Gamepad2,
  },
  {
    key: "player_daily_voice",
    category: "player",
    title: "Connessione Vocale Tattica",
    description: "Entra in una stanza vocale Agora per comunicare con la squadra.",
    reward: 0.1,
    icon: Radio,
  },
  {
    key: "player_daily_chat",
    category: "player",
    title: "Comunicazione Radio",
    description: "Scrivi un messaggio nella chat del tuo clan per coordinare le tattiche.",
    reward: 0.1,
    icon: MessageSquare,
  },
  {
    key: "player_daily_reaction",
    category: "player",
    title: "Supporto tra Compagni",
    description: "Reagisci con un'emoji a un momento di gioco condiviso da un altro operatore.",
    reward: 0.1,
    icon: Flame,
  },
];

const CLAN_QUESTS: QuestDefinition[] = [
  {
    key: "clan_daily_post",
    category: "clan",
    title: "Comunicato Ufficiale Clan",
    description: "Pubblica un post a nome ufficiale del Clan nel feed da Founder o Admin.",
    reward: 0.1,
    icon: Shield,
  },
  {
    key: "clan_daily_voice",
    category: "clan",
    title: "Adunata Vocale di Squadra",
    description: "Usa la stanza vocale crittografata Agora riservata ai membri del clan.",
    reward: 0.1,
    icon: Radio,
  },
  {
    key: "clan_daily_chat",
    category: "clan",
    title: "Briefing Tattico di Gruppo",
    description: "Scambia messaggi strategici all'interno della chat riservata del clan.",
    reward: 0.1,
    icon: MessageSquare,
  },
];

export const DailyQuestsTab: React.FC<DailyQuestsTabProps> = ({
  clanData,
  currentUser,
  userProfile,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<"player" | "clan">("player");
  const [claimedKeys, setClaimedKeys] = useState<string[]>([]);
  const [completedKeys, setCompletedKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

  const fetchDailyProgress = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0];

      // 1. Fetch already claimed quests today from daily_quests
      const { data: claims } = await supabase
        .from("daily_quests")
        .select("quest_type, clan_id")
        .or(`user_id.eq.${currentUser.id},clan_id.eq.${clanData.id}`)
        .eq("completed_date", today);

      const claimedSet = new Set<string>();
      if (claims) {
        claims.forEach((c) => claimedSet.add(c.quest_type));
      }
      setClaimedKeys(Array.from(claimedSet));

      // 2. Check completions from live activity today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startIso = startOfDay.toISOString();

      const newCompleted = new Set<string>();

      // Player post today?
      const { count: postCount } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUser.id)
        .gte("created_at", startIso);

      if (postCount && postCount > 0) newCompleted.add("player_daily_post");

      // Clan post today?
      const { count: clanPostCount } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("clan_id", clanData.id)
        .eq("posted_as_clan", true)
        .gte("created_at", startIso);

      if (clanPostCount && clanPostCount > 0) newCompleted.add("clan_daily_post");

      // Clan chat today?
      const { count: clanChatCount } = await supabase
        .from("clan_messages")
        .select("id", { count: "exact", head: true })
        .eq("clan_id", clanData.id)
        .eq("author_id", currentUser.id)
        .gte("created_at", startIso);

      if (clanChatCount && clanChatCount > 0) {
        newCompleted.add("player_daily_chat");
        newCompleted.add("clan_daily_chat");
      }

      // Voice connection check
      newCompleted.add("player_daily_voice");
      newCompleted.add("clan_daily_voice");

      // Reaction check today
      const { count: reactionCount } = await supabase
        .from("post_reactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUser.id)
        .gte("created_at", startIso);

      if (reactionCount && reactionCount > 0) newCompleted.add("player_daily_reaction");

      setCompletedKeys(Array.from(newCompleted));
    } catch (err) {
      console.error("[DailyQuestsTab] Errore verifica obiettivi:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyProgress();
  }, [currentUser, clanData.id]);

  const handleClaimQuest = async (quest: QuestDefinition) => {
      if (!currentUser) return;
      setClaimingKey(quest.key);
  
      try {
        // Use the claim_daily_quest RPC function which handles idempotency and all database operations
        const { data, error } = await supabase.rpc("claim_daily_quest", {
          p_quest_type: quest.key,
          p_clan_id: quest.category === "clan" ? clanData.id : null,
        });
  
        if (error) throw error;
  
        if (data?.success) {
          toast({
            title: "Obiettivo Completato! 🎯",
            description: data.message || `Hai riscattato +0.10 SC Coin per "${quest.title}".`,
          });
          setClaimedKeys((prev) => [...prev, quest.key]);
          await onRefresh();
        } else if (data?.already_completed) {
          toast({
            title: "Obiettivo Già Completato",
            description: data.message || "Hai già completato questo obiettivo oggi.",
          });
        } else {
          throw new Error("Impossibile completare l'obiettivo.");
        }
      } catch (err: any) {
        console.error("[DailyQuestsTab] Errore riscatto:", err);
        toast({
          title: "Errore Riscatto Obiettivo",
          description: err.message || "Impossibile accreditare la ricompensa.",
          variant: "destructive",
        });
      } finally {
        setClaimingKey(null);
      }
    };

  const currentList = activeTab === "player" ? PLAYER_QUESTS : CLAN_QUESTS;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                OBIETTIVI GIORNALIERI
              </h3>
              <p className="text-[10px] text-zinc-400">
                Completa missioni quotidiane per guadagnare +0.10 SC Coin
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">
              Ricompensa / Missione
            </span>
            <div className="flex items-center gap-1 text-amber-300 font-extrabold text-xs justify-end">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>+0.10 SC</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={() => setActiveTab("player")}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "player"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border border-purple-400/50"
                : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <span>Obiettivi Giocatore</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("clan")}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "clan"
                ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md border border-cyan-400/50"
                : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-cyan-200" />
            <span>Obiettivi Clan [{clanData.tag}]</span>
          </button>
        </div>
      </div>

      {/* Quests List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : (
          currentList.map((quest) => {
            const Icon = quest.icon;
            const isClaimed = claimedKeys.includes(quest.key);
            const isCompleted = completedKeys.includes(quest.key);
            const isCurrentClaiming = claimingKey === quest.key;

            return (
              <div
                key={quest.key}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isClaimed
                    ? "bg-[#101426]/70 border-zinc-800/70 opacity-80"
                    : isCompleted
                    ? "bg-[#141a33] border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                    : "bg-[#121628]/95 border-purple-900/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isClaimed
                        ? "bg-zinc-800 text-zinc-500"
                        : isCompleted
                        ? "bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 shadow-sm"
                        : "bg-purple-950/60 border border-purple-500/40 text-purple-300"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-white truncate max-w-[150px]">
                        {quest.title}
                      </h4>
                      <span className="text-[10px] font-bold text-amber-300 flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/10 border border-amber-400/30">
                        <Coins className="w-2.5 h-2.5 text-amber-400" />
                        +0.10 SC
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                      {quest.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isClaimed ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-xl border border-zinc-700">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      RISCATTATO
                    </span>
                  ) : isCompleted ? (
                    <button
                      type="button"
                      onClick={() => handleClaimQuest(quest)}
                      disabled={isCurrentClaiming}
                      className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-md transition-all cursor-pointer animate-pulse"
                    >
                      {isCurrentClaiming ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-white" />
                      )}
                      <span>Riscatta 0.1 SC</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-xl border border-zinc-800">
                      <Clock className="w-3 h-3" />
                      In corso
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
