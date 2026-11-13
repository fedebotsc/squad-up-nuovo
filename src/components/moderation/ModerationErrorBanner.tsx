import React from "react";
import { ShieldAlert, AlertTriangle, X, CheckCircle2, Bot } from "lucide-react";

interface ModerationErrorBannerProps {
  reason: string;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export const ModerationErrorBanner: React.FC<ModerationErrorBannerProps> = ({
  reason,
  onDismiss,
  className = "",
  compact = false,
}) => {
  if (!reason) return null;

  if (compact) {
    return (
      <div
        className={`p-2.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs shadow-lg animate-fade-in flex items-start justify-between gap-2 ${className}`}
      >
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-red-300 block text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Bot className="w-3 h-3 text-cyan-400" />
              Bloccato da Gemini 2.5 Flash
            </span>
            <p className="text-red-200/90 text-xs leading-snug">{reason}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-red-400 hover:text-white hover:bg-red-900/60 transition-colors"
            title="Chiudi avviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-red-950/90 via-[#1c0c16]/95 to-zinc-950/95 border-2 border-red-500/60 p-4 shadow-[0_0_25px_rgba(239,68,68,0.25)] text-zinc-100 animate-fade-in relative overflow-hidden ${className}`}
    >
      {/* Background glow accent */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-3">
        {/* Header with tags */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white tracking-wide uppercase">
                  Contenuto Bloccato dalla Moderazione IA
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Bot className="w-3 h-3 text-cyan-400" />
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-[11px] text-red-300/80">
                La pubblicazione su Supabase è stata impedita per violazione delle linee guida.
              </p>
            </div>
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1.5 rounded-xl bg-red-900/30 hover:bg-red-900/60 text-red-300 hover:text-white transition-all cursor-pointer border border-red-800/40"
              title="Chiudi avviso"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Detailed AI Reason Box */}
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-100 leading-relaxed font-medium">
          <span className="font-bold text-red-300 mr-1.5">Motivo del blocco:</span>
          {reason}
        </div>

        {/* CoD Community Rules Reminder */}
        <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-[11px] space-y-1.5 text-zinc-300">
          <div className="flex items-center gap-1.5 font-bold text-zinc-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Regolamento di Moderazione SquadUp:</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] pl-1">
            <li className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>Solo Call of Duty & Gaming competitivo</span>
            </li>
            <li className="flex items-center gap-1.5 text-red-400">
              <X className="w-3 h-3 shrink-0" />
              <span>No contenuti NSFW o pornografici</span>
            </li>
            <li className="flex items-center gap-1.5 text-red-400">
              <X className="w-3 h-3 shrink-0" />
              <span>No insulti, razzismo o odio</span>
            </li>
            <li className="flex items-center gap-1.5 text-red-400">
              <X className="w-3 h-3 shrink-0" />
              <span>No spam o argomenti off-topic</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
