import React, { useState, useRef } from "react";
import {
  X,
  Sparkles,
  Shield,
  Crown,
  UploadCloud,
  Loader2,
  Check,
  CheckCircle2,
  Lock,
  Palette,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { uploadMediaFile } from "@/services/storageService";
import { ClanData } from "@/data/mockData";

interface ClanCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clanData: ClanData;
  currentUser: any;
  onRefresh: () => Promise<void>;
  onOpenUpgrade: () => void;
}

const CLAN_PRESET_FRAMES = [
  { id: "frame-cyan", name: "Cyber Neon Ciano", color: "#06B6D4", tier: "pro", style: "border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]" },
  { id: "frame-purple", name: "Amethyst Pulse", color: "#A855F7", tier: "pro", style: "border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.6)]" },
  { id: "frame-gold", name: "Royal Gold Imperiale", color: "#F59E0B", tier: "elite", style: "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.7)]" },
  { id: "frame-emerald", name: "Spec-Ops Smeraldo", color: "#10B981", tier: "pro", style: "border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]" },
  { id: "frame-crimson", name: "Mythic Dragon Flame", color: "#EF4444", tier: "elite", style: "border-rose-500 shadow-[0_0_16px_rgba(239,68,68,0.7)]" },
  { id: "frame-obsidian", name: "Obsidian Cosmic Overlord", color: "#8B5CF6", tier: "elite", style: "border-indigo-400 shadow-[0_0_18px_rgba(139,92,246,0.8)]" },
];

const CLAN_PRESET_BANNERS = [
  {
    id: "banner-tactical",
    name: "Midnight Tactical Ops",
    gradient: "from-[#0d1326] via-[#1a1c38] to-[#0a0d17]",
  },
  {
    id: "banner-gold",
    name: "Imperial Dominion Gold",
    gradient: "from-[#291b00] via-[#3d2906] to-[#0f0b00]",
  },
  {
    id: "banner-cyber",
    name: "Cyberpunk Citadel",
    gradient: "from-[#042426] via-[#083d42] to-[#021314]",
  },
  {
    id: "banner-void",
    name: "Obsidian Nebula",
    gradient: "from-[#250d38] via-[#150a2b] to-[#090214]",
  },
];

