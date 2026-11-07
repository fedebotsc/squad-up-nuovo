import React, { useState, useRef } from "react";
import {
  X,
  Sparkles,
  Check,
  Palette,
  UploadCloud,
  Crown,
  Shield,
  Loader2,
  Lock,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface ProfileCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Tactical SVG / CSS Gradients (No external placeholder links)
export const BANNER_THEMES = [
  {
    id: "theme-void",
    name: "Void Obsidian",
    gradient: "from-[#0a0d18] via-[#1a1136] to-[#0b0c16]",
    accent: "purple",
    costSC: 0,
    isFree: true,
  },
  {
    id: "theme-cyber",
    name: "Cyber Neon",
    gradient: "from-[#06202e] via-[#093548] to-[#05111e]",
    accent: "cyan",
    costSC: 50,
    isFree: false,
  },
  {
    id: "theme-recon",
    name: "Emerald Recon",
    gradient: "from-[#061e14] via-[#093322] to-[#04130d]",
    accent: "emerald",
    costSC: 50,
    isFree: false,
  },
  {
    id: "theme-gold",
    name: "Champion Gold",
    gradient: "from-[#2a1e05] via-[#4d370b] to-[#1c1404]",
    accent: "amber",
    costSC: 50,
    isFree: false,
  },
  {
    id: "theme-inferno",
    name: "Inferno Crimson",
    gradient: "from-[#29070c] via-[#4d0d17] to-[#180306]",
    accent: "rose",
    costSC: 50,
    isFree: false,
  },
];

export const AVATAR_FRAMES = [
  {
    id: "base",
    name: "Standard Tactical",
    borderClass: "border-purple-500",
    glowClass: "shadow-[0_0_12px_rgba(139,92,246,0.5)]",
    previewColor: "from-purple-500 to-indigo-600",
    requiresPro: false,
  },
  {
    id: "neon-cyan",
    name: "Cyber Neon",
    borderClass: "border-cyan-400",
    glowClass: "shadow-[0_0_15px_rgba(34,211,238,0.7)]",
    previewColor: "from-cyan-400 to-blue-500",
    requiresPro: false,
  },
  {
    id: "gold",
    name: "Golden Champion",
    borderClass: "border-amber-400",
    glowClass: "shadow-[0_0_18px_rgba(245,158,11,0.8)]",
    previewColor: "from-amber-400 to-yellow-500",
    requiresPro: true,
  },
  {
    id: "fire-red",
    name: "Inferno Assault",
    borderClass: "border-rose-500",
    glowClass: "shadow-[0_0_15px_rgba(244,63,94,0.7)]",
    previewColor: "from-rose-500 to-orange-500",
    requiresPro: false,
  },
  {
    id: "amethyst",
    name: "Amethyst Elite",
    borderClass: "border-fuchsia-500",
    glowClass: "shadow-[0_0_15px_rgba(217,70,239,0.7)]",
    previewColor: "from-fuchsia-500 to-purple-600",
    requiresPro: false,
  },
];

export const ProfileCustomizerModal: React.FC<ProfileCustomizerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfile, sCoinBalance, refreshUserData, currentUser, openAuthModal } = useSquad();
  const [activeTab, setActiveTab] = useState<"upload" | "themes" | "frames">("upload");
  const [selectedFrame, setSelectedFrame] = useState<string>(userProfile.avatarFrame || "base");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isPro = userProfile.subscriptionTier === "pro";
  const unlockedBanners = userProfile.unlockedBanners || [];

  // Direct File Upload for Banner to Supabase bucket 'social-media'
  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Caricamento banner su storage protetto...");

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${currentUser.id}/banner_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("social-media")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from("social-media").getPublicUrl(filePath).data.publicUrl;

      // Update in profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          banner_url: publicUrl,
        })
        .eq("id", currentUser.id);

      if (updateError) throw updateError;

      await refreshUserData();
      toast({
        title: "Banner Profilo Aggiornato! 🎨",
        description: "Il nuovo file immagine è stato salvato con successo nel tuo profilo.",
      });

      if (bannerFileInputRef.current) bannerFileInputRef.current.value = "";
    } catch (err: any) {
      console.error("[Customizer] Errore upload banner:", err);
      toast({
        title: "Errore caricamento banner",
        description: err.message || "Impossibile salvare il file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Direct File Upload for Avatar to Supabase bucket 'social-media'
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Caricamento avatar su storage protetto...");

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${currentUser.id}/avatar_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("social-media")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from("social-media").getPublicUrl(filePath).data.publicUrl;

      // Update in profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
        })
        .eq("id", currentUser.id);

      if (updateError) throw updateError;

      await refreshUserData();
      toast({
        title: "Avatar Profilo Aggiornato! 👤",
        description: "La tua nuova immagine avatar è attiva su SquadUP.",
      });

      if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
    } catch (err: any) {
      console.error("[Customizer] Errore upload avatar:", err);
      toast({
        title: "Errore caricamento avatar",
        description: err.message || "Impossibile salvare il file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Select Preset Theme
  const handleApplyTheme = async (theme: typeof BANNER_THEMES[0]) => {
    if (!currentUser) return;
    setIsUploading(true);
    try {
      const isUnlocked = theme.isFree || unlockedBanners.includes(theme.id) || isPro;

      if (!isUnlocked && sCoinBalance < theme.costSC) {
        toast({
          title: "Saldo SCoin insufficiente",
          description: `Servono ${theme.costSC} SCoin per sbloccare questo stile (hai ${sCoinBalance} SCoin).`,
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      await supabase
        .from("profiles")
        .update({
          pro_theme: theme.id === "theme-gold" ? "gold" : "neon",
        })
        .eq("id", currentUser.id);

      await refreshUserData();
      toast({
        title: "Stema Tema Equipaggiato",
        description: `Lo stile "${theme.name}" è ora attivo.`,
      });
    } catch (err: any) {
      toast({
        title: "Errore salvataggio tema",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Equip Avatar Frame
  const handleApplyFrame = async (frameId: string) => {
    if (!currentUser) return;
    const target = AVATAR_FRAMES.find((f) => f.id === frameId);
    if (target?.requiresPro && !isPro) {
      toast({
        title: "Vantaggio Esclusivo Player Pro 👑",
        description: "La cornice Golden Champion richiede un abbonamento Player Pro attivo.",
      });
      return;
    }

    setIsUploading(true);
    try {
      await supabase
        .from("profiles")
        .update({
          pro_theme: frameId === "neon-cyan" ? "neon" : "gold",
        })
        .eq("id", currentUser.id);

      setSelectedFrame(frameId);
      await refreshUserData();
      toast({
        title: "Cornice Avatar Aggiornata",
        description: `Cornice ${target?.name} equipaggiata con successo.`,
      });
    } catch (err: any) {
      toast({
        title: "Errore cornice",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0f1322] border border-cyan-500/40 p-5 shadow-[0_0_35px_rgba(6,182,212,0.25)] overflow-hidden max-h-[92vh] flex flex-col">
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
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            Personalizzazione Profilo
          </div>
          <h3 className="text-base font-extrabold text-white">Caricamento Media & Stile</h3>
          <p className="text-[11px] text-zinc-400">
            Carica file diretti salvati su Supabase Storage e seleziona cornici avatar
          </p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#121628] p-1 rounded-2xl border border-zinc-800 my-3">
          <button
            onClick={() => setActiveTab("upload")}
            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "upload"
                ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => setActiveTab("frames")}
            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "frames"
                ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Cornici
          </button>
          <button
            onClick={() => setActiveTab("themes")}
            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "themes"
                ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Temi Colore
          </button>
        </div>

        {/* TAB 1: DIRECT FILE UPLOADS (BANNER & AVATAR) */}
        {activeTab === "upload" && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={bannerFileInputRef}
              onChange={handleBannerFileUpload}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={avatarFileInputRef}
              onChange={handleAvatarFileUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Banner Upload Box */}
            <div className="bg-[#121629] p-3.5 rounded-2xl border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  Banner Personale (File Diretto)
                </span>
                <span className="text-[10px] text-cyan-400 font-medium">social-media</span>
              </div>

              {userProfile.bannerUrl && (
                <div className="w-full h-18 rounded-xl overflow-hidden border border-zinc-700 bg-black/60 relative">
                  <img
                    src={userProfile.bannerUrl}
                    alt="Banner Attuale"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1.5 text-[9px] bg-black/75 px-1.5 py-0.5 rounded text-zinc-300">
                    Attualmente Attivo
                  </span>
                </div>
              )}

              <button
                type="button"
                disabled={isUploading}
                onClick={() => bannerFileInputRef.current?.click()}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span>Carica Nuovo Banner (JPG, PNG)</span>
              </button>
            </div>

            {/* Avatar Upload Box */}
            <div className="bg-[#121629] p-3.5 rounded-2xl border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-purple-400" />
                  Foto Profilo Avatar (File Diretto)
                </span>
                <span className="text-[10px] text-purple-400 font-medium">social-media</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-purple-500/50 shrink-0 bg-purple-950">
                  {userProfile.avatar ? (
                    <img
                      src={userProfile.avatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-purple-300">
                      {userProfile.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl border border-dashed border-purple-500/50 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-950/30 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-purple-400" />
                  <span>Scegli Foto Avatar</span>
                </button>
              </div>
            </div>

            {isUploading && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-center space-y-1">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin mx-auto" />
                <span className="text-xs font-bold text-white block">
                  {uploadProgress || "Salvataggio in corso..."}
                </span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AVATAR FRAMES */}
        {activeTab === "frames" && (
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
            {AVATAR_FRAMES.map((frame) => {
              const isSelected = selectedFrame === frame.id;
              const isLocked = frame.requiresPro && !isPro;

              return (
                <div
                  key={frame.id}
                  onClick={() => !isLocked && handleApplyFrame(frame.id)}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-700"
                  } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${frame.previewColor} border-2 ${frame.borderClass} ${frame.glowClass} flex items-center justify-center font-extrabold text-black text-xs shrink-0`}
                    >
                      ★
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs">{frame.name}</span>
                        {frame.requiresPro && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            PRO
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {frame.requiresPro ? "Riservato agli abbonati Pro" : "Disponibile per tutti"}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[11px] font-black">
                        ✓
                      </span>
                    ) : isLocked ? (
                      <Lock className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <span className="text-[10px] text-zinc-500 hover:text-white">Equipaggia</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: THEMES */}
        {activeTab === "themes" && (
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
            {BANNER_THEMES.map((theme) => {
              return (
                <div
                  key={theme.id}
                  onClick={() => handleApplyTheme(theme)}
                  className="p-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 flex items-center justify-between gap-3 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-8 rounded-lg bg-gradient-to-r ${theme.gradient} border border-zinc-700 shrink-0`}
                    />
                    <div>
                      <span className="font-bold text-white text-xs block">{theme.name}</span>
                      <span className="text-[10px] text-zinc-400">
                        {theme.isFree ? "Gratuito" : `${theme.costSC} SCoin`}
                      </span>
                    </div>
                  </div>

                  <button className="text-[10px] font-bold text-cyan-400 hover:underline">
                    Equipaggia
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
