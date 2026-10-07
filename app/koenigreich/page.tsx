"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { sitePath } from "../site-paths";
import {
  DIFFICULTIES, EXTRA_MOVES, GEMS, POWERS, canSwap, cellAt, createGame, findHint, isAdjacent, isGoalComplete, kingsBonus,
  applyTool, levelConfig, levelGoals, levelMoves, placeStartPowers, shuffleState, starsFor, swapPreview, swapTiles, tapPower,
  type Board, type Burst, type Difficulty, type Effect, type GameState, type Goal, type Move, type Pos, type PowerKind,
  type Resolution, type Tool,
} from "./engine";
import { DISTRICTS, EMPTY_KINGDOM, build, canBuild, currentDistrict, sanitizeKingdom, type Kingdom } from "./kingdom";

type Phase = "ready" | "kingdom" | "playing" | "won" | "lost";
type Progress = { unlocked: number; stars: Record<string, number>; best: Record<string, number> };
type Helpers = { hammer: number; arrow: number; cannon: number; shuffle: number };
type StartPower = "rocket" | "dynamite" | "electro";
type View = { board: Board; spawned: Record<number, number> };
type Fx = { id: number; effect?: Effect; burst?: Burst };
type Result = { stars: number; potions: number; score: number };
type Gesture = { pointerId: number; start: Pos; startX: number; startY: number; done: boolean };

const PROGRESS_KEY = "hannas-spiele-koenigreich-fortschritt";
const DIFFICULTY_KEY = "hannas-spiele-koenigreich-schwierigkeit";
const KINGDOM_KEY = "hannas-spiele-koenigreich-reich";
const EMPTY_PROGRESS: Progress = { unlocked: 1, stars: {}, best: {} };
const SWAP_TIME = 170;
const CLEAR_TIME = 190;
const FALL_TIME = 250;

const START_POWERS: Array<{ id: StartPower; name: string; symbol: string }> = [
  { id: "rocket", name: "Rakete", symbol: "🚀" },
  { id: "dynamite", name: "Dynamit", symbol: "🧨" },
  { id: "electro", name: "Elektrokugel", symbol: "🔮" },
];

const HELPERS: Array<{ id: keyof Helpers; name: string; symbol: string; title: string }> = [
  { id: "hammer", name: "Hammer", symbol: "🔨", title: "Zerschlägt ein Feld" },
  { id: "arrow", name: "Pfeil", symbol: "🏹", title: "Räumt eine ganze Reihe ab" },
  { id: "cannon", name: "Kanone", symbol: "💣", title: "Räumt eine ganze Spalte ab" },
  { id: "shuffle", name: "Narrenkappe", symbol: "🃏", title: "Mischt alle Steine neu" },
];

const GOAL_SYMBOL: Record<Exclude<Goal["kind"], "color">, string> = { crate: "📦", vine: "🌿", owl: "🦉", boss: "😈" };
const GOAL_NAME: Record<Goal["kind"], string> = { color: "", crate: "Kisten", vine: "Ranken", owl: "Eulen", boss: "Lebenspunkte des Dunklen Königs" };

function progressKey(difficulty: Difficulty): string {
  return difficulty.id === "leicht" ? PROGRESS_KEY : `${PROGRESS_KEY}-${difficulty.id}`;
}

function startHelpers(difficulty: Difficulty): Helpers {
  return { hammer: difficulty.boosters, arrow: difficulty.boosters, cannon: difficulty.boosters, shuffle: difficulty.boosters };
}

function loadDifficulty(): number {
  try {
    return Math.max(0, DIFFICULTIES.findIndex((entry) => entry.id === window.localStorage.getItem(DIFFICULTY_KEY)));
  } catch {
    return 0;
  }
}

