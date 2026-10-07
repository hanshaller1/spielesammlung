export const GEMS = [
  { name: "Rubin", key: "rubin" },
  { name: "Saphir", key: "saphir" },
  { name: "Smaragd", key: "smaragd" },
  { name: "Goldstern", key: "gold" },
  { name: "Amethyst", key: "amethyst" },
  { name: "Bernstein", key: "bernstein" },
] as const;

export const POWERS = {
  rocketH: { name: "Rakete", symbol: "🚀" },
  rocketV: { name: "Rakete", symbol: "🚀" },
  dynamite: { name: "Dynamit", symbol: "🧨" },
  spinner: { name: "Kreisel", symbol: "🌀" },
  electro: { name: "Elektrokugel", symbol: "🔮" },
} as const;

export const OWLS_PER_HOUSE = 3;
export const EXTRA_MOVES = 5;

export type PowerKind = keyof typeof POWERS;
export type Random = () => number;
/** color ist -1 bei Power-ups; Ranken halten einen Stein fest, bis sie gelöst sind. */
export type Tile = { id: number; color: number; power: PowerKind | null; vines: boolean };
export type Blocker = { kind: "crate" | "birdhouse"; hp: number };
export type Cell = { hole: boolean; tile: Tile | null; blocker: Blocker | null };
export type Board = { width: number; height: number; cells: Cell[] };
export type Pos = { x: number; y: number };
export type GoalKind = "color" | "crate" | "vine" | "owl" | "boss";
export type Goal = { kind: GoalKind; color: number; target: number; done: number };
export type Boss = { hp: number; maxHp: number; every: number; countdown: number; strength: number };
export type GameState = { board: Board; colors: number; moves: number; goals: Goal[]; boss: Boss | null; score: number; nextId: number };

export type LevelConfig = {
  /** "." Stein, "#" Lücke, "c"/"C" Kiste mit 1/2 Schichten, "v" Stein mit Ranken, "h" Vogelhaus mit Eulen. */
  map: string[];
  colors: number;
  moves: number;
  collect?: Array<[color: number, count: number]>;
  /** Hindernisse, die als Ziel zählen. */
  clear?: Array<"crate" | "vine" | "owl">;
  boss?: { hp: number; every: number; strength: number };
};

export type Effect =
  | { kind: "row" | "column"; x: number; y: number }
  | { kind: "blast"; x: number; y: number; radius: number }
  | { kind: "spin"; x: number; y: number; tx: number; ty: number }
  | { kind: "electro"; x: number; y: number; targets: Pos[] }
  | { kind: "attack"; targets: Pos[] }
  | { kind: "shuffle" };
export type Burst = { x: number; y: number; color: number; power: PowerKind | null };
export type Step = {
  /** Brett direkt nach dem Abräumen, noch ohne Nachrutschen. */
  afterClear: Board;
  board: Board;
  cleared: Burst[];
  effects: Effect[];
  /** Neue Steine: id → Startreihe oberhalb des Bretts; liegt sie auf der Zielreihe, erscheint der Stein an Ort und Stelle. */
  spawned: Record<number, number>;
  created: Pos[];
};
export type Resolution = { steps: Step[]; state: GameState; preview: Board | null };

export const LEVELS: LevelConfig[] = [
  {
    map: ["........", "........", "........", "........", "........", "........", "........", "........"],
    colors: 5, moves: 18, collect: [[0, 18], [1, 18]],
  },
  {
    map: ["........", "........", "........", ".cccccc.", ".cccccc.", "........", "........", "........"],
    colors: 5, moves: 16, clear: ["crate"],
  },
  {
    map: ["........", ".v....v.", "..v..v..", "...vv...", "...vv...", "..v..v..", ".v....v.", "........"],
    colors: 5, moves: 18, clear: ["vine"], collect: [[2, 20]],
  },
  {
    map: ["........", "........", "........", "........", "........", "........", "........", "........"],
    colors: 5, moves: 20, boss: { hp: 200, every: 4, strength: 2 },
  },
  {
    map: ["........", ".h....h.", "........", "..CCCC..", "..CCCC..", "........", ".h....h.", "........"],
    colors: 5, moves: 20, clear: ["owl", "crate"],
  },
  {
    map: ["##....##", "#......#", "........", "..CCCC..", "..CCCC..", "........", "#......#", "##....##"],
    colors: 5, moves: 20, clear: ["crate"], collect: [[3, 25]],
  },
  {
    map: ["........", ".CvvvvC.", ".C....C.", ".v.hh.v.", ".v....v.", ".C....C.", ".CvvvvC.", "........"],
    colors: 5, moves: 25, clear: ["crate", "vine", "owl"],
  },
  {
    map: ["........", "........", ".c.cc.c.", "........", "........", ".c.cc.c.", "........", "........"],
    colors: 5, moves: 22, boss: { hp: 280, every: 3, strength: 2 },
  },
  {
    map: ["#......#", ".vvvvvv.", ".v.hh.v.", "........", "..h..h..", "........", ".vvvvvv.", "#......#"],
    colors: 5, moves: 22, clear: ["vine", "owl"],
  },
  {
    map: ["........", ".CCCCCC.", "........", ".CC..CC.", ".CC..CC.", "........", ".CCCCCC.", "........"],
    colors: 5, moves: 24, clear: ["crate"],
  },
  {
    map: ["........", ".h.CC.h.", "..vvvv..", ".Cv..vC.", ".Cv..vC.", "..vvvv..", ".h.CC.h.", "........"],
    colors: 5, moves: 28, clear: ["owl", "vine", "crate"], collect: [[4, 20]],
  },
  {
    map: ["#......#", "........", ".v.vv.v.", "........", "........", ".v.vv.v.", "........", "#......#"],
    colors: 5, moves: 32, boss: { hp: 360, every: 3, strength: 3 },
  },
];

