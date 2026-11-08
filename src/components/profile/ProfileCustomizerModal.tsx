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
  Award,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { uploadMediaFile } from "@/services/storageService";
import { AVATAR_FRAMES, BANNER_THEMES, AvatarFrame, BannerTheme } from "./cosmeticsData";

export { AVATAR_FRAMES, BANNER_THEMES };

interface ProfileCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileCustomizerModal: React.FC<ProfileCustomizerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    userProfile,
    sCoinBalance,
    refreshUserData,
    currentUser,
    openAuthModal,
    isUniversalAdmin,
  } = useSquad();
  const [activeTab, setActiveTab] = useState<"upload" | "themes" | "frames">("upload");
  const [selectedFrame, setSelectedFrame] = useState<string>(
    userProfile.activeFrame || userProfile.avatarFrame || "base"
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isPro = userProfile.subscriptionTier === "pro" || isUniversalAdmin;
  const unlockedBanners = userProfile.unlockedBanners || [];
  const unlockedFrames = userProfile.unlockedFrames || [];

  // Direct File Upload for Banner to Supabase
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
      const { url: publicUrl } = await uploadMediaFile(file, "banner", currentUser.id);

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

  // Direct File Upload for Avatar
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
      const { url: publicUrl } = await uploadMediaFile(file, "avatar", currentUser.id);

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

  // Select Preset Theme or Tenure Banner
  const handleApplyTheme = async (theme: typeof BANNER_THEMES[0]) => {
    if (!currentUser) return;
    setIsUploading(true);
    try {
      const isTenureUnlocked =
        unlockedBanners.includes(theme.id) ||
        isUniversalAdmin ||
        userProfile.claimedTenureRewards?.some((r) => theme.id.includes(r.replace("tenure_", "")));

      if (theme.isTenure && !isTenureUnlocked) {
        toast({
          title: "Banner Fedeltà Bloccato 🎖️",
          description: `Questo banner si sblocca nella sezione Premi Fedeltà raggiungendo ${theme.tenureMilestone}.`,
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      const isUnlocked =
        theme.isFree ||
        unlockedBanners.includes(theme.id) ||
        isPro ||
        isTenureUnlocked ||
        isUniversalAdmin;

      if (!isUnlocked && sCoinBalance < theme.costSC) {
        toast({
          title: "Saldo SCoin insufficiente",
          description: `Servono ${theme.costSC} SCoin per sbloccare questo stile (hai ${sCoinBalance} SCoin).`,
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      if (theme.svgUrl) {
        // Tenure banner with high-res SVG
        await supabase
          .from("profiles")
          .update({
            banner_url: theme.svgUrl,
          })
          .eq("id", currentUser.id);
      } else {
        await supabase
          .from("profiles")
          .update({
            pro_theme: theme.id === "theme-gold" ? "gold" : "neon",
          })
          .eq("id", currentUser.id);
      }

      await refreshUserData();
      toast({
        title: "Banner Profilo Equipaggiato! 🖼️",
        description: `Lo stile "${theme.name}" è ora attivo sul tuo profilo.`,
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

  // Equip Avatar Frame on Supabase `profiles.active_frame`
  const handleApplyFrame = async (frameId: string) => {
    if (!currentUser) return;
    const target = AVATAR_FRAMES.find((f) => f.id === frameId);

    const isTenureUnlocked =
      unlockedFrames.includes(frameId) ||
      isUniversalAdmin ||
      userProfile.claimedTenureRewards?.some((r) => frameId.includes(r.replace("tenure_", "")));

    if (target?.isTenure && !isTenureUnlocked) {
      toast({
        title: "Cornice Fedeltà Bloccata 🎖️",
        description: `Questa cornice si sblocca nei Premi Fedeltà con anzianità ${target.tenureMilestone}.`,
        variant: "destructive",
      });
      return;
    }

    if (target?.requiresPro && !isPro && !isTenureUnlocked) {
      toast({
        title: "Vantaggio Esclusivo Player Pro 👑",
        description: "Questa cornice richiede un abbonamento Player Pro attivo.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      await supabase
        .from("profiles")
        .update({
          active_frame: frameId,
        })
        .eq("id", currentUser.id);

      setSelectedFrame(frameId);
      await refreshUserData();
      toast({
        title: "Cornice Avatar Aggiornata! ✨",
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
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Scegli foto, cornici e banner sbloccati per il tuo operatore.
          </p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900/80 rounded-2xl border border-zinc-800 my-3">
          <button
            onClick={() => setActiveTab("upload")}
            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "upload"
                ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Carica Foto
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
            Banner & Temi
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
                  <Shield className="w-4 h-4 text-purple-400" />
                  Foto Avatar Personale
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
              const isTenureUnlocked =
                unlockedFrames.includes(frame.id) ||
                isUniversalAdmin ||
                userProfile.claimedTenureRewards?.some((r) =>
                  frame.id.includes(r.replace("tenure_", ""))
                );

              const isLocked =
                (frame.isTenure && !isTenureUnlocked) ||
                (frame.requiresPro && !isPro && !isTenureUnlocked);

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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-xs">{frame.name}</span>
                        {frame.isTenure ? (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {frame.tenureMilestone}
                          </span>
                        ) : frame.requiresPro ? (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            PRO
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {frame.isTenure
                          ? isTenureUnlocked
                            ? "Sbloccata da fedeltà abbonamento"
                            : `Riservata ad anzianità ${frame.tenureMilestone}`
                          : frame.requiresPro
                          ? "Riservato agli abbonati Pro"
                          : "Disponibile per tutti"}
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
                      <span className="text-[10px] text-zinc-400 hover:text-white font-semibold">
                        Equipaggia
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: BANNER THEMES */}
        {activeTab === "themes" && (
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
            {BANNER_THEMES.map((theme) => {
              const isTenureUnlocked =
                unlockedBanners.includes(theme.id) ||
                isUniversalAdmin ||
                userProfile.claimedTenureRewards?.some((r) =>
                  theme.id.includes(r.replace("tenure_", ""))
                );

              const isLocked = theme.isTenure && !isTenureUnlocked;

              return (
                <div
                  key={theme.id}
                  onClick={() => !isLocked && handleApplyTheme(theme)}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isLocked
                      ? "border-zinc-800/60 bg-zinc-900/40 opacity-60 cursor-not-allowed"
                      : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {theme.svgUrl ? (
                      <div className="w-14 h-8 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                        <img
                          src={theme.svgUrl}
                          alt={theme.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-12 h-8 rounded-lg bg-gradient-to-r ${theme.gradient} border border-zinc-700 shrink-0`}
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs truncate">
                          {theme.name}
                        </span>
                        {theme.isTenure && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            {theme.tenureMilestone}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 block truncate">
                        {theme.isTenure
                          ? isTenureUnlocked
                            ? "Sbloccato da fedeltà abbonamento"
                            : `Richiede anzianità ${theme.tenureMilestone}`
                          : theme.isFree
                          ? "Gratuito"
                          : `${theme.costSC} SCoin`}
                      </span>
                    </div>
                  </div>

                  {isLocked ? (
                    <Lock className="w-4 h-4 text-zinc-500 shrink-0" />
                  ) : (
                    <button className="text-[10px] font-bold text-cyan-400 hover:underline shrink-0">
                      Equipaggia
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
