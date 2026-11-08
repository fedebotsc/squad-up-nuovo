// AAA Call of Duty / Warzone Inspired Rewards Definitions
// High-fidelity vector graphics, realistic metallic finishes, and tactical HUD stylings

export interface TenureRewardItem {
  months: 3 | 6 | 9 | 12;
  id: string;
  name: string;
  codename: string;
  tierLabel: string;
  colorTheme: "bronze" | "titanium" | "gold" | "diamond";
  accentColor: string;
  borderColor: string;
  glowClass: string;
  finishDescription: string;
  frame: {
    id: string;
    name: string;
    styleClass: string;
    metalFinish: string;
    borderHex: string;
    rarity: "Raro" | "Epico" | "Leggendario" | "Mitico";
  };
  banner: {
    id: string;
    name: string;
    camoType: string;
    svgUrl: string;
  };
  details: string[];
}

export interface ClanMilestoneItem {
  id: string;
  levelRequired: number;
  treasuryRequiredSC: number;
  tournamentsRequired?: number;
  title: string;
  codename: string;
  crestName: string;
  crestSvg: string;
  bannerName: string;
  bannerCamo: string;
  bannerSvg: string;
  chatTitle: string;
  chatTitleColor: string;
  rarity: "Standard" | "Elite" | "Special Ops" | "Apex";
  description: string;
}

export interface PlayerAchievementItem {
  id: string;
  title: string;
  codename: string;
  badgeName: string;
  badgeMetalFinish: "bronze_steel" | "titanium_cyan" | "carbon_amber" | "heavy_gold";
  badgeSvg: string;
  profileTitle: string;
  profileThemeName: string;
  profileThemeSvg: string;
  requirementText: string;
  statType: "tournaments" | "posts" | "wins";
  targetValue: number;
  rarity: "Operatore" | "Tattico" | "Veterano" | "Campione";
  loreText: string;
}

// ==========================================
// TAB 1: TENURE WIDESCREEN SVGS
// ==========================================

export const SVG_TENURE_3M = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="280" viewBox="0 0 900 280">
  <defs>
    <linearGradient id="bronzeBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0704"/>
      <stop offset="45%" stop-color="#1f1207"/>
      <stop offset="100%" stop-color="#080503"/>
    </linearGradient>
    <linearGradient id="brushedBronze" x1="0%" y1="0%" x2="100%" y2="40%">
      <stop offset="0%" stop-color="#92400e"/>
      <stop offset="30%" stop-color="#f59e0b"/>
      <stop offset="60%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>
    <pattern id="tacGridBronze" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(217,119,6,0.14)" stroke-width="0.8"/>
      <circle cx="12" cy="12" r="0.8" fill="rgba(245,158,11,0.2)"/>
    </pattern>
  </defs>
  <rect width="900" height="280" fill="url(#bronzeBg)"/>
  <rect width="900" height="280" fill="url(#tacGridBronze)"/>
  <!-- Tactical HUD Cutters -->
  <path d="M 0 0 L 140 0 L 110 32 L 0 32 Z" fill="#b45309" opacity="0.3"/>
  <path d="M 680 0 L 900 0 L 900 60 L 730 60 Z" fill="rgba(217,119,6,0.06)"/>
  <line x1="40" y1="38" x2="240" y2="38" stroke="url(#brushedBronze)" stroke-width="3"/>
  <!-- Micro-engraved Tactical Crosshairs -->
  <g stroke="rgba(245,158,11,0.35)" stroke-width="1">
    <line x1="38" y1="70" x2="48" y2="70"/><line x1="43" y1="65" x2="43" y2="75"/>
    <line x1="850" y1="230" x2="860" y2="230"/><line x1="855" y1="225" x2="855" y2="235"/>
  </g>
  <text x="40" y="80" font-family="'JetBrains Mono', 'Segoe UI', monospace" font-size="12" font-weight="900" fill="#f59e0b" letter-spacing="3">// TENURE-03M // BRONZE SPEC</text>
  <text x="40" y="125" font-family="'Impact', 'Arial Black', sans-serif" font-size="44" font-weight="900" fill="#fef3c7" letter-spacing="2">VANGUARD BRONZE</text>
  <text x="40" y="155" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#d97706" letter-spacing="4">OPERATORE COSTANTE • PRIMO TRIMESTRE COMPLETATO</text>
  <!-- Tactile Medallion -->
  <g transform="translate(760, 140)">
    <polygon points="0,-70 60,-35 60,35 0,70 -60,35 -60,-35" fill="#180e06" stroke="url(#brushedBronze)" stroke-width="4"/>
    <polygon points="0,-56 48,-28 48,28 0,56 -48,28 -48,-28" fill="none" stroke="rgba(245,158,11,0.3)" stroke-width="1.5" stroke-dasharray="6,4"/>
    <text x="0" y="8" font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="#fbbf24" text-anchor="middle">3M</text>
    <text x="0" y="28" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="800" fill="#92400e" text-anchor="middle" letter-spacing="2">VETERAN</text>
  </g>
