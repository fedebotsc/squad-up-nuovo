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
  Coins,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { uploadMediaFile } from "@/services/storageService";
import { AVATAR_FRAMES, BANNER_THEMES } from "./cosmeticsData";
import { SCoinShopModal } from "@/components/shop/SCoinShopModal";

export { AVATAR_FRAMES, BANNER_THEMES };

interface ProfileCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CUSTOM_UPLOAD_COST_SC = 100; // 100 SC Coin = 1€

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

  const [activeTab, setActiveTab] = useState<"banner" | "frames" | "avatar">("banner");
  const [selectedFrame, setSelectedFrame] = useState<string>(
    userProfile.activeFrame || userProfile.avatarFrame || "base"
  );

  // Banner upload states
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Custom frame upload states
  const [selectedFrameFile, setSelectedFrameFile] = useState<File | null>(null);
  const [framePreview, setFramePreview] = useState<string | null>(null);

  // Avatar upload states
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [showSCoinShop, setShowSCoinShop] = useState(false);

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const frameFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isPro = userProfile.subscriptionTier === "pro" || isUniversalAdmin;
  const unlockedBanners = userProfile.unlockedBanners || [];
  const unlockedFrames = userProfile.unlockedFrames || [];
  const hasEnoughForBanner = isUniversalAdmin || sCoinBalance >= CUSTOM_UPLOAD_COST_SC;
  const hasEnoughForFrame = isUniversalAdmin || sCoinBalance >= CUSTOM_UPLOAD_COST_SC;

  // Selection handlers for Banner
  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedBannerFile(file);
    const objectUrl = URL.createObjectURL(file);
    setBannerPreview(objectUrl);
  };

  // Selection handlers for Frame
  const handleFrameFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFrameFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFramePreview(objectUrl);
  };

  // Selection handler for Avatar photo
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  // Confirm Banner Upload with 100 SC Coin deduction
  const handleConfirmBannerUpload = async () => {
    if (!selectedBannerFile || !currentUser) {
      if (!currentUser) openAuthModal("signup");
      return;
    }

    if (!hasEnoughForBanner) {
      toast({
        title: "Saldo SCoin Insufficiente",
        description: `Servono ${CUSTOM_UPLOAD_COST_SC} SCoin (1€) per caricare un banner personalizzato. Ricarica SCoin per proseguire.`,
        variant: "destructive",
      });
      setShowSCoinShop(true);
      return;
    }

    setIsUploading(true);
    setUploadProgress("Caricamento banner su storage sicuro...");

    try {
      const { url: publicUrl } = await uploadMediaFile(selectedBannerFile, "banner", currentUser.id);

      const newBalance = isUniversalAdmin ? sCoinBalance : Math.max(0, sCoinBalance - CUSTOM_UPLOAD_COST_SC);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          banner_url: publicUrl,
          balance: newBalance,
          coins: newBalance,
          schoins: newBalance,
        })
        .eq("id", currentUser.id);

      if (updateError) throw updateError;

      // Inserimento transazione SC
      if (!isUniversalAdmin) {
        await supabase.from("sc_transactions").insert({
          user_id: currentUser.id,
          amount: CUSTOM_UPLOAD_COST_SC,
          type: "shop_purchase",
          description: "Caricamento Banner Profilo Personalizzato (-100 SC / 1€)",
        });
      }

      await refreshUserData();
      setSelectedBannerFile(null);
      setBannerPreview(null);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = "";

      toast({
        title: "Banner Profilo Applicato! 🎨",
        description: `Nuovo banner attivo con successo. ${isUniversalAdmin ? "(Admin Free)" : `-100 SCoin (1€) scalati dal saldo.`}`,
      });
    } catch (err: any) {
      console.error("[Customizer] Errore caricamento banner:", err);
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

  // Confirm Custom Frame Upload with 100 SC Coin deduction
  const handleConfirmFrameUpload = async () => {
    if (!selectedFrameFile || !currentUser) {
      if (!currentUser) openAuthModal("signup");
      return;
    }

    if (!hasEnoughForFrame) {
      toast({
        title: "Saldo SCoin Insufficiente",
        description: `Servono ${CUSTOM_UPLOAD_COST_SC} SCoin (1€) per caricare una cornice personalizzata. Ricarica SCoin per proseguire.`,
        variant: "destructive",
      });
      setShowSCoinShop(true);
      return;
    }

    setIsUploading(true);
    setUploadProgress("Caricamento cornice su storage sicuro...");

    try {
      const { url: publicUrl } = await uploadMediaFile(selectedFrameFile, "frame", currentUser.id);

      const newBalance = isUniversalAdmin ? sCoinBalance : Math.max(0, sCoinBalance - CUSTOM_UPLOAD_COST_SC);
      const updatedUnlocked = Array.from(new Set([...unlockedFrames, publicUrl]));

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          active_frame: publicUrl,
          unlocked_frames: updatedUnlocked,
          balance: newBalance,
          coins: newBalance,
          schoins: newBalance,
        })
        .eq("id", currentUser.id);

      if (updateError) throw updateError;

      // Inserimento transazione SC
      if (!isUniversalAdmin) {
        await supabase.from("sc_transactions").insert({
          user_id: currentUser.id,
          amount: CUSTOM_UPLOAD_COST_SC,
          type: "shop_purchase",
          description: "Caricamento Cornice Avatar Personalizzata (-100 SC / 1€)",
        });
      }

      await refreshUserData();
      setSelectedFrame(publicUrl);
      setSelectedFrameFile(null);
      setFramePreview(null);
      if (frameFileInputRef.current) frameFileInputRef.current.value = "";

      toast({
        title: "Cornice Avatar Applicata! 🛡️",
        description: `Nuova cornice personalizzata attiva attorno al tuo avatar. ${isUniversalAdmin ? "(Admin Free)" : `-100 SCoin (1€) scalati dal saldo.`}`,
      });
    } catch (err: any) {
      console.error("[Customizer] Errore caricamento cornice:", err);
      toast({
        title: "Errore caricamento cornice",
        description: err.message || "Impossibile salvare il file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Direct File Upload for Personal Avatar (Free photo update)
  const handleConfirmAvatarUpload = async () => {
    if (!selectedAvatarFile || !currentUser) return;

    setIsUploading(true);
    setUploadProgress("Caricamento avatar su storage protetto...");

    try {
      const { url: publicUrl } = await uploadMediaFile(selectedAvatarFile, "avatar", currentUser.id);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
        })
        .eq("id", currentUser.id);

      if (updateError) throw updateError;

      await refreshUserData();
      setSelectedAvatarFile(null);
      setAvatarPreview(null);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";

      toast({
        title: "Avatar Profilo Aggiornato! 👤",
        description: "La tua nuova immagine avatar è attiva su SquadUP.",
      });
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

  // Equip Preset Avatar Frame
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
        title: "Cornice Riservata a Player PRO 👑",
        description: "Attiva l'abbonamento PRO per sbloccare questa cornice animata.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          active_frame: frameId,
        })
        .eq("id", currentUser.id);

      if (error) throw error;

      setSelectedFrame(frameId);
      await refreshUserData();

      toast({
        title: "Cornice Profilo Equipaggiata! 🛡️",
        description: `Cornice "${target?.name || frameId}" attiva.`,
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-md rounded-3xl bg-[#0f1322] border border-cyan-500/40 p-5 shadow-[0_0_35px_rgba(6,182,212,0.25)] overflow-hidden max-h-[92vh] flex flex-col">
          {/* Ambient Top Glow */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-r from-cyan-500/30 via-purple-600/30 to-amber-500/20 blur-2xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900 transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center pb-3 border-b border-zinc-800">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider mb-1">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              Personalizzazione Profilo Player
            </div>
            <h3 className="text-base font-extrabold text-white">Carica Banner & Cornici</h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-300">
                <Coins className="w-3 h-3 text-amber-400" />
                <span>Tuo Saldo: {sCoinBalance.toLocaleString()} SC</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSCoinShop(true)}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Ricarica SC</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900/80 rounded-2xl border border-zinc-800 my-3 shrink-0">
            <button
              onClick={() => setActiveTab("banner")}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "banner"
                  ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Banner (100 SC)
            </button>
            <button
              onClick={() => setActiveTab("frames")}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "frames"
                  ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Cornici (100 SC)
            </button>
            <button
              onClick={() => setActiveTab("avatar")}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "avatar"
                  ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Foto Avatar
            </button>
          </div>

          {/* Progress Banner */}
          {uploadProgress && (
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-center space-y-1 mb-2">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin mx-auto" />
              <span className="text-xs font-bold text-white block">{uploadProgress}</span>
            </div>
          )}

          {/* TAB 1: BANNER UPLOAD & PRESETS */}
          {activeTab === "banner" && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <input
                type="file"
                ref={bannerFileInputRef}
                onChange={handleBannerFileSelect}
                accept="image/*"
                className="hidden"
              />

              {/* Custom Image Upload Section */}
              <div className="bg-[#121629] p-3.5 rounded-2xl border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span className="font-extrabold text-white text-xs">
                      Carica Banner da Immagine
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-[10px] flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    100 SC (1.00€)
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 leading-snug">
                  Carica qualsiasi immagine (JPG, PNG, WebP) in alta risoluzione per impostarla come banner personale.
                </p>

                {/* Banner Preview or Current Banner */}
                <div className="w-full h-24 rounded-xl overflow-hidden border border-zinc-700 bg-black/60 relative">
                  {bannerPreview ? (
                    <img
                      src={bannerPreview}
                      alt="Anteprima Banner"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : userProfile.bannerUrl && (userProfile.bannerUrl.startsWith("http") || userProfile.bannerUrl.startsWith("/") || userProfile.bannerUrl.startsWith("data:")) ? (
                    <img
                      src={userProfile.bannerUrl}
                      alt="Banner Attuale"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-r ${userProfile.bannerUrl || "from-purple-900 to-indigo-950"}`} />
                  )}

                  <span className="absolute bottom-1 right-1.5 text-[9px] bg-black/80 px-2 py-0.5 rounded-md text-zinc-200 border border-white/10 font-bold">
                    {bannerPreview ? "Anteprima Nuovo Banner" : "Banner Attualmente Attivo"}
                  </span>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-cyan-400" />
                    <span>{selectedBannerFile ? "Cambia Immagine Selezionata" : "Scegli File Immagine Banner"}</span>
                  </button>

                  {selectedBannerFile && (
                    <div className="space-y-2 pt-1 border-t border-zinc-800">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span className="truncate max-w-[200px]">{selectedBannerFile.name}</span>
                        <span className="text-amber-300 font-bold">Costo: 100 SC</span>
                      </div>

                      {!hasEnoughForBanner ? (
                        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-rose-300 font-bold text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Saldo SCoin insufficiente ({sCoinBalance}/100 SC)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowSCoinShop(true)}
                            className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-extrabold text-[11px] rounded-lg shadow cursor-pointer"
                          >
                            Ricarica 100 SCoin (1.00€)
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={handleConfirmBannerUpload}
                          className="w-full py-2.5 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>Conferma e Salva Banner (100 SC = 1€)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Preset Themes List */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
                  Oppure Scegli un Tema Preset
                </span>
                <div className="space-y-1.5">
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
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isLocked
                            ? "border-zinc-800/60 bg-zinc-900/40 opacity-60 cursor-not-allowed"
                            : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {theme.svgUrl ? (
                            <div className="w-12 h-7 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                              <img src={theme.svgUrl} alt={theme.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className={`w-12 h-7 rounded-lg bg-gradient-to-r ${theme.gradient} border border-zinc-700 shrink-0`} />
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-white text-xs truncate block">{theme.name}</span>
                            <span className="text-[10px] text-zinc-400 block truncate">
                              {theme.isTenure
                                ? isTenureUnlocked
                                  ? "Sbloccato da Fedeltà"
                                  : `Anzianità ${theme.tenureMilestone}`
                                : theme.isFree
                                ? "Gratuito"
                                : `${theme.costSC} SCoin`}
                            </span>
                          </div>
                        </div>
                        {isLocked ? (
                          <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        ) : (
                          <button className="text-[10px] font-bold text-cyan-400 hover:underline shrink-0">
                            Equipaggia
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FRAMES (CUSTOM UPLOAD 100 SC & PRESETS) */}
          {activeTab === "frames" && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <input
                type="file"
                ref={frameFileInputRef}
                onChange={handleFrameFileSelect}
                accept="image/*"
                className="hidden"
              />

              {/* Custom Frame Upload Section */}
              <div className="bg-[#121629] p-3.5 rounded-2xl border border-purple-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="font-extrabold text-white text-xs">
                      Carica Cornice da Immagine
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-[10px] flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    100 SC (1.00€)
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 leading-snug">
                  Carica una cornice grafica (PNG trasparente o SVG quadrata consigliata) che circonderà il tuo avatar in tutta l'app.
                </p>

                {/* Live Avatar Preview with Custom Frame Overlay */}
                <div className="flex items-center gap-4 p-3 rounded-xl bg-black/60 border border-zinc-800">
                  <div className="relative shrink-0 w-16 h-16 rounded-2xl bg-purple-950 flex items-center justify-center overflow-visible">
                    {/* Frame overlay */}
                    {framePreview ? (
                      <img
                        src={framePreview}
                        alt="Anteprima Cornice"
                        className="absolute -inset-2.5 w-[calc(100%+20px)] h-[calc(100%+20px)] max-w-none pointer-events-none z-10 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]"
                      />
                    ) : userProfile.activeFrame && (userProfile.activeFrame.startsWith("http") || userProfile.activeFrame.startsWith("/") || userProfile.activeFrame.startsWith("data:")) ? (
                      <img
                        src={userProfile.activeFrame}
                        alt="Cornice Attuale"
                        className="absolute -inset-2.5 w-[calc(100%+20px)] h-[calc(100%+20px)] max-w-none pointer-events-none z-10 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]"
                      />
                    ) : null}

                    {/* Avatar Image */}
                    <div className="w-full h-full rounded-2xl overflow-hidden border border-purple-500/30">
                      {userProfile.avatar ? (
                        <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-sm text-purple-300">
                          {userProfile.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-white block">
                      {framePreview ? "Anteprima Nuova Cornice" : "Cornice Attuale"}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      {framePreview ? "PNG trasparente pronto per l'applicazione" : "Seleziona un'immagine PNG trasparente"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => frameFileInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-purple-500/50 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-950/30 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-purple-400" />
                    <span>{selectedFrameFile ? "Scegli un'altra Cornice" : "Scegli File Immagine Cornice (PNG, SVG)"}</span>
                  </button>

                  {selectedFrameFile && (
                    <div className="space-y-2 pt-1 border-t border-zinc-800">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span className="truncate max-w-[200px]">{selectedFrameFile.name}</span>
                        <span className="text-amber-300 font-bold">Costo: 100 SC</span>
                      </div>

                      {!hasEnoughForFrame ? (
                        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-rose-300 font-bold text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Saldo SCoin insufficiente ({sCoinBalance}/100 SC)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowSCoinShop(true)}
                            className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-extrabold text-[11px] rounded-lg shadow cursor-pointer"
                          >
                            Ricarica 100 SCoin (1.00€)
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={handleConfirmFrameUpload}
                          className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>Conferma e Salva Cornice (100 SC = 1€)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Preset Frames List */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
                  Oppure Scegli una Cornice Preset
                </span>
                <div className="space-y-1.5">
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
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                            : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-700"
                        } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${frame.previewColor} border-2 ${frame.borderClass} ${frame.glowClass} flex items-center justify-center font-extrabold text-black text-xs shrink-0`}
                          >
                            ★
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs truncate">{frame.name}</span>
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
                            <span className="text-[10px] text-zinc-400 block truncate">
                              {frame.isTenure
                                ? isTenureUnlocked
                                  ? "Sbloccata da fedeltà"
                                  : `Anzianità ${frame.tenureMilestone}`
                                : frame.requiresPro
                                ? "Abbonamento Pro"
                                : "Disponibile per tutti"}
                            </span>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[11px] font-black shrink-0">
                            ✓
                          </span>
                        ) : isLocked ? (
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
              </div>
            </div>
          )}

          {/* TAB 3: AVATAR PHOTO (FREE) */}
          {activeTab === "avatar" && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <input
                type="file"
                ref={avatarFileInputRef}
                onChange={handleAvatarFileSelect}
                accept="image/*"
                className="hidden"
              />

              <div className="bg-[#121629] p-3.5 rounded-2xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-purple-400" />
                    Foto Avatar Operatore
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    Gratuito
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-purple-500/50 shrink-0 bg-purple-950">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Nuovo Avatar" className="w-full h-full object-cover" />
                    ) : userProfile.avatar ? (
                      <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-purple-300">
                        {userProfile.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-purple-500/50 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-950/30 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-purple-400" />
                      <span>{selectedAvatarFile ? "Cambia Foto Scelta" : "Scegli Nuova Foto"}</span>
                    </button>

                    {selectedAvatarFile && (
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={handleConfirmAvatarUpload}
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Salva Nuova Foto Avatar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SCoin Shop Modal Shortcut */}
      <SCoinShopModal
        isOpen={showSCoinShop}
        onClose={() => setShowSCoinShop(false)}
      />
    </>
  );
};