/** Nach dem letzten Level wiederholt sich die zweite Hälfte der Level mit neuen Brettern. */
export function levelConfig(level: number): LevelConfig {
  const index = Math.max(1, Math.floor(level)) - 1;
  if (index < LEVELS.length) return LEVELS[index];
  const loop = LEVELS.length / 2;
  return LEVELS[loop + ((index - LEVELS.length) % loop)];
}

export type Difficulty = {
  id: "leicht" | "mittel" | "schwer";
  name: string;
  summary: string;
  /** Anteil der Levelzüge, der zur Verfügung steht. */
  moveFactor: number;
  /** Anzahl je Hilfsmittel-Sorte pro Level. */
  boosters: number;
  /** Wie viele Start-Power-ups gewählt werden dürfen. */
  startPowers: number;
  /** Wie oft pro Level fünf Extrazüge angeboten werden. */
  extraMoves: number;
  /** Sekunden ohne Zug bis zum Tipp; null schaltet Tipps ab. */
  hintDelay: number | null;
};

export const DIFFICULTIES: Difficulty[] = [
  { id: "leicht", name: "Leicht", summary: "Alle Züge · 2 Hilfen je Sorte · 3 Start-Power-ups · Tipps", moveFactor: 1, boosters: 2, startPowers: 3, extraMoves: 1, hintDelay: 6 },
  { id: "mittel", name: "Mittel", summary: "85 % Züge · 1 Hilfe je Sorte · 1 Start-Power-up · späte Tipps", moveFactor: 0.85, boosters: 1, startPowers: 1, extraMoves: 1, hintDelay: 14 },
  { id: "schwer", name: "Schwer", summary: "75 % Züge · 1 Hilfe je Sorte · keine Start-Power-ups · keine Tipps", moveFactor: 0.75, boosters: 1, startPowers: 0, extraMoves: 0, hintDelay: null },
];

export function levelMoves(level: number, difficulty: Difficulty): number {
  return Math.round(levelConfig(level).moves * difficulty.moveFactor);
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

function shuffleInPlace<T>(list: T[], random: Random): T[] {
  for (let index = list.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [list[index], list[other]] = [list[other], list[index]];
  }
  return list;
}

export function cloneBoard(board: Board): Board {
  return {
    width: board.width,
    height: board.height,
    cells: board.cells.map((cell) => ({
      hole: cell.hole,
      tile: cell.tile && { ...cell.tile },
      blocker: cell.blocker && { ...cell.blocker },
    })),
  };
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    board: cloneBoard(state.board),
    goals: state.goals.map((goal) => ({ ...goal })),
    boss: state.boss && { ...state.boss },
  };
}

export function cellAt(board: Board, x: number, y: number): Cell | null {
  if (x < 0 || y < 0 || x >= board.width || y >= board.height) return null;
  return board.cells[y * board.width + x];
}

/** Farbe eines Steins, der zu einer Reihe passen kann, sonst -1. */
function colorAt(board: Board, x: number, y: number): number {
  const tile = cellAt(board, x, y)?.tile;
  return tile && !tile.power ? tile.color : -1;
}

function isMovable(cell: Cell | null): boolean {
  return Boolean(cell && !cell.hole && !cell.blocker && cell.tile && !cell.tile.vines);
}

export function isGoalComplete(state: GameState): boolean {
  return state.goals.every((goal) => goal.done >= goal.target);
}

export function goalsDone(state: GameState): number {
  return state.goals.filter((goal) => goal.done >= goal.target).length;
}

/* ---------- Reihen erkennen ---------- */

type Run = { cells: number[]; dir: "h" | "v" | "square" };
type Group = { cells: number[]; color: number; power: PowerKind | null };

function findRuns(board: Board): Run[] {
  const { width, height } = board;
  const runs: Run[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width;) {
      const color = colorAt(board, x, y);
      let end = x + 1;
      while (color >= 0 && end < width && colorAt(board, end, y) === color) end++;
      if (color >= 0 && end - x >= 3) runs.push({ dir: "h", cells: Array.from({ length: end - x }, (_, i) => y * width + x + i) });
      x = end;
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height;) {
      const color = colorAt(board, x, y);
      let end = y + 1;
      while (color >= 0 && end < height && colorAt(board, x, end) === color) end++;
      if (color >= 0 && end - y >= 3) runs.push({ dir: "v", cells: Array.from({ length: end - y }, (_, i) => (y + i) * width + x) });
      y = end;
    }
  }
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const color = colorAt(board, x, y);
      if (color >= 0 && colorAt(board, x + 1, y) === color && colorAt(board, x, y + 1) === color && colorAt(board, x + 1, y + 1) === color) {
        runs.push({ dir: "square", cells: [y * width + x, y * width + x + 1, (y + 1) * width + x, (y + 1) * width + x + 1] });
      }
    }
  }
  return runs;
}

