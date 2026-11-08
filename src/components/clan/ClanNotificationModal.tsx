import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  BellOff,
  BellRing,
  Shield,
  FileText,
  Trophy,
  Megaphone,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface ClanNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  clanId: string;
  clanName: string;
}

export interface ClanNotificationPrefs {
  new_posts: boolean;
  tournaments: boolean;
  announcements: boolean;
}

export const ClanNotificationModal: React.FC<ClanNotificationModalProps> = ({
  isOpen,
  onClose,
  clanId,
  clanName,
}) => {
  const { currentUser, openAuthModal } = useSquad();
  const [enabled, setEnabled] = useState(true);
  const [preferences, setPreferences] = useState<ClanNotificationPrefs>({
    new_posts: true,
    tournaments: true,
    announcements: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMember, setIsMember] = useState(false);

  // Fetch current membership notification settings from clan_members
  useEffect(() => {
    if (!isOpen || !clanId || !currentUser?.id) return;

    const loadClanMemberSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("clan_members")
          .select("notifications_enabled, notification_preferences")
          .eq("clan_id", clanId)
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setIsMember(true);
          setEnabled(data.notifications_enabled ?? true);
          const currentPrefs = data.notification_preferences as ClanNotificationPrefs | null;
          if (currentPrefs) {
            setPreferences({
              new_posts: currentPrefs.new_posts ?? true,
              tournaments: currentPrefs.tournaments ?? true,
              announcements: currentPrefs.announcements ?? true,
            });
          }
        } else {
          setIsMember(false);
        }
      } catch (err: any) {
        console.warn("[ClanNotificationModal] Errore caricamento:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadClanMemberSettings();
  }, [isOpen, clanId, currentUser?.id]);

  if (!isOpen) return null;

  const handleTogglePref = (key: keyof ClanNotificationPrefs) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    if (!isMember) {
      toast({
        title: "Non sei membro del clan",
        description: "Devi unirti al clan per gestire le notifiche interne.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("clan_members")
        .update({
          notifications_enabled: enabled,
          notification_preferences: preferences,
        })
        .eq("clan_id", clanId)
        .eq("user_id", currentUser.id);

      if (error) throw error;

      toast({
        title: "Preferenze Notifiche Salvate! 🔔",
        description: enabled
          ? "Riceverai aggiornamenti secondo le opzioni selezionate per questo Clan."
          : "Notifiche disattivate per questo Clan.",
      });
      onClose();
    } catch (err: any) {
      console.error("[ClanNotificationModal] Errore salvataggio:", err);
      toast({
        title: "Errore salvataggio",
        description: err.message || "Impossibile aggiornare le impostazioni.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0f1322] border border-cyan-500/40 p-5 shadow-[0_0_35px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-r from-cyan-500/30 via-purple-600/30 to-amber-500/20 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center pb-3 border-b border-zinc-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider mb-1">
            <BellRing className="w-3.5 h-3.5 text-cyan-400" />
            Notifiche Clan
          </div>
          <h3 className="text-base font-extrabold text-white truncate max-w-xs mx-auto">
            {clanName}
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Scegli quali aggiornamenti ed eventi ricevere dal clan.
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            <span className="text-xs text-zinc-400">Caricamento preferenze...</span>
          </div>
        ) : !isMember ? (
          <div className="py-8 text-center space-y-3">
            <Shield className="w-10 h-10 text-cyan-400/50 mx-auto" />
            <p className="text-xs text-zinc-300">
              Le notifiche del clan sono riservate ai membri effettivi di <strong className="text-white">{clanName}</strong>.
            </p>
            <span className="text-[11px] text-zinc-400 block">
              Invia una richiesta di reclutamento per accedere a tutte le notifiche strategiche.
            </span>
          </div>
        ) : (
          <div className="space-y-4 py-3">
            {/* Master Toggle */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-[#12162a] border border-cyan-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    enabled
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500"
                  }`}
                >
                  {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Notifiche Attive
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {enabled ? "Ricevi aggiornamenti dal clan" : "Nessun avviso per questo clan"}
                  </span>
                </div>
              </div>

              {/* iOS Style Switch */}
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enabled ? "bg-cyan-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Sub-Preferences Checklist */}
            <div className={`space-y-2 transition-opacity ${enabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block px-1">
                Categorie Notifiche Clan
              </span>

              {/* 1. Nuovi Post del Clan */}
              <div
                onClick={() => handleTogglePref("new_posts")}
                className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 flex items-center justify-between gap-3 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-300">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Nuovi post del clan
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Clip, screenshot e aggiornamenti feed
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    preferences.new_posts
                      ? "bg-cyan-500 border-cyan-400 text-black"
                      : "border-zinc-700 bg-zinc-800"
                  }`}
                >
                  {preferences.new_posts && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* 2. Nuovi Tornei del Clan */}
              <div
                onClick={() => handleTogglePref("tournaments")}
                className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 flex items-center justify-between gap-3 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Nuovi tornei del clan
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Sfide interne, scrim e iscrizioni aperte
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    preferences.tournaments
                      ? "bg-cyan-500 border-cyan-400 text-black"
                      : "border-zinc-700 bg-zinc-800"
                  }`}
                >
                  {preferences.tournaments && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* 3. Annunci Ufficiali */}
              <div
                onClick={() => handleTogglePref("announcements")}
                className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 flex items-center justify-between gap-3 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-300">
                    <Megaphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Annunci ufficiali
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Comunicazioni importanti dai Founder/Admin
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    preferences.announcements
                      ? "bg-cyan-500 border-cyan-400 text-black"
                      : "border-zinc-700 bg-zinc-800"
                  }`}
                >
                  {preferences.announcements && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-98"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvataggio su Supabase...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salva Preferenze Notifiche</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
