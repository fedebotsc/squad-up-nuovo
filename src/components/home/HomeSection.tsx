import React, { useState } from "react";
import { useSquad } from "@/context/SquadContext";
import { Story, Post } from "@/data/mockData";
import { StoryViewerModal } from "./StoryViewerModal";
import {
  Heart,
  MessageSquare,
  Share2,
  Plus,
  Flame,
  Gamepad2,
  CheckCircle2,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export const HomeSection: React.FC = () => {
  const { stories, posts, toggleLikePost, createPost, activeStory, setActiveStory } = useSquad();
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>("Tutti");
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedPostGame, setSelectedPostGame] = useState("Warzone");
  const [isComposing, setIsComposing] = useState(false);

  const gameFilters = ["Tutti", "Warzone", "Valorant", "Apex Legends", "CS2"];

  const filteredPosts = posts.filter((post) => {
    if (selectedGameFilter === "Tutti") return true;
    return post.game.toLowerCase().includes(selectedGameFilter.toLowerCase());
  });

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    createPost(newPostContent.trim(), selectedPostGame);
    setNewPostContent("");
    setIsComposing(false);
  };

  const handleShare = (post: Post) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`Guarda questo post di ${post.author.name} su SquadUP: "${post.content.slice(0, 50)}..."`);
    }
    toast({
      title: "Link copiato!",
      description: "Puoi incollarlo su Discord, WhatsApp o Telegram per invitare il tuo team.",
    });
  };

  const handleAddStory = () => {
    toast({
      title: "Carica Storia 24h",
      description: "Seleziona una clip o uno screenshot dal tuo rullino foto.",
    });
  };

  return (
    <div className="pb-24 pt-2 max-w-md mx-auto px-3.5 space-y-4">
      {/* 24h Stories Tray */}
      <section aria-label="Storie 24h" className="relative">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
            <span>STORIE 24H COMMUNITY</span>
          </div>
          <span className="text-[10px] text-purple-400 font-semibold tracking-wide">
            LIVE CLIPS
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
          {/* Add story button */}
          <button
            onClick={handleAddStory}
            className="flex flex-col items-center shrink-0 group select-none"
          >
            <div className="relative w-16 h-16 rounded-2xl bg-[#161b2e] border-2 border-dashed border-purple-500/60 p-0.5 flex items-center justify-center group-hover:border-purple-400 transition-colors">
              <div className="w-full h-full rounded-xl bg-purple-950/40 flex items-center justify-center">
                <Plus className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-black font-bold text-xs shadow-md">
                +
              </div>
            </div>
            <span className="text-[11px] font-medium text-zinc-300 mt-1.5 truncate max-w-[64px]">
              La tua clip
            </span>
          </button>

          {/* Stories List */}
          {stories.map((story) => (
            <button
              key={story.id}
              onClick={() => setActiveStory(story)}
              className="flex flex-col items-center shrink-0 group select-none"
            >
              <div
                className={`w-16 h-16 rounded-2xl p-[2px] transition-transform group-hover:scale-105 ${
                  story.hasUnread
                    ? "bg-gradient-to-tr from-purple-500 via-pink-500 to-cyan-400 shadow-[0_0_12px_rgba(139,92,246,0.5)]"
                    : "bg-zinc-700/60"
                }`}
              >
                <div className="w-full h-full rounded-[14px] overflow-hidden bg-zinc-900 border border-black/40 relative">
                  <img
                    src={story.avatar}
                    alt={story.username}
                    className="w-full h-full object-cover"
                  />
                  {story.verified && (
                    <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-cyan-500 flex items-center justify-center shadow">
                      <CheckCircle2 className="w-2.5 h-2.5 text-black" />
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-medium text-zinc-300 mt-1.5 truncate max-w-[68px]">
                {story.username}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Quick Post Composer */}
      <section className="bg-[#13182c]/90 border border-purple-900/30 rounded-2xl p-3.5 shadow-lg">
        {!isComposing ? (
          <div
            onClick={() => setIsComposing(true)}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-900/50 border border-purple-500/40 overflow-hidden shrink-0">
              <img
                src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80"
                alt="My avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 bg-zinc-900/80 hover:bg-zinc-900 text-zinc-400 text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 transition-colors">
              Condividi un clutch, highlight o cerca compagni...
            </div>
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreatePost} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                Nuovo Post Gaming
              </span>
              <button
                type="button"
                onClick={() => setIsComposing(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Annulla
              </button>
            </div>

            <textarea
              rows={3}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Racconta la tua giocata o condividi un consiglio per il torneo..."
              className="w-full bg-zinc-900/90 text-zinc-200 text-xs rounded-xl p-3 border border-purple-900/40 focus:outline-none focus:border-purple-500 resize-none break-words"
            />

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-400">Gioco:</span>
                <select
                  value={selectedPostGame}
                  onChange={(e) => setSelectedPostGame(e.target.value)}
                  className="bg-zinc-900 text-zinc-200 text-xs rounded-lg px-2 py-1 border border-zinc-700/60 focus:outline-none focus:border-purple-500"
                >
                  <option value="Warzone">Warzone</option>
                  <option value="Valorant">Valorant</option>
                  <option value="Apex Legends">Apex Legends</option>
                  <option value="CS2">CS2</option>
                  <option value="Clan Nexus Prime">Clan Nexus</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!newPostContent.trim()}
                className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
              >
                <Send className="w-3 h-3" />
                Pubblica
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Game Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {gameFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedGameFilter(filter)}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
              selectedGameFilter === filter
                ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                : "bg-[#14182a] text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Feed Posts */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <article
            key={post.id}
            className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl p-4 shadow-md space-y-3 transition-all hover:border-purple-700/40"
          >
            {/* Author Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-10 h-10 rounded-xl object-cover border border-purple-500/40 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-zinc-100 truncate max-w-[130px]">
                      {post.author.name}
                    </span>
                    {post.author.verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    )}
                    {post.author.clanTag && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-600/40">
                        [{post.author.clanTag}]
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <span className="truncate max-w-[90px]">{post.author.handle}</span>
                    <span>•</span>
                    <span className="shrink-0">{post.timeAgo}</span>
                  </div>
                </div>
              </div>

              {/* Game Tag Badge */}
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 shrink-0">
                {post.game}
              </span>
            </div>

            {/* Post Content with safe break-words */}
            <p className="text-xs text-zinc-200 leading-relaxed break-words whitespace-pre-wrap">
              {post.content}
            </p>

            {/* Optional Media Preview */}
            {post.image && (
              <div className="relative rounded-xl overflow-hidden border border-purple-900/40 bg-zinc-950 aspect-[16/10]">
                <img
                  src={post.image}
                  alt="Post visual preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Actions Footer */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-zinc-400 text-xs">
              <button
                onClick={() => toggleLikePost(post.id)}
                className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors ${
                  post.isLiked
                    ? "text-rose-400 bg-rose-500/10 font-medium"
                    : "hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <Heart
                  className={`w-4 h-4 transition-transform ${
                    post.isLiked ? "fill-rose-400 scale-110" : ""
                  }`}
                />
                <span>{post.likes}</span>
              </button>

              <button
                onClick={() =>
                  toast({
                    title: "Commenti",
                    description: `Aperta la discussione per il post di ${post.author.name}.`,
                  })
                }
                className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span>{post.comments}</span>
              </button>

              <button
                onClick={() => handleShare(post)}
                className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
              >
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>{post.shares}</span>
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Story Viewer Modal */}
      {activeStory && (
        <StoryViewerModal
          story={activeStory}
          onClose={() => setActiveStory(null)}
        />
      )}
    </div>
  );
};