/** Fasst zusammenhängende Reihen gleicher Farbe zu Gruppen zusammen und bestimmt das entstehende Power-up. */
function findGroups(board: Board): Group[] {
  const runs = findRuns(board);
  if (runs.length === 0) return [];
  const parent = new Map<number, number>();
  const find = (cell: number): number => {
    let root = cell;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(cell, root);
    return root;
  };
  for (const run of runs) {
    for (const cell of run.cells) if (!parent.has(cell)) parent.set(cell, cell);
    for (const cell of run.cells.slice(1)) parent.set(find(cell), find(run.cells[0]));
  }
  const byRoot = new Map<number, { cells: Set<number>; runs: Run[] }>();
  for (const run of runs) {
    const root = find(run.cells[0]);
    const entry = byRoot.get(root) ?? { cells: new Set<number>(), runs: [] };
    for (const cell of run.cells) entry.cells.add(cell);
    entry.runs.push(run);
    byRoot.set(root, entry);
  }
  return [...byRoot.values()].map(({ cells, runs: groupRuns }) => {
    const lines = groupRuns.filter((run) => run.dir !== "square");
    const longest = lines.reduce((max, run) => Math.max(max, run.cells.length), 0);
    const hasH = lines.some((run) => run.dir === "h");
    const hasV = lines.some((run) => run.dir === "v");
    let power: PowerKind | null = null;
    if (longest >= 5) power = "electro";
    else if (hasH && hasV) power = "dynamite";
    // Eine waagerechte Viererreihe wird zur senkrecht fliegenden Rakete und umgekehrt.
    else if (longest === 4) power = lines.find((run) => run.cells.length === 4)!.dir === "h" ? "rocketV" : "rocketH";
    else if (groupRuns.some((run) => run.dir === "square")) power = "spinner";
    const list = [...cells];
    return { cells: list, color: board.cells[list[0]].tile!.color, power };
  });
}

/** Prüft, ob an einer Stelle eine Dreierreihe oder ein Viererquadrat liegt. */
function matchAt(board: Board, x: number, y: number): boolean {
  const color = colorAt(board, x, y);
  if (color < 0) return false;
  let count = 1;
  for (let i = x - 1; colorAt(board, i, y) === color; i--) count++;
  for (let i = x + 1; colorAt(board, i, y) === color; i++) count++;
  if (count >= 3) return true;
  count = 1;
  for (let i = y - 1; colorAt(board, x, i) === color; i--) count++;
  for (let i = y + 1; colorAt(board, x, i) === color; i++) count++;
  if (count >= 3) return true;
  for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
    const sx = x + dx;
    const sy = y + dy;
    if (colorAt(board, sx, sy) === color && colorAt(board, sx + 1, sy) === color && colorAt(board, sx, sy + 1) === color && colorAt(board, sx + 1, sy + 1) === color) return true;
  }
  return false;
}

export function isAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

export function canSwap(board: Board, a: Pos, b: Pos): boolean {
  return isAdjacent(a, b) && isMovable(cellAt(board, a.x, a.y)) && isMovable(cellAt(board, b.x, b.y));
}

/** Brett mit vertauschten Steinen, ohne etwas aufzulösen. */
export function swapPreview(board: Board, a: Pos, b: Pos): Board {
  const next = cloneBoard(board);
  const ca = cellAt(next, a.x, a.y)!;
  const cb = cellAt(next, b.x, b.y)!;
  [ca.tile, cb.tile] = [cb.tile, ca.tile];
  return next;
}

/** Ein Tausch zählt, wenn er eine Reihe bildet oder ein Power-up beteiligt ist. */
export function isValidSwap(board: Board, a: Pos, b: Pos): boolean {
  if (!canSwap(board, a, b)) return false;
  const ta = cellAt(board, a.x, a.y)!.tile!;
  const tb = cellAt(board, b.x, b.y)!.tile!;
  if (ta.power || tb.power) return true;
  const swapped = swapPreview(board, a, b);
  return matchAt(swapped, a.x, a.y) || matchAt(swapped, b.x, b.y);
}

export type Move = { a: Pos; b: Pos };

export function listMoves(board: Board): Move[] {
  const moves: Move[] = [];
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      for (const b of [{ x: x + 1, y }, { x, y: y + 1 }]) {
        if (isValidSwap(board, { x, y }, b)) moves.push({ a: { x, y }, b });
      }
    }
  }
  return moves;
}

export function hasMove(board: Board): boolean {
  if (board.cells.some((cell) => cell.tile?.power && !cell.tile.vines)) return true;
  return listMoves(board).length > 0;
}