</svg>
`)}`;

export const SVG_TENURE_6M = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="280" viewBox="0 0 900 280">
  <defs>
    <linearGradient id="titaniumBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#040912"/>
      <stop offset="50%" stop-color="#0b172a"/>
      <stop offset="100%" stop-color="#030810"/>
    </linearGradient>
    <linearGradient id="titaniumLaser" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="45%" stop-color="#f8fafc"/>
      <stop offset="70%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="laserGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f0ff"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <pattern id="tacGridCyan" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(6,182,212,0.12)" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect width="900" height="280" fill="url(#titaniumBg)"/>
  <rect width="900" height="280" fill="url(#tacGridCyan)"/>
  <!-- Glowing Laser Conduits -->
  <line x1="0" y1="20" x2="380" y2="20" stroke="url(#laserGlow)" stroke-width="2.5" opacity="0.9"/>
  <line x1="380" y1="20" x2="410" y2="45" stroke="url(#laserGlow)" stroke-width="2.5" opacity="0.9"/>
  <line x1="410" y1="45" x2="900" y2="45" stroke="url(#laserGlow)" stroke-width="2.5" opacity="0.9"/>
  <!-- Cyber Cutters -->
  <polygon points="40,240 280,240 300,265 40,265" fill="rgba(6,182,212,0.15)"/>
  <text x="40" y="80" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="900" fill="#38bdf8" letter-spacing="3">// TENURE-06M // TITANIUM LASER STRIKE</text>
  <text x="40" y="125" font-family="'Impact', 'Arial Black', sans-serif" font-size="44" font-weight="900" fill="#f8fafc" letter-spacing="2">TITANIUM LASER 6M</text>
  <text x="40" y="155" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#94a3b8" letter-spacing="4">SEI MESI DI GUERRA TATTICA • LED LASER AZZURRO</text>
  <!-- Geometric Insignia with Cyan Laser Core -->
  <g transform="translate(760, 140)">
    <polygon points="0,-72 65,-15 42,65 -42,65 -65,-15" fill="#061224" stroke="url(#titaniumLaser)" stroke-width="3.5"/>
    <circle cx="0" cy="5" r="32" fill="none" stroke="#00f0ff" stroke-width="2" stroke-dasharray="8,4"/>
    <text x="0" y="12" font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="#f0fdf4" text-anchor="middle">6M</text>
    <text x="0" y="32" font-family="'JetBrains Mono', monospace" font-size="8" font-weight="900" fill="#38bdf8" text-anchor="middle" letter-spacing="2">TITANIUM</text>
  </g>
</svg>
`)}`;

