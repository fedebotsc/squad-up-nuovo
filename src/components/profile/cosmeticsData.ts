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
  rarity?: "Standard" | "Raro" | "Epico" | "Leggendario" | "Mitico";
  category?: "cod" | "standard" | "tenure";
  description?: string;
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
  frameUrl?: string; // Direct image/SVG overlay (e.g. COD Warzone frame)
  category?: "cod" | "standard" | "tenure";
  description?: string;
}

// ==========================================
// CALL OF DUTY / WARZONE COSMETICS
// ==========================================

export const COD_AVATAR_FRAMES: AvatarFrame[] = [
  {
    id: "cod-warzone-specops",
    name: "Warzone Spec-Ops Dogtag",
    borderClass: "border-emerald-400",
    glowClass: "shadow-[0_0_20px_rgba(52,211,153,0.7)]",
    previewColor: "from-emerald-500 via-zinc-800 to-zinc-950",
    requiresPro: false,
    isTenure: false,
    tenureMilestone: "COD Armory",
    rarity: "Leggendario",
    frameUrl: "/rewards/cod-warzone-frame.png",
    category: "cod",
    description: "Cornice metallica ufficiale Warzone con piastrina con teschio, proiettili d'assalto e LED verdi ad alta intensità.",
  },
  {
    id: "cod-dark-aether",
    name: "Dark Aether Tactical Skull",
    borderClass: "border-fuchsia-500",
    glowClass: "shadow-[0_0_22px_rgba(217,70,239,0.75)]",
    previewColor: "from-purple-600 via-pink-600 to-zinc-950",
    requiresPro: false,
    isTenure: false,
    tenureMilestone: "COD Armory",
    rarity: "Mitico",
    frameUrl: "/rewards/cod-dark-aether-frame.svg",
    category: "cod",
    description: "Titanio scuro con condotti a scarica eterea viola, piastrina operatore Ghost e cartucce dorate.",
  },
  {
    id: "cod-tactical-nuke",
    name: "Tactical Nuke 25-Streak",
    borderClass: "border-amber-400",
    glowClass: "shadow-[0_0_25px_rgba(245,158,11,0.85)]",
    previewColor: "from-amber-400 via-orange-500 to-zinc-950",
    requiresPro: false,
    isTenure: false,
    tenureMilestone: "COD Armory",
    rarity: "Mitico",
    frameUrl: "/rewards/cod-tactical-nuke-frame.svg",
    category: "cod",
    description: "Ghiera perimetrale atomica per la serie da 25 uccisioni. Simbolo di radiazione dorato, strisce hazard e LED ambra.",
  },
  {
    id: "cod-damascus",
    name: "Damascus Apex Mastery",
    borderClass: "border-cyan-400",
    glowClass: "shadow-[0_0_22px_rgba(34,211,238,0.75)]",
    previewColor: "from-cyan-400 via-purple-600 to-pink-500",
    requiresPro: false,
    isTenure: false,
    tenureMilestone: "COD Armory",
    rarity: "Leggendario",
    frameUrl: "/rewards/cod-damascus-frame.svg",
    category: "cod",
    description: "Acciaio damascato ondulato iridescente con nodi laser cyan e inserti balistici in titanio aeronautico.",
  },
  {
    id: "cod-crimson-ghost",
    name: "Crimson Ghost Task Force 141",
    borderClass: "border-rose-500",
    glowClass: "shadow-[0_0_22px_rgba(244,63,94,0.8)]",
    previewColor: "from-rose-600 via-red-700 to-zinc-950",
    requiresPro: false,
    isTenure: false,
    tenureMilestone: "COD Armory",
    rarity: "Epico",
    frameUrl: "/rewards/cod-crimson-ghost-frame.svg",
    category: "cod",
    description: "Carbonio stealth opaco con guide laser rosso sangue, balaclava Ghost incisa e munizioni 7.62mm.",
  },
  {
    id: "cod-arctic-recon",
    name: "Sub-Zero Arctic Recon",
    borderClass: "border-sky-400",
    glowClass: "shadow-[0_0_20px_rgba(56,189,248,0.7)]",
    previewColor: "from-sky-300 via-blue-500 to-slate-900",
    requiresPro: false,
    isTenure: false,
    tenureMilestone: "COD Armory",
    rarity: "Raro",
    frameUrl: "/rewards/cod-arctic-recon-frame.svg",
    category: "cod",
    description: "Placcatura criogenica bianca artica con sensori ottici azzurro ghiaccio e ghiera bussola militare.",
  },
];

