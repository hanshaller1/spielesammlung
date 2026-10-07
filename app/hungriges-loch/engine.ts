export const KINDS = [
  { symbol: "🍒", name: "Kirsche", tier: 1 },
  { symbol: "🍓", name: "Erdbeere", tier: 1 },
  { symbol: "🍬", name: "Bonbon", tier: 1 },
  { symbol: "🍎", name: "Apfel", tier: 2 },
  { symbol: "🍩", name: "Donut", tier: 2 },
  { symbol: "🧁", name: "Muffin", tier: 2 },
  { symbol: "🎾", name: "Tennisball", tier: 2 },
  { symbol: "⚽", name: "Fußball", tier: 3 },
  { symbol: "🍉", name: "Melone", tier: 3 },
  { symbol: "🧸", name: "Teddy", tier: 3 },
  { symbol: "🎁", name: "Geschenk", tier: 3 },
  { symbol: "🚲", name: "Fahrrad", tier: 4 },
  { symbol: "🛒", name: "Einkaufswagen", tier: 4 },
  { symbol: "📦", name: "Kiste", tier: 4 },
  { symbol: "🎸", name: "Gitarre", tier: 4 },
  { symbol: "🚗", name: "Auto", tier: 5 },
  { symbol: "🌳", name: "Baum", tier: 5 },
  { symbol: "⛵", name: "Segelboot", tier: 5 },
  { symbol: "🏠", name: "Haus", tier: 6 },
  { symbol: "🚌", name: "Bus", tier: 6 },
  { symbol: "🎡", name: "Riesenrad", tier: 6 },
] as const;

export const MAX_SIZE = 6;
/** Radius einer Sache je Stufe und Radius des Lochs je Größe: Größe n schluckt genau bis Stufe n. */
export const TIER_RADIUS = [14, 20, 28, 40, 56, 78];
export const HOLE_RADIUS = [19, 27, 38, 54, 76, 105];
export const TIER_XP = [1, 2, 4, 8, 14, 24];
/** Gesammelte Punkte, ab denen das Loch die Größen 2 bis 6 erreicht. */
export const XP_STEPS = [12, 34, 74, 140, 240];

export const FIT_FACTOR = 0.9;
export const GIANT_FACTOR = 1.5;
export const BOOSTER_TIME = { magnet: 8, giant: 8, freeze: 10 } as const;
const FALL_TIME = 0.32;
const START_CLEARANCE = 70;

export type Booster = keyof typeof BOOSTER_TIME;
export type Random = () => number;
export type LevelConfig = {
  width: number;
  height: number;
  seconds: number;
  /** Symbol → Anzahl auf der Karte. */
  spawn: Record<string, number>;
  /** Symbol → Anzahl, die gefressen werden muss. */
  targets: Record<string, number>;
};
export type Item = {
  id: number;
  kind: number;
  x: number;
  y: number;
  radius: number;
  /** -1 solange die Sache steht, sonst Fortschritt des Falls von 0 bis 1. */
  fall: number;
  /** Restzeit des Wackelns, wenn das Loch noch zu klein ist. */
  wobble: number;
};
export type HoleEvent =
  | { type: "swallow"; kind: number; x: number; y: number; target: boolean }
  | { type: "grow"; size: number }
  | { type: "blocked"; kind: number; x: number; y: number }
  | { type: "won" }
  | { type: "lost" };

export const LEVELS: LevelConfig[] = [
  { width: 520, height: 660, seconds: 45, spawn: { "🍒": 14, "🍓": 12, "🍎": 8 }, targets: { "🍎": 4 } },
  { width: 640, height: 800, seconds: 60, spawn: { "🍒": 14, "🍬": 14, "🍎": 9, "🍩": 10, "⚽": 5 }, targets: { "🍩": 6, "⚽": 2 } },
  { width: 740, height: 920, seconds: 70, spawn: { "🍓": 16, "🍬": 14, "🍎": 10, "🧁": 11, "⚽": 7, "🧸": 6 }, targets: { "🧁": 7, "🧸": 4 } },
  { width: 840, height: 1040, seconds: 85, spawn: { "🍒": 18, "🍓": 14, "🍎": 12, "🍩": 12, "⚽": 9, "🍉": 8, "🚲": 4, "📦": 4 }, targets: { "🍉": 5, "🚲": 3 } },
  { width: 920, height: 1160, seconds: 95, spawn: { "🍬": 18, "🍒": 16, "🧁": 13, "🎾": 12, "🧸": 9, "🎁": 9, "🛒": 5, "🎸": 4 }, targets: { "🍒": 12, "🎁": 6, "🛒": 3 } },
  { width: 1040, height: 1300, seconds: 110, spawn: { "🍓": 18, "🍬": 16, "🍎": 13, "🍩": 13, "⚽": 11, "🍉": 9, "🚲": 7, "📦": 7, "🚗": 4 }, targets: { "⚽": 8, "📦": 4, "🚗": 2 } },
  { width: 1140, height: 1420, seconds: 120, spawn: { "🍒": 18, "🍬": 16, "🧁": 13, "🍩": 14, "🧸": 10, "🎁": 10, "🛒": 7, "📦": 8, "🌳": 5, "⛵": 3 }, targets: { "🍩": 10, "📦": 5, "🌳": 3 } },
  { width: 1260, height: 1560, seconds: 135, spawn: { "🍓": 20, "🍒": 16, "🍎": 14, "🎾": 13, "⚽": 11, "🍉": 11, "🚲": 8, "🎸": 7, "🚗": 6, "🌳": 5, "🏠": 2 }, targets: { "🍉": 8, "🚗": 4, "🏠": 1 } },
  { width: 1380, height: 1700, seconds: 150, spawn: { "🍬": 20, "🍓": 18, "🧁": 14, "🍩": 14, "🧸": 12, "🎁": 11, "🛒": 8, "📦": 8, "⛵": 6, "🚗": 5, "🚌": 3 }, targets: { "🍓": 14, "🧸": 8, "⛵": 4, "🚌": 2 } },
  { width: 1500, height: 1840, seconds: 165, spawn: { "🍒": 20, "🍬": 18, "🍎": 15, "🎾": 14, "⚽": 12, "🍉": 12, "🚲": 9, "🎸": 9, "🌳": 7, "🚗": 6, "🏠": 3, "🎡": 2 }, targets: { "🎸": 6, "🌳": 5, "🏠": 2, "🎡": 1 } },
];