function loadProgress(difficulty: Difficulty): Progress {
  try {
    const stored = JSON.parse(window.localStorage.getItem(progressKey(difficulty)) ?? "null") as Partial<Progress> | null;
    const unlocked = Math.floor(Number(stored?.unlocked));
    return {
      unlocked: Number.isFinite(unlocked) && unlocked > 1 ? unlocked : 1,
      stars: { ...stored?.stars },
      best: { ...stored?.best },
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function loadKingdom(): Kingdom {
  try {
    return sanitizeKingdom(JSON.parse(window.localStorage.getItem(KINGDOM_KEY) ?? "null"));
  } catch {
    return EMPTY_KINGDOM;
  }
}

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Das Spiel bleibt auch ohne verfügbaren Browserspeicher spielbar.
  }
}

function goalLabel(goal: Goal): string {
  return goal.kind === "color" ? GEMS[goal.color].name : GOAL_NAME[goal.kind];
}

function describeGoals(goals: Goal[]): string {
  return goals.map((goal) => goal.kind === "boss" ? "Dunkler König" : `${goal.target} ${goalLabel(goal)}`).join(" · ");
}

function Stars({ count }: { count: number }) {
  return (
    <span className="reich-stars" role="img" aria-label={`${count} von 3 Sternen`}>
      {[1, 2, 3].map((star) => <i key={star} data-earned={star <= count || undefined}>★</i>)}
    </span>
  );
}

function GoalIcon({ goal }: { goal: Goal }) {
  if (goal.kind === "color") return <span className="reich-gem reich-goal-gem" data-color={GEMS[goal.color].key} aria-hidden="true" />;
  return <span aria-hidden="true">{GOAL_SYMBOL[goal.kind]}</span>;
}

export default function KoenigreichPage() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [level, setLevel] = useState(1);
  const [difficultyIndex, setDifficultyIndex] = useState(0);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [kingdom, setKingdom] = useState<Kingdom>(EMPTY_KINGDOM);
  const [game, setGame] = useState<GameState | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const [helpers, setHelpers] = useState<Helpers>(() => startHelpers(DIFFICULTIES[0]));
  const [picks, setPicks] = useState<StartPower[]>([]);
  const [extraLeft, setExtraLeft] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  /** Der Zugzähler springt sofort, Ziele und Brett folgen nach der Animation. */
  const [movesShown, setMovesShown] = useState(0);
  const [hint, setHint] = useState<Move | null>(null);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [shake, setShake] = useState(false);
  const [justBuilt, setJustBuilt] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const difficulty = DIFFICULTIES[difficultyIndex];

  const gameRef = useRef<GameState | null>(null);
  const busyRef = useRef(false);
  const runRef = useRef(0);
  const levelRef = useRef(1);
  const difficultyRef = useRef(DIFFICULTIES[0]);
  const progressRef = useRef<Progress>(EMPTY_PROGRESS);
  const kingdomRef = useRef<Kingdom>(EMPTY_KINGDOM);
  const totalMovesRef = useRef(0);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const fxIdRef = useRef(0);
  const timeoutsRef = useRef(new Set<number>());
  const noticeTimeoutRef = useRef<number | null>(null);
  const soundEnabledRef = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotes = useCallback((frequencies: number[], duration = 0.12, type: OscillatorType = "sine") => {
    if (!soundEnabledRef.current || typeof window === "undefined" || !window.AudioContext) return;
    try {
      const audio = audioContextRef.current && audioContextRef.current.state !== "closed"
        ? audioContextRef.current
        : new window.AudioContext();
      audioContextRef.current = audio;
      if (audio.state === "suspended") void audio.resume().catch(() => {});
      frequencies.forEach((frequency, index) => {
        const startAt = audio.currentTime + index * 0.06;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.1, startAt + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + duration + 0.01);
      });
    } catch {
      // WebAudio kann je nach Browserrichtlinie nicht verfügbar sein.
    }
  }, []);

  const later = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current.delete(id);
      callback();
    }, delay);
    timeoutsRef.current.add(id);
    return id;
  }, []);

  const wait = useCallback((delay: number) => new Promise<void>((resolve) => { later(resolve, delay); }), [later]);

  const showNotice = useCallback((text: string) => {
    if (noticeTimeoutRef.current !== null) window.clearTimeout(noticeTimeoutRef.current);
    setNotice(text);
    noticeTimeoutRef.current = later(() => setNotice(""), 2400);
  }, [later]);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      const index = loadDifficulty();
      const stored = loadProgress(DIFFICULTIES[index]);
      const storedKingdom = loadKingdom();
      difficultyRef.current = DIFFICULTIES[index];
      setDifficultyIndex(index);
      setHelpers(startHelpers(DIFFICULTIES[index]));
      progressRef.current = stored;
      setProgress(stored);
      kingdomRef.current = storedKingdom;
      setKingdom(storedKingdom);
      levelRef.current = stored.unlocked;
      setLevel(stored.unlocked);
    });
    const timeouts = timeoutsRef.current;
    return () => {
      mounted = false;
      for (const id of timeouts) window.clearTimeout(id);
      void audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  // Nach einer Weile ohne Zug zeigt ein Tipp einen möglichen Tausch.
  useEffect(() => {
    const { hintDelay } = difficulty;
    if (phase !== "playing" || busy || !game || hintDelay === null) return;
    const id = window.setTimeout(() => setHint(findHint(game.board)), hintDelay * 1000);
    return () => window.clearTimeout(id);
  }, [busy, difficulty, game, phase]);

  const addFx = useCallback((effects: Effect[], bursts: Burst[]) => {
    const added: Fx[] = [
      ...effects.map((effect) => ({ id: fxIdRef.current++, effect })),
      ...bursts.map((burst) => ({ id: fxIdRef.current++, burst })),
    ];
    if (added.length === 0) return;
    setFx((current) => [...current, ...added]);
    later(() => setFx((current) => current.filter((entry) => !added.includes(entry))), 650);
  }, [later]);

  const finishLevel = useCallback((state: GameState, movesLeft: number) => {
    const finished = levelRef.current;
    const stars = starsFor(movesLeft, totalMovesRef.current);
    const previous = progressRef.current;
    const next: Progress = {
      unlocked: Math.max(previous.unlocked, finished + 1),
      stars: { ...previous.stars, [finished]: Math.max(previous.stars[finished] ?? 0, stars) },
      best: { ...previous.best, [finished]: Math.max(previous.best[finished] ?? 0, state.score) },
    };
    progressRef.current = next;
    setProgress(next);
    save(progressKey(difficultyRef.current), next);
    const nextKingdom = { ...kingdomRef.current, potions: kingdomRef.current.potions + stars };
    kingdomRef.current = nextKingdom;
    setKingdom(nextKingdom);
    save(KINGDOM_KEY, nextKingdom);
    setResult({ stars, potions: stars, score: state.score });
    setPhase("won");
    playNotes([523, 659, 784, 1047], 0.3, "triangle");
  }, [playNotes]);

  /** Spielt die Abschnitte einer Auflösung nacheinander ab und übernimmt danach den neuen Zustand. */
  const play = useCallback(async (resolution: Resolution, speed = 1) => {
    const token = ++runRef.current;
    busyRef.current = true;
    setBusy(true);
    setHint(null);
    setSelected(null);
    setMovesShown(resolution.state.moves);
    if (resolution.preview) {
      setView({ board: resolution.preview, spawned: {} });
      await wait(SWAP_TIME);
    }
    let chain = 0;
    for (const step of resolution.steps) {
      if (token !== runRef.current) return;
      setView({ board: step.afterClear, spawned: {} });
      addFx(step.effects, step.cleared);
      const colored = step.cleared.filter((burst) => burst.color >= 0).length;
      if (step.effects.some((effect) => effect.kind === "attack")) {
        setShake(true);
        later(() => setShake(false), 420);
        showNotice("Der Dunkle König schlägt zurück!");
        playNotes([196, 147], 0.3, "sawtooth");
      } else if (step.effects.some((effect) => effect.kind === "shuffle")) {
        showNotice("Keine Züge mehr – neu gemischt!");
        playNotes([330, 392, 330, 440], 0.1, "triangle");
      } else if (step.effects.length > 0) {
        playNotes([220, 330, 494], 0.16, "square");
      } else if (colored > 0) {
        playNotes([440 + chain * 70, 660 + chain * 80], 0.12);
      }
      if (step.created.length > 0) playNotes([880, 1175], 0.14, "triangle");
      chain++;
      await wait(CLEAR_TIME / speed);
      if (token !== runRef.current) return;
      setView({ board: step.board, spawned: step.spawned });
      await wait(FALL_TIME / speed);
    }
    if (token !== runRef.current) return;
    if (chain >= 4) showNotice(chain >= 6 ? "Königlich!" : "Großartig!");
    gameRef.current = resolution.state;
    setGame(resolution.state);
    setView({ board: resolution.state.board, spawned: {} });
    busyRef.current = false;
    setBusy(false);
  }, [addFx, later, playNotes, showNotice, wait]);

  /** Prüft nach jedem Zug auf Sieg oder fehlende Züge. */
  const afterAction = useCallback(async () => {
    const state = gameRef.current;
    if (!state) return;
    if (isGoalComplete(state)) {
      const movesLeft = state.moves;
      showNotice(movesLeft > 0 ? "Königsbonus!" : "Geschafft!");
      const bonus = kingsBonus(state);
      const token = runRef.current + 1;
      await play(bonus, 1.7);
      if (token !== runRef.current) return;
      finishLevel(bonus.state, movesLeft);
    } else if (state.moves <= 0) {
      setPhase("lost");
      playNotes([392, 311, 233], 0.4, "triangle");
    }
  }, [finishLevel, play, playNotes, showNotice]);

  const run = useCallback(async (resolution: Resolution) => {
    const token = runRef.current + 1;
    await play(resolution);
    if (token === runRef.current) await afterAction();
  }, [afterAction, play]);

  const startLevel = useCallback((nextLevel: number) => {
    runRef.current++;
    const currentDifficulty = difficultyRef.current;
    const moves = levelMoves(nextLevel, currentDifficulty);
    let state = createGame(levelConfig(nextLevel), moves);
    const powers: PowerKind[] = picks.slice(0, currentDifficulty.startPowers).map((pick) => (
      pick === "rocket" ? (Math.random() < 0.5 ? "rocketH" : "rocketV") : pick
    ));
    if (powers.length > 0) state = placeStartPowers(state, powers);
    gameRef.current = state;
    setGame(state);
    setView({ board: state.board, spawned: {} });
    levelRef.current = nextLevel;
    setLevel(nextLevel);
    totalMovesRef.current = moves;
    setTotalMoves(moves);
    setMovesShown(state.moves);
    setExtraLeft(currentDifficulty.extraMoves);
    setHelpers(startHelpers(currentDifficulty));
    setSelected(null);
    setTool(null);
    setHint(null);
    setFx([]);
    setNotice("");
    setResult(null);
    busyRef.current = false;
    setBusy(false);
    setPhase("playing");
    playNotes([392, 523], 0.14, "triangle");
  }, [picks, playNotes]);

  const canAct = phase === "playing" && !busy && game !== null;

  const attemptSwap = async (a: Pos, b: Pos) => {
    const state = gameRef.current;
    if (!state || busyRef.current) return;
    setSelected(null);
    if (!canSwap(state.board, a, b)) return;
    const resolution = swapTiles(state, a, b);
    if (resolution) {
      await run(resolution);
      return;
    }
    // Ungültiger Tausch: kurz tauschen und zurückspringen.
    const token = ++runRef.current;
    busyRef.current = true;
    setBusy(true);
    setView({ board: swapPreview(state.board, a, b), spawned: {} });
    playNotes([180], 0.09, "triangle");
    await wait(SWAP_TIME + 40);
    if (token !== runRef.current) return;
    setView({ board: state.board, spawned: {} });
    await wait(SWAP_TIME);
    if (token !== runRef.current) return;
    busyRef.current = false;
    setBusy(false);
  };

  const aimTool = (activeTool: Tool, pos: Pos) => {
    const state = gameRef.current;
    if (!state) return;
    const resolution = applyTool(state, activeTool, pos);
    if (!resolution) return;
    setTool(null);
    setHelpers((current) => ({ ...current, [activeTool]: current[activeTool] - 1 }));
    void run(resolution);
  };

  const handleTap = (pos: Pos) => {
    const state = gameRef.current;
    if (!state || busyRef.current) return;
    if (tool) {
      aimTool(tool, pos);
      return;
    }
    const tile = cellAt(state.board, pos.x, pos.y)?.tile;
    if (tile?.power && !tile.vines && !(selected && isAdjacent(selected, pos))) {
      const resolution = tapPower(state, pos);
      if (resolution) void run(resolution);
      return;
    }
    if (selected && isAdjacent(selected, pos)) {
      void attemptSwap(selected, pos);
      return;
    }
    if (selected && selected.x === pos.x && selected.y === pos.y) {
      setSelected(null);
      return;
    }
    if (tile && !tile.vines) {
      setSelected(pos);
      playNotes([520], 0.05, "triangle");
    } else {
      setSelected(null);
    }
  };

  const cellFromPoint = (clientX: number, clientY: number): Pos | null => {
    const element = boardRef.current;
    const board = gameRef.current?.board;
    if (!element || !board) return null;
    const rect = element.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / rect.width * board.width);
    const y = Math.floor((clientY - rect.top) / rect.height * board.height);
    if (x < 0 || y < 0 || x >= board.width || y >= board.height) return null;
    return { x, y };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canAct || event.button !== 0 || gestureRef.current) return;
    const start = cellFromPoint(event.clientX, event.clientY);
    if (!start) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { pointerId: event.pointerId, start, startX: event.clientX, startY: event.clientY, done: false };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    const board = gameRef.current?.board;
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.done || !board || tool) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const cellSize = event.currentTarget.getBoundingClientRect().width / board.width;
    if (Math.hypot(dx, dy) < cellSize * 0.35) return;
    gesture.done = true;
    const target = Math.abs(dx) > Math.abs(dy)
      ? { x: gesture.start.x + Math.sign(dx), y: gesture.start.y }
      : { x: gesture.start.x, y: gesture.start.y + Math.sign(dy) };
    void attemptSwap(gesture.start, target);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (!gesture.done) handleTap(gesture.start);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gestureRef.current?.pointerId === event.pointerId) gestureRef.current = null;
  };

  const chooseHelper = (id: keyof Helpers) => {
    if (!canAct || helpers[id] === 0 || !game) return;
    if (id === "shuffle") {
      setTool(null);
      setHelpers((current) => ({ ...current, shuffle: current.shuffle - 1 }));
      void play(shuffleState(game));
      return;
    }
    setSelected(null);
    setTool((current) => current === id ? null : id);
  };

  const buyExtraMoves = () => {
    const state = gameRef.current;
    if (!state || extraLeft === 0) return;
    const next = { ...state, moves: state.moves + EXTRA_MOVES };
    gameRef.current = next;
    setGame(next);
    setMovesShown(next.moves);
    totalMovesRef.current += EXTRA_MOVES;
    setTotalMoves(totalMovesRef.current);
    setExtraLeft((current) => current - 1);
    setPhase("playing");
    showNotice(`+${EXTRA_MOVES} Züge!`);
    playNotes([660, 880], 0.18, "triangle");
  };

  const toggleSound = () => {
    soundEnabledRef.current = !soundEnabledRef.current;
    setSoundEnabled(soundEnabledRef.current);
  };

  const openLevelSelect = () => {
    runRef.current++;
    busyRef.current = false;
    setBusy(false);
    gameRef.current = null;
    setGame(null);
    setView(null);
    setTool(null);
    setPhase("ready");
  };

  const openKingdom = () => {
    openLevelSelect();
    setPhase("kingdom");
  };

  const chooseLevel = (nextLevel: number) => {
    levelRef.current = nextLevel;
    setLevel(nextLevel);
  };

  const chooseDifficulty = (index: number) => {
    const next = DIFFICULTIES[index];
    const stored = loadProgress(next);
    difficultyRef.current = next;
    setDifficultyIndex(index);
    setHelpers(startHelpers(next));
    setPicks((current) => current.slice(0, next.startPowers));
    progressRef.current = stored;
    setProgress(stored);
    levelRef.current = stored.unlocked;
    setLevel(stored.unlocked);
    try {
      window.localStorage.setItem(DIFFICULTY_KEY, next.id);
    } catch {
      // Ohne Browserspeicher gilt die Auswahl nur für diesen Besuch.
    }
  };

  const togglePick = (id: StartPower) => {
    setPicks((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id);
      if (difficulty.startPowers === 0) return current;
      return [...current, id].slice(-difficulty.startPowers);
    });
  };

  const buildTask = (taskId: string) => {
    if (!canBuild(kingdomRef.current, taskId)) return;
    const next = build(kingdomRef.current, taskId);
    kingdomRef.current = next;
    setKingdom(next);
    save(KINGDOM_KEY, next);
    setJustBuilt(taskId);
    later(() => setJustBuilt((current) => current === taskId ? null : current), 900);
    playNotes([523, 784, 1047], 0.22, "triangle");
  };

  const previewGoals = levelGoals(levelConfig(level));
  const levelStars = progress.stars[level] ?? 0;
  const board = view?.board ?? null;
  const district = currentDistrict(kingdom);
  const finishedDistricts = DISTRICTS.filter((entry) => entry.tasks.every((task) => kingdom.built.includes(task.id)));
  const status = notice
    || (tool === "hammer" ? "Tippe auf ein Feld für den Hammer." : "")
    || (tool === "arrow" ? "Tippe auf eine Reihe für den Pfeil." : "")
    || (tool === "cannon" ? "Tippe auf eine Spalte für die Kanone." : "")
    || (hint ? "Tipp: Tausche die wackelnden Steine!" : "")
    || (selected ? "Tippe auf einen Nachbarstein zum Tauschen." : "")
    || (phase === "playing" ? "Tausche Steine, bis drei gleiche in einer Reihe liegen." : "");
  const isHint = (x: number, y: number) => Boolean(hint && ((hint.a.x === x && hint.a.y === y) || (hint.b.x === x && hint.b.y === y)));

  return (
    <main className="game-shell reich-game-shell">
      <section className="game-card reich-game-card" aria-labelledby="reich-title">
        <div className="reich-topbar">
          <a className="back-link" href={sitePath("/")}>← Hanna&apos;s Spiele</a>
          <div className="reich-controls">
            <button onClick={toggleSound} aria-pressed={soundEnabled} aria-label={soundEnabled ? "Ton ausschalten" : "Ton einschalten"}>{soundEnabled ? "🔊" : "🔇"}</button>
            <button onClick={() => startLevel(level)} disabled={phase !== "playing"} aria-label="Level neu starten">↻</button>
            <button onClick={openLevelSelect} disabled={phase !== "playing"} aria-label="Level auswählen">☰</button>
          </div>
        </div>
        <header>
          <div><p className="eyebrow">MATCH-3-ABENTEUER</p><h1 id="reich-title">Königreich</h1></div>
          <div className="stats">
            <span>Level <b>{level}</b> · {difficulty.name}</span>
            {game && <span><b>{movesShown}</b> Züge</span>}
            <span title="Zaubertränke zum Bauen"><b>{kingdom.potions}</b> 🧪</span>
          </div>
        </header>

        {game && (phase === "playing" || phase === "won" || phase === "lost") && (
          <>
            <div className="reich-goals" aria-label="Ziele">
              {game.goals.filter((goal) => goal.kind !== "boss").map((goal) => {
                const left = goal.target - goal.done;
                return (
                  <span className="reich-goal" key={`${goal.kind}-${goal.color}`} data-done={left <= 0 || undefined} aria-label={`${goalLabel(goal)}: noch ${Math.max(0, left)}`}>
                    <GoalIcon goal={goal} />
                    <b>{left <= 0 ? "✓" : left}</b>
                  </span>
                );
              })}
            </div>
            {game.boss && (
              <div className="reich-boss" data-hit={shake || undefined}>
                <span className="reich-boss-face" aria-hidden="true">😈<i>👑</i></span>
                <div>
                  <strong>Dunkler König <b>{game.boss.hp} / {game.boss.maxHp}</b></strong>
                  <div className="reich-boss-bar" role="progressbar" aria-label="Lebenspunkte des Dunklen Königs" aria-valuemin={0} aria-valuemax={game.boss.maxHp} aria-valuenow={game.boss.hp}>
                    <i style={{ width: `${game.boss.hp / game.boss.maxHp * 100}%` }} />
                  </div>
                </div>
                <small>{game.boss.hp > 0 ? `Angriff in ${game.boss.countdown} ${game.boss.countdown === 1 ? "Zug" : "Zügen"}` : "Besiegt!"}</small>
              </div>
            )}
            <div className="reich-helpers">
              {HELPERS.map((helper) => (
                <button
                  className="reich-helper"
                  key={helper.id}
                  onClick={() => chooseHelper(helper.id)}
                  disabled={!canAct || helpers[helper.id] === 0}
                  aria-pressed={tool === helper.id}
                  title={helper.title}
                >
                  <span aria-hidden="true">{helper.symbol}</span><em>{helper.name}</em><b>{helpers[helper.id]}</b>
                </button>
              ))}
            </div>
            <p className="reich-status" aria-live="polite">{status}</p>
          </>
        )}

        <div className="reich-stage">
          {board && game && phase !== "ready" && phase !== "kingdom" && (
            <div
              className="reich-board"
              ref={boardRef}
              style={{ aspectRatio: `${board.width} / ${board.height}`, "--w": board.width, "--h": board.height } as CSSProperties}
              data-shake={shake || undefined}
              data-tool={tool ?? undefined}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              role="application"
              aria-label="Spielbrett"
            >
              {board.cells.map((cell, index) => {
                if (cell.hole) return null;
                const x = index % board.width;
                const y = Math.floor(index / board.width);
                return <i className="reich-cell" key={`cell-${index}`} style={{ "--x": x, "--y": y } as CSSProperties} data-dark={(x + y) % 2 === 1 || undefined} />;
              })}
              {board.cells.map((cell, index) => {
                if (!cell.blocker) return null;
                const x = index % board.width;
                const y = Math.floor(index / board.width);
                const isHouse = cell.blocker.kind === "birdhouse";
                return (
                  <div
                    className="reich-blocker"
                    key={`blocker-${index}`}
                    style={{ "--x": x, "--y": y } as CSSProperties}
                    data-kind={cell.blocker.kind}
                    data-hp={cell.blocker.hp}
                    title={isHouse ? `Vogelhaus mit ${cell.blocker.hp} Eulen` : `Kiste mit ${cell.blocker.hp} ${cell.blocker.hp === 1 ? "Schicht" : "Schichten"}`}
                  >
                    {isHouse ? <><span aria-hidden="true">🏠</span><b>🦉{cell.blocker.hp}</b></> : null}
                  </div>
                );
              })}
              {board.cells.map((cell, index) => {
                const tile = cell.tile;
                if (!tile) return null;
                const x = index % board.width;
                const y = Math.floor(index / board.width);
                const from = view?.spawned[tile.id];
                const isSelected = selected?.x === x && selected.y === y;
                return (
                  <div
                    className="reich-tile"
                    key={tile.id}
                    style={{ "--x": x, "--y": y, "--from": from === undefined ? 0 : from - y } as CSSProperties}
                    data-new={from !== undefined && from < y ? true : undefined}
                    data-pop={from === y || undefined}
                    data-power={tile.power ?? undefined}
                    data-selected={isSelected || undefined}
                    data-hint={isHint(x, y) || undefined}
                    title={`${tile.power ? POWERS[tile.power].name : GEMS[tile.color].name}${tile.vines ? " mit Ranken" : ""}`}
                  >
                    {tile.power
                      ? <span className="reich-power">{POWERS[tile.power].symbol}</span>
                      : <span className="reich-gem" data-color={GEMS[tile.color].key} />}
                    {tile.vines && <span className="reich-vines" aria-hidden="true" />}
                  </div>
                );
              })}
              {fx.map((entry) => <FxView key={entry.id} entry={entry} />)}
            </div>
          )}

          {phase === "ready" && (
            <div className="reich-panel">
              <div className="reich-logo" aria-hidden="true">👑💎🏰</div>
              <h2>Rette das Königreich!</h2>
              <p>Tausche benachbarte Steine, bis drei gleiche in einer Reihe liegen. Erfülle die Ziele, bevor die Züge ausgehen, und verdiene Zaubertränke für dein Königreich.</p>
              <ul className="reich-legend" aria-label="Power-ups">
                <li><span>🚀</span>4 in einer Reihe</li>
                <li><span>🌀</span>4 im Quadrat</li>
                <li><span>🧨</span>L- oder T-Form</li>
                <li><span>🔮</span>5 in einer Reihe</li>
              </ul>
              <div className="reich-difficulty" role="radiogroup" aria-label="Schwierigkeit">
                {DIFFICULTIES.map((entry, index) => (
                  <button key={entry.id} role="radio" aria-checked={index === difficultyIndex} onClick={() => chooseDifficulty(index)}>{entry.name}</button>
                ))}
              </div>
              <small className="reich-difficulty-note">{difficulty.summary}</small>
              <div className="reich-level-picker">
                <button onClick={() => chooseLevel(level - 1)} disabled={level <= 1} aria-label="Vorheriges Level">◀</button>
                <div aria-live="polite">
                  <strong>Level {level}{levelConfig(level).boss ? " · Boss" : ""}</strong>
                  <Stars count={levelStars} />
                  <small>{describeGoals(previewGoals)} · {levelMoves(level, difficulty)} Züge</small>
                </div>
                <button onClick={() => chooseLevel(level + 1)} disabled={level >= progress.unlocked} aria-label="Nächstes Level">▶</button>
              </div>
              <div className="reich-picks">
                <span>Start-Power-ups {difficulty.startPowers > 0 ? `(bis zu ${difficulty.startPowers})` : "– auf Schwer nicht erlaubt"}</span>
                <div>
                  {START_POWERS.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => togglePick(entry.id)}
                      aria-pressed={picks.includes(entry.id)}
                      disabled={difficulty.startPowers === 0}
                    >
                      <span aria-hidden="true">{entry.symbol}</span>{entry.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="start-actions">
                <button className="start-button" onClick={() => startLevel(level)}>Spiel starten</button>
                <button className="reset-button" onClick={openKingdom}>🏰 Königreich bauen · {kingdom.potions} 🧪</button>
              </div>
            </div>
          )}

          {phase === "kingdom" && (
            <div className="reich-panel reich-kingdom">
              <p className="reich-potions"><b>{kingdom.potions}</b> 🧪 Zaubertränke</p>
              {district ? (
                <>
                  <h2>{district.name}</h2>
                  <p>{district.intro}</p>
                  <div className="reich-scene" data-district={district.id} aria-label={`Bild vom ${district.name}`}>
                    {district.tasks.map((task) => {
                      const done = kingdom.built.includes(task.id);
                      return (
                        <span
                          key={task.id}
                          className="reich-spot"
                          style={{ left: `${task.spot[0]}%`, top: `${task.spot[1]}%` }}
                          data-built={done || undefined}
                          data-fresh={justBuilt === task.id || undefined}
                          title={task.name}
                        >
                          {done ? task.icon : "?"}
                        </span>
                      );
                    })}
                  </div>
                  <ul className="reich-tasks">
                    {district.tasks.map((task) => {
                      const done = kingdom.built.includes(task.id);
                      return (
                        <li key={task.id} data-built={done || undefined}>
                          <span aria-hidden="true">{task.icon}</span>
                          <strong>{task.name}</strong>
                          {done
                            ? <em>Gebaut ✓</em>
                            : <button onClick={() => buildTask(task.id)} disabled={!canBuild(kingdom, task.id)}>Bauen · {task.cost} 🧪</button>}
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <>
                  <div className="reich-logo" aria-hidden="true">🏰🎉👑</div>
                  <h2>Dein Königreich ist vollständig!</h2>
                  <p>König Richard dankt dir. Alle Bezirke erstrahlen in vollem Glanz.</p>
                </>
              )}
              {finishedDistricts.length > 0 && (
                <p className="reich-finished">Fertig: {finishedDistricts.map((entry) => entry.name).join(" · ")}</p>
              )}
              <div className="start-actions">
                <button className="start-button" onClick={() => setPhase("ready")}>Weiter spielen</button>
              </div>
            </div>
          )}

          {phase === "won" && result && (
            <div className="reich-overlay">
              <div className="reich-panel">
                <Stars count={result.stars} />
                <h2>Level {level} geschafft!</h2>
                <p><b>{result.score} Punkte</b>{(progress.best[level] ?? 0) > result.score ? ` · Bestwert ${progress.best[level]}` : " · Neuer Bestwert!"}<br />Du erhältst <b>{result.potions} 🧪</b> für dein Königreich.</p>
                <div className="start-actions">
                  <button className="start-button" onClick={() => startLevel(level + 1)}>Nächstes Level</button>
                  <button className="reset-button" onClick={openKingdom}>🏰 Königreich bauen</button>
                  <button className="reset-button" onClick={() => startLevel(level)}>Nochmal spielen</button>
                </div>
              </div>
            </div>
          )}

          {phase === "lost" && game && (
            <div className="reich-overlay">
              <div className="reich-panel">
                <div className="reich-logo" aria-hidden="true">😢</div>
                <h2>Keine Züge mehr!</h2>
                <p>Es fehlen noch: {game.goals.filter((goal) => goal.done < goal.target).map((goal) => `${goal.target - goal.done} ${goalLabel(goal)}`).join(", ")}.</p>
                <div className="start-actions">
                  {extraLeft > 0 && <button className="start-button" onClick={buyExtraMoves}>+{EXTRA_MOVES} Züge</button>}
                  <button className={extraLeft > 0 ? "reset-button" : "start-button"} onClick={() => startLevel(level)}>Nochmal versuchen</button>
                  <button className="reset-button" onClick={openLevelSelect}>Level auswählen</button>
                </div>
              </div>
            </div>
          )}
        </div>
        {phase === "playing" && game && <p className="reich-moves-note">{movesShown} von {totalMoves} Zügen übrig</p>}
      </section>
    </main>
  );
}

function FxView({ entry }: { entry: Fx }) {
  const { effect, burst } = entry;
  if (burst) {
    if (burst.color === -1) return null;
    const style = { "--x": burst.x, "--y": burst.y } as CSSProperties;
    if (burst.color === -2) return <span className="reich-burst reich-burst-wood" style={style} aria-hidden="true" />;
    if (burst.color === -3) return <span className="reich-burst reich-burst-leaf" style={style} aria-hidden="true">🍃</span>;
    return <span className="reich-burst" style={style} data-color={GEMS[burst.color].key} aria-hidden="true" />;
  }
  if (!effect) return null;
  if (effect.kind === "row") return <span className="reich-beam" data-dir="row" style={{ "--y": effect.y } as CSSProperties} aria-hidden="true" />;
  if (effect.kind === "column") return <span className="reich-beam" data-dir="column" style={{ "--x": effect.x } as CSSProperties} aria-hidden="true" />;
  if (effect.kind === "blast") {
    return (
      <span className="reich-blast" style={{ "--x": effect.x, "--y": effect.y, "--r": effect.radius } as CSSProperties} aria-hidden="true">
        {effect.radius === 0 ? "🔨" : ""}
      </span>
    );
  }
  if (effect.kind === "spin") {
    return <span className="reich-spin" style={{ "--x": effect.x, "--y": effect.y, "--dx": effect.tx - effect.x, "--dy": effect.ty - effect.y } as CSSProperties} aria-hidden="true">🌀</span>;
  }
  if (effect.kind === "electro") {
    return (
      <>
        <span className="reich-flash" aria-hidden="true" />
        {effect.targets.map((target, index) => (
          <span className="reich-spark" key={index} style={{ "--x": target.x, "--y": target.y } as CSSProperties} aria-hidden="true">⚡</span>
        ))}
      </>
    );
  }
  if (effect.kind === "attack") {
    return (
      <>
        {effect.targets.map((target, index) => (
          <span className="reich-spark reich-attack" key={index} style={{ "--x": target.x, "--y": target.y } as CSSProperties} aria-hidden="true">🌩️</span>
        ))}
      </>
    );
  }
  return null;
}