/** Tipp: der Tausch mit der größten entstehenden Gruppe. */
export function findHint(board: Board): Move | null {
  let best: Move | null = null;
  let bestScore = -1;
  for (const move of listMoves(board)) {
    const ta = cellAt(board, move.a.x, move.a.y)!.tile!;
    const tb = cellAt(board, move.b.x, move.b.y)!.tile!;
    let score: number;
    if (ta.power || tb.power) {
      score = ta.power && tb.power ? 30 : 12;
    } else {
      const groups = findGroups(swapPreview(board, move.a, move.b));
      score = groups.reduce((sum, group) => sum + group.cells.length + (group.power ? 6 : 0), 0);
    }
    if (score > bestScore) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}

/* ---------- Brett erzeugen ---------- */

function randomSafeColor(board: Board, x: number, y: number, colors: number, random: Random): number {
  const options = shuffleInPlace(Array.from({ length: colors }, (_, index) => index), random);
  const cell = cellAt(board, x, y)!;
  for (const color of options) {
    cell.tile!.color = color;
    if (!matchAt(board, x, y)) return color;
  }
  return options[0];
}

function fillColors(board: Board, colors: number, random: Random) {
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const tile = cellAt(board, x, y)!.tile;
      if (tile && !tile.power) {
        tile.color = -1;
      }
    }
  }
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const tile = cellAt(board, x, y)!.tile;
      if (tile && !tile.power) tile.color = randomSafeColor(board, x, y, colors, random);
    }
  }
}

/** Ziele eines Levels, abgeleitet aus Sammelaufträgen, Karte und Boss. */
export function levelGoals(config: LevelConfig): Goal[] {
  const count = (symbols: string) => config.map.join("").split("").filter((symbol) => symbols.includes(symbol)).length;
  const goals: Goal[] = [];
  if (config.boss) goals.push({ kind: "boss", color: -1, target: config.boss.hp, done: 0 });
  for (const [color, target] of config.collect ?? []) goals.push({ kind: "color", color, target, done: 0 });
  for (const kind of config.clear ?? []) {
    const target = kind === "crate" ? count("cC") : kind === "vine" ? count("v") : count("h") * OWLS_PER_HOUSE;
    if (target > 0) goals.push({ kind, color: -1, target, done: 0 });
  }
  return goals;
}

export function createGame(config: LevelConfig, moves: number, random: Random = Math.random): GameState {
  const width = config.map[0].length;
  const height = config.map.length;
  let nextId = 1;
  const cells: Cell[] = [];
  for (const row of config.map) {
    for (const symbol of row) {
      if (symbol === "#") cells.push({ hole: true, tile: null, blocker: null });
      else if (symbol === "c" || symbol === "C") cells.push({ hole: false, tile: null, blocker: { kind: "crate", hp: symbol === "C" ? 2 : 1 } });
      else if (symbol === "h") cells.push({ hole: false, tile: null, blocker: { kind: "birdhouse", hp: OWLS_PER_HOUSE } });
      else cells.push({ hole: false, tile: { id: nextId++, color: 0, power: null, vines: symbol === "v" }, blocker: null });
    }
  }
  const board: Board = { width, height, cells };
  for (let attempt = 0; attempt < 50; attempt++) {
    fillColors(board, config.colors, random);
    if (listMoves(board).length >= 3) break;
  }
  const boss = config.boss ? { hp: config.boss.hp, maxHp: config.boss.hp, every: config.boss.every, countdown: config.boss.every, strength: config.boss.strength } : null;
  return { board, colors: config.colors, moves, goals: levelGoals(config), boss, score: 0, nextId };
}

/** Setzt gewählte Start-Power-ups auf zufällige freie Steine. */
export function placeStartPowers(state: GameState, powers: PowerKind[], random: Random = Math.random): GameState {
  const next = cloneState(state);
  const candidates = shuffleInPlace(next.board.cells.filter((cell) => cell.tile && !cell.tile.power && !cell.tile.vines), random);
  powers.forEach((power, index) => {
    const cell = candidates[index];
    if (cell) cell.tile = { id: next.nextId++, color: -1, power, vines: false };
  });
  return next;
}

/* ---------- Auflösen ---------- */

type Activation = { power: PowerKind; x: number; y: number };

class Resolver {
  state: GameState;
  random: Random;
  steps: Step[] = [];
  cleared: Burst[] = [];
  effects: Effect[] = [];
  created: Pos[] = [];
  queue: Activation[] = [];
  damage = 0;
  /** Während des Königsbonus zählen Treffer nur noch für die Punkte. */
  scoring: "goals" | "bonus" = "goals";
  /** Hilfsmittel lösen keinen Gegenangriff des Dunklen Königs aus. */
  counterattack = true;

  constructor(state: GameState, random: Random) {
    this.state = cloneState(state);
    this.random = random;
  }

  get board(): Board {
    return this.state.board;
  }

  progress(kind: GoalKind, amount = 1, color = -1) {
    if (this.scoring !== "goals") return;
    for (const goal of this.state.goals) {
      if (goal.kind === kind && (kind !== "color" || goal.color === color)) goal.done = Math.min(goal.target, goal.done + amount);
    }
  }

  hitBlocker(x: number, y: number) {
    const cell = cellAt(this.board, x, y);
    if (!cell?.blocker) return;
    const blocker = cell.blocker;
    blocker.hp--;
    this.state.score += 25;
    this.damage++;
    if (blocker.kind === "birdhouse") this.progress("owl");
    if (blocker.hp <= 0) {
      if (blocker.kind === "crate") this.progress("crate");
      cell.blocker = null;
    }
    this.cleared.push({ x, y, color: -2, power: null });
  }

