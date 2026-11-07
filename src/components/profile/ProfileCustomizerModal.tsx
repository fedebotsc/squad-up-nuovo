import React, { useState } from "react";
import {
  X,
  Sparkles,
  Check,
  Palette,
  Image as ImageIcon,
  Crown,
  Shield,
  Loader2,
  Lock,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface ProfileCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BANNER_PRESETS = [
  {
    id: "banner-cyber",
    name: "Cyber Grid",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
    costSC: 0,
    isFree: true,
  },
  {
    id: "banner-neon",
    name: "Neon Tokyo",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
    costSC: 50,
    isFree: false,
  },
  {
    id: "banner-warzone",
    name: "Tactical Recon",
    url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
    costSC: 50,
    isFree: false,
  },
  {
    id: "banner-gold",
    name: "Golden Legend",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    costSC: 50,
    isFree: false,
  },
  {
    id: "banner-nebula",
    name: "Deep Void",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80",
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
  const { userProfile, sCoinBalance, refreshUserData, currentUser } = useSquad();
  const [activeTab, setActiveTab] = useState<"banners" | "frames" | "themes">("banners");
  const [selectedBanner, setSelectedBanner] = useState<string>(
    userProfile.bannerUrl || BANNER_PRESETS[0].url
  );
  const [selectedFrame, setSelectedFrame] = useState<string>(
    userProfile.avatarFrame || "base"
  );
  const [selectedTheme, setSelectedTheme] = useState<"gold" | "neon">(
    userProfile.proTheme || "gold"
  );
  const [customBannerUrl, setCustomBannerUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const isPro = userProfile.subscriptionTier === "pro";
  const unlockedBanners = userProfile.unlockedBanners || [];

  const handleApplyBanner = async (preset: typeof BANNER_PRESETS[0]) => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const isAlreadyUnlocked =
        preset.isFree || unlockedBanners.includes(preset.id) || isPro;

      if (!isAlreadyUnlocked) {
        if (sCoinBalance < preset.costSC) {
          toast({
            title: "Saldo SCoin insufficiente",
            description: `Servono ${preset.costSC} SCoin per sbloccare questo banner (hai ${sCoinBalance} SCoin).`,
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }

        // Try RPC buy_profile_banner
        const { error: rpcErr } = await supabase.rpc("buy_profile_banner", {
          p_banner_id: preset.id,
          p_banner_url: preset.url,
          p_pay_with_coins: true,
        });

        if (rpcErr) {
          // Fallback direct update
          await supabase
            .from("profiles")
            .update({
              banner_url: preset.url,
              unlocked_banners: [...unlockedBanners, preset.id],
              coins: Math.max(0, sCoinBalance - preset.costSC),
              balance: Math.max(0, sCoinBalance - preset.costSC),
            })
            .eq("id", currentUser.id);
        }
      } else {
        // Equip banner
        await supabase
          .from("profiles")
          .update({ banner_url: preset.url })
          .eq("id", currentUser.id);
      }

      setSelectedBanner(preset.url);
      await refreshUserData();
      toast({
        title: "Banner equipaggiato!",
        description: `Il banner "${preset.name}" è ora attivo sul tuo profilo.`,
      });
    } catch (err: any) {
      console.error("[Customizer] Errore salvataggio banner:", err);
      toast({
        title: "Errore salvataggio",
        description: err.message || "Impossibile aggiornare il banner.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyCustomUrl = async () => {
    if (!customBannerUrl.trim() || !currentUser) return;
    setIsSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ banner_url: customBannerUrl.trim() })
        .eq("id", currentUser.id);
      setSelectedBanner(customBannerUrl.trim());
      await refreshUserData();
      toast({
        title: "Banner personalizzato applicato",
        description: "Il nuovo URL del banner è stato salvato.",
      });
      setCustomBannerUrl("");
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyFrame = async (frameId: string) => {
    if (!currentUser) return;
    const target = AVATAR_FRAMES.find((f) => f.id === frameId);
    if (target?.requiresPro && !isPro) {
      toast({
        title: "Vantaggio Esclusivo Pro 👑",
        description: "La cornice Golden Champion richiede un abbonamento Player Pro attivo.",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Store in profiles (bio or custom columns)
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
        description: `Stile ${target?.name} equipaggiato con successo.`,
      });
    } catch (err: any) {
      toast({
        title: "Errore cornice",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyTheme = async (theme: "gold" | "neon") => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ pro_theme: theme })
        .eq("id", currentUser.id);
      setSelectedTheme(theme);
      await refreshUserData();
      toast({
        title: "Tema Pro Aggiornato",
        description: `Tema ${theme === "gold" ? "Oro Tattico" : "Neon Cyber"} attivato.`,
      });
    } catch (err: any) {
      toast({ title: "Errore tema", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0f1322] border border-purple-500/40 p-5 shadow-[0_0_35px_rgba(139,92,246,0.3)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-purple-900/50 text-purple-300 border border-purple-500/30">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Personalizza Profilo</h3>
              <p className="text-[10px] text-zinc-400">Banner, cornici avatar ed estetica</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="my-3 rounded-2xl overflow-hidden border border-purple-500/30 relative h-28 bg-zinc-950">
          <img
            src={selectedBanner}
            alt="Banner preview"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-2.5">
            <div
              className={`w-12 h-12 rounded-xl overflow-hidden bg-purple-950 border-2 ${
                AVATAR_FRAMES.find((f) => f.id === selectedFrame)?.borderClass || "border-purple-500"
              } ${
                AVATAR_FRAMES.find((f) => f.id === selectedFrame)?.glowClass || ""
              }`}
            >
              {userProfile.avatar ? (
                <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white">
                  {userProfile.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-white">{userProfile.name}</span>
                {isPro && (
                  <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    PRO
                  </span>
                )}
              </div>
              <span className="text-[10px] text-zinc-400 block">{userProfile.tag}</span>
            </div>
          </div>
        </div>

        {/* Subtabs */}
        <div className="grid grid-cols-3 p-1 bg-[#14182a] rounded-xl border border-zinc-800 mb-3">
          <button
            onClick={() => setActiveTab("banners")}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "banners"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Banner
          </button>
          <button
            onClick={() => setActiveTab("frames")}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "frames"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Cornici
          </button>
          <button
            onClick={() => setActiveTab("themes")}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "themes"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Temi Pro
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {activeTab === "banners" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5">
                {BANNER_PRESETS.map((preset) => {
                  const isCurrent = selectedBanner === preset.url;
                  const isUnlocked =
                    preset.isFree || unlockedBanners.includes(preset.id) || isPro;

                  return (
                    <div
                      key={preset.id}
                      className={`relative rounded-xl overflow-hidden border p-2 flex items-center justify-between gap-3 transition-all ${
                        isCurrent
                          ? "border-cyan-400 bg-cyan-950/30"
                          : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-16 h-10 rounded-lg object-cover border border-zinc-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{preset.name}</h4>
                          <span className="text-[10px] text-zinc-400 block">
                            {preset.isFree
                              ? "Gratuito"
                              : isPro
                              ? "Incluso con Pro"
                              : `${preset.costSC} SCoin`}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleApplyBanner(preset)}
                        disabled={isSaving}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-emerald-600 text-white"
                            : isUnlocked
                            ? "bg-purple-600 hover:bg-purple-500 text-white"
                            : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {isCurrent ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3" /> Attivo
                          </span>
                        ) : isUnlocked ? (
                          "Equipaggia"
                        ) : (
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Sblocca
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Custom Banner URL */}
              <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-300">
                  Oppure inserisci URL immagine personalizzato:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={customBannerUrl}
                    onChange={(e) => setCustomBannerUrl(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                  <button
                    onClick={handleApplyCustomUrl}
                    disabled={!customBannerUrl.trim() || isSaving}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 text-white text-xs font-bold rounded-xl disabled:opacity-40"
                  >
                    Applica
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "frames" && (
            <div className="space-y-2.5">
              {AVATAR_FRAMES.map((frame) => {
                const isCurrent = selectedFrame === frame.id;
                const locked = frame.requiresPro && !isPro;

                return (
                  <div
                    key={frame.id}
                    onClick={() => !locked && handleApplyFrame(frame.id)}
                    className={`rounded-xl border p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isCurrent
                        ? "border-cyan-400 bg-cyan-950/30"
                        : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-700"
                    } ${locked ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl border-2 ${frame.borderClass} ${frame.glowClass} bg-gradient-to-br ${frame.previewColor} flex items-center justify-center text-black font-extrabold text-[10px]`}
                      >
                        {frame.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white">{frame.name}</h4>
                          {frame.requiresPro && (
                            <span className="text-[9px] font-extrabold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              PRO
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          {frame.requiresPro ? "Richiede Player Pro" : "Disponibile per tutti"}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isCurrent ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : locked ? (
                        <div className="p-1 rounded-lg text-amber-400 bg-amber-500/10 border border-amber-500/30">
                          <Crown className="w-4 h-4" />
                        </div>
                      ) : (
                        <span className="text-xs text-purple-400 font-bold hover:underline">
                          Scegli
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "themes" && (
            <div className="space-y-3">
              <div
                onClick={() => handleApplyTheme("gold")}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  selectedTheme === "gold"
                    ? "border-amber-400 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    : "border-zinc-800 bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400" />
                    Tema Gold Champion
                  </span>
                  {selectedTheme === "gold" && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Accenti dorati, badge imperiale e riflessi caldi sul profilo e sulle card dei tornei.
                </p>
              </div>

              <div
                onClick={() => handleApplyTheme("neon")}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  selectedTheme === "neon"
                    ? "border-cyan-400 bg-cyan-950/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                    : "border-zinc-800 bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Tema Cyber Neon
                  </span>
                  {selectedTheme === "neon" && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Accenti ciano luminescenti, glow futuristico e badge sintetico cyberpunk.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