export const SVG_TENURE_9M = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="280" viewBox="0 0 900 280">
  <defs>
    <linearGradient id="goldBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#140c02"/>
      <stop offset="50%" stop-color="#2a1804"/>
      <stop offset="100%" stop-color="#100a01"/>
    </linearGradient>
    <linearGradient id="imperialGold" x1="0%" y1="0%" x2="100%" y2="30%">
      <stop offset="0%" stop-color="#eab308"/>
      <stop offset="35%" stop-color="#fef08a"/>
      <stop offset="65%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <pattern id="tacGridGold" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 30 M 0 0 L 30 30" fill="none" stroke="rgba(234,179,8,0.12)" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect width="900" height="280" fill="url(#goldBg)"/>
  <rect width="900" height="280" fill="url(#tacGridGold)"/>
  <!-- Solid Gold Geometric Chamfers -->
  <polygon points="0,0 200,0 170,40 0,40" fill="url(#imperialGold)" opacity="0.4"/>
  <polygon points="650,280 900,280 900,240 680,240" fill="url(#imperialGold)" opacity="0.25"/>
  <line x1="40" y1="46" x2="300" y2="46" stroke="url(#imperialGold)" stroke-width="3.5"/>
  <text x="40" y="80" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="900" fill="#facc15" letter-spacing="3">// TENURE-09M // IMPERIAL GOLD SPEC</text>
  <text x="40" y="125" font-family="'Impact', 'Arial Black', sans-serif" font-size="44" font-weight="900" fill="#fef08a" letter-spacing="2">GOLDEN IMPERIAL 9M</text>
  <text x="40" y="155" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#eab308" letter-spacing="4">ORO MASSICCIO SFACCETTATO • COMANDANTE SUPREMO</text>
  <!-- Massive Imperial Crest -->
  <g transform="translate(760, 140)">
    <polygon points="0,-75 70,0 0,75 -70,0" fill="#241402" stroke="url(#imperialGold)" stroke-width="4.5"/>
    <circle cx="0" cy="0" r="42" fill="none" stroke="rgba(254,240,138,0.5)" stroke-width="2"/>
    <text x="0" y="10" font-family="system-ui, sans-serif" font-size="30" font-weight="900" fill="#fef08a" text-anchor="middle">9M</text>
    <text x="0" y="30" font-family="'JetBrains Mono', monospace" font-size="8" font-weight="900" fill="#ca8a04" text-anchor="middle" letter-spacing="2">IMPERIAL</text>
  </g>
</svg>
`)}`;

export const SVG_TENURE_12M = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="280" viewBox="0 0 900 280">
  <defs>
    <linearGradient id="holoBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090514"/>
      <stop offset="40%" stop-color="#0a192f"/>
      <stop offset="80%" stop-color="#1e0b36"/>
      <stop offset="100%" stop-color="#040b18"/>
    </linearGradient>
    <linearGradient id="prismaticGlow" x1="0%" y1="0%" x2="100%" y2="30%">
      <stop offset="0%" stop-color="#c084fc"/>
      <stop offset="25%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#f8fafc"/>
      <stop offset="75%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <pattern id="holoPrism" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 16 0 L 32 16 L 16 32 L 0 16 Z" fill="none" stroke="rgba(192,132,252,0.15)" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect width="900" height="280" fill="url(#holoBg)"/>
  <rect width="900" height="280" fill="url(#holoPrism)"/>
  <!-- Floating Prismatic Flares -->
  <circle cx="200" cy="80" r="120" fill="rgba(168,85,247,0.12)" filter="blur(40px)"/>
  <circle cx="700" cy="180" r="140" fill="rgba(56,189,248,0.12)" filter="blur(40px)"/>
  <!-- Holographic Rail Lines -->
  <line x1="40" y1="42" x2="340" y2="42" stroke="url(#prismaticGlow)" stroke-width="4"/>
  <text x="40" y="80" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="900" fill="#c084fc" letter-spacing="3">// TENURE-12M // HOLOGRAPHIC PLATINUM DIAMOND</text>
  <text x="40" y="125" font-family="'Impact', 'Arial Black', sans-serif" font-size="44" font-weight="900" fill="#f8fafc" letter-spacing="2">HOLO PLATINUM DIAMOND</text>
  <text x="40" y="155" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#38bdf8" letter-spacing="4">1 ANNO DI ONORI • RIFLESSI PRISMATICI VIOLA/AZZURRI</text>
  <!-- Diamond Crest -->
  <g transform="translate(760, 140)">
    <polygon points="0,-78 68,-18 42,70 -42,70 -68,-18" fill="#120c24" stroke="url(#prismaticGlow)" stroke-width="4.5"/>
    <polygon points="0,-50 44,-10 28,45 -28,45 -44,-10" fill="none" stroke="#a855f7" stroke-width="2" opacity="0.6"/>
    <text x="0" y="8" font-family="system-ui, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">12M</text>
    <text x="0" y="28" font-family="'JetBrains Mono', monospace" font-size="8" font-weight="900" fill="#38bdf8" text-anchor="middle" letter-spacing="2">HOLO DIAMOND</text>
  </g>
</svg>
`)}`;

// ==========================================
// TAB 1 TENURE DATA CONFIG
// ==========================================

