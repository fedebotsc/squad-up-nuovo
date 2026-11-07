import React, { useEffect, useState } from "react";
import { Story } from "@/data/mockData";
import { X, Heart, Send, CheckCircle2, Flame } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface StoryViewerModalProps {
  story: Story | null;
  onClose: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({ story, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (!story) return;
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
  }, [story, onClose]);

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
            <img
              src={story.avatar}
              alt={story.username}
              className="w-9 h-9 rounded-full border-2 border-purple-500 object-cover"
            />
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

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/50 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Image / Background */}
        <div className="flex-1 relative bg-zinc-900">
          <img
            src={story.preview}
            alt="Story visual"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

          <div className="absolute bottom-20 left-4 right-4 z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs backdrop-blur-sm">
              <Flame className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Storia Esport 24h</span>
            </div>
          </div>
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
      </div>
    </div>
  );
};
