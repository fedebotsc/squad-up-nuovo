import { supabase } from "@/integrations/supabase/client";
import { ClanData, ClanMember } from "@/data/mockData";

export interface ClanDirectMessage {
  id: string;
  clan_id: string; // The clan receiving or managing this conversation
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  sender_clan_tag?: string;
  sender_role_title?: string; // e.g. "Leader", "Delegato Chat"
  receiver_id: string; // Can be an operator user_id or clan_id
  receiver_name: string;
  receiver_avatar?: string;
  receiver_clan_tag?: string;
  receiver_is_clan?: boolean;
  content: string;
  created_at: string;
  is_from_clan: boolean; // True if sent by the clan direction to the recipient
}

export interface ClanDirectThread {
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  partnerClanTag?: string;
  partnerIsClan: boolean;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

const LOCAL_CLAN_DM_KEY_PREFIX = "squadup_clan_dm_";
const LOCAL_ROLE_PERMS_KEY_PREFIX = "squadup_clan_role_perms_";

/**
 * Checks whether the current user is authorized to read and send direct messages for the clan.
 * Authorized if:
 * 1. Clan Owner / Founder
 * 2. Role is "founder", "admin", "Leader", or "Co-Leader"
 * 3. Has custom role with `can_manage_clan_chat: true`
 */
export function canUserManageClanDirectChat(
  currentUser: { id: string } | null,
  clanData: ClanData | null,
  clanMembers: ClanMember[]
): {
  authorized: boolean;
  reason: string;
  roleTitle: string;
} {
  if (!currentUser || !clanData) {
    return { authorized: false, reason: "Nessun clan attivo o non autenticato.", roleTitle: "Ospite" };
  }

  // 1. Owner / Founder check
  if (clanData.ownerId === currentUser.id) {
    return {
      authorized: true,
      reason: "Fondatore e Leader del Clan",
      roleTitle: "Leader Clan",
    };
  }

  // 2. Member role check
  const member = clanMembers.find((m) => (m.userId || m.id) === currentUser.id);
  if (!member) {
    return { authorized: false, reason: "Non sei registrato come membro attivo del clan.", roleTitle: "Non Membro" };
  }

  const rawRole = (member.role || "").toLowerCase();
  if (rawRole.includes("leader") || rawRole.includes("admin") || rawRole.includes("founder") || rawRole.includes("capo")) {
    return {
      authorized: true,
      reason: `Ruolo direttivo (${member.role})`,
      roleTitle: member.role || "Co-Leader",
    };
  }

  // 3. Custom role check
  if (member.customRoleId || member.customRoleTitle) {
    // Check saved permission map
    const perms = getClanRolePermissions(clanData.id);
    if (member.customRoleId && perms[member.customRoleId]?.can_manage_clan_chat) {
      return {
        authorized: true,
        reason: `Permesso abilitato dal Leader per il ruolo "${member.customRoleTitle}"`,
        roleTitle: member.customRoleTitle || "Delegato Chat",
      };
    }

    // Heuristic fallback on role title keywords (e.g. Diplomatico, Chat, Comunicazione, Scrim, Relazioni)
    const titleLower = (member.customRoleTitle || "").toLowerCase();
    if (
      titleLower.includes("chat") ||
      titleLower.includes("diplomatic") ||
      titleLower.includes("comunicazion") ||
      titleLower.includes("scrim") ||
      titleLower.includes("direttivo") ||
      titleLower.includes("moderator")
    ) {
      return {
        authorized: true,
        reason: `Ruolo diplomatico attivo "${member.customRoleTitle}"`,
        roleTitle: member.customRoleTitle || "Delegato Chat",
      };
    }
  }

  return {
    authorized: false,
    reason: "Il tuo ruolo attuale nel clan non include il permesso 'Gestione Chat Clan'. Chiedi al Leader di abilitarlo.",
    roleTitle: member.customRoleTitle || member.role || "Membro",
  };
}

/**
 * Gets role permissions map for a given clan from local storage
 */
export function getClanRolePermissions(clanId: string): Record<string, { can_manage_clan_chat?: boolean }> {
  try {
    const raw = localStorage.getItem(`${LOCAL_ROLE_PERMS_KEY_PREFIX}${clanId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Sets clan role permission for a given custom role
 */
export function setClanRolePermission(
  clanId: string,
  roleId: string,
  canManageClanChat: boolean
) {
  try {
    const current = getClanRolePermissions(clanId);
    current[roleId] = {
      ...(current[roleId] || {}),
      can_manage_clan_chat: canManageClanChat,
    };
    localStorage.setItem(`${LOCAL_ROLE_PERMS_KEY_PREFIX}${clanId}`, JSON.stringify(current));
  } catch (e) {
    console.warn("[ClanDirectChatService] Failed to store role permission", e);
  }
}

/**
 * Loads clan direct messages for a given clan
 */
export function getStoredClanDirectMessages(clanId: string): ClanDirectMessage[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_CLAN_DM_KEY_PREFIX}${clanId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Saves clan direct messages
 */
export function storeClanDirectMessages(clanId: string, messages: ClanDirectMessage[]) {
  try {
    localStorage.setItem(`${LOCAL_CLAN_DM_KEY_PREFIX}${clanId}`, JSON.stringify(messages));
  } catch (e) {
    console.warn("[ClanDirectChatService] Failed to store clan DMs", e);
  }
}

/**
 * Sends a message to a Clan or from a Clan
 */
export async function sendClanDirectMessage(params: {
  clanId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderClanTag?: string;
  senderRoleTitle?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  receiverClanTag?: string;
  receiverIsClan?: boolean;
  content: string;
  isFromClan: boolean;
}): Promise<ClanDirectMessage> {
  const newMsg: ClanDirectMessage = {
    id: `cdm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    clan_id: params.clanId,
    sender_id: params.senderId,
    sender_name: params.senderName,
    sender_avatar: params.senderAvatar,
    sender_clan_tag: params.senderClanTag,
    sender_role_title: params.senderRoleTitle,
    receiver_id: params.receiverId,
    receiver_name: params.receiverName,
    receiver_avatar: params.receiverAvatar,
    receiver_clan_tag: params.receiverClanTag,
    receiver_is_clan: params.receiverIsClan ?? false,
    content: params.content,
    created_at: new Date().toISOString(),
    is_from_clan: params.isFromClan,
  };

  // 1. Store in local persistent storage for the recipient clan
  const clanMsgs = getStoredClanDirectMessages(params.clanId);
  clanMsgs.push(newMsg);
  storeClanDirectMessages(params.clanId, clanMsgs);

  // If receiver is also another clan, store in their inbox too!
  if (params.receiverIsClan && params.receiverId !== params.clanId) {
    const targetClanMsgs = getStoredClanDirectMessages(params.receiverId);
    targetClanMsgs.push(newMsg);
    storeClanDirectMessages(params.receiverId, targetClanMsgs);
  }

  // 2. Broadcast via Supabase Realtime channel so any online members get it instantly
  try {
    const channel = supabase.channel(`clan_dm_${params.clanId}`);
    channel.send({
      type: "broadcast",
      event: "new_clan_dm",
      payload: newMsg,
    });

    if (params.receiverIsClan && params.receiverId !== params.clanId) {
      const targetChannel = supabase.channel(`clan_dm_${params.receiverId}`);
      targetChannel.send({
        type: "broadcast",
        event: "new_clan_dm",
        payload: newMsg,
      });
    }
  } catch (err) {
    console.warn("[ClanDirectChatService] Broadcast warning:", err);
  }

  // 3. Try to also insert into direct_messages table as backup if valid schema
  try {
    await supabase.from("direct_messages").insert({
      sender_id: params.senderId,
      receiver_id: params.receiverId,
      content: `[CLAN:${params.clanId}] ${params.content}`,
      is_read: false,
    });
  } catch {
    // Ignore foreign key restrictions if receiver is clan ID
  }

  return newMsg;
}

/**
 * Returns the timestamp when the conversation with a given partner was last read
 */
export function getLastReadTimestamp(conversationKey: string): number {
  try {
    const raw = localStorage.getItem(`squadup_read_${conversationKey}`);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Updates the last read timestamp for a conversation
 */
export function setLastReadTimestamp(conversationKey: string, timestamp: number = Date.now()): void {
  try {
    localStorage.setItem(`squadup_read_${conversationKey}`, timestamp.toString());
  } catch (e) {
    console.warn("[ClanDirectChatService] Failed to set read timestamp", e);
  }
}

/**
 * Marks direct messages with an operator as read in Supabase and local cache
 */
export async function markDirectMessagesAsRead(currentUserId: string, partnerId: string): Promise<void> {
  const convKey = `dm_${currentUserId}_${partnerId}`;
  setLastReadTimestamp(convKey, Date.now());

  // Try updating is_read column in Supabase direct_messages
  try {
    await supabase
      .from("direct_messages")
      .update({ is_read: true })
      .eq("receiver_id", currentUserId)
      .eq("sender_id", partnerId);
  } catch {
    // Column might not exist yet, local timestamp handles it
  }
}

/**
 * Marks clan direct messages from a partner as read
 */
export async function markClanDirectMessagesAsRead(clanId: string, partnerId: string): Promise<void> {
  const convKey = `clan_${clanId}_${partnerId}`;
  setLastReadTimestamp(convKey, Date.now());

  // Also update stored local messages for the clan
  try {
    const clanMsgs = getStoredClanDirectMessages(clanId);
    let modified = false;
    clanMsgs.forEach((msg) => {
      if (msg.clan_id === clanId && (msg.sender_id === partnerId || msg.receiver_id === partnerId)) {
        (msg as any).is_read = true;
        modified = true;
      }
    });
    if (modified) {
      storeClanDirectMessages(clanId, clanMsgs);
    }
  } catch {
    // Ignore
  }

  // Also try Supabase clan_direct_messages if table exists
  try {
    await supabase
      .from("clan_direct_messages")
      .update({ is_read: true })
      .eq("clan_id", clanId)
      .eq("sender_id", partnerId);
  } catch {
    // Ignore
  }
}

/**
 * Calculates how many unread clan messages exist for a clan
 */
export function calculateClanUnreadCount(clanId: string): number {
  try {
    const clanMsgs = getStoredClanDirectMessages(clanId);
    const incoming = clanMsgs.filter((m) => m.clan_id === clanId && !m.is_from_clan);

    let unread = 0;
    incoming.forEach((msg) => {
      const partnerId = msg.sender_id;
      const lastRead = getLastReadTimestamp(`clan_${clanId}_${partnerId}`);
      const msgTime = new Date(msg.created_at).getTime();
      if (msgTime > lastRead) {
        unread++;
      }
    });

    return unread;
  } catch {
    return 0;
  }
}