export const TENURE_REWARDS_DATA: TenureRewardItem[] = [
  {
    months: 3,
    id: "tenure_3m",
    name: "Veterano di Bronzo",
    codename: "TAC-BRONZE-V1",
    tierLabel: "3 Mesi Pro",
    colorTheme: "bronze",
    accentColor: "#d97706",
    borderColor: "border-amber-600",
    glowClass: "shadow-[0_0_20px_rgba(217,119,6,0.6)]",
    finishDescription: "Bronzo spazzolato ad alta intensità con micro-incisioni balistiche e rifiniture tattiche calde.",
    frame: {
      id: "frame-tenure-3m",
      name: "Veterano Bronzo Spazzolato",
      styleClass: "border-2 border-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.8)] ring-2 ring-amber-700/60",
      metalFinish: "Brushed Bronze W/ Micro-grooves",
      borderHex: "#b45309",
      rarity: "Raro",
    },
    banner: {
      id: "banner-tenure-3m",
      name: "Widescreen Vanguard Bronze",
      camoType: "Tactical Bronze Grid",
      svgUrl: SVG_TENURE_3M,
    },
    details: [
      "Cornice tattica in bronzo con viti angolari ed incisioni laser",
      "Banner widescreen ad alta risoluzione con reticolo militare",
      "Badge veterano applicabile all'avatar e scheda giocatore",
    ],
  },
  {
    months: 6,
    id: "tenure_6m",
    name: "Argento Titanio Laser",
    codename: "SPEC-TITANIUM-CYAN",
    tierLabel: "6 Mesi Pro",
    colorTheme: "titanium",
    accentColor: "#06b6d4",
    borderColor: "border-cyan-400",
    glowClass: "shadow-[0_0_24px_rgba(6,182,212,0.7)]",
    finishDescription: "Argento titanio aerospaziale con guide luminose a LED laser azzurro pulsante (Neon Glow).",
    frame: {
      id: "frame-tenure-6m",
      name: "Argento Titanio LED Cyan",
      styleClass: "border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.9)] ring-2 ring-cyan-500/70",
      metalFinish: "Aircraft Titanium W/ Cyan Laser Core",
      borderHex: "#06b6d4",
      rarity: "Epico",
    },
    banner: {
      id: "banner-tenure-6m",
      name: "Widescreen Titanium Laser Strike",
      camoType: "Laser Electric Cyber",
      svgUrl: SVG_TENURE_6M,
    },
    details: [
      "Cornice smussata con inserti laser a LED azzurro",
      "Banner widescreen con condotto a impulsi 480nm",
      "Effetto neon glow attivo nella lista membri e chat",
    ],
  },
  {
    months: 9,
    id: "tenure_9m",
    name: "Oro Imperiale Massiccio",
    codename: "DOM-GOLD-IMPERIAL",
    tierLabel: "9 Mesi Pro",
    colorTheme: "gold",
    accentColor: "#eab308",
    borderColor: "border-yellow-400",
    glowClass: "shadow-[0_0_28px_rgba(234,179,8,0.8)]",
    finishDescription: "Oro imperiale pesante con sfaccettature geometriche tridimensionali e bagliore ambra radiante.",
    frame: {
      id: "frame-tenure-9m",
      name: "Oro Imperiale Geometrico",
      styleClass: "border-2 border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.95)] ring-2 ring-amber-400/80 animate-pulse",
      metalFinish: "Solid Heavy Gold W/ Amber Heat Bloom",
      borderHex: "#eab308",
      rarity: "Leggendario",
    },
    banner: {
      id: "banner-tenure-9m",
      name: "Widescreen Golden Imperial",
      camoType: "Imperial Royal Radiance",
      svgUrl: SVG_TENURE_9M,
    },
    details: [
      "Cornice pesante in oro massiccio sfaccettato",
      "Bagliore ambra continuo ad alto impatto visivo",
      "Stendardo imperiale con stemma a diamante dorato",
    ],
  },
  {
    months: 12,
    id: "tenure_12m",
    name: "Diamante Platino Olografico",
    codename: "APEX-HOLO-PRISM",
    tierLabel: "12 Mesi Pro (1 Anno)",
    colorTheme: "diamond",
    accentColor: "#c084fc",
    borderColor: "border-purple-400",
    glowClass: "shadow-[0_0_32px_rgba(192,132,252,0.9)]",
    finishDescription: "Platino diamante olografico prismatico con riflessi dinamici viola/azzurri e particelle fluttuanti.",
    frame: {
      id: "frame-tenure-12m",
      name: "Diamante Platino Olografico",
      styleClass: "border-2 border-purple-300 shadow-[0_0_30px_rgba(192,132,252,1)] ring-2 ring-cyan-300 shadow-purple-500/80 animate-pulse",
      metalFinish: "Holographic Platinum Prism W/ Floating Diamond Motes",
      borderHex: "#c084fc",
      rarity: "Mitico",
    },
    banner: {
      id: "banner-tenure-12m",
      name: "Widescreen Holo Platinum Diamond",
      camoType: "Mythic Prismatic Obsidian",
      svgUrl: SVG_TENURE_12M,
    },
    details: [
      "Cornice prismatica ultra-rara con riflesso cangiante",
      "Particelle di diamante fluttuanti in CSS",
      "Massimo prestigio SquadUP Warzone con aura leggendaria",
    ],
  },
];