  /** Trifft eine Zelle durch Power-up oder Hilfsmittel. */
  hitCell(x: number, y: number) {
    const cell = cellAt(this.board, x, y);
    if (!cell || cell.hole) return;
    if (cell.blocker) {
      this.hitBlocker(x, y);
      return;
    }
    const tile = cell.tile;
    if (!tile) return;
    if (tile.vines) {
      tile.vines = false;
      this.state.score += 25;
      this.damage++;
      this.progress("vine");
      this.cleared.push({ x, y, color: -3, power: null });
      return;
    }
    cell.tile = null;
    if (tile.power) {
      this.queue.push({ power: tile.power, x, y });
      this.cleared.push({ x, y, color: -1, power: tile.power });
      return;
    }
    this.removeColored(x, y, tile);
  }

  removeColored(x: number, y: number, tile: Tile) {
    this.state.score += 10;
    this.damage++;
    this.progress("color", 1, tile.color);
    this.cleared.push({ x, y, color: tile.color, power: null });
  }

  clearGroups(groups: Group[], preferred: Pos[]) {
    const { width } = this.board;
    for (const group of groups) {
      const blockers = new Set<number>();
      let spawn: number | null = null;
      if (group.power) {
        const free = group.cells.filter((index) => !this.board.cells[index].tile?.vines);
        const wanted = preferred.map((pos) => pos.y * width + pos.x).find((index) => free.includes(index));
        spawn = wanted ?? free.sort((a, b) => b - a)[0] ?? null;
      }
      for (const index of group.cells) {
        const x = index % width;
        const y = Math.floor(index / width);
        const cell = this.board.cells[index];
        const tile = cell.tile;
        if (!tile) continue;
        if (tile.vines) {
          tile.vines = false;
          this.state.score += 25;
          this.damage++;
          this.progress("vine");
          this.cleared.push({ x, y, color: -3, power: null });
        } else {
          cell.tile = null;
          this.removeColored(x, y, tile);
        }
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (cellAt(this.board, nx, ny)?.blocker) blockers.add(ny * width + nx);
        }
      }
      for (const index of blockers) this.hitBlocker(index % width, Math.floor(index / width));
      if (group.power && spawn !== null && !this.board.cells[spawn].tile && !this.board.cells[spawn].blocker) {
        this.board.cells[spawn].tile = { id: this.state.nextId++, color: -1, power: group.power, vines: false };
        this.created.push({ x: spawn % width, y: Math.floor(spawn / width) });
      }
    }
  }

  /** Bevorzugte Ziele für Kreisel: Hindernisse und gesuchte Steine. */
  pickSpinTarget(fromX: number, fromY: number): Pos | null {
    const { board } = this;
    const wanted = new Set(this.state.goals.filter((goal) => goal.kind === "color" && goal.done < goal.target).map((goal) => goal.color));
    const open = new Set(this.state.goals.filter((goal) => goal.done < goal.target).map((goal) => goal.kind));
    const candidates: Array<{ pos: Pos; score: number }> = [];
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        if (Math.abs(x - fromX) + Math.abs(y - fromY) <= 1) continue;
        const cell = cellAt(board, x, y)!;
        if (cell.hole) continue;
        let score = 1;
        if (cell.blocker?.kind === "crate") score = open.has("crate") ? 20 : 4;
        else if (cell.blocker?.kind === "birdhouse") score = open.has("owl") ? 22 : 4;
        else if (cell.tile?.vines) score = open.has("vine") ? 18 : 3;
        else if (cell.tile && wanted.has(cell.tile.color)) score = 8;
        else if (!cell.tile) continue;
        candidates.push({ pos: { x, y }, score: score + this.random() * 4 });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.pos ?? null;
  }

  mostCommonColor(): number {
    const counts = new Map<number, number>();
    for (const cell of this.board.cells) {
      const tile = cell.tile;
      if (tile && !tile.power) counts.set(tile.color, (counts.get(tile.color) ?? 0) + 1);
    }
    let best = -1;
    let bestCount = 0;
    for (const [color, count] of counts) {
      if (count > bestCount || (count === bestCount && this.random() < 0.5)) {
        best = color;
        bestCount = count;
      }
    }
    return best;
  }

  hitArea(x: number, y: number, radius: number) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) this.hitCell(x + dx, y + dy);
    }
  }

  hitRow(y: number) {
    for (let x = 0; x < this.board.width; x++) this.hitCell(x, y);
  }

  hitColumn(x: number) {
    for (let y = 0; y < this.board.height; y++) this.hitCell(x, y);
  }

  clearColor(color: number, x: number, y: number) {
    const targets: Pos[] = [];
    this.board.cells.forEach((cell, index) => {
      if (cell.tile && !cell.tile.power && cell.tile.color === color) targets.push({ x: index % this.board.width, y: Math.floor(index / this.board.width) });
    });
    this.effects.push({ kind: "electro", x, y, targets });
    for (const target of targets) this.hitCell(target.x, target.y);
  }

  activate({ power, x, y }: Activation) {
    if (power === "rocketH") {
      this.effects.push({ kind: "row", x, y });
      this.hitRow(y);
    } else if (power === "rocketV") {
      this.effects.push({ kind: "column", x, y });
      this.hitColumn(x);
    } else if (power === "dynamite") {
      this.effects.push({ kind: "blast", x, y, radius: 2 });
      this.hitArea(x, y, 2);
    } else if (power === "spinner") {
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) this.hitCell(nx, ny);
      const target = this.pickSpinTarget(x, y);
      if (target) {
        this.effects.push({ kind: "spin", x, y, tx: target.x, ty: target.y });
        this.hitCell(target.x, target.y);
      }
    } else {
      const color = this.mostCommonColor();
      if (color >= 0) this.clearColor(color, x, y);
    }
  }

  drain() {
    for (let guard = 0; this.queue.length > 0 && guard < 500; guard++) this.activate(this.queue.shift()!);
  }

  /** Kombination zweier Power-ups an Position b. */
  combo(first: PowerKind, second: PowerKind, x: number, y: number) {
    const kinds = [first, second];
    const has = (kind: PowerKind | "rocket") => kinds.some((entry) => kind === "rocket" ? entry.startsWith("rocket") : entry === kind);
    const rockets = kinds.filter((entry) => entry.startsWith("rocket")).length;
    if (first === "electro" && second === "electro") {
      this.effects.push({ kind: "blast", x, y, radius: Math.max(this.board.width, this.board.height) });
      for (let ty = 0; ty < this.board.height; ty++) for (let tx = 0; tx < this.board.width; tx++) this.hitCell(tx, ty);
    } else if (has("electro")) {
      const other = first === "electro" ? second : first;
      const color = this.mostCommonColor();
      const targets: Pos[] = [];
      this.board.cells.forEach((cell, index) => {
        if (cell.tile && !cell.tile.power && !cell.tile.vines && cell.tile.color === color) {
          const kind = other.startsWith("rocket") ? (this.random() < 0.5 ? "rocketH" : "rocketV") : other;
          cell.tile = { id: this.state.nextId++, color: -1, power: kind, vines: false };
          targets.push({ x: index % this.board.width, y: Math.floor(index / this.board.width) });
        }
      });
      this.effects.push({ kind: "electro", x, y, targets });
      for (const target of targets) this.hitCell(target.x, target.y);
    } else if (rockets === 2) {
      this.effects.push({ kind: "row", x, y }, { kind: "column", x, y });
      this.hitRow(y);
      this.hitColumn(x);
    } else if (rockets === 1 && has("dynamite")) {
      for (let offset = -1; offset <= 1; offset++) {
        this.effects.push({ kind: "row", x, y: y + offset }, { kind: "column", x: x + offset, y });
        if (y + offset >= 0 && y + offset < this.board.height) this.hitRow(y + offset);
        if (x + offset >= 0 && x + offset < this.board.width) this.hitColumn(x + offset);
      }
    } else if (first === "dynamite" && second === "dynamite") {
      this.effects.push({ kind: "blast", x, y, radius: 4 });
      this.hitArea(x, y, 4);
    } else if (first === "spinner" && second === "spinner") {
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) this.hitCell(nx, ny);
      for (let count = 0; count < 3; count++) {
        const target = this.pickSpinTarget(x, y);
        if (!target) break;
        this.effects.push({ kind: "spin", x, y, tx: target.x, ty: target.y });
        this.hitCell(target.x, target.y);
      }
    } else {
      // Kreisel trägt das andere Power-up zu einem lohnenden Ziel und zündet es dort.
      const other = first === "spinner" ? second : first;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) this.hitCell(nx, ny);
      const target = this.pickSpinTarget(x, y) ?? { x, y };
      this.effects.push({ kind: "spin", x, y, tx: target.x, ty: target.y });
      this.activate({ power: other, x: target.x, y: target.y });
    }
    this.drain();
  }

  /** Lässt Steine fallen, rutscht schräg an Hindernissen vorbei und füllt von oben auf. */
  gravity(): Record<number, number> {
    const { board } = this;
    const { colors } = this.state;
    const spawned: Record<number, number> = {};
    const spawnCount = new Array<number>(board.width).fill(0);
    const pullVertical = (): boolean => {
      let changed = false;
      for (let x = 0; x < board.width; x++) {
        for (let y = board.height - 1; y >= 0; y--) {
          const cell = cellAt(board, x, y)!;
          if (cell.hole || cell.blocker || cell.tile) continue;
          let above = y - 1;
          while (above >= 0) {
            const source = cellAt(board, x, above)!;
            if (source.hole || (!source.blocker && !source.tile)) {
              above--;
              continue;
            }
            break;
          }
          if (above < 0) {
            spawnCount[x]++;
            const tile: Tile = { id: this.state.nextId++, color: Math.floor(this.random() * colors), power: null, vines: false };
            cell.tile = tile;
            spawned[tile.id] = -spawnCount[x];
            changed = true;
          } else {
            const source = cellAt(board, x, above)!;
            if (isMovable(source)) {
              cell.tile = source.tile;
              source.tile = null;
              changed = true;
            }
          }
        }
      }
      return changed;
    };
    const pullDiagonal = (): boolean => {
      for (let y = board.height - 1; y > 0; y--) {
        for (let x = 0; x < board.width; x++) {
          const cell = cellAt(board, x, y)!;
          if (cell.hole || cell.blocker || cell.tile) continue;
          const order = (x + y) % 2 === 0 ? [x - 1, x + 1] : [x + 1, x - 1];
          for (const sx of order) {
            const source = cellAt(board, sx, y - 1);
            if (!isMovable(source)) continue;
            // Nur wenn der Stein nicht ohnehin senkrecht weiterfallen kann.
            const below = cellAt(board, sx, y)!;
            if (!below.hole && !below.blocker && !below.tile) continue;
            cell.tile = source!.tile;
            source!.tile = null;
            return true;
          }
        }
      }
      return false;
    };
    for (let guard = 0; guard < 400; guard++) {
      if (pullVertical()) continue;
      if (!pullDiagonal()) break;
    }
    // Felder, die von oben nicht erreichbar sind, bekommen direkt einen neuen Stein.
    board.cells.forEach((cell, index) => {
      if (cell.hole || cell.blocker || cell.tile) return;
      const tile: Tile = { id: this.state.nextId++, color: Math.floor(this.random() * colors), power: null, vines: false };
      cell.tile = tile;
      spawned[tile.id] = Math.floor(index / board.width);
    });
    return spawned;
  }

  /** Schließt einen Abschnitt ab: Brett festhalten, nachrutschen lassen und speichern. */
  finishStep() {
    if (this.cleared.length === 0 && this.effects.length === 0 && this.created.length === 0) return;
    const afterClear = cloneBoard(this.board);
    const spawned = this.gravity();
    this.steps.push({ afterClear, board: cloneBoard(this.board), cleared: this.cleared, effects: this.effects, spawned, created: this.created });
    this.cleared = [];
    this.effects = [];
    this.created = [];
  }

  cascade() {
    for (let guard = 0; guard < 60; guard++) {
      const groups = findGroups(this.board);
      if (groups.length === 0) break;
      this.clearGroups(groups, []);
      this.drain();
      this.finishStep();
    }
  }

  bossTurn() {
    const boss = this.state.boss;
    if (!boss) return;
    if (this.scoring === "goals") {
      boss.hp = Math.max(0, boss.hp - this.damage);
      this.progress("boss", this.damage);
    }
    this.damage = 0;
    if (!this.counterattack || boss.hp <= 0 || isGoalComplete(this.state) || this.state.moves <= 0) return;
    boss.countdown--;
    if (boss.countdown > 0) return;
    boss.countdown = boss.every;
    // Der Dunkle König verwandelt einige Steine in Kisten.
    const candidates = shuffleInPlace(this.board.cells.flatMap((cell, index) => (
      cell.tile && !cell.tile.power && !cell.tile.vines && Math.floor(index / this.board.width) > 0 ? [index] : []
    )), this.random).slice(0, boss.strength);
    if (candidates.length === 0) return;
    const targets = candidates.map((index) => ({ x: index % this.board.width, y: Math.floor(index / this.board.width) }));
    const afterClear = cloneBoard(this.board);
    for (const index of candidates) {
      this.board.cells[index].tile = null;
      this.board.cells[index].blocker = { kind: "crate", hp: 1 };
    }
    this.steps.push({ afterClear, board: cloneBoard(this.board), cleared: [], effects: [{ kind: "attack", targets }], spawned: {}, created: [] });
  }

  ensureMoves() {
    if (isGoalComplete(this.state) || this.state.moves <= 0 || hasMove(this.board)) return;
    const afterClear = cloneBoard(this.board);
    shuffleTiles(this.board, this.state.colors, this.random);
    this.steps.push({ afterClear, board: cloneBoard(this.board), cleared: [], effects: [{ kind: "shuffle" }], spawned: {}, created: [] });
  }

  finish(preview: Board | null = null): Resolution {
    this.finishStep();
    this.cascade();
    this.bossTurn();
    this.ensureMoves();
    return { steps: this.steps, state: this.state, preview };
  }
}