/** Nach dem letzten Level bleibt die größte Karte mit immer neuer Verteilung bestehen. */
export function levelConfig(level: number): LevelConfig {
  return LEVELS[Math.min(Math.max(1, level), LEVELS.length) - 1];
}

export type Difficulty = {
  id: "leicht" | "mittel" | "schwer";
  name: string;
  summary: string;
  /** Anteil der Levelzeit, der zur Verfügung steht. */
  timeFactor: number;
  /** Anzahl je Booster-Sorte pro Level. */
  boosters: number;
  /** Ob ein Pfeil am Rand zur nächsten passenden Sache zeigt. */
  pointer: boolean;
};

export const DIFFICULTIES: Difficulty[] = [
  { id: "leicht", name: "Leicht", summary: "Volle Zeit · 2 Booster je Sorte · Wegweiser", timeFactor: 1, boosters: 2, pointer: true },
  { id: "mittel", name: "Mittel", summary: "80 % Zeit · 1 Booster je Sorte · Wegweiser", timeFactor: 0.8, boosters: 1, pointer: true },
  { id: "schwer", name: "Schwer", summary: "65 % Zeit · 1 Booster je Sorte · kein Wegweiser", timeFactor: 0.65, boosters: 1, pointer: false },
];

/** Levelbeschreibung mit der zur Schwierigkeit passenden Zeit. */
export function difficultyLevel(level: number, difficulty: Difficulty): LevelConfig {
  const config = levelConfig(level);
  return { ...config, seconds: Math.round(config.seconds * difficulty.timeFactor) };
}

