export const SLOTS = 3;

export const GOODS = [
  { name: "Apfel", symbol: "🍎" },
  { name: "Banane", symbol: "🍌" },
  { name: "Karotte", symbol: "🥕" },
  { name: "Milch", symbol: "🥛" },
  { name: "Käse", symbol: "🧀" },
  { name: "Brot", symbol: "🍞" },
  { name: "Keks", symbol: "🍪" },
  { name: "Saft", symbol: "🧃" },
  { name: "Dose", symbol: "🥫" },
  { name: "Seife", symbol: "🧼" },
  { name: "Teddy", symbol: "🧸" },
  { name: "Trauben", symbol: "🍇" },
] as const;

export type Item = { id: number; good: number };
export type Slot = Item | null;
/** Eine Reihe im Regal mit genau SLOTS Plätzen. */
export type Layer = Slot[];
/** layers[0] ist die vordere, spielbare Reihe. lock zählt die noch nötigen Treffer bis zum Öffnen. */
export type Shelf = { layers: Layer[]; lock: number };
export type Board = { shelves: Shelf[] };
export type Position = { shelf: number; slot: number };
export type Move = { from: Position; to: Position };
export type Outcome = {
  matches: Array<{ shelf: number; good: number }>;
  advanced: number[];
  unlocked: number[];
};
export type LevelConfig = {
  shelves: number;
  layers: number;
  goods: number;
  triples: number;
  locks: number[];
  seconds: number;
};
export type Random = () => number;

export const LEVELS: LevelConfig[] = [
  { shelves: 4, layers: 1, goods: 3, triples: 3, locks: [], seconds: 60 },
  { shelves: 6, layers: 1, goods: 5, triples: 5, locks: [], seconds: 80 },
  { shelves: 6, layers: 2, goods: 5, triples: 8, locks: [], seconds: 110 },
  { shelves: 6, layers: 2, goods: 6, triples: 10, locks: [], seconds: 130 },
  { shelves: 8, layers: 2, goods: 7, triples: 12, locks: [], seconds: 150 },
  { shelves: 8, layers: 2, goods: 8, triples: 13, locks: [2], seconds: 170 },
  { shelves: 8, layers: 3, goods: 8, triples: 18, locks: [2], seconds: 210 },
  { shelves: 12, layers: 2, goods: 9, triples: 20, locks: [3], seconds: 240 },
  { shelves: 12, layers: 2, goods: 10, triples: 20, locks: [2, 4], seconds: 250 },
  { shelves: 12, layers: 3, goods: 10, triples: 27, locks: [3], seconds: 320 },
  { shelves: 12, layers: 3, goods: 11, triples: 29, locks: [2, 5], seconds: 345 },
  { shelves: 12, layers: 3, goods: 12, triples: 30, locks: [3, 6], seconds: 360 },
];

/** Nach dem letzten Level bleibt die höchste Schwierigkeit mit immer neuen Regalen bestehen. */
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
  /** Sekunden ohne Zug bis zum Tipp; null schaltet Tipps ab. */
  hintDelay: number | null;
};

export const DIFFICULTIES: Difficulty[] = [
  { id: "leicht", name: "Leicht", summary: "Volle Zeit · 2 Booster je Sorte · Tipps", timeFactor: 1, boosters: 2, hintDelay: 8 },
  { id: "mittel", name: "Mittel", summary: "80 % Zeit · 1 Booster je Sorte · späte Tipps", timeFactor: 0.8, boosters: 1, hintDelay: 15 },
  { id: "schwer", name: "Schwer", summary: "65 % Zeit · 1 Booster je Sorte · keine Tipps", timeFactor: 0.65, boosters: 1, hintDelay: null },
];