export const COD_BANNER_THEMES: BannerTheme[] = [
  {
    id: "banner-cod-tactical-nuke",
    name: "Tactical Nuke // Dark Aether",
    gradient: "from-[#1a082e] via-[#330f57] to-[#0d0417]",
    accent: "purple",
    costSC: 0,
    isFree: false,
    isTenure: false,
    tenureMilestone: "COD Armory",
    svgUrl: "/rewards/cod-tactical-nuke-banner.png",
    rarity: "Mitico",
    category: "cod",
    description: "Calling Card epica Warzone con teschio Ghost a energia Dark Aether, nucleo atomico aureo e Black Hawk in volo.",
  },
  {
    id: "banner-cod-ghost-verdansk",
    name: "Ghost Recon // Verdansk Shadows",
    gradient: "from-[#020e06] via-[#092b15] to-[#010703]",
    accent: "emerald",
    costSC: 0,
    isFree: false,
    isTenure: false,
    tenureMilestone: "COD Armory",
    svgUrl: "/rewards/cod-ghost-verdansk-banner.svg",
    rarity: "Leggendario",
    category: "cod",
    description: "Infiltrazione notturna con visore termico quadruplo verde smeraldo, operatore Ghost e telemetria HUD Verdansk.",
  },
  {
    id: "banner-cod-warzone-champion",
    name: "Warzone Champion // #1 Victory Exfil",
    gradient: "from-[#1f1003] via-[#452206] to-[#120901]",
    accent: "amber",
    costSC: 0,
    isFree: false,
    isTenure: false,
    tenureMilestone: "COD Armory",
    svgUrl: "/rewards/cod-warzone-champion-banner.svg",
    rarity: "Leggendario",
    category: "cod",
    description: "Vittoria assoluta a Verdansk: elicottero da estrazione con fune winch, allori d'oro massiccio e fumo d'estrazione.",
  },
  {
    id: "banner-cod-ac130-gunship",
    name: "AC-130 Gunship // Death From Above",
    gradient: "from-[#240409] via-[#4d0b16] to-[#140104]",
    accent: "rose",
    costSC: 0,
    isFree: false,
    isTenure: false,
    tenureMilestone: "COD Armory",
    svgUrl: "/rewards/cod-ac130-gunship-banner.svg",
    rarity: "Epico",
    category: "cod",
    description: "Supporto aereo pesante con camera termica FLIR, reticolo di mira cannone 105mm e detonazioni al suolo.",
  },
  {
    id: "banner-cod-zombies-packapunch",
    name: "Zombies // Pack-A-Punch Overload",
    gradient: "from-[#1f0529] via-[#3f0c54] to-[#0d0112]",
    accent: "fuchsia",
    costSC: 0,
    isFree: false,
    isTenure: false,
    tenureMilestone: "COD Armory",
    svgUrl: "/rewards/cod-zombies-packapunch-banner.svg",
    rarity: "Mitico",
    category: "cod",
    description: "Potenziamento di livello 3 Pack-A-Punch: scariche eteree 115 magenta, lampi di Ray Gun e fenditura dimensionale.",
  },
];

// Base banner themes + COD Banners + Tenure Banner Themes
export const BANNER_THEMES: BannerTheme[] = [
  ...COD_BANNER_THEMES,
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
    category: "standard",
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
    category: "standard",
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
    category: "standard",
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
    category: "standard",
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
    category: "standard",
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
    category: "tenure" as const,
  })),
];

// Base avatar frames + COD Frames + Tenure Avatar Frames
export const AVATAR_FRAMES: AvatarFrame[] = [
  ...COD_AVATAR_FRAMES,
  {
    id: "base",
    name: "Standard Tactical",
    borderClass: "border-purple-500",
    glowClass: "shadow-[0_0_12px_rgba(139,92,246,0.5)]",
    previewColor: "from-purple-500 to-indigo-600",
    requiresPro: false,
    isTenure: false,
    tenureMilestone: "",
    category: "standard",
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
    category: "standard",
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
    category: "standard",
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
    category: "standard",
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
    category: "standard",
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
    category: "tenure" as const,
  })),
];
