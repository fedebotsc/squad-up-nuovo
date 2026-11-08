import { TENURE_REWARDS } from "./tenureRewardsData";

export interface BannerTheme {
  id: string;
  name: string;
  gradient: string;
  accent: string;
  costSC: number;
  isFree: boolean;
  isTenure: boolean;
  tenureMilestone: string;
  svgUrl: string;
}

export interface AvatarFrame {
  id: string;
  name: string;
  borderClass: string;
  glowClass: string;
  previewColor: string;
  requiresPro: boolean;
  isTenure: boolean;
  tenureMilestone: string;
  rarity?: string;
}

// Base banner themes + Tenure Banner Themes
export const BANNER_THEMES: BannerTheme[] = [
  {
    id: "theme-void",
    name: "Void Obsidian",
    gradient: "from-[#0a0d18] via-[#1a1136] to-[#0b0c16]",
    accent: "purple",
    costSC: 0,
    isFree: true,
    isTenure: false,
    tenureMilestone: "",
    svgUrl: "",
  },
  {
    id: "theme-cyber",
    name: "Cyber Neon",
    gradient: "from-[#06202e] via-[#093548] to-[#05111e]",
    accent: "cyan",
    costSC: 50,
    isFree: false,
    isTenure: false,
    tenureMilestone: "",
    svgUrl: "",
  },
  {
    id: "theme-recon",
    name: "Emerald Recon",
    gradient: "from-[#061e14] via-[#093322] to-[#04130d]",
    accent: "emerald",
    costSC: 50,
    isFree: false,
    isTenure: false,
    tenureMilestone: "",
    svgUrl: "",
  },
  {
    id: "theme-gold",
    name: "Champion Gold",
    gradient: "from-[#2a1e05] via-[#4d370b] to-[#1c1404]",
    accent: "amber",
    costSC: 50,
    isFree: false,
    isTenure: false,
    tenureMilestone: "",
    svgUrl: "",
  },
  {
    id: "theme-inferno",
    name: "Inferno Crimson",
    gradient: "from-[#29070c] via-[#4d0d17] to-[#180306]",
    accent: "rose",
    costSC: 50,
    isFree: false,
    isTenure: false,
    tenureMilestone: "",
    svgUrl: "",
  },
  // Tenure rewards banners (3, 6, 9, 12 Mesi)
  ...TENURE_REWARDS.map((r) => ({
    id: r.banner.id,
    name: r.banner.name,
    gradient: r.banner.gradient,
    accent: r.banner.accent,
    costSC: 0,
    isFree: false,
    isTenure: true,
    tenureMilestone: r.badgeLabel,
    svgUrl: r.banner.svgUrl,
  })),
];

// Base avatar frames + Tenure Avatar Frames
export const AVATAR_FRAMES: AvatarFrame[] = [
  {
    id: "base",
    name: "Standard Tactical",
    borderClass: "border-purple-500",
    glowClass: "shadow-[0_0_12px_rgba(139,92,246,0.5)]",
    previewColor: "from-purple-500 to-indigo-600",
    requiresPro: false,
    isTenure: false,
    tenureMilestone: "",
  },
  {
    id: "neon-cyan",
    name: "Cyber Neon",
    borderClass: "border-cyan-400",
    glowClass: "shadow-[0_0_15px_rgba(34,211,238,0.7)]",
    previewColor: "from-cyan-400 to-blue-500",
    requiresPro: false,
    isTenure: false,
    tenureMilestone: "",
  },
  {
    id: "gold",
    name: "Golden Champion",
    borderClass: "border-amber-400",
    glowClass: "shadow-[0_0_18px_rgba(245,158,11,0.8)]",
    previewColor: "from-amber-400 to-yellow-500",
    requiresPro: true,
    isTenure: false,
    tenureMilestone: "",
  },
  {
    id: "fire-red",
    name: "Inferno Assault",
    borderClass: "border-rose-500",
    glowClass: "shadow-[0_0_15px_rgba(244,63,94,0.7)]",
    previewColor: "from-rose-500 to-orange-500",
    requiresPro: false,
    isTenure: false,
    tenureMilestone: "",
  },
  {
    id: "amethyst",
    name: "Amethyst Elite",
    borderClass: "border-fuchsia-500",
    glowClass: "shadow-[0_0_15px_rgba(217,70,239,0.7)]",
    previewColor: "from-fuchsia-500 to-purple-600",
    requiresPro: false,
    isTenure: false,
    tenureMilestone: "",
  },
  // Tenure rewards frames (3, 6, 9, 12 Mesi)
  ...TENURE_REWARDS.map((r) => ({
    id: r.frame.id,
    name: r.frame.name,
    borderClass: r.frame.borderClass,
    glowClass: r.frame.glowClass,
    previewColor: r.frame.previewColor,
    requiresPro: true,
    isTenure: true,
    tenureMilestone: r.badgeLabel,
    rarity: r.frame.rarity,
  })),
];
