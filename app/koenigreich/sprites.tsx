import type { PowerKind } from "./engine";

/* Alle Spielgrafiken als Vektor-Symbole: sie werden einmal pro Seite definiert und
   über <use> beliebig oft gestochen scharf in jeder Auflösung gezeichnet. */

type Point = [number, number];

const GEM_COLORS = [
  { light: "#ffc2ca", mid: "#f0304f", dark: "#9a0a2a", line: "#5a0318" },
  { light: "#cdeaff", mid: "#3189f2", dark: "#1240a6", line: "#0a2460" },
  { light: "#cffcc2", mid: "#2fc25a", dark: "#11782f", line: "#08431c" },
  { light: "#fff8c8", mid: "#ffcd24", dark: "#d18600", line: "#744400" },
  { light: "#f3d6ff", mid: "#b65cf2", dark: "#6721a8", line: "#3a0b64" },
  { light: "#ffe3b8", mid: "#ff9526", dark: "#c45406", line: "#6a2a00" },
];

function regular(count: number, radius: number, rotation: number, cx = 50, cy = 50): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = rotation + (index * 2 * Math.PI) / count;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });
}

function scale(points: Point[], factor: number, cx = 50, cy = 50): Point[] {
  return points.map(([x, y]) => [cx + (x - cx) * factor, cy + (y - cy) * factor]);
}