// ==========================================
// TAB 2: CLAN CRESTS & CAMO BANNERS
// ==========================================

export const SVG_CLAN_BANNER_LVL5 = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="260" viewBox="0 0 900 260">
  <defs>
    <linearGradient id="arcticBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a121e"/>
      <stop offset="50%" stop-color="#14263f"/>
      <stop offset="100%" stop-color="#070d17"/>
    </linearGradient>
    <pattern id="arcticCamo" width="60" height="60" patternUnits="userSpaceOnUse">
      <polygon points="0,0 25,10 20,40 5,30" fill="rgba(255,255,255,0.06)"/>
      <polygon points="35,15 55,20 50,45 30,35" fill="rgba(56,189,248,0.08)"/>
      <polygon points="10,40 30,50 25,60 5,55" fill="rgba(148,163,184,0.05)"/>
    </pattern>
  </defs>
  <rect width="900" height="260" fill="url(#arcticBg)"/>
  <rect width="900" height="260" fill="url(#arcticCamo)"/>
  <!-- Tactical Reticle & Coordinates -->
  <line x1="40" y1="35" x2="180" y2="35" stroke="#38bdf8" stroke-width="3"/>
  <text x="40" y="70" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="900" fill="#38bdf8" letter-spacing="3">// CLAN MIL-SPEC // ARCTIC TASK FORCE</text>
  <text x="40" y="115" font-family="'Impact', sans-serif" font-size="40" font-weight="900" fill="#f8fafc" letter-spacing="2">TASK FORCE ELITE • LVL 5</text>
  <text x="40" y="145" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#94a3b8" letter-spacing="4">MIMETICA ARTICA AD ALTA DEFINIZIONE</text>
</svg>
`)}`;

export const SVG_CLAN_BANNER_LVL10 = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="260" viewBox="0 0 900 260">
  <defs>
    <linearGradient id="stealthBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#05070a"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#020305"/>
    </linearGradient>
    <pattern id="hexStealth" width="30" height="52" patternUnits="userSpaceOnUse">
      <path d="M 0 0 L 15 8.66 L 30 0 L 30 17.32 L 15 26 L 0 17.32 Z" fill="none" stroke="rgba(244,63,94,0.12)" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect width="900" height="260" fill="url(#stealthBg)"/>
  <rect width="900" height="260" fill="url(#hexStealth)"/>
  <line x1="40" y1="35" x2="200" y2="35" stroke="#f43f5e" stroke-width="3.5"/>
  <text x="40" y="70" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="900" fill="#f43f5e" letter-spacing="3">// CLAN MIL-SPEC // GHOST DIVISION LVL 10</text>
  <text x="40" y="115" font-family="'Impact', sans-serif" font-size="40" font-weight="900" fill="#ffffff" letter-spacing="2">GHOST VANGUARD STEALTH</text>
  <text x="40" y="145" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#fb7185" letter-spacing="4">CAMO NOTTURNA BLACK-CARBON • SQUADRA OMBRA</text>
</svg>
`)}`;

