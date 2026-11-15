import React, { useState, useRef } from "react";
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Type,
  Layers,
  Upload,
  Check,
  Loader2,
  Flame,
  Camera,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { toast } from "@/components/ui/use-toast";
import { ModerationErrorBanner } from "@/components/moderation/ModerationErrorBanner";

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type StoryMode = "mixed" | "text" | "photo";

const BACKGROUND_GRADIENTS = [
  { id: "purple", label: "Nebula", class: "from-purple-900 via-indigo-950 to-[#0a0d1a]" },
  { id: "cyan", label: "Cyber Neon", class: "from-cyan-900 via-blue-950 to-[#060a16]" },
  { id: "crimson", label: "Crimson Flame", class: "from-red-900 via-rose-950 to-[#120508]" },
  { id: "gold", label: "Golden Glory", class: "from-amber-800 via-yellow-950 to-[#140f04]" },
  { id: "emerald", label: "Warzone Green", class: "from-emerald-900 via-teal-950 to-[#03120c]" },
];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ isOpen, onClose }) => {
  const { createStory, userProfile } = useSquad();
  const [mode, setMode] = useState<StoryMode>("mixed");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedGradient, setSelectedGradient] = useState(BACKGROUND_GRADIENTS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleResetFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "text") {
      if (!textContent.trim()) {
        toast({
          title: "Testo mancante",
          description: "Scrivi un testo per la tua storia.",
          variant: "destructive",
        });
        return;
      }
    } else if (mode === "photo") {
      if (!selectedFile) {
        toast({
          title: "Foto mancante",
          description: "Seleziona una foto dal tuo dispositivo.",
          variant: "destructive",
        });
        return;
      }
    } else if (mode === "mixed") {
      if (!selectedFile) {
        toast({
          title: "Foto mancante",
          description: "Carica una foto per accompagnarla al tuo testo.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    setModerationError(null);
    try {
      const res = await createStory({
        file: selectedFile || undefined,
        text: mode === "photo" ? "" : textContent.trim(),
        bgGradient: mode === "text" ? selectedGradient.class : undefined,
      });

      if (res.success) {
        handleResetFile();
        setTextContent("");
        setModerationError(null);
        onClose();
      } else if (res.reason) {
        setModerationError(res.reason);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0f1324] border border-purple-900/50 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92dvh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-purple-900/30 flex items-center justify-between bg-[#12162a]/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Flame className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Crea Storia 24h</h3>
              <p className="text-[10px] text-zinc-400">Condividi con l'intera community</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Story Type Selector Tabs */}
        <div className="p-3 bg-zinc-950/60 border-b border-zinc-800/80 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setMode("mixed")}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "mixed"
                ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Foto + Testo</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("text")}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "text"
                ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Solo Testo</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("photo")}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "photo"
                ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Solo Foto</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Banner Errore Moderazione IA Gemini */}
          {moderationError && (
            <ModerationErrorBanner
              reason={moderationError}
              onDismiss={() => setModerationError(null)}
            />
          )}

          {/* File Picker input hidden */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* PREVIEW CONTAINER */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Anteprima Storia
            </span>

            <div className="relative w-full aspect-[9/12] max-h-[290px] rounded-2xl overflow-hidden border border-purple-900/40 shadow-inner flex flex-col justify-between p-3.5">
              {/* Background Render */}
              {mode === "text" ? (
                <div
                  className={`absolute inset-0 bg-gradient-to-b ${selectedGradient.class}`}
                />
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Anteprima"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[#14182c] flex flex-col items-center justify-center gap-2 text-zinc-500">
                  <ImageIcon className="w-10 h-10 opacity-40 text-purple-400" />
                  <span className="text-xs">Nessuna immagine selezionata</span>
                </div>
              )}

              {/* Shading Overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

              {/* Top Bar Preview */}
              <div className="relative z-10 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-950 border border-purple-400 overflow-hidden shrink-0">
                  {userProfile.avatar ? (
                    <img
                      src={userProfile.avatar}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-purple-300">
                      {userProfile.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate drop-shadow">
                    {userProfile.name}
                  </span>
                  <span className="text-[9px] text-zinc-300 drop-shadow">24h rimanenti</span>
                </div>
              </div>

              {/* Center Content for Solo Testo */}
              {mode === "text" && (
                <div className="relative z-10 my-auto text-center px-4 py-2">
                  <p className="text-sm font-extrabold text-white leading-relaxed break-words whitespace-pre-wrap drop-shadow-md">
                    {textContent.trim() || "Scrivi qui il messaggio per la tua storia..."}
                  </p>
                </div>
              )}

              {/* Bottom Caption Overlay for Mixed */}
              {mode === "mixed" && textContent.trim() && (
                <div className="relative z-10 p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 mt-auto">
                  <p className="text-xs font-medium text-white break-words line-clamp-3">
                    {textContent}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* INPUT CONTROLS BASED ON MODE */}

          {/* 1. Photo Controls (Solo Foto & Mixed) */}
          {(mode === "photo" || mode === "mixed") && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 block">Foto o Screenshot</label>
              {!selectedFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-purple-600/40 hover:border-purple-500 bg-purple-950/20 hover:bg-purple-950/40 text-purple-300 text-xs font-semibold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group"
                >
                  <Upload className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span>Seleziona una foto dal tuo dispositivo</span>
                  <span className="text-[10px] text-zinc-400 font-normal">
                    PNG, JPG, WEBP (Max 15MB)
                  </span>
                </button>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-purple-900/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={previewUrl || ""}
                      alt="Thumbnail"
                      className="w-10 h-10 rounded-lg object-cover border border-purple-500/50"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">
                        {selectedFile.name}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      Cambia
                    </button>
                    <button
                      type="button"
                      onClick={handleResetFile}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Text Controls (Solo Testo & Mixed) */}
          {(mode === "text" || mode === "mixed") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">
                  {mode === "text" ? "Testo della storia" : "Descrizione / Didascalia foto"}
                </label>
                <span className="text-[10px] text-zinc-500">{textContent.length}/280</span>
              </div>
              <textarea
                rows={mode === "text" ? 3 : 2}
                maxLength={280}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={
                  mode === "text"
                    ? "Scrivi qualcosa per i tuoi compagni o la community..."
                    : "Aggiungi una didascalia descrittiva alla foto..."
                }
                className="w-full bg-zinc-900/90 text-zinc-200 text-xs rounded-xl p-3 border border-purple-900/40 focus:outline-none focus:border-cyan-400 resize-none transition-colors"
              />
            </div>
          )}

          {/* 3. Gradient picker for Solo Testo */}
          {mode === "text" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 block">Sfondo Colorato</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {BACKGROUND_GRADIENTS.map((grad) => (
                  <button
                    key={grad.id}
                    type="button"
                    onClick={() => setSelectedGradient(grad)}
                    className={`h-8 px-3 rounded-xl text-[10px] font-bold bg-gradient-to-r ${
                      grad.class
                    } border transition-transform shrink-0 flex items-center gap-1 ${
                      selectedGradient.id === grad.id
                        ? "border-cyan-400 scale-105 shadow-[0_0_10px_rgba(6,182,212,0.4)] text-white"
                        : "border-white/20 text-zinc-300 opacity-75 hover:opacity-100"
                    }`}
                  >
                    {selectedGradient.id === grad.id && <Check className="w-3 h-3 text-cyan-400" />}
                    <span>{grad.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Pubblicazione in corso...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-cyan-300" />
                  <span>
                    {mode === "text"
                      ? "Pubblica Storia di Testo"
                      : mode === "photo"
                      ? "Pubblica Foto Storia"
                      : "Pubblica Foto con Descrizione"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
