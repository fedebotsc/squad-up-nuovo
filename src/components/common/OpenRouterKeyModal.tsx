import React, { useState, useEffect } from "react";
import {
  Key,
  ShieldCheck,
  ExternalLink,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  X,
} from "lucide-react";
import { getOpenRouterApiKey, setOpenRouterApiKey } from "@/services/openRouterService";
import { toast } from "@/components/ui/use-toast";

interface OpenRouterKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const OpenRouterKeyModal: React.FC<OpenRouterKeyModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getOpenRouterApiKey());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast({
        title: "Chiave vuota",
        description: "Inserisci una chiave valida OpenRouter.",
        variant: "destructive",
      });
      return;
    }

    setOpenRouterApiKey(apiKey.trim());
    toast({
      title: "Chiave OpenRouter salvata! ⚡",
      description: "Ora puoi generare tornei con l'IA e analizzare gli screenshot dei match con Gemini Flash.",
    });
    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121628] border border-purple-500/40 rounded-2xl p-6 max-w-md w-full shadow-[0_0_30px_rgba(139,92,246,0.3)] space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Configura OpenRouter IA
              </h3>
              <p className="text-xs text-zinc-400">
                Alimenta la generazione tornei e l'OCR di match
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl p-3 text-xs text-zinc-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-purple-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Supporto multimodale Gemini Flash</span>
          </div>
          <p className="leading-relaxed text-[11px] text-zinc-300">
            Utilizziamo l'endpoint OpenRouter con i modelli veloci multimodali di Gemini Flash per analizzare tabelloni, calcolare i punteggi ed elaborare tornei completi.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Chiave API OpenRouter (sk-or-v1-...)</span>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Ottieni chiave</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-xxxxxxxxxxxxxxxx"
                className="w-full pl-9 pr-10 py-2.5 bg-zinc-900/90 border border-purple-900/50 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
              <Key className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              La chiave viene salvata localmente nel tuo browser in modo sicuro.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-300 font-semibold transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs text-white font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Salva Chiave</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