export const ClanCustomizerModal: React.FC<ClanCustomizerModalProps> = ({
  isOpen,
  onClose,
  clanData,
  currentUser,
  onRefresh,
  onOpenUpgrade,
}) => {
  const isProOrElite =
    clanData.tier === "pro" ||
    clanData.tier === "elite" ||
    clanData.subscriptionTier === "pro" ||
    clanData.subscriptionTier === "elite";

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploading(true);
    setUploadProgress("Caricamento stemma clan su storage...");

    try {
      const { url: publicUrl } = await uploadMediaFile(
        file,
        "clan-logo",
        currentUser.id,
        clanData.id
      );

      const { error } = await supabase.rpc("update_clan_branding", {
        p_clan_id: clanData.id,
        p_avatar_url: publicUrl,
      });

      if (error) throw error;

      await onRefresh();
      toast({
        title: "Logo Clan Aggiornato! 🛡️",
        description: "Il nuovo stemma ufficiale è visibile sul profilo del clan.",
      });
    } catch (err: any) {
      console.error("[ClanCustomizer] Errore logo:", err);
      toast({
        title: "Errore caricamento logo",
        description: err.message || "Impossibile caricare il file su storage.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !currentUser) return;
  
      setIsUploading(true);
      setUploadProgress("Caricamento banner clan su storage...");
  
      try {
        const { url: publicUrl } = await uploadMediaFile(
          file,
          "clan-banner",
          currentUser.id,
          clanData.id
        );
  
        const { error } = await supabase.rpc("update_clan_branding", {
          p_clan_id: clanData.id,
          p_clan_banner_url: publicUrl,
        });
  
        if (error) throw error;
  
        await onRefresh();
        toast({
          title: "Banner Clan Aggiornato! 🎨",
          description: "Il nuovo banner grafico della pagina clan è ora attivo.",
        });
      } catch (err: any) {
        console.error("[ClanCustomizer] Errore banner:", err);
        toast({
          title: "Errore caricamento banner",
          description: err.message || "Impossibile caricare il banner su storage.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
        if (bannerInputRef.current) bannerInputRef.current.value = "";
      }
    };

  const handleSelectPresetBanner = async (gradientString: string, name: string) => {
    try {
      const { error } = await supabase.rpc("update_clan_branding", {
        p_clan_id: clanData.id,
        p_clan_banner_url: gradientString,
      });

      if (error) throw error;

      await onRefresh();
      toast({
        title: "Banner Clan Applicato! ✨",
        description: `Hai equipaggiato il banner "${name}".`,
      });
    } catch (err: any) {
      toast({
        title: "Errore selezione banner",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectFrame = async (frameColorOrClass: string, frameName: string) => {
    try {
      const { error } = await supabase.rpc("update_clan_branding", {
        p_clan_id: clanData.id,
        p_clan_frame_url: frameColorOrClass,
      });

      if (error) throw error;

      await onRefresh();
      toast({
        title: "Cornice Stemma Applicata! 🛡️",
        description: `Cornice "${frameName}" impostata attorno allo stemma del clan.`,
      });
    } catch (err: any) {
      toast({
        title: "Errore selezione cornice",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="w-full max-w-md bg-[#0e1224] border border-purple-500/40 rounded-3xl p-5 shadow-2xl space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-cyan-300">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Personalizza Grafica Clan [{clanData.tag}]
              </h3>
              <p className="text-[10px] text-zinc-400">
                Stemma, cornici luminose e banner di legione
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Upgrade Banner if Clan Base */}
        {!isProOrElite && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-cyan-950/40 border border-amber-500/40 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Vantaggio Esclusivo Clan Pro ed Elite</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-snug">
              Il tuo clan è attualmente al livello <strong>Base</strong>. Esegui l'upgrade per applicare cornici animate allo stemma e banner grafici personalizzati!
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenUpgrade();
              }}
              className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 text-black font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Passa a Clan Pro o Elite
            </button>
          </div>
        )}

        {/* Hidden inputs */}
        <input
          type="file"
          ref={logoInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />
        <input
          type="file"
          ref={bannerInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleBannerUpload}
        />

        {uploadProgress && (
          <div className="p-2.5 rounded-xl bg-purple-950/50 border border-purple-500/40 flex items-center gap-2 text-purple-200 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span>{uploadProgress}</span>
          </div>
        )}

        {/* 1. Stemma & Cornice Logo */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-zinc-200">
            1. Stemma Clan & Cornice Attorno al Logo
          </label>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#14182e] border border-zinc-800">
            <div className="relative shrink-0">
              {clanData.clanFrameUrl && (
                <div
                  className="absolute -inset-1 rounded-2xl pointer-events-none z-10 border-2"
                  style={{
                    borderColor: clanData.clanFrameUrl.startsWith("#") ? clanData.clanFrameUrl : "#06B6D4",
                    boxShadow: `0 0 10px ${clanData.clanFrameUrl.startsWith("#") ? clanData.clanFrameUrl : "#06B6D4"}90`,
                  }}
                />
              )}
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-900 border border-purple-500/30 flex items-center justify-center">
                {clanData.avatarUrl ? (
                  <img src={clanData.avatarUrl} alt="Logo Clan" className="w-full h-full object-cover" />
                ) : (
                  <Shield className="w-7 h-7 text-cyan-400" />
                )}
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <span className="text-xs font-bold text-white block">Logo Ufficiale</span>
              <p className="text-[10px] text-zinc-400">Carica file JPG o PNG su bucket protetto</p>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploading}
                className="py-1 px-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <UploadCloud className="w-3 h-3" />
                <span>Carica File Logo</span>
              </button>
            </div>
          </div>

          {/* Preset Frames Selection */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-300 block">
              Seleziona Cornice Stemma:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {CLAN_PRESET_FRAMES.map((f) => {
                const isSelected = clanData.clanFrameUrl === f.color;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelectFrame(f.color, f.name)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-950/60 border-purple-400 shadow-md"
                        : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border-2 shrink-0"
                      style={{
                        borderColor: f.color,
                        boxShadow: `0 0 6px ${f.color}`,
                        backgroundColor: `${f.color}30`,
                      }}
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-white block truncate">{f.name}</span>
                      <span className="text-[8px] text-zinc-400 uppercase font-semibold">{f.tier}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Banner Pagina Clan */}
        <div className="space-y-2.5 pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-zinc-200">
              2. Banner Pagina Clan
            </label>
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploading}
              className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <UploadCloud className="w-3 h-3" />
              <span>Carica File Banner</span>
            </button>
          </div>

          {/* Preset Banners */}
          <div className="grid grid-cols-2 gap-2">
            {CLAN_PRESET_BANNERS.map((b) => {
              const isSelected = clanData.clanBannerUrl === b.gradient;
              return (
                <div
                  key={b.id}
                  onClick={() => handleSelectPresetBanner(b.gradient, b.name)}
                  className={`h-14 rounded-xl border p-2 flex flex-col justify-between cursor-pointer bg-gradient-to-r ${b.gradient} transition-all ${
                    isSelected
                      ? "border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <span className="text-[10px] font-bold text-white truncate">{b.name}</span>
                  {isSelected && (
                    <span className="text-[8px] font-bold text-cyan-300 flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> ATTIVO
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors cursor-pointer"
        >
          Chiudi Personalizzazione
        </button>
      </div>
    </div>
  );
};