export function levelSeconds(level: number, difficulty: Difficulty): number {
  return Math.round(levelConfig(level).seconds * difficulty.timeFactor);
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

function emptyLayer(): Layer {
  return Array.from({ length: SLOTS }, () => null);
}

function filled(layer: Layer): number {
  return layer.reduce((count, slot) => count + (slot ? 1 : 0), 0);
}

function countGood(layer: Layer, good: number): number {
  return layer.reduce((count, slot) => count + (slot?.good === good ? 1 : 0), 0);
}

function isTriple(layer: Layer): boolean {
  const first = layer[0];
  return first !== null && layer.every((slot) => slot?.good === first.good);
}

export function cloneBoard(board: Board): Board {
  return { shelves: board.shelves.map((shelf) => ({ lock: shelf.lock, layers: shelf.layers.map((layer) => [...layer]) })) };
}

export function isCleared(board: Board): boolean {
  return board.shelves.every((shelf) => shelf.layers.every((layer) => filled(layer) === 0));
}

export function countItems(board: Board): number {
  return board.shelves.reduce((sum, shelf) => sum + shelf.layers.reduce((count, layer) => count + filled(layer), 0), 0);
}

function registerMatch(board: Board, outcome: Outcome) {
  board.shelves.forEach((shelf, index) => {
    if (shelf.lock > 0 && --shelf.lock === 0) outcome.unlocked.push(index);
  });
}

/** Entfernt fertige Dreier und lässt hintere Reihen nachrücken, bis das Regal stabil ist. */
function settle(board: Board, outcome: Outcome) {
  let changed = true;
  while (changed) {
    changed = false;
    board.shelves.forEach((shelf, index) => {
      if (shelf.lock > 0) return;
      const front = shelf.layers[0];
      if (isTriple(front)) {
        outcome.matches.push({ shelf: index, good: front[0]!.good });
        shelf.layers[0] = emptyLayer();
        registerMatch(board, outcome);
        changed = true;
      }
      if (shelf.layers.length > 1 && filled(shelf.layers[0]) === 0) {
        shelf.layers.shift();
        outcome.advanced.push(index);
        changed = true;
      }
    });
  }
}

export function canMove(board: Board, from: Position, to: Position): boolean {
  const source = board.shelves[from.shelf];
  const target = board.shelves[to.shelf];
  if (!source || !target || source.lock > 0 || target.lock > 0) return false;
  if (from.shelf === to.shelf && from.slot === to.slot) return false;
  return Boolean(source.layers[0][from.slot]) && target.layers[0][to.slot] === null;
}

/** Verschiebt eine Ware und verändert dabei das übergebene Board. Ungültige Züge liefern null. */
export function moveItem(board: Board, from: Position, to: Position): Outcome | null {
  if (!canMove(board, from, to)) return null;
  const source = board.shelves[from.shelf].layers[0];
  board.shelves[to.shelf].layers[0][to.slot] = source[from.slot];
  source[from.slot] = null;
  const outcome: Outcome = { matches: [], advanced: [], unlocked: [] };
  settle(board, outcome);
  return outcome;
}

type RankedMove = Move & { score: number };

/** Alle sinnvollen Züge, die besten zuerst. Gleichwertige Ziele werden zusammengefasst. */
function rankMoves(board: Board): RankedMove[] {
  const moves: RankedMove[] = [];
  const visible = new Map<number, number>();
  for (const shelf of board.shelves) {
    if (shelf.lock > 0) continue;
    for (const slot of shelf.layers[0]) if (slot) visible.set(slot.good, (visible.get(slot.good) ?? 0) + 1);
  }

  board.shelves.forEach((sourceShelf, sourceIndex) => {
    if (sourceShelf.lock > 0) return;
    const source = sourceShelf.layers[0];
    const sourceItems = filled(source);
    const tried = new Set<number>();
    source.forEach((item, sourceSlot) => {
      if (!item || tried.has(item.good)) return;
      tried.add(item.good);
      const sameAtSource = countGood(source, item.good);
      const revealsLayer = sourceItems === 1 && sourceShelf.layers.length > 1;
      let emptyTargetUsed = false;

      board.shelves.forEach((targetShelf, targetIndex) => {
        if (targetIndex === sourceIndex || targetShelf.lock > 0) return;
        const target = targetShelf.layers[0];
        const targetSlot = target.indexOf(null);
        if (targetSlot < 0) return;
        const targetItems = filled(target);
        const sameAtTarget = countGood(target, item.good);
        let score: number;
        if (targetItems === 0) {
          if (emptyTargetUsed) return;
          emptyTargetUsed = true;
          // Ein sortenreines Fach in ein leeres Fach umzuräumen ändert nichts.
          if (sameAtSource === sourceItems && sourceShelf.layers.length === 1) return;
          score = (visible.get(item.good) ?? 0) >= SLOTS ? 120 : 30;
        } else if (sameAtTarget === 2) {
          score = 1000;
        } else if (sameAtTarget === targetItems) {
          score = sameAtSource > 1 ? 40 : 300;
        } else {
          score = 10;
        }
        if (revealsLayer) score += 80;
        moves.push({ from: { shelf: sourceIndex, slot: sourceSlot }, to: { shelf: targetIndex, slot: targetSlot }, score });
      });
    });
  });

  return moves.sort((a, b) => b.score - a.score);
}

/** Falsch, wenn kein Zug mehr etwas am Regal verändern kann. */
export function hasUsefulMove(board: Board): boolean {
  return rankMoves(board).length > 0;
}

function boardKey(board: Board): string {
  return board.shelves.map((shelf) => `${shelf.lock}:${shelf.layers.map((layer) => (
    layer.map((slot) => slot ? slot.good : -1).sort((a, b) => a - b).join(",")
  )).join("|")}`).join("/");
}

/** Sucht per Tiefensuche eine Zugfolge, die das Regal vollständig leert. */
export function solveBoard(board: Board, nodeLimit = 4000): Move[] | null {
  const seen = new Set<string>();
  const path: Move[] = [];
  let nodes = 0;

  const visit = (state: Board): boolean => {
    if (isCleared(state)) return true;
    const key = boardKey(state);
    if (seen.has(key) || ++nodes > nodeLimit) return false;
    seen.add(key);
    for (const move of rankMoves(state)) {
      const next = cloneBoard(state);
      moveItem(next, move.from, move.to);
      path.push({ from: move.from, to: move.to });
      if (visit(next)) return true;
      path.pop();
      if (nodes > nodeLimit) return false;
    }
    return false;
  };

  return visit(board) ? path : null;
}

/** Nächster Zug einer Lösung, ersatzweise der am besten bewertete Zug. */
export function findHint(board: Board): Move | null {
  const solution = solveBoard(board, 1500);
  if (solution?.length) return solution[0];
  const [best] = rankMoves(board);
  return best ? { from: best.from, to: best.to } : null;
}

function layoutItems(items: Item[], shelves: Shelf[], open: number[], maxLayers: number, random: Random): boolean {
  let remaining = items.length;
  const spare = Math.max(3, Math.ceil(open.length / 2));
  const frontCapacity = Math.max(0, open.length * SLOTS - spare);
  let frontCount = Math.min(remaining, frontCapacity);
  remaining -= frontCount;

  const counts = new Map<number, number[]>(open.map((index) => [index, [0]]));
  if (remaining > 0) {
    // Vor einer gefüllten hinteren Reihe muss mindestens eine Ware stehen.
    if (frontCount < open.length) return false;
    for (const index of open) counts.get(index)![0] = 1;
    frontCount -= open.length;
  }
  const freeFront = shuffleInPlace(open.flatMap((index) => Array.from({ length: SLOTS - counts.get(index)![0] }, () => index)), random);
  for (const index of freeFront.slice(0, frontCount)) counts.get(index)![0]++;

  let slack = open.length * SLOTS * (maxLayers - 1) - remaining;
  for (let depth = 1; remaining > 0; depth++) {
    const order = shuffleInPlace(open.filter((index) => counts.get(index)!.length === depth), random);
    for (const index of order) {
      if (remaining === 0) break;
      let count = Math.min(SLOTS, remaining);
      if (count === SLOTS && slack > 0 && random() < 0.3) {
        count--;
        slack--;
      }
      counts.get(index)!.push(count);
      remaining -= count;
    }
  }

  const pool = shuffleInPlace([...items], random);
  const layers: Layer[] = [];
  for (const index of open) {
    shelves[index] = {
      lock: 0,
      layers: counts.get(index)!.map((count) => {
        const layer = emptyLayer();
        for (const slot of shuffleInPlace([0, 1, 2], random).slice(0, count)) layer[slot] = pool.pop()!;
        layers.push(layer);
        return layer;
      }),
    };
  }

  // Kein Fach darf schon sortiert starten: einen Dreier mit einer fremden Ware aufbrechen.
  for (let attempt = 0; attempt < 60; attempt++) {
    const triple = layers.find(isTriple);
    if (!triple) return true;
    const candidates = layers.flatMap((layer) => layer.flatMap((slot, index) => slot && slot.good !== triple[0]!.good ? [{ layer, index }] : []));
    if (candidates.length === 0) return false;
    const swap = candidates[Math.floor(random() * candidates.length)];
    const slot = Math.floor(random() * SLOTS);
    [triple[slot], swap.layer[swap.index]] = [swap.layer[swap.index], triple[slot]];
  }
  return !layers.some(isTriple);
}

/** Verteilt Waren auf die offenen Regale; gesperrte Regale bleiben unverändert. Nur lösbare Regale werden zurückgegeben. */
function generateBoard(items: Item[], fixed: Array<Shelf | null>, maxLayers: number, random: Random): Board {
  const open = fixed.flatMap((shelf, index) => shelf ? [] : [index]);
  let fallback: Board | null = null;
  for (let attempt = 0; attempt < 80; attempt++) {
    const shelves = fixed.map((shelf) => shelf ? { lock: shelf.lock, layers: shelf.layers.map((layer) => [...layer]) } : { lock: 0, layers: [emptyLayer()] });
    if (!layoutItems(items, shelves, open, maxLayers, random)) continue;
    const board = { shelves };
    if (solveBoard(cloneBoard(board))) return board;
    fallback = board;
  }
  if (fixed.some(Boolean)) {
    // Mit Ketten gibt es keine Lösung: alle Regale öffnen und gemeinsam neu verteilen.
    const all = [...items, ...fixed.flatMap((shelf) => shelf ? shelf.layers.flat().filter((slot): slot is Item => slot !== null) : [])];
    return generateBoard(all, fixed.map(() => null), maxLayers, random);
  }
  return fallback ?? { shelves: fixed.map(() => ({ lock: 0, layers: [emptyLayer()] })) };
}

export function createLevel(config: LevelConfig, random: Random = Math.random): Board {
  const goods = shuffleInPlace(GOODS.map((_, index) => index), random).slice(0, config.goods);
  const items = shuffleInPlace(Array.from({ length: config.triples * SLOTS }, (_, index) => ({
    id: index,
    good: goods[Math.floor(index / SLOTS) % goods.length],
  })), random);

  const fixed: Array<Shelf | null> = Array.from({ length: config.shelves }, () => null);
  const lockedShelves = shuffleInPlace(fixed.map((_, index) => index), random).slice(0, config.locks.length);
  lockedShelves.forEach((shelfIndex, lockIndex) => {
    const layer: Layer = [];
    while (layer.length < SLOTS) {
      // Hinter einer Kette stehen nie drei gleiche Waren.
      const pick = items.findIndex((item) => layer.length < SLOTS - 1 || !layer.every((slot) => slot?.good === item.good));
      layer.push(items.splice(Math.max(0, pick), 1)[0]);
    }
    fixed[shelfIndex] = { lock: config.locks[lockIndex], layers: [layer] };
  });

  return generateBoard(items, fixed, config.layers, random);
}

/** Mischt alle frei zugänglichen Waren neu. Waren hinter Ketten bleiben liegen. */
export function shuffleBoard(board: Board, maxLayers: number, random: Random = Math.random): Board {
  const fixed = board.shelves.map((shelf) => shelf.lock > 0 ? shelf : null);
  const items = board.shelves.flatMap((shelf) => shelf.lock > 0 ? [] : shelf.layers.flat().filter((slot): slot is Item => slot !== null));
  return generateBoard(items, fixed, maxLayers, random);
}

export type WandOutcome = Outcome & { removed: Array<{ shelf: number; good: number }> };

/** Zauberstab: nimmt drei gleiche Waren aus dem Regal, bevorzugt gut sichtbare. */
export function removeTriple(board: Board): WandOutcome | null {
  type Found = { shelf: number; layer: number; slot: number; locked: boolean };
  const found = new Map<number, Found[]>();
  board.shelves.forEach((shelf, shelfIndex) => shelf.layers.forEach((layer, layerIndex) => layer.forEach((item, slot) => {
    if (!item) return;
    const list = found.get(item.good) ?? [];
    list.push({ shelf: shelfIndex, layer: layerIndex, slot, locked: shelf.lock > 0 });
    found.set(item.good, list);
  })));

  let best: Found[] | null = null;
  let bestScore = -1;
  for (const list of found.values()) {
    if (list.length < SLOTS) continue;
    list.sort((a, b) => Number(a.locked) - Number(b.locked) || a.layer - b.layer);
    const picked = list.slice(0, SLOTS);
    const score = picked.reduce((sum, entry) => sum + (entry.locked ? 0 : entry.layer === 0 ? 10 : 3), 0);
    if (score > bestScore) {
      best = picked;
      bestScore = score;
    }
  }
  if (!best) return null;

  const outcome: WandOutcome = { matches: [], advanced: [], unlocked: [], removed: [] };
  for (const entry of best) {
    const layer = board.shelves[entry.shelf].layers[entry.layer];
    outcome.removed.push({ shelf: entry.shelf, good: layer[entry.slot]!.good });
    layer[entry.slot] = null;
  }
  // Leere Zwischenreihen verschwinden, die vordere Reihe bleibt als Ablage bestehen.
  for (const shelf of board.shelves) {
    shelf.layers = shelf.layers.filter((layer, index) => index === 0 || filled(layer) > 0);
  }
  registerMatch(board, outcome);
  settle(board, outcome);
  return outcome;
}