export const SVG_CLAN_BANNER_LVL20 = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="260" viewBox="0 0 900 260">
  <defs>
    <linearGradient id="damascusBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#12061f"/>
      <stop offset="50%" stop-color="#2a0845"/>
      <stop offset="100%" stop-color="#090212"/>
    </linearGradient>
    <linearGradient id="damascusGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="50%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="900" height="260" fill="url(#damascusBg)"/>
  <!-- Top Damascus Wave Ribbons -->
  <path d="M 0 60 Q 200 120 400 40 T 800 80 L 900 60 L 900 0 L 0 0 Z" fill="rgba(245,158,11,0.15)"/>
  <path d="M 0 160 Q 250 80 500 180 T 900 140 L 900 260 L 0 260 Z" fill="rgba(236,72,153,0.12)"/>
  <line x1="40" y1="35" x2="220" y2="35" stroke="url(#damascusGlow)" stroke-width="4"/>
  <text x="40" y="70" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="900" fill="#f59e0b" letter-spacing="3">// CLAN MIL-SPEC // APEX TITAN DIVISION</text>
  <text x="40" y="115" font-family="'Impact', sans-serif" font-size="40" font-weight="900" fill="#fef08a" letter-spacing="2">APEX TITAN GOLDEN CAMO</text>
  <text x="40" y="145" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#f472b6" letter-spacing="4">DAMASCUS WEAVE &amp; TITAN GOLD • TRAGUARDO LVL 20</text>
</svg>
`)}`;

export const CLAN_MILESTONES_DATA: ClanMilestoneItem[] = [
  {
    id: "clan_lvl_2",
    levelRequired: 2,
    treasuryRequiredSC: 2000,
    title: "Vanguard Strike Force",
    codename: "TAC-CLAN-02",
    crestName: "Stemma Iron Wolf Vanguard",
    crestSvg: "🐺",
    bannerName: "Widescreen Iron Bastion",
    bannerCamo: "Mimetica Bronzo & Acciaio",
    bannerSvg: SVG_TENURE_3M,
    chatTitle: "[VANGUARD]",
    chatTitleColor: "text-amber-400 bg-amber-950/70 border-amber-500/50",
    rarity: "Standard",
    description: "Sbloccabile al Livello 2 del Clan. Sblocca lo stemma per il logo del clan e il titolo tattico per tutti i membri.",
  },
  {
    id: "clan_lvl_5",
    levelRequired: 5,
    treasuryRequiredSC: 5000,
    title: "Task Force Elite",
    codename: "TAC-CLAN-05",
    crestName: "Stemma Apex Eagle Crest",
    crestSvg: "🦅",
    bannerName: "Widescreen Camo Artica Tattica",
    bannerCamo: "Arctic Winter Tactical Camo",
    bannerSvg: SVG_CLAN_BANNER_LVL5,
    chatTitle: "[TASK FORCE]",
    chatTitleColor: "text-cyan-300 bg-cyan-950/70 border-cyan-400/50",
    rarity: "Elite",
    description: "Sbloccabile al Livello 5 del Clan. Sblocca il prestigioso banner widescreen con camo artica e stemma dell'aquila d'assalto.",
  },
  {
    id: "clan_lvl_10",
    levelRequired: 10,
    treasuryRequiredSC: 10000,
    title: "Ghost Vanguard Stealth",
    codename: "TAC-CLAN-10",
    crestName: "Stemma Ghost Skull Recon",
    crestSvg: "💀",
    bannerName: "Widescreen Camo Notturna Stealth",
    bannerCamo: "Black-Carbon Night Ops Camo",
    bannerSvg: SVG_CLAN_BANNER_LVL10,
    chatTitle: "[GHOST SQUAD]",
    chatTitleColor: "text-rose-300 bg-rose-950/70 border-rose-500/50",
    rarity: "Special Ops",
    description: "Sbloccabile al Livello 10 del Clan. Dotazione black-ops con stemma cranio da ricognizione e banner notturno a esagoni riflettenti.",
  },
  {
    id: "clan_lvl_20",
    levelRequired: 20,
    treasuryRequiredSC: 20000,
    title: "Apex Titan Division",
    codename: "TAC-CLAN-20",
    crestName: "Stemma Titan Lion Crown",
    crestSvg: "👑",
    bannerName: "Widescreen Damascus Apex Gold",
    bannerCamo: "Damascus Weave & Golden Glare",
    bannerSvg: SVG_CLAN_BANNER_LVL20,
    chatTitle: "[APEX TITAN]",
    chatTitleColor: "text-yellow-300 bg-yellow-950/80 border-yellow-400/60 shadow-[0_0_10px_rgba(234,179,8,0.5)]",
    rarity: "Apex",
    description: "Il traguardo supremo per il Clan. Corona leonina dorata, banner in trama damasco imperiale e titolo Apex Titan.",
  },
  {
    id: "clan_tourney_1",
    levelRequired: 1,
    treasuryRequiredSC: 0,
    tournamentsRequired: 1,
    title: "Campioni del Torneo Warzone",
    codename: "WARZONE-VICTORY-01",
    crestName: "Stemma Golden Wreath & Trophy",
    crestSvg: "🏆",
    bannerName: "Widescreen Warzone Champions",
    bannerCamo: "Victory Laurel & Amber Flare",
    bannerSvg: SVG_TENURE_9M,
    chatTitle: "[CHAMPIONS]",
    chatTitleColor: "text-amber-200 bg-amber-900/80 border-amber-300/80 animate-pulse",
    rarity: "Apex",
    description: "Concesso alle squadre che hanno conquistato almeno 1 vittoria o podio in un torneo ufficiale SquadUP.",
  },
];