export function mulberry32(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function kindIndex(symbol: string): number {
  const index = KINDS.findIndex((kind) => kind.symbol === symbol);
  if (index < 0) throw new Error(`Unbekannte Sache: ${symbol}`);
  return index;
}

/** Verteilt alle Sachen ohne Überlappung; große zuerst, damit sie sicher Platz finden. */
function placeItems(config: LevelConfig, random: Random): Item[] {
  const kinds = Object.entries(config.spawn)
    .flatMap(([symbol, count]) => Array.from({ length: count }, () => kindIndex(symbol)))
    .sort((a, b) => KINDS[b].tier - KINDS[a].tier);
  const items: Item[] = [];
  const centerX = config.width / 2;
  const centerY = config.height / 2;

  for (const kind of kinds) {
    const radius = TIER_RADIUS[KINDS[kind].tier - 1];
    const margin = radius + 12;
    let x = 0;
    let y = 0;
    // Findet sich kein freier Platz, wird der Abstand schrittweise gelockert.
    for (let attempt = 0, spacing = 1.12; attempt < 400; attempt++, spacing = attempt % 80 === 0 ? spacing * 0.85 : spacing) {
      x = margin + random() * (config.width - margin * 2);
      y = margin + random() * (config.height - margin * 2);
      if (Math.hypot(x - centerX, y - centerY) < START_CLEARANCE + radius) continue;
      if (items.every((other) => Math.hypot(x - other.x, y - other.y) >= (radius + other.radius) * spacing)) break;
    }
    items.push({ id: items.length, kind, x, y, radius, fall: -1, wobble: 0 });
  }
  return items;
}

export class HoleEngine {
  readonly width: number;
  readonly height: number;
  readonly seconds: number;
  readonly hole: { x: number; y: number; radius: number };
  /** Benötigte Anzahl je Zielsorte, in der Reihenfolge der Levelbeschreibung. */
  readonly goals: Array<{ kind: number; need: number }>;
  readonly remaining = new Map<number, number>();
  readonly active: Record<Booster, number> = { magnet: 0, giant: 0, freeze: 0 };
  items: Item[];
  size = 1;
  xp = 0;
  timeLeft: number;
  status: "playing" | "won" | "lost" = "playing";
  events: HoleEvent[] = [];
  private blockedCooldown = 0;

  constructor(config: LevelConfig, random: Random = Math.random) {
    this.width = config.width;
    this.height = config.height;
    this.seconds = config.seconds;
    this.timeLeft = config.seconds;
    this.hole = { x: config.width / 2, y: config.height / 2, radius: HOLE_RADIUS[0] };
    this.goals = Object.entries(config.targets).map(([symbol, need]) => ({ kind: kindIndex(symbol), need }));
    for (const goal of this.goals) this.remaining.set(goal.kind, goal.need);
    this.items = placeItems(config, random);
  }

  /** Radius, auf den das Loch gerade zuwächst. */
  get targetRadius(): number {
    return HOLE_RADIUS[this.size - 1] * (this.active.giant > 0 ? GIANT_FACTOR : 1);
  }

  /** Anteil der Punkte auf dem Weg zur nächsten Größe, 1 bei voller Größe. */
  get growth(): number {
    if (this.size >= MAX_SIZE) return 1;
    const from = this.size === 1 ? 0 : XP_STEPS[this.size - 2];
    return (this.xp - from) / (XP_STEPS[this.size - 1] - from);
  }

  fits(item: Item): boolean {
    return item.radius <= this.hole.radius * FIT_FACTOR;
  }

  isTarget(kind: number): boolean {
    return (this.remaining.get(kind) ?? 0) > 0;
  }

  activate(booster: Booster): boolean {
    if (this.status !== "playing" || this.active[booster] > 0) return false;
    this.active[booster] = BOOSTER_TIME[booster];
    return true;
  }

  /** Bewegt das Loch in Richtung (dirX, dirY) mit einer Länge von höchstens 1 und rechnet dt Sekunden weiter. */
  step(dt: number, dirX: number, dirY: number) {
    if (this.status !== "playing") return;
    const { hole, active } = this;

    if (active.freeze > 0) active.freeze = Math.max(0, active.freeze - dt);
    else this.timeLeft -= dt;
    active.magnet = Math.max(0, active.magnet - dt);
    active.giant = Math.max(0, active.giant - dt);
    this.blockedCooldown = Math.max(0, this.blockedCooldown - dt);

    hole.radius += (this.targetRadius - hole.radius) * Math.min(1, dt * 8);
    const length = Math.hypot(dirX, dirY);
    if (length > 0) {
      const speed = (170 + hole.radius * 1.7) / Math.max(1, length);
      hole.x = Math.min(this.width, Math.max(0, hole.x + dirX * speed * dt));
      hole.y = Math.min(this.height, Math.max(0, hole.y + dirY * speed * dt));
    }

    let finished = false;
    for (const item of this.items) {
      if (item.fall >= 0) {
        item.fall += dt / FALL_TIME;
        const pull = Math.min(1, dt * 14);
        item.x += (hole.x - item.x) * pull;
        item.y += (hole.y - item.y) * pull;
        if (item.fall >= 1) finished = true;
        continue;
      }
      item.wobble = Math.max(0, item.wobble - dt);
      const dx = hole.x - item.x;
      const dy = hole.y - item.y;
      const distance = Math.hypot(dx, dy);

      if (!this.fits(item)) {
        if (distance < hole.radius + item.radius * 0.45) {
          item.wobble = 0.35;
          if (this.blockedCooldown === 0) {
            this.blockedCooldown = 1.6;
            this.events.push({ type: "blocked", kind: item.kind, x: item.x, y: item.y });
          }
        }
        continue;
      }

      const magnet = active.magnet > 0;
      const reach = magnet ? Math.max(170, hole.radius * 3.2) : hole.radius + item.radius * 0.5;
      if (distance < reach && distance > 0) {
        const move = Math.min(distance, (magnet ? 280 : 90) * dt);
        item.x += dx / distance * move;
        item.y += dy / distance * move;
      }
      if (Math.hypot(hole.x - item.x, hole.y - item.y) <= hole.radius - item.radius * 0.35) this.swallow(item);
    }
    if (finished) this.items = this.items.filter((item) => item.fall < 1);

    if (this.status === "playing" && this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.status = "lost";
      this.events.push({ type: "lost" });
    }
  }

  private swallow(item: Item) {
    item.fall = 0;
    const left = this.remaining.get(item.kind) ?? 0;
    if (left > 0) this.remaining.set(item.kind, left - 1);
    this.events.push({ type: "swallow", kind: item.kind, x: item.x, y: item.y, target: left > 0 });

    this.xp += TIER_XP[KINDS[item.kind].tier - 1];
    while (this.size < MAX_SIZE && this.xp >= XP_STEPS[this.size - 1]) {
      this.size++;
      this.events.push({ type: "grow", size: this.size });
    }
    if ([...this.remaining.values()].every((count) => count === 0)) {
      this.status = "won";
      this.events.push({ type: "won" });
    }
  }
}
