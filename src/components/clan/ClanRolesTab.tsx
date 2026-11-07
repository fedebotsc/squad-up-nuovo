import React, { useState, useEffect } from "react";
import {
  Shield,
  Crown,
  Sparkles,
  Plus,
  Loader2,
  Trash2,
  Check,
  UserCheck,
  AlertCircle,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { ClanData, ClanMember } from "@/data/mockData";

interface ClanRolesTabProps {
  clanData: ClanData;
  clanMembers: ClanMember[];
  currentUser: any;
  onRefresh: () => Promise<void>;
  onOpenUpgrade: () => void;
}

interface CustomRole {
  id: string;
  clan_id: string;
  name: string;
  color: string;
  can_publish: boolean;
  can_moderate: boolean;
  created_at: string;
}

const PRESET_COLORS = [
  "#F59E0B", // Amber / Gold
  "#06B6D4", // Cyan
  "#A855F7", // Purple
  "#10B981", // Emerald
  "#EC4899", // Pink
  "#3B82F6", // Blue
  "#EF4444", // Rose
];

export const ClanRolesTab: React.FC<ClanRolesTabProps> = ({
  clanData,
  clanMembers,
  currentUser,
  onRefresh,
  onOpenUpgrade,
}) => {
  const isProOrElite = clanData.tier === "pro" || clanData.tier === "elite" || clanData.subscriptionTier === "pro" || clanData.subscriptionTier === "elite";
  const isOwner = currentUser && clanData.ownerId === currentUser.id;

  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [roleName, setRoleName] = useState("");
  const [roleColor, setRoleColor] = useState(PRESET_COLORS[0]);
  const [canPublish, setCanPublish] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  // Assigning role state
  const [assigningMemberId, setAssigningMemberId] = useState<string | null>(null);

  const maxRoles = clanData.tier === "elite" || clanData.subscriptionTier === "elite" ? 12 : 5;

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("clan_custom_roles")
        .select("*")
        .eq("clan_id", clanData.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setRoles(data || []);
    } catch (err: any) {
      console.error("[ClanRolesTab] Errore fetch ruoli:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isProOrElite) {
      fetchRoles();
    }
  }, [clanData.id, isProOrElite]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    if (roles.length >= maxRoles) {
      toast({
        title: "Limite Ruoli Raggiunto",
        description: `Hai raggiunto il numero massimo di ${maxRoles} ruoli per il piano ${clanData.tier?.toUpperCase()}.`,
        variant: "destructive",
      });
      return;
    }

    setIsCreatingRole(true);
    try {
      const { error } = await supabase.from("clan_custom_roles").insert({
        clan_id: clanData.id,
        name: roleName.trim(),
        color: roleColor,
        can_publish: canPublish,
        can_moderate: canModerate,
      });

      if (error) throw error;

      toast({
        title: "Ruolo Creato! ✨",
        description: `Il ruolo "${roleName.trim()}" è ora disponibile per i membri del clan.`,
      });

      setRoleName("");
      setCanPublish(false);
      setCanModerate(false);
      setShowAddForm(false);
      await fetchRoles();
    } catch (err: any) {
      console.error("[ClanRolesTab] Errore creazione ruolo:", err);
      toast({
        title: "Errore Creazione",
        description: err.message || "Impossibile creare il ruolo.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleTitle: string) => {
    if (!isOwner) return;

    try {
      const { error } = await supabase
        .from("clan_custom_roles")
        .delete()
        .eq("id", roleId)
        .eq("clan_id", clanData.id);

      if (error) throw error;

      // Update members holding this role
      await supabase
        .from("clan_members")
        .update({ custom_role_id: null, custom_role_title: null })
        .eq("clan_id", clanData.id)
        .eq("custom_role_id", roleId);

      toast({
        title: "Ruolo Rimosso",
        description: `Il ruolo "${roleTitle}" è stato eliminato.`,
      });

      await fetchRoles();
      await onRefresh();
    } catch (err: any) {
      console.error("[ClanRolesTab] Errore cancellazione ruolo:", err);
      toast({
        title: "Errore Cancellazione",
        description: err.message || "Impossibile cancellare il ruolo.",
        variant: "destructive",
      });
    }
  };

  const handleAssignRoleToMember = async (userId: string, roleId: string | null) => {
    setAssigningMemberId(userId);
    try {
      const targetRole = roles.find((r) => r.id === roleId);

      const { error } = await supabase
        .from("clan_members")
        .update({
          custom_role_id: roleId,
          custom_role_title: targetRole ? targetRole.name : null,
        })
        .eq("clan_id", clanData.id)
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Ruolo Assegnato! 🎖️",
        description: targetRole
          ? `Membro promosso a "${targetRole.name}".`
          : "Ruolo personalizzato rimosso dal membro.",
      });

      await onRefresh();
    } catch (err: any) {
      console.error("[ClanRolesTab] Errore assegnazione:", err);
      toast({
        title: "Errore Assegnazione",
        description: err.message || "Impossibile assegnare il ruolo.",
        variant: "destructive",
      });
    } finally {
      setAssigningMemberId(null);
    }
  };

  // IF BASE CLAN: UPGRADE BANNER
  if (!isProOrElite) {
    return (
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-6 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-extrabold text-white">
            Ruoli Personalizzati Clan Pro & Elite
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            I clan di livello <strong className="text-purple-300">Base</strong> utilizzano la gerarchia standard. Passa a un abbonamento Pro o Elite per definire fino a 12 ruoli su misura, titoli unici, badge colorati e permessi di moderazione!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-left max-w-xs mx-auto text-[11px] pt-1">
          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-200">
            <strong className="block text-white font-bold mb-0.5">Clan Pro:</strong>
            5 Ruoli personalizzati con badge colorati
          </div>
          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-200">
            <strong className="block text-white font-bold mb-0.5">Clan Elite:</strong>
            12 Ruoli, permessi avanzati e badge dorato
          </div>
        </div>

        <button
          onClick={onOpenUpgrade}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-400 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
        >
          <Crown className="w-4 h-4 text-amber-300" />
          <span>Sblocca Ruoli con Upgrade Clan</span>
        </button>
      </div>
    );
  }

  // PRO / ELITE ROLE MANAGER
  return (
    <div className="space-y-4">
      {/* Roles Overview Card */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-amber-300">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Ruoli Personalizzati ({roles.length}/{maxRoles})
              </h4>
              <p className="text-[10px] text-zinc-400">
                Piano Clan {clanData.tier?.toUpperCase()} attivo
              </p>
            </div>
          </div>

          {isOwner && roles.length < maxRoles && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuovo Ruolo</span>
            </button>
          )}
        </div>

        {/* Add Role Form Modal / Drawer */}
        {showAddForm && (
          <form
            onSubmit={handleCreateRole}
            className="p-3.5 rounded-2xl bg-[#151a32] border border-purple-500/40 space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Crea Nuovo Ruolo di Squadra
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                required
                placeholder="es. Capitano d'Assalto, Incursore..."
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full bg-[#101426] border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />

              {/* Color Presets */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-300 mb-1">
                  Colore Badge Ruolo:
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setRoleColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                        roleColor === c ? "scale-110 border-white shadow-md" : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <label className="flex items-center gap-1.5 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canPublish}
                    onChange={(e) => setCanPublish(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-0"
                  />
                  <span>Pubblica Post</span>
                </label>
                <label className="flex items-center gap-1.5 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canModerate}
                    onChange={(e) => setCanModerate(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-0"
                  />
                  <span>Modera Chat</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreatingRole || !roleName.trim()}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer"
            >
              {isCreatingRole ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Salva Ruolo</span>
            </button>
          </form>
        )}

        {/* Existing Roles List */}
        {isLoading ? (
          <div className="py-6 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          </div>
        ) : roles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {roles.map((r) => (
              <div
                key={r.id}
                className="p-2.5 rounded-xl bg-[#14182e] border border-zinc-800 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: r.color }}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">{r.name}</span>
                    <div className="flex items-center gap-1 text-[9px] text-zinc-400">
                      {r.can_publish && <span>Post ✓</span>}
                      {r.can_moderate && <span>Mod ✓</span>}
                      {!r.can_publish && !r.can_moderate && <span>Membro Onorario</span>}
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <button
                    onClick={() => handleDeleteRole(r.id, r.name)}
                    title="Elimina ruolo"
                    className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-zinc-400">
            Nessun ruolo personalizzato definito. Clicca su "+ Nuovo Ruolo" per iniziare.
          </div>
        )}
      </div>

      {/* Member Assignment Section */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
          <UserCheck className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-black text-white uppercase tracking-wider">
            Assegna Ruoli ai Membri ({clanMembers.length})
          </h4>
        </div>

        <div className="space-y-2">
          {clanMembers.map((m) => {
            const isMemberAssigning = assigningMemberId === (m.userId || m.id);
            const currentCustomRole = roles.find((r) => r.id === m.customRoleId);

            return (
              <div
                key={m.id}
                className="p-2.5 rounded-xl bg-[#14182e] border border-zinc-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    {m.avatar ? (
                      <img
                        src={m.avatar}
                        alt={m.name}
                        className="w-8 h-8 rounded-lg object-cover border border-purple-500/40"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-purple-950 flex items-center justify-center border border-purple-700/40 text-purple-300 font-bold text-xs">
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate max-w-[120px]">
                      {m.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {currentCustomRole ? (
                        <span
                          className="font-bold px-1.5 py-0.2 rounded text-[9px]"
                          style={{
                            color: currentCustomRole.color,
                            backgroundColor: `${currentCustomRole.color}20`,
                            border: `1px solid ${currentCustomRole.color}50`,
                          }}
                        >
                          {currentCustomRole.name}
                        </span>
                      ) : (
                        m.role
                      )}
                    </span>
                  </div>
                </div>

                {/* Role Selector dropdown */}
                {isOwner && (
                  <div className="shrink-0">
                    {isMemberAssigning ? (
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    ) : (
                      <select
                        value={m.customRoleId || ""}
                        onChange={(e) =>
                          handleAssignRoleToMember(
                            m.userId || m.id,
                            e.target.value === "" ? null : e.target.value
                          )
                        }
                        className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-400"
                      >
                        <option value="">Ruolo Standard ({m.role})</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            ★ {r.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