function pts(points: Point[]): string {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

/** Facetten zwischen äußerer Kontur und Tafel, abwechselnd hell und dunkel. */
function Facets({ outer, inner }: { outer: Point[]; inner: Point[] }) {
  return (
    <>
      {outer.map((point, index) => {
        const next = (index + 1) % outer.length;
        return (
          <polygon
            key={index}
            points={pts([point, outer[next], inner[next], inner[index]])}
            fill={index % 2 === 0 ? "#fff" : "#000"}
            opacity={index % 2 === 0 ? 0.2 : 0.14}
          />
        );
      })}
    </>
  );
}

function Sparkle({ x, y, size }: { x: number; y: number; size: number }) {
  const s = size;
  return (
    <path
      d={`M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z`}
      fill="#fff"
    />
  );
}

function Shine() {
  return (
    <>
      <ellipse cx="36" cy="30" rx="12" ry="6.5" fill="#fff" opacity=".55" transform="rotate(-32 36 30)" />
      <Sparkle x={66} y={30} size={5} />
    </>
  );
}

const RUBY_OUTER = regular(8, 43, Math.PI / 8);
const RUBY_TABLE = regular(8, 23, Math.PI / 8);
const SAPPHIRE_OUTER: Point[] = [[50, 4], [95, 50], [50, 96], [5, 50]];
const SAPPHIRE_TABLE = scale(SAPPHIRE_OUTER, 0.46);
const EMERALD_OUTER: Point[] = [[30, 8], [70, 8], [90, 28], [90, 72], [70, 92], [30, 92], [10, 72], [10, 28]];
const EMERALD_TABLE = scale(EMERALD_OUTER, 0.58);
const STAR_CENTER: Point = [50, 54];
const STAR_POINTS = regular(5, 47, -Math.PI / 2, ...STAR_CENTER);
const STAR_VALLEYS = regular(5, 21, -Math.PI / 2 + Math.PI / 5, ...STAR_CENTER);
const STAR_OUTLINE = STAR_POINTS.flatMap((point, index) => [point, STAR_VALLEYS[index]]);
const TRILLION_OUTER: Point[] = [[50, 7], [95, 87], [5, 87]];
const TRILLION_TABLE = scale(TRILLION_OUTER, 0.45, 50, 60);
const HEART = "M50 90 C22 70 6 54 8 34 C10 16 32 8 50 26 C68 8 90 16 92 34 C94 54 78 70 50 90Z";

function GemDefs() {
  return (
    <>
      {GEM_COLORS.map((color, index) => (
        <g key={index}>
          <linearGradient id={`reich-gem-fill-${index}`} x1="0.15" y1="0.05" x2="0.85" y2="0.95">
            <stop offset="0" stopColor={color.light} />
            <stop offset=".45" stopColor={color.mid} />
            <stop offset="1" stopColor={color.dark} />
          </linearGradient>
          <radialGradient id={`reich-gem-table-${index}`} cx=".38" cy=".32" r=".8">
            <stop offset="0" stopColor="#fff" stopOpacity=".95" />
            <stop offset=".35" stopColor={color.light} />
            <stop offset="1" stopColor={color.mid} />
          </radialGradient>
        </g>
      ))}
    </>
  );
}

function GemSymbols() {
  const fill = (index: number) => `url(#reich-gem-fill-${index})`;
  const table = (index: number) => `url(#reich-gem-table-${index})`;
  const line = (index: number) => GEM_COLORS[index].line;
  return (
    <>
      <symbol id="reich-gem-0" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill={fill(0)} stroke={line(0)} strokeWidth="3" />
        <Facets outer={RUBY_OUTER} inner={RUBY_TABLE} />
        <polygon points={pts(RUBY_TABLE)} fill={table(0)} stroke={line(0)} strokeOpacity=".35" strokeWidth="1.2" />
        <Shine />
      </symbol>
      <symbol id="reich-gem-1" viewBox="0 0 100 100">
        <polygon points={pts(SAPPHIRE_OUTER)} fill={fill(1)} stroke={line(1)} strokeWidth="3" strokeLinejoin="round" />
        <Facets outer={SAPPHIRE_OUTER} inner={SAPPHIRE_TABLE} />
        <polygon points={pts(SAPPHIRE_TABLE)} fill={table(1)} stroke={line(1)} strokeOpacity=".35" strokeWidth="1.2" />
        <ellipse cx="40" cy="34" rx="9" ry="4.5" fill="#fff" opacity=".6" transform="rotate(-45 40 34)" />
        <Sparkle x={62} y={36} size={4.5} />
      </symbol>
      <symbol id="reich-gem-2" viewBox="0 0 100 100">
        <polygon points={pts(EMERALD_OUTER)} fill={fill(2)} stroke={line(2)} strokeWidth="3" strokeLinejoin="round" />
        <Facets outer={EMERALD_OUTER} inner={EMERALD_TABLE} />
        <polygon points={pts(EMERALD_TABLE)} fill={table(2)} stroke={line(2)} strokeOpacity=".35" strokeWidth="1.2" />
        <rect x="32" y="27" width="14" height="5" rx="2.5" fill="#fff" opacity=".65" />
        <Sparkle x={64} y={33} size={4.5} />
      </symbol>
      <symbol id="reich-gem-3" viewBox="0 0 100 100">
        <polygon points={pts(STAR_OUTLINE)} fill={fill(3)} stroke={line(3)} strokeWidth="3" strokeLinejoin="round" />
        {STAR_POINTS.map((point, index) => (
          <g key={index}>
            <polygon points={pts([STAR_CENTER, point, STAR_VALLEYS[index]])} fill="#fff" opacity=".28" />
            <polygon points={pts([STAR_CENTER, point, STAR_VALLEYS[(index + 4) % 5]])} fill="#000" opacity=".1" />
          </g>
        ))}
        <circle cx="50" cy="54" r="9" fill={table(3)} />
        <Sparkle x={42} y={30} size={5} />
      </symbol>
      <symbol id="reich-gem-4" viewBox="0 0 100 100">
        <path d={HEART} fill={fill(4)} stroke={line(4)} strokeWidth="3" strokeLinejoin="round" />
        <path d="M50 26 L50 90 M8 34 L50 52 L92 34" stroke="#000" strokeOpacity=".12" strokeWidth="2" fill="none" />
        <path d={HEART} fill={table(4)} transform="translate(27.5 22) scale(.45)" opacity=".95" />
        <ellipse cx="28" cy="30" rx="9" ry="5" fill="#fff" opacity=".6" transform="rotate(-40 28 30)" />
        <Sparkle x={72} y={30} size={4.5} />
      </symbol>
      <symbol id="reich-gem-5" viewBox="0 0 100 100">
        <polygon points={pts(TRILLION_OUTER)} fill={fill(5)} stroke={line(5)} strokeWidth="3" strokeLinejoin="round" />
        <Facets outer={TRILLION_OUTER} inner={TRILLION_TABLE} />
        <polygon points={pts(TRILLION_TABLE)} fill={table(5)} stroke={line(5)} strokeOpacity=".35" strokeWidth="1.2" />
        <ellipse cx="40" cy="40" rx="7" ry="3.5" fill="#fff" opacity=".6" transform="rotate(-60 40 40)" />
        <Sparkle x={58} y={34} size={4} />
      </symbol>
    </>
  );
}

function PowerSymbols() {
  return (
    <>
      <linearGradient id="reich-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".5" stopColor="#dfe6ee" />
        <stop offset="1" stopColor="#8d9aa8" />
      </linearGradient>
      <linearGradient id="reich-red" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff8a7a" />
        <stop offset=".5" stopColor="#ec2b2b" />
        <stop offset="1" stopColor="#9c0d14" />
      </linearGradient>
      <linearGradient id="reich-red-stick" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ff7a68" />
        <stop offset=".45" stopColor="#e5262a" />
        <stop offset="1" stopColor="#8c0b12" />
      </linearGradient>
      <radialGradient id="reich-flame" cx=".9" cy=".5" r=".9">
        <stop offset="0" stopColor="#fff7c0" />
        <stop offset=".45" stopColor="#ffc33a" />
        <stop offset="1" stopColor="#ff5a1f" />
      </radialGradient>
      <radialGradient id="reich-window" cx=".35" cy=".3" r=".8">
        <stop offset="0" stopColor="#d9f3ff" />
        <stop offset=".5" stopColor="#3aa6f5" />
        <stop offset="1" stopColor="#0d4a9e" />
      </radialGradient>
      <radialGradient id="reich-gold" cx=".35" cy=".3" r=".85">
        <stop offset="0" stopColor="#fffbd6" />
        <stop offset=".45" stopColor="#ffcf3a" />
        <stop offset="1" stopColor="#b77400" />
      </radialGradient>
      <radialGradient id="reich-orb" cx=".4" cy=".36" r=".7">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".22" stopColor="#f8cfff" />
        <stop offset=".6" stopColor="#b14ff0" />
        <stop offset="1" stopColor="#3f0f86" />
      </radialGradient>
      <radialGradient id="reich-orb-glow" cx=".5" cy=".5" r=".5">
        <stop offset=".6" stopColor="#e27bff" stopOpacity=".7" />
        <stop offset="1" stopColor="#e27bff" stopOpacity="0" />
      </radialGradient>

      {/* Rakete zeigt nach rechts; die senkrechte Variante wird gedreht. */}
      <symbol id="reich-rocket" viewBox="0 0 100 100">
        <path d="M27 39 C15 39 7 45 1 50 C7 55 15 61 27 61Z" fill="url(#reich-flame)">
          <animate attributeName="d" dur=".35s" repeatCount="indefinite"
            values="M27 39 C15 39 7 45 1 50 C7 55 15 61 27 61Z;M27 40 C17 40 11 46 6 50 C11 54 17 60 27 60Z;M27 39 C15 39 7 45 1 50 C7 55 15 61 27 61Z" />
        </path>
        <path d="M27 44 C20 44 15 47 11 50 C15 53 20 56 27 56Z" fill="#fffbe0" />
        <path d="M30 38 L20 19 Q36 21 46 37Z" fill="url(#reich-red)" stroke="#5c0a0e" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M30 62 L20 81 Q36 79 46 63Z" fill="url(#reich-red)" stroke="#5c0a0e" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M25 36 H66 C80 36 90 44 97 50 C90 56 80 64 66 64 H25 Q21 50 25 36Z" fill="url(#reich-metal)" stroke="#3e4955" strokeWidth="2.5" />
        <path d="M70 36.6 C82 38.5 91 44.5 97 50 C91 55.5 82 61.5 70 63.4 Q75 50 70 36.6Z" fill="url(#reich-red)" stroke="#5c0a0e" strokeWidth="2" />
        <rect x="31" y="36.5" width="6" height="27" fill="url(#reich-red)" />
        <circle cx="53" cy="50" r="8.5" fill="url(#reich-window)" stroke="#c8d2de" strokeWidth="3" />
        <circle cx="50.5" cy="47" r="2.6" fill="#fff" opacity=".9" />
        <path d="M30 41 H64" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
      </symbol>

      <symbol id="reich-dynamite" viewBox="0 0 100 100">
        <path d="M50 30 C49 20 58 16 63 11" stroke="#6b4423" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <g transform="translate(64 10)">
          <circle r="7" fill="#ffd34a" opacity=".55">
            <animate attributeName="r" values="5;9;5" dur=".5s" repeatCount="indefinite" />
          </circle>
          <path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8Z" fill="#fff6c0">
            <animateTransform attributeName="transform" type="rotate" values="0;45;0" dur=".4s" repeatCount="indefinite" />
          </path>
        </g>
        {[20, 41, 62].map((x) => (
          <g key={x}>
            <rect x={x} y="30" width="19" height="60" rx="7" fill="url(#reich-red-stick)" stroke="#5c0a0e" strokeWidth="2.5" />
            <ellipse cx={x + 9.5} cy="33" rx="7" ry="2.6" fill="#ffd0c4" opacity=".85" />
            <rect x={x + 4} y="38" width="3.5" height="46" rx="1.75" fill="#fff" opacity=".35" />
          </g>
        ))}
        <rect x="16" y="54" width="68" height="14" rx="3" fill="#3a2618" stroke="#1c120a" strokeWidth="2" />
        <text x="50" y="65" textAnchor="middle" fontFamily="Arial Black,Arial,sans-serif" fontWeight="900" fontSize="11" fill="#ffd54f">TNT</text>
      </symbol>

      <symbol id="reich-spinner" viewBox="0 0 100 100">
        {["#ff5470", "#ffd23f", "#3fa2ff", "#4fd27a"].map((color, index) => (
          <g key={color} transform={`rotate(${index * 90} 50 50)`}>
            <path d="M50 46 C38 40 36 18 44 8 C50 2 58 4 60 12 C63 24 58 40 50 46Z" fill={color} stroke="#2a1a3a" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M47 38 C42 30 42 18 46 12" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".6" />
          </g>
        ))}
        <circle cx="50" cy="50" r="12" fill="url(#reich-gold)" stroke="#6a4300" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="4.5" fill="#fff6c8" />
      </symbol>

      <symbol id="reich-electro" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="url(#reich-orb-glow)">
          <animate attributeName="opacity" values=".6;1;.6" dur="1.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="50" cy="50" r="36" fill="url(#reich-orb)" stroke="#2c0866" strokeWidth="2.5" />
        <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
          <path d="M36 30 L46 46 L38 52 L52 72" strokeWidth="3.2">
            <animate attributeName="opacity" values="1;.25;1" dur=".6s" repeatCount="indefinite" />
          </path>
          <path d="M64 28 L56 44 L66 50 L58 68" strokeWidth="2.4" opacity=".85">
            <animate attributeName="opacity" values=".3;1;.3" dur=".7s" repeatCount="indefinite" />
          </path>
        </g>
        <ellipse cx="38" cy="30" rx="11" ry="6" fill="#fff" opacity=".7" transform="rotate(-30 38 30)" />
      </symbol>
    </>
  );
}

function ObstacleSymbols() {
  return (
    <>
      <linearGradient id="reich-wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f2c27a" />
        <stop offset="1" stopColor="#b97938" />
      </linearGradient>
      <linearGradient id="reich-wood-dark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c08548" />
        <stop offset="1" stopColor="#7a4a1e" />
      </linearGradient>
      <linearGradient id="reich-steel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#f4f8fb" />
        <stop offset=".5" stopColor="#aebbc6" />
        <stop offset="1" stopColor="#66737e" />
      </linearGradient>
      <linearGradient id="reich-roof" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff7a6a" />
        <stop offset="1" stopColor="#b8241e" />
      </linearGradient>
      <linearGradient id="reich-house" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8fd6ff" />
        <stop offset="1" stopColor="#3a8fd0" />
      </linearGradient>
      <linearGradient id="reich-leaf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#9be27a" />
        <stop offset="1" stopColor="#2e8b2e" />
      </linearGradient>

      <symbol id="reich-crate-1" viewBox="0 0 100 100">
        <rect x="7" y="7" width="86" height="86" rx="9" fill="url(#reich-wood)" stroke="#6b3f17" strokeWidth="3" />
        <rect x="17" y="17" width="66" height="66" rx="3" fill="#d6984f" stroke="#8a5523" strokeWidth="2" />
        {[33, 50, 67].map((y) => <path key={y} d={`M18 ${y} H82`} stroke="#9c642d" strokeWidth="1.6" />)}
        <path d="M22 26 L74 78" stroke="#6b3f17" strokeWidth="13" strokeLinecap="round" />
        <path d="M22 26 L74 78" stroke="#eab572" strokeWidth="8" strokeLinecap="round" />
        <path d="M24 25 L74 75" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
        {[[12, 12], [88, 12], [12, 88], [88, 88]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="#5a3412" />)}
        <path d="M12 10 H70" stroke="#fff" strokeOpacity=".45" strokeWidth="2.5" strokeLinecap="round" />
      </symbol>
      <symbol id="reich-crate-2" viewBox="0 0 100 100">
        <rect x="7" y="7" width="86" height="86" rx="9" fill="url(#reich-wood-dark)" stroke="#3f2409" strokeWidth="3" />
        <rect x="17" y="17" width="66" height="66" rx="3" fill="#a06a35" stroke="#5c3714" strokeWidth="2" />
        {[33, 50, 67].map((y) => <path key={y} d={`M18 ${y} H82`} stroke="#6e4319" strokeWidth="1.6" />)}
        <path d="M22 26 L74 78" stroke="#3f2409" strokeWidth="12" strokeLinecap="round" />
        <path d="M22 26 L74 78" stroke="#c08548" strokeWidth="7" strokeLinecap="round" />
        {[24, 64].map((x) => (
          <g key={x}>
            <rect x={x} y="5" width="12" height="90" rx="2" fill="url(#reich-steel)" stroke="#3b444c" strokeWidth="2" />
            {[14, 50, 86].map((y) => <circle key={y} cx={x + 6} cy={y} r="2.6" fill="#e9eef2" stroke="#3b444c" strokeWidth="1.2" />)}
          </g>
        ))}
        <path d="M12 10 H70" stroke="#fff" strokeOpacity=".3" strokeWidth="2.5" strokeLinecap="round" />
      </symbol>

      <symbol id="reich-birdhouse" viewBox="0 0 100 100">
        <rect x="45" y="80" width="10" height="18" rx="2" fill="#7a4a1e" stroke="#3f2409" strokeWidth="2" />
        <path d="M22 44 H78 V82 Q78 88 72 88 H28 Q22 88 22 82Z" fill="url(#reich-house)" stroke="#164a78" strokeWidth="3" />
        <path d="M27 50 V82" stroke="#fff" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="64" r="14" fill="#2a1a10" stroke="#164a78" strokeWidth="2.5" />
        <circle cx="50" cy="67" r="11.5" fill="#a06a35" />
        <path d="M40 58 L42 52 L46 57Z M60 58 L58 52 L54 57Z" fill="#a06a35" />
        <circle cx="45" cy="63" r="4.6" fill="#fff" />
        <circle cx="55" cy="63" r="4.6" fill="#fff" />
        <circle cx="45.6" cy="63.4" r="2.4" fill="#1a1a1a" />
        <circle cx="54.4" cy="63.4" r="2.4" fill="#1a1a1a" />
        <path d="M48 67 L52 67 L50 71Z" fill="#ff9f1c" />
        <rect x="40" y="80" width="20" height="3.5" rx="1.75" fill="#7a4a1e" />
        <path d="M12 48 L50 12 L88 48 Q90 52 85 53 L15 53 Q10 52 12 48Z" fill="url(#reich-roof)" stroke="#6e0f0b" strokeWidth="3" strokeLinejoin="round" />
        <path d="M30 40 H70 M40 30 H60" stroke="#6e0f0b" strokeOpacity=".45" strokeWidth="2" />
        <path d="M20 46 L50 18" stroke="#fff" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" />
      </symbol>

      <symbol id="reich-vines" viewBox="0 0 100 100">
        <g fill="none" strokeLinecap="round">
          <path d="M4 20 C28 26 44 58 96 80" stroke="#1d5c20" strokeWidth="9" />
          <path d="M6 84 C34 72 58 40 96 16" stroke="#1d5c20" strokeWidth="9" />
          <path d="M4 20 C28 26 44 58 96 80" stroke="#5fb64a" strokeWidth="5" />
          <path d="M6 84 C34 72 58 40 96 16" stroke="#5fb64a" strokeWidth="5" />
          <path d="M6 19 C28 24 42 54 92 76" stroke="#c6f2a8" strokeWidth="1.5" opacity=".7" />
        </g>
        {[[16, 22, -20], [36, 40, 40], [72, 66, 30], [88, 76, -30], [20, 78, -60], [50, 50, 120], [78, 30, -50], [90, 18, 10]].map(([x, y, angle]) => (
          <path
            key={`${x}-${y}`}
            d="M0 0 C5 -7 15 -7 19 0 C15 7 5 7 0 0Z"
            fill="url(#reich-leaf)"
            stroke="#1d5c20"
            strokeWidth="1.6"
            transform={`translate(${x} ${y}) rotate(${angle})`}
          />
        ))}
      </symbol>

      <symbol id="reich-sprig" viewBox="0 0 100 100">
        <path d="M30 92 C34 62 52 38 78 14" stroke="#1d5c20" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M30 92 C34 62 52 38 78 14" stroke="#5fb64a" strokeWidth="4" fill="none" strokeLinecap="round" />
        {[[38, 62, -110], [50, 44, -20], [62, 30, -120], [44, 54, 20]].map(([x, y, angle]) => (
          <path key={`${x}-${y}`} d="M0 0 C7 -11 23 -11 30 0 C23 11 7 11 0 0Z" fill="url(#reich-leaf)" stroke="#1d5c20" strokeWidth="2" transform={`translate(${x} ${y}) rotate(${angle})`} />
        ))}
      </symbol>

      <symbol id="reich-owl" viewBox="0 0 100 100">
        <path d="M24 30 L28 10 L40 24Z M76 30 L72 10 L60 24Z" fill="#8a5a2e" stroke="#4a2c12" strokeWidth="2.5" strokeLinejoin="round" />
        <ellipse cx="50" cy="58" rx="32" ry="36" fill="#a06a35" stroke="#4a2c12" strokeWidth="3" />
        <ellipse cx="50" cy="70" rx="19" ry="20" fill="#e8c79a" />
        {[[44, 64], [56, 64], [50, 74], [44, 80], [56, 80]].map(([x, y]) => <path key={`${x}-${y}`} d={`M${x - 4} ${y} Q${x} ${y + 4} ${x + 4} ${y}`} stroke="#b4874f" strokeWidth="1.8" fill="none" />)}
        <circle cx="37" cy="40" r="13" fill="#fff" stroke="#4a2c12" strokeWidth="2" />
        <circle cx="63" cy="40" r="13" fill="#fff" stroke="#4a2c12" strokeWidth="2" />
        <circle cx="38" cy="41" r="6.5" fill="#1a1a1a" />
        <circle cx="62" cy="41" r="6.5" fill="#1a1a1a" />
        <circle cx="40" cy="38.5" r="2.2" fill="#fff" />
        <circle cx="64" cy="38.5" r="2.2" fill="#fff" />
        <path d="M45 50 L55 50 L50 59Z" fill="#ff9f1c" stroke="#9a4f00" strokeWidth="1.5" strokeLinejoin="round" />
      </symbol>
    </>
  );
}

function ToolSymbols() {
  return (
    <>
      <linearGradient id="reich-handle" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#d99a5a" />
        <stop offset=".5" stopColor="#b06e33" />
        <stop offset="1" stopColor="#6e3f15" />
      </linearGradient>
      <linearGradient id="reich-iron" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7d8794" />
        <stop offset=".45" stopColor="#3b4450" />
        <stop offset="1" stopColor="#14181e" />
      </linearGradient>

      <symbol id="reich-hammer" viewBox="0 0 100 100">
        <g transform="rotate(-38 50 54)">
          <rect x="45" y="34" width="11" height="62" rx="5" fill="url(#reich-handle)" stroke="#4a2a0c" strokeWidth="2.5" />
          <rect x="45" y="80" width="11" height="10" fill="#8a2a22" />
          <rect x="20" y="12" width="60" height="26" rx="6" fill="url(#reich-steel)" stroke="#2f3840" strokeWidth="3" />
          <rect x="14" y="14" width="10" height="22" rx="3" fill="url(#reich-steel)" stroke="#2f3840" strokeWidth="2.5" />
          <path d="M28 18 H72" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
        </g>
      </symbol>

      <symbol id="reich-arrow" viewBox="0 0 100 100">
        <g transform="rotate(-30 50 50)">
          <rect x="10" y="47" width="72" height="6" rx="3" fill="url(#reich-handle)" stroke="#4a2a0c" strokeWidth="1.5" />
          <path d="M76 36 L97 50 L76 64 L81 50Z" fill="url(#reich-gold)" stroke="#6a4300" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M8 50 L20 34 L32 34 L22 50Z" fill="#ef3b4a" stroke="#6e0f0b" strokeWidth="2" strokeLinejoin="round" />
          <path d="M8 50 L20 66 L32 66 L22 50Z" fill="#c21d2c" stroke="#6e0f0b" strokeWidth="2" strokeLinejoin="round" />
          <path d="M22 37 L28 37" stroke="#fff" strokeWidth="2" opacity=".6" />
        </g>
      </symbol>

      <symbol id="reich-cannon" viewBox="0 0 100 100">
        <g transform="rotate(-50 40 66)">
          <path d="M26 54 H84 Q92 54 92 60 V72 Q92 78 84 78 H26 Q16 78 16 66 Q16 54 26 54Z" fill="url(#reich-iron)" stroke="#0a0c10" strokeWidth="2.5" />
          <rect x="84" y="51" width="8" height="30" rx="3" fill="#2a3038" stroke="#0a0c10" strokeWidth="2" />
          <rect x="40" y="52" width="6" height="28" rx="2" fill="url(#reich-gold)" />
          <path d="M26 58 H80" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".45" />
        </g>
        <circle cx="38" cy="74" r="17" fill="url(#reich-handle)" stroke="#4a2a0c" strokeWidth="3" />
        {[0, 45, 90, 135].map((angle) => <path key={angle} d="M38 59 V89" stroke="#4a2a0c" strokeWidth="3" transform={`rotate(${angle} 38 74)`} />)}
        <circle cx="38" cy="74" r="5" fill="url(#reich-gold)" stroke="#4a2a0c" strokeWidth="1.5" />
        <circle cx="84" cy="14" r="8" fill="url(#reich-iron)" stroke="#0a0c10" strokeWidth="2" />
      </symbol>

      <symbol id="reich-jester" viewBox="0 0 100 100">
        <path d="M18 72 C10 52 8 36 6 24 C24 32 36 48 42 70Z" fill="#ef3b4a" stroke="#5c0a0e" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M58 70 C66 48 78 34 94 24 C92 38 88 56 82 72Z" fill="#2fc25a" stroke="#0b4a1f" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M34 72 C38 44 44 22 50 8 C56 22 62 44 66 72Z" fill="#a24ee6" stroke="#3a0b64" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M44 60 C46 42 48 28 50 18" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".45" />
        <path d="M14 70 Q50 84 86 70 L86 82 Q50 96 14 82Z" fill="url(#reich-gold)" stroke="#6a4300" strokeWidth="2.5" strokeLinejoin="round" />
        {[[30, 82], [50, 86], [70, 82]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" fill="#ef3b4a" />)}
        {[[6, 24], [50, 8], [94, 24]].map(([x, y]) => (
          <g key={x}>
            <circle cx={x} cy={y} r="6.5" fill="url(#reich-gold)" stroke="#6a4300" strokeWidth="2" />
            <circle cx={x - 2} cy={y - 2} r="1.8" fill="#fff" />
          </g>
        ))}
      </symbol>
    </>
  );
}

function MiscSymbols() {
  return (
    <>
      <radialGradient id="reich-boss-skin" cx=".4" cy=".35" r=".8">
        <stop offset="0" stopColor="#8a6bc4" />
        <stop offset="1" stopColor="#2c1650" />
      </radialGradient>
      <linearGradient id="reich-potion-liquid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9effa8" />
        <stop offset="1" stopColor="#18a84a" />
      </linearGradient>

      <symbol id="reich-boss" viewBox="0 0 100 100">
        <path d="M20 34 L26 10 L38 24 L50 6 L62 24 L74 10 L80 34Z" fill="url(#reich-gold)" stroke="#6a4300" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="50" cy="20" r="3.5" fill="#ef2b4a" />
        <circle cx="30" cy="26" r="2.6" fill="#3189f2" />
        <circle cx="70" cy="26" r="2.6" fill="#3189f2" />
        <path d="M16 30 Q14 64 30 82 Q50 98 70 82 Q86 64 84 30Z" fill="url(#reich-boss-skin)" stroke="#140828" strokeWidth="3" />
        <path d="M26 46 L44 52 L42 58 L28 54Z M74 46 L56 52 L58 58 L72 54Z" fill="#ff3d5a">
          <animate attributeName="fill" values="#ff3d5a;#ffb3c0;#ff3d5a" dur="1.4s" repeatCount="indefinite" />
        </path>
        <path d="M24 42 L44 48 M76 42 L56 48" stroke="#140828" strokeWidth="4" strokeLinecap="round" />
        <path d="M34 70 Q50 80 66 70 L62 76 L56 72 L50 78 L44 72 L38 76Z" fill="#140828" />
        <path d="M24 36 Q24 30 34 30" stroke="#fff" strokeOpacity=".35" strokeWidth="3" fill="none" strokeLinecap="round" />
      </symbol>

      <symbol id="reich-potion" viewBox="0 0 100 100">
        <rect x="40" y="6" width="20" height="12" rx="3" fill="url(#reich-handle)" stroke="#4a2a0c" strokeWidth="2.5" />
        <path d="M42 18 H58 V36 C74 40 84 52 84 66 C84 84 68 94 50 94 C32 94 16 84 16 66 C16 52 26 40 42 36Z" fill="#e8f6ff" fillOpacity=".55" stroke="#2b3d55" strokeWidth="3" />
        <path d="M20 62 C30 58 40 66 50 62 C60 58 70 66 80 62 C82 80 68 90 50 90 C32 90 18 80 20 62Z" fill="url(#reich-potion-liquid)" />
        <circle cx="40" cy="74" r="4" fill="#fff" opacity=".6" />
        <circle cx="58" cy="70" r="2.6" fill="#fff" opacity=".6" />
        <path d="M28 54 Q30 46 40 42" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity=".75" />
      </symbol>

      <symbol id="reich-bolt" viewBox="0 0 100 100">
        <path d="M58 4 L22 56 H46 L36 96 L80 38 H54Z" fill="#fff5a8" stroke="#ffb300" strokeWidth="4" strokeLinejoin="round" />
      </symbol>
      <symbol id="reich-bolt-dark" viewBox="0 0 100 100">
        <path d="M58 4 L22 56 H46 L36 96 L80 38 H54Z" fill="#d6a8ff" stroke="#3a0b64" strokeWidth="5" strokeLinejoin="round" />
      </symbol>
    </>
  );
}

/** Einmal pro Seite einbinden; alle Sprites verweisen darauf. */
export function SpriteSheet() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", overflow: "hidden" }} aria-hidden="true" focusable="false">
      <defs>
        <GemDefs />
        <GemSymbols />
        <PowerSymbols />
        <ObstacleSymbols />
        <ToolSymbols />
        <MiscSymbols />
      </defs>
    </svg>
  );
}

export type SpriteId =
  | `gem-${number}` | "rocket" | "dynamite" | "spinner" | "electro" | "crate-1" | "crate-2" | "birdhouse" | "vines"
  | "sprig" | "owl" | "hammer" | "arrow" | "cannon" | "jester" | "boss" | "potion" | "bolt" | "bolt-dark";

export function Sprite({ id, className }: { id: SpriteId; className?: string }) {
  return (
    <svg className={className ? `reich-sprite ${className}` : "reich-sprite"} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <use href={`#reich-${id}`} />
    </svg>
  );
}

export function powerSprite(power: PowerKind): SpriteId {
  return power === "rocketH" || power === "rocketV" ? "rocket" : power;
}