/** Ordnet bewegliche Steine neu, bis keine Reihe liegt und ein Zug möglich ist. */
function shuffleTiles(board: Board, colors: number, random: Random) {
  const movable = board.cells.filter((cell) => isMovable(cell) && !cell.tile!.power);
  const palette = movable.map((cell) => cell.tile!.color);
  for (let attempt = 0; attempt < 120; attempt++) {
    shuffleInPlace(palette, random);
    movable.forEach((cell, index) => { cell.tile!.color = palette[index]; });
    if (findGroups(board).length === 0 && listMoves(board).length > 0) return;
  }
  for (let attempt = 0; attempt < 50; attempt++) {
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const cell = cellAt(board, x, y)!;
        if (isMovable(cell) && !cell.tile!.power) cell.tile!.color = randomSafeColor(board, x, y, colors, random);
      }
    }
    if (listMoves(board).length > 0) return;
  }
}

/** Tauscht zwei Nachbarsteine. Ungültige Tausche liefern null. */
export function swapTiles(state: GameState, a: Pos, b: Pos, random: Random = Math.random): Resolution | null {
  if (state.moves <= 0 || !isValidSwap(state.board, a, b)) return null;
  const resolver = new Resolver(state, random);
  const { board } = resolver;
  const ca = cellAt(board, a.x, a.y)!;
  const cb = cellAt(board, b.x, b.y)!;
  const ta = ca.tile!;
  const tb = cb.tile!;
  const preview = swapPreview(state.board, a, b);
  resolver.state.moves--;

  if (ta.power && tb.power) {
    ca.tile = null;
    cb.tile = null;
    resolver.cleared.push({ x: a.x, y: a.y, color: -1, power: ta.power }, { x: b.x, y: b.y, color: -1, power: tb.power });
    resolver.combo(ta.power, tb.power, b.x, b.y);
    return resolver.finish(preview);
  }
  if (ta.power === "electro" || tb.power === "electro") {
    const [electroPos, other] = ta.power === "electro" ? [a, tb] : [b, ta];
    cellAt(board, electroPos.x, electroPos.y)!.tile = null;
    resolver.cleared.push({ x: electroPos.x, y: electroPos.y, color: -1, power: "electro" });
    resolver.clearColor(other.color, electroPos.x, electroPos.y);
    resolver.drain();
    return resolver.finish(preview);
  }
  [ca.tile, cb.tile] = [tb, ta];
  if (ta.power || tb.power) {
    // Das Power-up zündet am neuen Platz; der andere Stein kann zusätzlich eine Reihe bilden.
    const [pos, tile] = ta.power ? [b, ta] : [a, tb];
    cellAt(board, pos.x, pos.y)!.tile = null;
    resolver.cleared.push({ x: pos.x, y: pos.y, color: -1, power: tile.power });
    resolver.activate({ power: tile.power!, x: pos.x, y: pos.y });
    resolver.drain();
    return resolver.finish(preview);
  }
  resolver.clearGroups(findGroups(board), [b, a]);
  resolver.drain();
  return resolver.finish(preview);
}

