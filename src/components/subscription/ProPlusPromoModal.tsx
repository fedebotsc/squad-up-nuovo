import React from "react";
import { X, Crown, Sparkles, Check, ArrowRight, Shield, Award, Flame } from "lucide-react";
import { useSquad } from "@/context/SquadContext";

interface ProPlusPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSubscriptionModal?: () => void;
  title?: string;
  description?: string;
}

export const ProPlusPromoModal: React.FC<ProPlusPromoModalProps> = ({
  isOpen,
  onClose,
  onOpenSubscriptionModal,
  title = "Sblocca le Votazioni con Player Pro Plus",
  description = "La possibilità di votare e assegnare badge ai giocatori e ai clan è un privilegio esclusivo riservato ai membri Player Pro Plus.",
}) => {
  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    onClose();
    if (onOpenSubscriptionModal) {
      onOpenSubscriptionModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0f1322] border-2 border-amber-500/60 p-5 shadow-[0_0_40px_rgba(245,158,11,0.3)] overflow-hidden flex flex-col text-center">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-r from-amber-500/40 via-yellow-500/30 to-purple-600/40 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900/80 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Crown Icon */}
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)]">
          <Crown className="w-7 h-7 text-amber-400 animate-pulse" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-[10px] font-black text-amber-300 uppercase tracking-wider mx-auto mb-2">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Funzionalità Esclusiva
        </div>

        <h3 className="text-base font-black text-white mb-1.5 leading-snug">
          {title}
        </h3>

        <p className="text-xs text-zinc-300 mb-4 px-1 leading-relaxed">
          {description}
        </p>

        {/* Feature List Preview */}
        <div className="rounded-2xl bg-zinc-950/70 border border-amber-500/30 p-3 mb-4 text-left space-y-2">
          <div className="flex items-start gap-2">
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <span className="text-xs text-zinc-200">
              <strong className="text-amber-300">Boost Post &quot;Per te&quot;:</strong> I tuoi contenuti ottengono priorità e compaiono per primi nel feed di tutta la community
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span className="text-xs text-zinc-200">
              <strong className="text-amber-300">Accesso Esclusivo Voti &amp; Badge:</strong> Assegna badge di reputazione su profili giocatori e clan
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span className="text-xs text-zinc-200">
              <strong className="text-white">Badge Verificato PRO:</strong> Icona dorata accanto al tuo nome
            </span>
          </div>
        </div>

        {/* Call to action button */}
        <button
          onClick={handleUpgradeClick}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all cursor-pointer transform hover:scale-[1.02]"
        >
          <Crown className="w-4 h-4 text-black" />
          <span>Passa a Player Pro Plus</span>
          <ArrowRight className="w-4 h-4 ml-0.5" />
        </button>

        <button
          onClick={onClose}
          className="mt-2 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Forse più tardi
        </button>
      </div>
    </div>
  );
};
