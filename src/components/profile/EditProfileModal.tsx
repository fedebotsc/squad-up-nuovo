import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Gamepad2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Sparkles,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfile, currentUser, refreshUserData } = useSquad();

  const [displayName, setDisplayName] = useState("");
  const [activisionId, setActivisionId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(userProfile.name || "");
      setActivisionId(userProfile.activisionName || userProfile.activisionId || "");
      setErrorMsg(null);
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = displayName.trim();
    const cleanActId = activisionId.trim();

    if (!cleanName || cleanName.length < 3) {
      setErrorMsg("Il Nome ID sull'applicazione deve contenere almeno 3 caratteri.");
      return;
    }

    if (!currentUser) {
      setErrorMsg("Devi aver effettuato l'accesso per salvare i dati personali.");
      return;
    }

    setIsSaving(true);
    try {
      let actName = cleanActId;
      let actTag = "";
      if (cleanActId.includes("#")) {
        const parts = cleanActId.split("#");
        actName = parts[0];
        actTag = parts.slice(1).join("#");
      }

      // Check if username already taken by another user
      const cleanUsername = cleanName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const { data: existingUser, error: checkErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .neq("id", currentUser.id)
        .maybeSingle();

      if (!checkErr && existingUser) {
        setErrorMsg("Questo Nome ID sull'applicazione è già in uso. Scegline uno diverso.");
        setIsSaving(false);
        return;
      }

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          display_name: cleanName,
          username: cleanUsername,
          activision_id: cleanActId || null,
          activision_name: actName || "",
          activision_tag: actTag || "",
        })
        .eq("id", currentUser.id);

      if (updateErr) {
        throw updateErr;
      }

      await refreshUserData();

      toast({
        title: "Dati Personali Aggiornati! ✅",
        description: `Nome SquadUP: ${cleanName} ${cleanActId ? `• Activision ID: ${cleanActId}` : ""}`,
      });

      onClose();
    } catch (err: any) {
      console.error("[EditProfileModal] Errore aggiornamento profilo:", err);
      setErrorMsg(err.message || "Errore durante il salvataggio dei dati personali.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0f1324] border border-purple-900/50 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92dvh]">
        {/* Header */}
        <div className="p-4 border-b border-purple-900/30 flex items-center justify-between bg-[#12162a]/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <User className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Modifica Dati Personali</h3>
              <p className="text-[10px] text-zinc-400">Aggiorna il tuo ID SquadUP e Activision ID</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-4 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Nome ID sull'applicazione */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Nome ID sull'applicazione (SquadUP)</span>
              <span className="text-rose-400 text-xs">*</span>
            </label>
            <p className="text-[10px] text-zinc-400 leading-normal">
              Il tuo nome pubblico visibile nel feed, nelle classifiche, nelle chat e nei tornei.
            </p>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={30}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="es. Ghost_Killa o Federico"
                className="w-full bg-zinc-900/90 text-white text-xs rounded-xl px-3.5 py-2.5 border border-purple-900/50 focus:outline-none focus:border-cyan-400 transition-colors font-medium"
              />
            </div>
          </div>

          {/* 2. Activision ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Activision ID Ufficiale (Call of Duty)</span>
              </label>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                Tornei & KD Check
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-normal">
              Inserisci il tuo Activision ID esatto completo di tag numerico (es.{" "}
              <span className="text-cyan-300 font-mono">PlayerName#1234567</span>). Necessario per la verifica automatica delle partite e per il controllo IA Vision del KD nei tornei.
            </p>
            <div className="relative">
              <input
                type="text"
                maxLength={40}
                value={activisionId}
                onChange={(e) => setActivisionId(e.target.value)}
                placeholder="es. Ghost_Killa#98213"
                className="w-full bg-zinc-900/90 text-white text-xs rounded-xl px-3.5 py-2.5 border border-purple-900/50 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Tips card */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border border-purple-800/30 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sincronizzazione Automatica</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Modificando qui i tuoi dati, verranno sincronizzati istantaneamente sul tuo profilo, nei tuoi post e nelle iscrizioni ai tornei.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salva Modifiche</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
