import React, { useState, useRef } from "react";
import {
  X,
  Sparkles,
  Shield,
  Crown,
  UploadCloud,
  Loader2,
  Check,
  Palette,
  Image as ImageIcon,
  Coins,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { uploadMediaFile } from "@/services/storageService";
import { ClanData } from "@/data/mockData";
import { SCoinShopModal } from "@/components/shop/SCoinShopModal";

interface ClanCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clanData: ClanData;
  currentUser: any;
  onRefresh: () => Promise<void>;
  onOpenUpgrade: () => void;
}

const CUSTOM_UPLOAD_COST_SC = 100; // 100 SC Coin = 1€

const CLAN_PRESET_FRAMES = [
  { id: "frame-cyan", name: "Cyber Neon Ciano", color: "#06B6D4", tier: "pro" },
  { id: "frame-purple", name: "Amethyst Pulse", color: "#A855F7", tier: "pro" },
  { id: "frame-gold", name: "Royal Gold Imperiale", color: "#F59E0B", tier: "elite" },
  { id: "frame-emerald", name: "Spec-Ops Smeraldo", color: "#10B981", tier: "pro" },
  { id: "frame-crimson", name: "Mythic Dragon Flame", color: "#EF4444", tier: "elite" },
  { id: "frame-obsidian", name: "Obsidian Cosmic Overlord", color: "#8B5CF6", tier: "elite" },
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
  const { sCoinBalance, refreshUserData, isUniversalAdmin, openAuthModal } = useSquad();

  const [activeTab, setActiveTab] = useState<"banner" | "frame" | "logo">("banner");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [showSCoinShop, setShowSCoinShop] = useState(false);

  // Custom Banner states
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Custom Frame states
  const [selectedFrameFile, setSelectedFrameFile] = useState<File | null>(null);
  const [framePreview, setFramePreview] = useState<string | null>(null);

  // Logo file states
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const frameInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isProOrElite =
    clanData.tier === "pro" ||
    clanData.tier === "elite" ||
    clanData.subscriptionTier === "pro" ||
    clanData.subscriptionTier === "elite";

  const hasEnoughSC = isUniversalAdmin || sCoinBalance >= CUSTOM_UPLOAD_COST_SC;

  // Safe updater for clan fields in Supabase
  const updateClanBrandingSafely = async (fields: {
    bannerUrl?: string;
    frameUrl?: string;
    avatarUrl?: string;
  }) => {
    // Try RPC first
    try {
      const { error: rpcError } = await supabase.rpc("update_clan_branding", {
        p_clan_id: clanData.id,
        ...(fields.bannerUrl ? { p_clan_banner_url: fields.bannerUrl } : {}),
        ...(fields.frameUrl ? { p_clan_frame_url: fields.frameUrl } : {}),
        ...(fields.avatarUrl ? { p_avatar_url: fields.avatarUrl } : {}),
      });

      if (!rpcError) return;
    } catch {
      // Ignore RPC failure and proceed with direct update
    }

    // Direct table update fallback
    const directPayload: any = {};
    if (fields.bannerUrl) {
      directPayload.clan_banner_url = fields.bannerUrl;
      directPayload.banner_url = fields.bannerUrl;
    }
    if (fields.frameUrl) {
      directPayload.clan_frame_url = fields.frameUrl;
    }
    if (fields.avatarUrl) {
      directPayload.avatar_url = fields.avatarUrl;
    }

    const { error: tableError } = await supabase
      .from("clans")
      .update(directPayload)
      .eq("id", clanData.id);

    if (tableError) throw tableError;
  };

  // Helper for deducting 100 SCoin
  const deductUploadCost = async (description: string) => {
    if (isUniversalAdmin) return;

    const newBalance = Math.max(0, sCoinBalance - CUSTOM_UPLOAD_COST_SC);

    // Update user balance in profiles
    await supabase
      .from("profiles")
      .update({
        balance: newBalance,
        coins: newBalance,
        schoins: newBalance,
      })
      .eq("id", currentUser.id);

    // Record transaction
    await supabase.from("sc_transactions").insert({
      user_id: currentUser.id,
      amount: CUSTOM_UPLOAD_COST_SC,
      type: "shop_purchase",
      description: description,
    });
  };

  // Selection handlers
  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleFrameFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFrameFile(file);
    setFramePreview(URL.createObjectURL(file));
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  // Confirm Custom Banner Upload (Cost: 100 SC)
  const handleConfirmBannerUpload = async () => {
    if (!selectedBannerFile || !currentUser) {
      if (!currentUser) openAuthModal("signup");
      return;
    }

    if (!hasEnoughSC) {
      toast({
        title: "Saldo SCoin Insufficiente",
        description: `Servono ${CUSTOM_UPLOAD_COST_SC} SCoin (1€) per caricare il banner clan personalizzato.`,
        variant: "destructive",
      });
      setShowSCoinShop(true);
      return;
    }

    setIsUploading(true);
    setUploadProgress("Caricamento banner clan su storage protetto...");

    try {
      const { url: publicUrl } = await uploadMediaFile(
        selectedBannerFile,
        "clan-banner",
        currentUser.id,
        clanData.id
      );

      await updateClanBrandingSafely({ bannerUrl: publicUrl });
      await deductUploadCost(`Caricamento Banner Clan Personalizzato [${clanData.name}] (-100 SC / 1€)`);

      await onRefresh();
      await refreshUserData();

      setSelectedBannerFile(null);
      setBannerPreview(null);
      if (bannerInputRef.current) bannerInputRef.current.value = "";

      toast({
        title: "Banner Clan Aggiornato! 🎨",
        description: `Nuovo banner attivo sul profilo clan. ${isUniversalAdmin ? "(Admin Free)" : "-100 SCoin (1€) applicati."}`,
      });
    } catch (err: any) {
      console.error("[ClanCustomizer] Errore banner:", err);
      toast({
        title: "Errore caricamento banner",
        description: err.message || "Impossibile salvare il banner.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Confirm Custom Frame Upload (Cost: 100 SC)
  const handleConfirmFrameUpload = async () => {
    if (!selectedFrameFile || !currentUser) {
      if (!currentUser) openAuthModal("signup");
      return;
    }

    if (!hasEnoughSC) {
      toast({
        title: "Saldo SCoin Insufficiente",
        description: `Servono ${CUSTOM_UPLOAD_COST_SC} SCoin (1€) per caricare la cornice clan personalizzata.`,
        variant: "destructive",
      });
      setShowSCoinShop(true);
      return;
    }

    setIsUploading(true);
    setUploadProgress("Caricamento cornice clan su storage protetto...");

    try {
      const { url: publicUrl } = await uploadMediaFile(
        selectedFrameFile,
        "clan-frame",
        currentUser.id,
        clanData.id
      );

      await updateClanBrandingSafely({ frameUrl: publicUrl });
      await deductUploadCost(`Caricamento Cornice Clan Personalizzata [${clanData.name}] (-100 SC / 1€)`);

      await onRefresh();
      await refreshUserData();

      setSelectedFrameFile(null);
      setFramePreview(null);
      if (frameInputRef.current) frameInputRef.current.value = "";

      toast({
        title: "Cornice Clan Aggiornata! 🛡️",
        description: `Nuova cornice grafica attiva sullo stemma clan. ${isUniversalAdmin ? "(Admin Free)" : "-100 SCoin (1€) applicati."}`,
      });
    } catch (err: any) {
      console.error("[ClanCustomizer] Errore cornice:", err);
      toast({
        title: "Errore caricamento cornice",
        description: err.message || "Impossibile salvare la cornice.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Confirm Clan Logo Upload (Free management)
  const handleConfirmLogoUpload = async () => {
    if (!selectedLogoFile || !currentUser) return;

    setIsUploading(true);
    setUploadProgress("Caricamento stemma clan su storage...");

    try {
      const { url: publicUrl } = await uploadMediaFile(
        selectedLogoFile,
        "clan-logo",
        currentUser.id,
        clanData.id
      );

      await updateClanBrandingSafely({ avatarUrl: publicUrl });
      await onRefresh();

      setSelectedLogoFile(null);
      setLogoPreview(null);
      if (logoInputRef.current) logoInputRef.current.value = "";

      toast({
        title: "Stemma Clan Aggiornato! 🛡️",
        description: "Il nuovo logo è ora attivo sul profilo ufficiale del clan.",
      });
    } catch (err: any) {
      console.error("[ClanCustomizer] Errore logo:", err);
      toast({
        title: "Errore caricamento logo",
        description: err.message || "Impossibile salvare il file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Select Preset Banner
  const handleSelectPresetBanner = async (gradientString: string, name: string) => {
    try {
      await updateClanBrandingSafely({ bannerUrl: gradientString });
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

  // Select Preset Frame
  const handleSelectPresetFrame = async (colorHex: string, frameName: string) => {
    try {
      await updateClanBrandingSafely({ frameUrl: colorHex });
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
        <div className="w-full max-w-md bg-[#0e1224] border border-cyan-500/40 rounded-3xl p-5 shadow-2xl space-y-4 my-auto relative max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Personalizzazione Clan [{clanData.tag}]
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                    <Coins className="w-2.5 h-2.5 text-amber-400" />
                    Saldo: {sCoinBalance.toLocaleString()} SC
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSCoinShop(true)}
                    className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Ricarica SC</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Upgrade Banner for Base Clans */}
          {!isProOrElite && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-cyan-950/40 border border-amber-500/40 space-y-1.5 shrink-0">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Consiglio: Clan Pro ed Elite</span>
              </div>
              <p className="text-[10px] text-zinc-300 leading-snug">
                I clan PRO ed ELITE hanno accesso esclusivo a cornici mitiche e slot membri ampliati.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenUpgrade();
                }}
                className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 text-black font-extrabold text-[11px] rounded-xl shadow cursor-pointer"
              >
                Scopri Vantaggi Clan Pro
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900/80 rounded-2xl border border-zinc-800 shrink-0">
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
              onClick={() => setActiveTab("frame")}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "frame"
                  ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Cornice (100 SC)
            </button>
            <button
              onClick={() => setActiveTab("logo")}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "logo"
                  ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Stemma Logo
            </button>
          </div>

          {/* Progress */}
          {uploadProgress && (
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-center space-y-1 shrink-0">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin mx-auto" />
              <span className="text-xs font-bold text-white block">{uploadProgress}</span>
            </div>
          )}

          {/* TAB 1: CLAN BANNER (100 SC) */}
          {activeTab === "banner" && (
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              <input
                type="file"
                ref={bannerInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleBannerFileSelect}
              />

              {/* Upload Box */}
              <div className="p-3.5 rounded-2xl bg-[#14182e] border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    Carica Banner Clan da File
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-[10px] flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    100 SC (1.00€)
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 leading-snug">
                  Carica una copertina personalizzata ad alta definizione (JPG, PNG, WebP) per la pagina ufficiale del tuo clan.
                </p>

                {/* Live Banner Preview */}
                <div className="w-full h-24 rounded-xl overflow-hidden border border-zinc-700 bg-black/60 relative">
                  {bannerPreview ? (
                    <img
                      src={bannerPreview}
                      alt="Anteprima Banner Clan"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : clanData.clanBannerUrl && (clanData.clanBannerUrl.startsWith("http") || clanData.clanBannerUrl.startsWith("/") || clanData.clanBannerUrl.startsWith("data:")) ? (
                    <img
                      src={clanData.clanBannerUrl}
                      alt="Banner Clan Attuale"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-r ${clanData.clanBannerUrl || "from-cyan-950 via-indigo-950 to-purple-950"}`} />
                  )}

                  <span className="absolute bottom-1 right-1.5 text-[9px] bg-black/80 px-2 py-0.5 rounded-md text-zinc-200 border border-white/10 font-bold">
                    {bannerPreview ? "Anteprima Nuovo Banner" : "Banner Clan Attuale"}
                  </span>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-cyan-400" />
                    <span>{selectedBannerFile ? "Cambia File Immagine" : "Scegli File Banner"}</span>
                  </button>

                  {selectedBannerFile && (
                    <div className="space-y-2 pt-1 border-t border-zinc-800">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span className="truncate max-w-[200px]">{selectedBannerFile.name}</span>
                        <span className="text-amber-300 font-bold">Costo: 100 SC</span>
                      </div>

                      {!hasEnoughSC ? (
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
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          <span>Conferma e Salva Banner Clan (100 SC = 1€)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Preset Banners */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-zinc-300 block">
                  Oppure Scegli un Banner Preset:
                </span>
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
            </div>
          )}

          {/* TAB 2: CLAN FRAME (100 SC) */}
          {activeTab === "frame" && (
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              <input
                type="file"
                ref={frameInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFrameFileSelect}
              />

              {/* Custom Frame Box */}
              <div className="p-3.5 rounded-2xl bg-[#14182e] border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Carica Cornice Stemma da File
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-[10px] flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    100 SC (1.00€)
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 leading-snug">
                  Carica una cornice personalizzata (PNG trasparente o SVG consigliata) per circondare lo stemma ufficiale del clan.
                </p>

                {/* Live Emblem Preview with Frame Overlay */}
                <div className="flex items-center gap-4 p-3 rounded-xl bg-black/60 border border-zinc-800">
                  <div className="relative shrink-0 w-16 h-16 rounded-2xl bg-zinc-950 flex items-center justify-center overflow-visible">
                    {/* Frame Overlay */}
                    {framePreview ? (
                      <img
                        src={framePreview}
                        alt="Nuova Cornice Clan"
                        className="absolute -inset-2.5 w-[calc(100%+20px)] h-[calc(100%+20px)] max-w-none pointer-events-none z-10 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.7)]"
                      />
                    ) : clanData.clanFrameUrl && (clanData.clanFrameUrl.startsWith("http") || clanData.clanFrameUrl.startsWith("/") || clanData.clanFrameUrl.startsWith("data:")) ? (
                      <img
                        src={clanData.clanFrameUrl}
                        alt="Cornice Clan Attuale"
                        className="absolute -inset-2.5 w-[calc(100%+20px)] h-[calc(100%+20px)] max-w-none pointer-events-none z-10 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.7)]"
                      />
                    ) : clanData.clanFrameUrl && clanData.clanFrameUrl.startsWith("#") ? (
                      <div
                        className="absolute -inset-1.5 rounded-2xl pointer-events-none z-10 border-2"
                        style={{
                          borderColor: clanData.clanFrameUrl,
                          boxShadow: `0 0 10px ${clanData.clanFrameUrl}90`,
                        }}
                      />
                    ) : null}

                    {/* Emblem Image */}
                    <div className="w-full h-full rounded-2xl overflow-hidden border border-purple-500/30 flex items-center justify-center bg-zinc-900">
                      {clanData.avatarUrl ? (
                        <img src={clanData.avatarUrl} alt="Logo Clan" className="w-full h-full object-cover" />
                      ) : (
                        <Shield className="w-7 h-7 text-cyan-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-white block">
                      {framePreview ? "Anteprima Nuova Cornice" : "Cornice Attuale Clan"}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      {framePreview ? "PNG trasparente pronto per il salvataggio" : "Carica file PNG o SVG trasparente"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => frameInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-cyan-400" />
                    <span>{selectedFrameFile ? "Cambia File Cornice" : "Scegli File Cornice (PNG, SVG)"}</span>
                  </button>

                  {selectedFrameFile && (
                    <div className="space-y-2 pt-1 border-t border-zinc-800">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span className="truncate max-w-[200px]">{selectedFrameFile.name}</span>
                        <span className="text-amber-300 font-bold">Costo: 100 SC</span>
                      </div>

                      {!hasEnoughSC ? (
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
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          <span>Conferma e Salva Cornice Clan (100 SC = 1€)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Preset Frames Selection */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-zinc-300 block">
                  Oppure Scegli una Cornice Colore Preset:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {CLAN_PRESET_FRAMES.map((f) => {
                    const isSelected = clanData.clanFrameUrl === f.color;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleSelectPresetFrame(f.color, f.name)}
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
          )}

          {/* TAB 3: CLAN LOGO (FREE MANAGEMENT) */}
          {activeTab === "logo" && (
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              <input
                type="file"
                ref={logoInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleLogoFileSelect}
              />

              <div className="p-3.5 rounded-2xl bg-[#14182e] border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Stemma Ufficiale del Clan
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    Incluso nel Clan
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-900 border border-purple-500/30 flex items-center justify-center shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Nuovo Logo" className="w-full h-full object-cover" />
                    ) : clanData.avatarUrl ? (
                      <img src={clanData.avatarUrl} alt="Logo Clan" className="w-full h-full object-cover" />
                    ) : (
                      <Shield className="w-8 h-8 text-cyan-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-cyan-400" />
                      <span>{selectedLogoFile ? "Cambia Immagine Stemma" : "Scegli File Stemma"}</span>
                    </button>

                    {selectedLogoFile && (
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={handleConfirmLogoUpload}
                        className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Salva Nuovo Stemma Ufficiale</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Close */}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
          >
            Chiudi
          </button>
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
