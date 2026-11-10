import React, { useEffect, useState } from "react";
import { Story } from "@/data/mockData";
import { X, Heart, Send, CheckCircle2, Flame, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useSquad } from "@/context/SquadContext";

interface StoryViewerModalProps {
  story: Story | null;
  onClose: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({ story, onClose }) => {
  const { currentUser, isUniversalAdmin, deleteStory } = useSquad();
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = Boolean(
    story && currentUser && (story.userId === currentUser.id || isUniversalAdmin)
  );

  useEffect(() => {
    if (!story || showDeleteConfirm) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onClose();
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [story, onClose, showDeleteConfirm]);

  if (!story) return null;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    toast({
      title: "Risposta inviata!",
      description: `Messaggio diretto inviato a ${story.username}.`,
    });
    setReplyText("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2">
      <div className="relative w-full max-w-sm h-[85vh] max-h-[700px] bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-purple-900/50">
        {/* Progress bar */}
        <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
          <div className="h-1 bg-white/20 rounded-full flex-1 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Story Header */}
        <div className="absolute top-6 left-3 right-3 z-20 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            {story.avatar ? (
              <img
                src={story.avatar}
                alt={story.username}
                className="w-9 h-9 rounded-full border-2 border-purple-500 object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-purple-950 border-2 border-purple-500 flex items-center justify-center font-bold text-xs text-purple-300">
                {story.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white drop-shadow truncate max-w-[140px]">
                  {story.username}
                </span>
                {story.verified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-300 drop-shadow">
                <span>{story.game}</span>
                <span>•</span>
                <span>{story.hoursLeft}h rimanenti</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                title="Elimina Storia"
                className="w-8 h-8 rounded-full bg-rose-500/30 hover:bg-rose-500 text-rose-200 hover:text-white flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/50 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-sm cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Story Image / Background */}
        <div className="flex-1 relative bg-zinc-950 flex flex-col justify-center overflow-hidden">
          {story.preview ? (
            <>
              <img
                src={story.preview}
                alt="Story visual"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

              {/* Caption Overlay for Mixed Story (Photo + Text) */}
              {story.text && (
                <div className="absolute bottom-16 left-3 right-3 z-10 p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 shadow-xl animate-fade-in">
                  <p className="text-xs font-semibold text-white leading-relaxed break-words whitespace-pre-wrap">
                    {story.text}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Solo Testo Story */
            <div
              className={`w-full h-full flex flex-col justify-center items-center px-6 py-12 relative bg-gradient-to-b ${
                story.bgGradient || "from-purple-900 via-indigo-950 to-zinc-950"
              }`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0%,transparent_70%)] pointer-events-none" />
              
              <div className="relative z-10 text-center max-w-xs space-y-4">
                <span className="text-3xl text-cyan-400 opacity-60 font-serif leading-none block">“</span>
                <p className="text-base sm:text-lg font-black text-white leading-relaxed tracking-wide break-words drop-shadow-md">
                  {story.text || "Storia 24h"}
                </p>
                <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-purple-300 font-semibold">
                  <Flame className="w-3.5 h-3.5 text-cyan-400" />
                  <span>@{story.username}</span>
                </div>
              </div>
            </div>
          )}

          {!story.text && story.preview && (
            <div className="absolute bottom-16 left-4 right-4 z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs backdrop-blur-sm">
                <Flame className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Storia Esport 24h</span>
              </div>
            </div>
          )}
        </div>

        {/* Reply & Reaction Footer */}
        <div className="p-3 bg-zinc-950/90 border-t border-zinc-800/80 flex items-center gap-2">
          <form onSubmit={handleSendReply} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              placeholder={`Rispondi a ${story.username}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 bg-zinc-900 text-zinc-200 text-xs rounded-full px-3.5 py-2 border border-zinc-700/60 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="p-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`p-2 rounded-full border transition-all ${
              isLiked
                ? "bg-rose-500/20 border-rose-500 text-rose-400 scale-110"
                : "bg-zinc-900 border-zinc-700 text-zinc-300"
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-400" : ""}`} />
          </button>
        </div>

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#121628] border border-rose-500/50 rounded-2xl p-5 max-w-xs w-full text-center space-y-3 shadow-2xl">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Eliminare questa storia?</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Verrà rimossa definitivamente dal database di SquadUP.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="py-2 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      await deleteStory(story.id);
                      onClose();
                    } catch (e) {
                      // handled in context
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Elimina</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