/** Antippen eines Power-ups zündet es und kostet einen Zug. */
export function tapPower(state: GameState, pos: Pos, random: Random = Math.random): Resolution | null {
  const tile = cellAt(state.board, pos.x, pos.y)?.tile;
  if (state.moves <= 0 || !tile?.power || tile.vines) return null;
  const resolver = new Resolver(state, random);
  resolver.state.moves--;
  cellAt(resolver.board, pos.x, pos.y)!.tile = null;
  resolver.cleared.push({ x: pos.x, y: pos.y, color: -1, power: tile.power });
  resolver.activate({ power: tile.power, x: pos.x, y: pos.y });
  resolver.drain();
  return resolver.finish();
}

export type Tool = "hammer" | "arrow" | "cannon";

/** Hilfsmittel kosten keinen Zug: Hammer trifft ein Feld, Pfeil eine Reihe, Kanone eine Spalte. */
export function applyTool(state: GameState, tool: Tool, pos: Pos, random: Random = Math.random): Resolution | null {
  const cell = cellAt(state.board, pos.x, pos.y);
  if (!cell || cell.hole) return null;
  if (tool === "hammer" && !cell.tile && !cell.blocker) return null;
  const resolver = new Resolver(state, random);
  if (tool === "hammer") {
    resolver.effects.push({ kind: "blast", x: pos.x, y: pos.y, radius: 0 });
    resolver.hitCell(pos.x, pos.y);
  } else if (tool === "arrow") {
    resolver.effects.push({ kind: "row", x: pos.x, y: pos.y });
    resolver.hitRow(pos.y);
  } else {
    resolver.effects.push({ kind: "column", x: pos.x, y: pos.y });
    resolver.hitColumn(pos.x);
  }
  resolver.drain();
  resolver.counterattack = false;
  return resolver.finish();
}

