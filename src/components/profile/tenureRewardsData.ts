export interface TenureMilestone {
  months: 3 | 6 | 9 | 12;
  id: string; // "tenure_3m", "tenure_6m", "tenure_9m", "tenure_12m"
  title: string;
  badgeLabel: string;
  badgeColor: string;
  glowColor: string;
  frame: {
    id: string;
    name: string;
    borderClass: string;
    glowClass: string;
    previewColor: string;
    rarity: string;
  };
  banner: {
    id: string;
    name: string;
    gradient: string;
    accent: string;
    rarity: string;
    svgUrl: string;
  };
  description: string;
  perk: string;
}

// Crisp inline SVGs for high-performance zero-dependency banners
const SVG_BANNER_3M = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#140a02"/>
      <stop offset="50%" stop-color="#2d1504"/>
      <stop offset="100%" stop-color="#120701"/>
    </linearGradient>
    <linearGradient id="bronze" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b45309"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(217,119,6,0.12)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="800" height="300" fill="url(#bg)"/>
  <rect width="800" height="300" fill="url(#grid)"/>
  <circle cx="700" cy="80" r="140" fill="rgba(217,119,6,0.08)" filter="blur(30px)"/>
  <!-- Tactical Diagonal Stripes -->
  <path d="M 620 0 L 720 0 L 600 300 L 500 300 Z" fill="rgba(217,119,6,0.06)"/>
  <path d="M 680 0 L 750 0 L 660 300 L 590 300 Z" fill="rgba(245,158,11,0.08)"/>
  <!-- Border and Accent Bars -->
  <line x1="40" y1="35" x2="120" y2="35" stroke="url(#bronze)" stroke-width="3"/>
  <text x="40" y="70" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#fef3c7" letter-spacing="2">VANGUARD BRONZE</text>
  <text x="40" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="13" fill="#d97706" letter-spacing="4">VETERANO 3 MESI • SQUADUP PRO</text>
  <!-- Tactical Insignia Badge -->
  <g transform="translate(680, 150)">
    <polygon points="0,-45 40,-20 40,25 0,50 -40,25 -40,-20" fill="#1f1103" stroke="url(#bronze)" stroke-width="3"/>
    <text x="0" y="5" font-family="system-ui, sans-serif" font-weight="900" font-size="18" fill="#fbbf24" text-anchor="middle">3M</text>
    <text x="0" y="20" font-family="system-ui, sans-serif" font-weight="800" font-size="8" fill="#92400e" text-anchor="middle" letter-spacing="1">TENURE</text>
  </g>
</svg>
`)}`;

const SVG_BANNER_6M = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300">
  <defs>
    <linearGradient id="silverBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1120"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>
    <linearGradient id="silver" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="50%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.5" fill="rgba(226,232,240,0.15)"/>
    </pattern>
  </defs>
  <rect width="800" height="300" fill="url(#silverBg)"/>
  <rect width="800" height="300" fill="url(#dots)"/>
  <circle cx="150" cy="220" r="150" fill="rgba(226,232,240,0.06)" filter="blur(40px)"/>
  <!-- Geometric Lines -->
  <path d="M 0 250 L 300 250 L 400 300 L 0 300 Z" fill="rgba(226,232,240,0.04)"/>
  <line x1="40" y1="35" x2="140" y2="35" stroke="url(#silver)" stroke-width="3"/>
  <text x="40" y="70" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#f8fafc" letter-spacing="2">SILVER STRIKE</text>
  <text x="40" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="13" fill="#cbd5e1" letter-spacing="4">SPECIALISTA 6 MESI • SQUADUP PRO</text>
  <!-- Diamond Crest -->
  <g transform="translate(680, 150)">
    <polygon points="0,-48 45,0 0,48 -45,0" fill="#0f172a" stroke="url(#silver)" stroke-width="3"/>
    <text x="0" y="6" font-family="system-ui, sans-serif" font-weight="900" font-size="19" fill="#f8fafc" text-anchor="middle">6M</text>
    <text x="0" y="21" font-family="system-ui, sans-serif" font-weight="800" font-size="8" fill="#94a3b8" text-anchor="middle" letter-spacing="1">TENURE</text>
  </g>
</svg>
`)}`;

const SVG_BANNER_9M = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300">
  <defs>
    <linearGradient id="goldBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f1402"/>
      <stop offset="50%" stop-color="#3b2505"/>
      <stop offset="100%" stop-color="#140a01"/>
    </linearGradient>
    <linearGradient id="goldGleam" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ca8a04"/>
      <stop offset="50%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
  </defs>
  <rect width="800" height="300" fill="url(#goldBg)"/>
  <!-- Sunburst Ray Patterns -->
  <g opacity="0.12" stroke="#facc15" stroke-width="1.5">
    <line x1="700" y1="150" x2="350" y2="0"/>
    <line x1="700" y1="150" x2="400" y2="50"/>
    <line x1="700" y1="150" x2="300" y2="120"/>
    <line x1="700" y1="150" x2="320" y2="220"/>
    <line x1="700" y1="150" x2="450" y2="300"/>
  </g>
  <line x1="40" y1="35" x2="150" y2="35" stroke="url(#goldGleam)" stroke-width="4"/>
  <text x="40" y="70" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#fef08a" letter-spacing="2">GOLDEN EMPIRE</text>
  <text x="40" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="13" fill="#fbbf24" letter-spacing="4">COMANDANTE 9 MESI • SQUADUP PRO</text>
  <!-- Royal Seal -->
  <g transform="translate(680, 150)">
    <circle cx="0" cy="0" r="48" fill="#231502" stroke="url(#goldGleam)" stroke-width="3.5"/>
    <circle cx="0" cy="0" r="40" fill="none" stroke="rgba(250,204,21,0.3)" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="0" y="7" font-family="system-ui, sans-serif" font-weight="900" font-size="21" fill="#fef08a" text-anchor="middle">9M</text>
    <text x="0" y="24" font-family="system-ui, sans-serif" font-weight="800" font-size="8" fill="#ca8a04" text-anchor="middle" letter-spacing="1">TENURE</text>
  </g>
</svg>
`)}`;

const SVG_BANNER_12M = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300">
  <defs>
    <linearGradient id="diamondBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#021422"/>
      <stop offset="50%" stop-color="#063249"/>
      <stop offset="100%" stop-color="#010c14"/>
    </linearGradient>
    <linearGradient id="cyanPrism" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="50%" stop-color="#e0f2fe"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <pattern id="prismGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 40 M 0 0 L 40 40" fill="none" stroke="rgba(6,182,212,0.12)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="800" height="300" fill="url(#diamondBg)"/>
  <rect width="800" height="300" fill="url(#prismGrid)"/>
  <circle cx="680" cy="150" r="160" fill="rgba(6,182,212,0.12)" filter="blur(45px)"/>
  <!-- Futuristic Accents -->
  <line x1="40" y1="35" x2="160" y2="35" stroke="url(#cyanPrism)" stroke-width="4"/>
  <text x="40" y="70" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#e0f2fe" letter-spacing="2">OBSIDIAN LEGEND</text>
  <text x="40" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="13" fill="#38bdf8" letter-spacing="4">DIAMANTE 1 ANNO • SQUADUP LEGEND</text>
  <!-- Diamond Crest -->
  <g transform="translate(680, 150)">
    <polygon points="0,-52 50,-10 32,48 -32,48 -50,-10" fill="#041a29" stroke="url(#cyanPrism)" stroke-width="3.5"/>
    <text x="0" y="4" font-family="system-ui, sans-serif" font-weight="900" font-size="18" fill="#e0f2fe" text-anchor="middle">12M</text>
    <text x="0" y="21" font-family="system-ui, sans-serif" font-weight="800" font-size="8" fill="#38bdf8" text-anchor="middle" letter-spacing="1">1 ANNO</text>
  </g>
</svg>
`)}`;

export const TENURE_REWARDS: TenureMilestone[] = [
  {
    months: 3,
    id: "tenure_3m",
    title: "Veterano di Bronzo — 3 Mesi",
    badgeLabel: "3 Mesi Pro",
    badgeColor: "bg-amber-800/40 text-amber-300 border-amber-600/60",
    glowColor: "rgba(217, 119, 6, 0.5)",
    frame: {
      id: "frame-tenure-3m",
      name: "Bronzo Spazzolato 3M",
      borderClass: "border-amber-600",
      glowClass: "shadow-[0_0_15px_rgba(217,119,6,0.8)] ring-2 ring-amber-600/50",
      previewColor: "from-amber-600 via-amber-700 to-amber-900",
      rarity: "Raro",
    },
    banner: {
      id: "banner-tenure-3m",
      name: "Vanguard Bronze 3M",
      gradient: "from-[#291404] via-[#4d2508] to-[#170a02]",
      accent: "amber",
      rarity: "Raro",
      svgUrl: SVG_BANNER_3M,
    },
    description: "Bronzo spazzolato con micro-incisioni tattiche e riflessi caldi.",
    perk: "Cornice bronzo con micro-incisioni balistiche + Banner tattico Vanguard",
  },
  {
    months: 6,
    id: "tenure_6m",
    title: "Argento Titanio Laser — 6 Mesi",
    badgeLabel: "6 Mesi Pro",
    badgeColor: "bg-cyan-950/70 text-cyan-200 border-cyan-400/60",
    glowColor: "rgba(6, 182, 212, 0.7)",
    frame: {
      id: "frame-tenure-6m",
      name: "Argento Titanio Laser 6M",
      borderClass: "border-cyan-400",
      glowClass: "shadow-[0_0_20px_rgba(6,182,212,0.9)] ring-2 ring-cyan-500/70",
      previewColor: "from-slate-200 via-cyan-400 to-slate-600",
      rarity: "Epico",
    },
    banner: {
      id: "banner-tenure-6m",
      name: "Titanium Laser 6M",
      gradient: "from-[#051322] via-[#0b253d] to-[#040e1a]",
      accent: "cyan",
      rarity: "Epico",
      svgUrl: SVG_BANNER_6M,
    },
    description: "Argento titanio con inserti laser a LED azzurro (Neon Glow).",
    perk: "Cornice titanio aerospaziale LED laser + Banner Titanium Strike",
  },
  {
    months: 9,
    id: "tenure_9m",
    title: "Oro Imperiale Massiccio — 9 Mesi",
    badgeLabel: "9 Mesi Pro",
    badgeColor: "bg-yellow-950/70 text-yellow-200 border-yellow-400/70",
    glowColor: "rgba(245, 158, 11, 0.8)",
    frame: {
      id: "frame-tenure-9m",
      name: "Oro Imperiale Geometrico 9M",
      borderClass: "border-yellow-400",
      glowClass: "shadow-[0_0_25px_rgba(250,204,21,0.95)] ring-2 ring-amber-400/80 animate-pulse",
      previewColor: "from-yellow-300 via-amber-400 to-amber-600",
      rarity: "Leggendario",
    },
    banner: {
      id: "banner-tenure-9m",
      name: "Golden Imperial 9M",
      gradient: "from-[#382604] via-[#5c3e07] to-[#241701]",
      accent: "amber",
      rarity: "Leggendario",
      svgUrl: SVG_BANNER_9M,
    },
    description: "Oro imperiale massiccio con bordi geometrici e bagliore ambra.",
    perk: "Cornice oro massiccio sfaccettato + Banner Golden Imperial",
  },
  {
    months: 12,
    id: "tenure_12m",
    title: "Diamante Platino Olografico — 1 Anno (12 Mesi)",
    badgeLabel: "1 Anno Pro (12M)",
    badgeColor: "bg-purple-950/70 text-purple-200 border-purple-400/80",
    glowColor: "rgba(192, 132, 252, 0.9)",
    frame: {
      id: "frame-tenure-12m",
      name: "Diamante Platino Olografico 12M",
      borderClass: "border-purple-300",
      glowClass: "shadow-[0_0_30px_rgba(192,132,252,1)] ring-2 ring-cyan-300 shadow-purple-500/80 animate-pulse",
      previewColor: "from-purple-300 via-cyan-300 to-indigo-500",
      rarity: "Mitico",
    },
    banner: {
      id: "banner-tenure-12m",
      name: "Holo Platinum Diamond 12M",
      gradient: "from-[#0d071a] via-[#1a0f35] to-[#080411]",
      accent: "purple",
      rarity: "Mitico",
      svgUrl: SVG_BANNER_12M,
    },
    description: "Diamante platino olografico con riflessi prismatici viola/azzurri e particelle fluttuanti.",
    perk: "Cornice prismatica olografica con moti di diamante + Banner Holo Platinum",
  },
];

/**
 * Calcola l'anzianità in mesi dell'abbonamento Pro dell'utente.
 * Per fedezdesimone@gmail.com o God Mode, ritorna sempre 12 (massima anzianità).
 */
export function calculateTenureMonths(
  subscriptionTier?: string,
  proExpiresAt?: string | null,
  createdAt?: string,
  isUniversalAdmin: boolean = false
): number {
  if (isUniversalAdmin) return 12;
  if (subscriptionTier !== "pro") return 0;

  let months = 1;

  if (proExpiresAt) {
    const diffToExpiry = new Date(proExpiresAt).getTime() - Date.now();
    const monthsAhead = Math.ceil(diffToExpiry / (30 * 24 * 60 * 60 * 1000));
    if (monthsAhead > 0) {
      months = Math.max(months, monthsAhead);
    }
  }

  if (createdAt) {
    const diffFromCreation = Date.now() - new Date(createdAt).getTime();
    const monthsFromCreation = Math.ceil(diffFromCreation / (30 * 24 * 60 * 60 * 1000));
    if (monthsFromCreation > 0) {
      months = Math.max(months, monthsFromCreation);
    }
  }

  return Math.min(12, Math.max(1, months));
}