// ==========================================
// TAB 3: PLAYER ACHIEVEMENTS (TRAGUARDI PROFILO)
// ==========================================

export const SVG_PROFILE_BG_OPERATOR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="300" viewBox="0 0 900 300">
  <defs>
    <linearGradient id="opBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="60%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>
  </defs>
  <rect width="900" height="300" fill="url(#opBg)"/>
  <line x1="30" y1="30" x2="160" y2="30" stroke="#94a3b8" stroke-width="3"/>
  <text x="30" y="65" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="900" fill="#94a3b8" letter-spacing="3">// PROFILE BACKDROP // VERDANSK OUTPOST</text>
  <text x="30" y="110" font-family="'Impact', sans-serif" font-size="36" font-weight="900" fill="#f8fafc" letter-spacing="2">VERDANSK OUTPOST DUSK</text>
  <text x="30" y="140" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#64748b" letter-spacing="3">SFONDO OPERATORE • PRIMO BATTESTIMO DEL FUOCO</text>
</svg>
`)}`;

export const SVG_PROFILE_BG_TACTICIAN = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="300" viewBox="0 0 900 300">
  <defs>
    <linearGradient id="tacBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#051c24"/>
      <stop offset="50%" stop-color="#0b3846"/>
      <stop offset="100%" stop-color="#031117"/>
    </linearGradient>
  </defs>
  <rect width="900" height="300" fill="url(#tacBg)"/>
  <line x1="30" y1="30" x2="160" y2="30" stroke="#06b6d4" stroke-width="3"/>
  <text x="30" y="65" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="900" fill="#06b6d4" letter-spacing="3">// PROFILE BACKDROP // HIGH-TECH BUNKER</text>
  <text x="30" y="110" font-family="'Impact', sans-serif" font-size="36" font-weight="900" fill="#e0f2fe" letter-spacing="2">TACTICAL BUNKER RECON</text>
  <text x="30" y="140" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#0891b2" letter-spacing="3">SFONDO TATTICO • MIRINO HUD AD ALTA PRECISIONE</text>
</svg>
`)}`;

export const SVG_PROFILE_BG_STRIKER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="300" viewBox="0 0 900 300">
  <defs>
    <linearGradient id="strikerBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f1003"/>
      <stop offset="50%" stop-color="#3d1f05"/>
      <stop offset="100%" stop-color="#140901"/>
    </linearGradient>
  </defs>
  <rect width="900" height="300" fill="url(#strikerBg)"/>
  <line x1="30" y1="30" x2="160" y2="30" stroke="#f59e0b" stroke-width="3"/>
  <text x="30" y="65" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="900" fill="#f59e0b" letter-spacing="3">// PROFILE BACKDROP // CYBER WARFIELD</text>
  <text x="30" y="110" font-family="'Impact', sans-serif" font-size="36" font-weight="900" fill="#fef3c7" letter-spacing="2">CYBER WARFIELD WARZONE</text>
  <text x="30" y="140" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#d97706" letter-spacing="3">SFONDO STRIKER • FORZA D'ASSAALTO BALISTICA</text>