/** Mischt alle beweglichen Steine neu, ohne einen Zug zu kosten. */
export function shuffleState(state: GameState, random: Random = Math.random): Resolution {
  const resolver = new Resolver(state, random);
  const afterClear = cloneBoard(resolver.board);
  shuffleTiles(resolver.board, resolver.state.colors, random);
  resolver.steps.push({ afterClear, board: cloneBoard(resolver.board), cleared: [], effects: [{ kind: "shuffle" }], spawned: {}, created: [] });
  return { steps: resolver.steps, state: resolver.state, preview: null };
}

/** Königsbonus: übrige Power-ups zünden, jeder übrige Zug wird zu einer Rakete. */
export function kingsBonus(state: GameState, random: Random = Math.random): Resolution {
  const resolver = new Resolver(state, random);
  resolver.scoring = "bonus";
  const { board } = resolver;
  for (let round = 0; round < 40; round++) {
    const powered = board.cells.findIndex((cell) => cell.tile?.power && !cell.tile.vines);
    if (powered >= 0) {
      const tile = board.cells[powered].tile!;
      const x = powered % board.width;
      const y = Math.floor(powered / board.width);
      board.cells[powered].tile = null;
      resolver.cleared.push({ x, y, color: -1, power: tile.power });
      resolver.activate({ power: tile.power!, x, y });
      resolver.drain();
    } else if (resolver.state.moves > 0) {
      resolver.state.moves--;
      resolver.state.score += 50;
      const plain = board.cells.flatMap((cell, index) => cell.tile && !cell.tile.power && !cell.tile.vines ? [index] : []);
      if (plain.length === 0) continue;
      const index = plain[Math.floor(random() * plain.length)];
      const power: PowerKind = random() < 0.5 ? "rocketH" : "rocketV";
      board.cells[index].tile = null;
      const x = index % board.width;
      const y = Math.floor(index / board.width);
      resolver.created.push({ x, y });
      resolver.activate({ power, x, y });
      resolver.drain();
    } else {
      break;
    }
    resolver.finishStep();
    resolver.cascade();
  }
  resolver.state.moves = 0;
  return { steps: resolver.steps, state: resolver.state, preview: null };
}

/** Sterne nach übrigen Zügen beim Sieg. */
export function starsFor(movesLeft: number, totalMoves: number): number {
  const share = movesLeft / Math.max(1, totalMoves);
  return share >= 0.25 ? 3 : share >= 0.1 ? 2 : 1;
}