</svg>
`)}`;

export const SVG_PROFILE_BG_MVP = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="300" viewBox="0 0 900 300">
  <defs>
    <linearGradient id="mvpBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f1402"/>
      <stop offset="40%" stop-color="#3d2805"/>
      <stop offset="80%" stop-color="#180e01"/>
      <stop offset="100%" stop-color="#0a0500"/>
    </linearGradient>
    <linearGradient id="mvpGold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
  </defs>
  <rect width="900" height="300" fill="url(#mvpBg)"/>
  <line x1="30" y1="30" x2="200" y2="30" stroke="url(#mvpGold)" stroke-width="4"/>
  <text x="30" y="65" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="900" fill="#facc15" letter-spacing="3">// PROFILE BACKDROP // MVP WARZONE GLORY</text>
  <text x="30" y="110" font-family="'Impact', sans-serif" font-size="36" font-weight="900" fill="#fef08a" letter-spacing="2">MVP WARZONE CHAMPION'S GLORY</text>
  <text x="30" y="140" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#ca8a04" letter-spacing="3">SFONDO LEGEND • DOMINATORE ASSOLUTO DEL CAMPO</text>
</svg>
`)}`;

export const PLAYER_ACHIEVEMENTS_DATA: PlayerAchievementItem[] = [
  {
    id: "achieve_operator",
    title: "Battesimo del Fuoco",
    codename: "OP-CERTIFIED-01",
    badgeName: "Distintivo Operatore d'Acciaio",
    badgeMetalFinish: "bronze_steel",
    badgeSvg: "🛡️",
    profileTitle: "OPERATOR",
    profileThemeName: "Verdansk Outpost Dusk",
    profileThemeSvg: SVG_PROFILE_BG_OPERATOR,
    requirementText: "Partecipa ad almeno 1 Torneo o pubblica il tuo 1° post",
    statType: "tournaments",
    targetValue: 1,
    rarity: "Operatore",
    loreText: "Assegnato al primo dispiegamento sul campo operativo SquadUP.",
  },
  {
    id: "achieve_tactician",
    title: "Mente Strategica",
    codename: "TAC-OFFICER-03",
    badgeName: "Distintivo Tattico Titanio",
    badgeMetalFinish: "titanium_cyan",
    badgeSvg: "🎯",
    profileTitle: "TATTICO",
    profileThemeName: "Tactical High-Tech Bunker",
    profileThemeSvg: SVG_PROFILE_BG_TACTICIAN,
    requirementText: "Partecipa a 3 Tornei o pubblica 3 post nella community",
    statType: "tournaments",
    targetValue: 3,
    rarity: "Tattico",
    loreText: "Riconoscimento per aver pianificato e condotto ingaggi con precisione analitica.",
  },
  {
    id: "achieve_striker",
    title: "Forza d'Impatto",
    codename: "STRIKE-LEAD-05",
    badgeName: "Distintivo Striker Carbon-Amber",
    badgeMetalFinish: "carbon_amber",
    badgeSvg: "⚡",
    profileTitle: "STRIKER",
    profileThemeName: "Cyber Warfield Warzone",
    profileThemeSvg: SVG_PROFILE_BG_STRIKER,
    requirementText: "Partecipa a 5 Tornei o pubblica 8 post nella community",
    statType: "tournaments",
    targetValue: 5,
    rarity: "Veterano",
    loreText: "Capacità balistica letale e costanza operativa dimostrata in molteplici scontri a fuoco.",
  },
  {
    id: "achieve_mvp",
    title: "Leggenda di Warzone",
    codename: "WARZONE-MVP-LEGEND",
    badgeName: "Distintivo MVP Oro Massiccio 3D",
    badgeMetalFinish: "heavy_gold",
    badgeSvg: "👑",
    profileTitle: "MVP WARZONE",
    profileThemeName: "Warzone Champion's Glory",
    profileThemeSvg: SVG_PROFILE_BG_MVP,
    requirementText: "Ottieni almeno 1 Vittoria in Torneo (o Account Founder)",
    statType: "wins",
    targetValue: 1,
    rarity: "Campione",
    loreText: "Il titolo più ambito dell'infrastruttura SquadUP: dominatore assoluto di Warzone.",
  },
];
