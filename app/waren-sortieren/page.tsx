"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { sitePath } from "../site-paths";
import {
  DIFFICULTIES, GOODS, SLOTS, cloneBoard, createLevel, findHint, hasUsefulMove, isCleared, levelConfig, levelSeconds,
  moveItem, removeTriple, shuffleBoard, type Board, type Difficulty, type Move, type Outcome, type Position,
} from "./engine";

type Phase = "ready" | "playing" | "paused" | "won" | "lost";
type Progress = { unlocked: number; stars: Record<string, number>; best: Record<string, number> };
type Boosters = { wand: number; shuffle: number; freeze: number };
type Effect = { id: number; shelf: number; goods: number[]; label: string };
type Result = { stars: number; bonus: number; total: number };
type Drag = {
  pointerId: number;
  from: Position;
  element: HTMLElement;
  shelfElement: HTMLElement | null;
  hoverElement: HTMLElement | null;
  startX: number;
  startY: number;
  moved: boolean;
};

const PROGRESS_KEY = "hannas-spiele-waren-sortieren-fortschritt";
const DIFFICULTY_KEY = "hannas-spiele-waren-sortieren-schwierigkeit";
const EMPTY_PROGRESS: Progress = { unlocked: 1, stars: {}, best: {} };
const COMBO_WINDOW = 5000;
const FREEZE_TIME = 10000;
const DRAG_THRESHOLD = 8;

/** Der Fortschritt wird je Schwierigkeit getrennt gespeichert; "leicht" behält den bisherigen Schlüssel. */
function progressKey(difficulty: Difficulty): string {
  return difficulty.id === "leicht" ? PROGRESS_KEY : `${PROGRESS_KEY}-${difficulty.id}`;
}

function startBoosters(difficulty: Difficulty): Boosters {
  return { wand: difficulty.boosters, shuffle: difficulty.boosters, freeze: difficulty.boosters };
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

function Stars({ count }: { count: number }) {
  return (
    <span className="waren-stars" role="img" aria-label={`${count} von 3 Sternen`}>
      {[1, 2, 3].map((star) => <i key={star} data-earned={star <= count || undefined}>★</i>)}
    </span>
  );
}

export default function WarenSortierenPage() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [level, setLevel] = useState(1);
  const [difficultyIndex, setDifficultyIndex] = useState(0);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [board, setBoard] = useState<Board | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [seconds, setSeconds] = useState(() => levelSeconds(1, DIFFICULTIES[0]));
  const [frozen, setFrozen] = useState(false);
  const [boosters, setBoosters] = useState<Boosters>(() => startBoosters(DIFFICULTIES[0]));
  const [selected, setSelected] = useState<Position | null>(null);
  const [hint, setHint] = useState<Move | null>(null);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const difficulty = DIFFICULTIES[difficultyIndex];

  const phaseRef = useRef<Phase>("ready");
  const levelRef = useRef(1);
  const difficultyRef = useRef(DIFFICULTIES[0]);
  const boardRef = useRef<Board | null>(null);
  const progressRef = useRef<Progress>(EMPTY_PROGRESS);
  const scoreRef = useRef(0);
  const remainingRef = useRef(0);
  const freezeRef = useRef(0);
  const comboRef = useRef({ count: 0, until: 0 });
  const lastActionRef = useRef(0);
  const pausedAtRef = useRef(0);
  const hintShownRef = useRef(false);
  const dragRef = useRef<Drag | null>(null);
  const suppressClickUntilRef = useRef(0);
  const effectIdRef = useRef(0);
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

  const showNotice = useCallback((text: string) => {
    if (noticeTimeoutRef.current !== null) window.clearTimeout(noticeTimeoutRef.current);
    setNotice(text);
    noticeTimeoutRef.current = later(() => setNotice(""), 2600);
  }, [later]);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      const index = loadDifficulty();
      const stored = loadProgress(DIFFICULTIES[index]);
      difficultyRef.current = DIFFICULTIES[index];
      setDifficultyIndex(index);
      setBoosters(startBoosters(DIFFICULTIES[index]));
      progressRef.current = stored;
      setProgress(stored);
      levelRef.current = stored.unlocked;
      setLevel(stored.unlocked);
      setSeconds(levelSeconds(stored.unlocked, DIFFICULTIES[index]));
    });
    const timeouts = timeoutsRef.current;
    return () => {
      mounted = false;
      for (const id of timeouts) window.clearTimeout(id);
      void audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      // Ein gedrosselter Hintergrundtab pausiert die Uhr, statt die Zeit auf einmal abzuziehen.
      const delta = Math.min(now - last, 250);
      last = now;
      if (freezeRef.current > 0) {
        freezeRef.current = Math.max(0, freezeRef.current - delta);
        if (freezeRef.current === 0) setFrozen(false);
      } else {
        remainingRef.current -= delta;
      }
      const left = Math.max(0, Math.ceil(remainingRef.current / 1000));
      setSeconds((current) => current === left ? current : left);

      if (comboRef.current.count > 0 && now > comboRef.current.until) {
        comboRef.current.count = 0;
        setCombo(0);
      }
      if (remainingRef.current <= 0) {
        phaseRef.current = "lost";
        setPhase("lost");
        setSelected(null);
        setHint(null);
        playNotes([392, 311, 233], 0.4, "triangle");
        return;
      }
      const { hintDelay } = difficultyRef.current;
      if (hintDelay !== null && !hintShownRef.current && !dragRef.current && boardRef.current && now - lastActionRef.current > hintDelay * 1000) {
        hintShownRef.current = true;
        setHint(findHint(boardRef.current));
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase, playNotes]);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const drag = dragRef.current;
    if (drag) {
      dragRef.current = null;
      if (drag.hoverElement) delete drag.hoverElement.dataset.dropHover;
      if (drag.shelfElement) drag.shelfElement.style.zIndex = "";
      drag.element.style.transform = "";
      delete drag.element.dataset.dragging;
    }
    pausedAtRef.current = performance.now();
    setSelected(null);
    setHint(null);
    phaseRef.current = "paused";
    setPhase("paused");
  }, []);

  const resumeGame = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    // Combo und Tipp-Wartezeit laufen erst ab dem Weiterspielen wieder.
    const now = performance.now();
    comboRef.current.until += now - pausedAtRef.current;
    lastActionRef.current = now;
    hintShownRef.current = false;
    phaseRef.current = "playing";
    setPhase("playing");
  }, []);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) pauseGame();
    };
    const togglePause = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key.toLowerCase() !== "p") return;
      if (phaseRef.current === "playing") pauseGame();
      else resumeGame();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    window.addEventListener("keydown", togglePause);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      window.removeEventListener("keydown", togglePause);
    };
  }, [pauseGame, resumeGame]);

  const startLevel = useCallback((nextLevel: number) => {
    const config = levelConfig(nextLevel);
    const fresh = createLevel(config);
    boardRef.current = fresh;
    setBoard(fresh);
    levelRef.current = nextLevel;
    setLevel(nextLevel);
    scoreRef.current = 0;
    setScore(0);
    comboRef.current = { count: 0, until: 0 };
    setCombo(0);
    const total = levelSeconds(nextLevel, difficultyRef.current);
    remainingRef.current = total * 1000;
    setSeconds(total);
    freezeRef.current = 0;
    setFrozen(false);
    setBoosters(startBoosters(difficultyRef.current));
    setSelected(null);
    setHint(null);
    setEffects([]);
    setNotice("");
    setResult(null);
    lastActionRef.current = performance.now();
    hintShownRef.current = false;
    phaseRef.current = "playing";
    setPhase("playing");
    playNotes([392, 523], 0.14, "triangle");
  }, [playNotes]);

  const finishLevel = useCallback(() => {
    const finished = levelRef.current;
    const left = Math.max(0, remainingRef.current);
    const share = left / (levelSeconds(finished, difficultyRef.current) * 1000);
    const stars = share >= 0.4 ? 3 : share >= 0.15 ? 2 : 1;
    const bonus = Math.ceil(left / 1000) * 5;
    const total = scoreRef.current + bonus;
    const previous = progressRef.current;
    const next: Progress = {
      unlocked: Math.max(previous.unlocked, finished + 1),
      stars: { ...previous.stars, [finished]: Math.max(previous.stars[finished] ?? 0, stars) },
      best: { ...previous.best, [finished]: Math.max(previous.best[finished] ?? 0, total) },
    };
    progressRef.current = next;
    setProgress(next);
    try {
      window.localStorage.setItem(progressKey(difficultyRef.current), JSON.stringify(next));
    } catch {
      // Das Spiel bleibt auch ohne verfügbaren Browserspeicher spielbar.
    }
    setResult({ stars, bonus, total });
    phaseRef.current = "won";
    setPhase("won");
    playNotes([523, 659, 784, 1047], 0.3, "triangle");
  }, [playNotes]);

  /** Übernimmt ein von der Engine verändertes Regal samt Punkten, Effekten und Folgezuständen. */
  const commit = useCallback((next: Board, outcome: Outcome, wand: Array<{ shelf: number; good: number }> = []) => {
    const now = performance.now();
    lastActionRef.current = now;
    hintShownRef.current = false;
    setHint(null);
    setSelected(null);

    const added: Effect[] = [];
    for (const shelf of new Set(wand.map((entry) => entry.shelf))) {
      added.push({ id: effectIdRef.current++, shelf, goods: wand.filter((entry) => entry.shelf === shelf).map((entry) => entry.good), label: "" });
    }
    let gained = wand.length > 0 ? 30 : 0;
    for (const match of outcome.matches) {
      const count = now < comboRef.current.until ? comboRef.current.count + 1 : 1;
      comboRef.current = { count, until: now + COMBO_WINDOW };
      const points = 30 * Math.min(count, 5);
      gained += points;
      added.push({ id: effectIdRef.current++, shelf: match.shelf, goods: [match.good, match.good, match.good], label: `+${points}` });
    }
    if (outcome.matches.length > 0) {
      const count = comboRef.current.count;
      setCombo(count);
      playNotes([440 + count * 40, 660 + count * 50, 880 + count * 60], 0.16);
    }
    if (gained > 0) {
      scoreRef.current += gained;
      setScore(scoreRef.current);
    }
    if (added.length > 0) {
      setEffects((current) => [...current, ...added]);
      later(() => setEffects((current) => current.filter((effect) => !added.includes(effect))), 750);
    }
    if (outcome.unlocked.length > 0) showNotice("Ein Regal ist jetzt offen!");

    let current = next;
    if (isCleared(current)) {
      boardRef.current = current;
      setBoard(current);
      finishLevel();
      return;
    }
    if (!hasUsefulMove(current)) {
      current = shuffleBoard(current, levelConfig(levelRef.current).layers);
      showNotice("Kein Platz mehr – neu gemischt!");
    }
    boardRef.current = current;
    setBoard(current);
  }, [finishLevel, later, playNotes, showNotice]);

  const tryMove = useCallback((from: Position, to: Position) => {
    if (phaseRef.current !== "playing" || !boardRef.current) return;
    const next = cloneBoard(boardRef.current);
    const outcome = moveItem(next, from, to);
    if (!outcome) {
      playNotes([180], 0.09, "triangle");
      return;
    }
    if (outcome.matches.length === 0) playNotes([300], 0.06, "triangle");
    commit(next, outcome);
  }, [commit, playNotes]);

  const castWand = () => {
    if (phase !== "playing" || boosters.wand === 0 || !boardRef.current) return;
    const next = cloneBoard(boardRef.current);
    const outcome = removeTriple(next);
    if (!outcome) return;
    setBoosters((current) => ({ ...current, wand: current.wand - 1 }));
    playNotes([784, 988, 1175], 0.2);
    commit(next, outcome, outcome.removed);
  };

  const mixGoods = () => {
    if (phase !== "playing" || boosters.shuffle === 0 || !boardRef.current) return;
    const next = shuffleBoard(boardRef.current, levelConfig(level).layers);
    boardRef.current = next;
    setBoard(next);
    setBoosters((current) => ({ ...current, shuffle: current.shuffle - 1 }));
    setSelected(null);
    setHint(null);
    lastActionRef.current = performance.now();
    hintShownRef.current = false;
    showNotice("Alle Waren wurden neu gemischt.");
    playNotes([330, 392, 330, 440], 0.1, "triangle");
  };

  const freezeClock = () => {
    if (phase !== "playing" || boosters.freeze === 0 || freezeRef.current > 0) return;
    freezeRef.current = FREEZE_TIME;
    setFrozen(true);
    setBoosters((current) => ({ ...current, freeze: current.freeze - 1 }));
    showNotice("Die Uhr steht 10 Sekunden still.");
    playNotes([1047, 1319], 0.25);
  };

  const toggleSound = () => {
    soundEnabledRef.current = !soundEnabledRef.current;
    setSoundEnabled(soundEnabledRef.current);
  };

  const openLevelSelect = () => {
    phaseRef.current = "ready";
    setPhase("ready");
    setBoard(null);
    boardRef.current = null;
    setSeconds(levelSeconds(level, difficulty));
    setScore(0);
  };

  const chooseLevel = (nextLevel: number) => {
    levelRef.current = nextLevel;
    setLevel(nextLevel);
    setSeconds(levelSeconds(nextLevel, difficulty));
  };

  const chooseDifficulty = (index: number) => {
    const next = DIFFICULTIES[index];
    const stored = loadProgress(next);
    difficultyRef.current = next;
    setDifficultyIndex(index);
    setBoosters(startBoosters(next));
    progressRef.current = stored;
    setProgress(stored);
    levelRef.current = stored.unlocked;
    setLevel(stored.unlocked);
    setSeconds(levelSeconds(stored.unlocked, next));
    try {
      window.localStorage.setItem(DIFFICULTY_KEY, next.id);
    } catch {
      // Ohne Browserspeicher gilt die Auswahl nur für diesen Besuch.
    }
  };

  const findDropTarget = (x: number, y: number, from: Position): { position: Position | null; shelfElement: HTMLElement | null } => {
    const shelfElement = document.elementsFromPoint(x, y)
      .find((element): element is HTMLElement => element instanceof HTMLElement && element.dataset.shelf !== undefined) ?? null;
    const currentBoard = boardRef.current;
    if (!shelfElement || !currentBoard) return { position: null, shelfElement: null };
    const shelfIndex = Number(shelfElement.dataset.shelf);
    const shelf = currentBoard.shelves[shelfIndex];
    if (!shelf || shelf.lock > 0) return { position: null, shelfElement: null };
    const rect = shelfElement.getBoundingClientRect();
    const wanted = Math.min(SLOTS - 1, Math.max(0, Math.floor((x - rect.left) / rect.width * SLOTS)));
    if (shelfIndex === from.shelf && wanted === from.slot) return { position: null, shelfElement: null };
    const free = shelf.layers[0].flatMap((slot, index) => slot === null ? [index] : []);
    if (free.length === 0) return { position: null, shelfElement: null };
    free.sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted));
    return { position: { shelf: shelfIndex, slot: free[0] }, shelfElement };
  };

  const endDrag = (drag: Drag, returning: boolean) => {
    dragRef.current = null;
    if (drag.hoverElement) delete drag.hoverElement.dataset.dropHover;
    if (drag.shelfElement) drag.shelfElement.style.zIndex = "";
    const { element } = drag;
    if (returning && drag.moved) {
      element.style.transition = "transform .18s ease-out";
      element.style.transform = "";
      later(() => {
        element.style.transition = "";
        delete element.dataset.dragging;
      }, 190);
    } else {
      element.style.transform = "";
      delete element.dataset.dragging;
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, from: Position) => {
    if (phaseRef.current !== "playing" || dragRef.current || event.button !== 0) return;
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      from,
      element,
      shelfElement: element.closest<HTMLElement>("[data-shelf]"),
      hoverElement: null,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      drag.element.dataset.dragging = "true";
      if (drag.shelfElement) drag.shelfElement.style.zIndex = "6";
      lastActionRef.current = performance.now();
      setSelected(null);
      setHint(null);
    }
    drag.element.style.transform = `translate(${dx}px,${dy}px) scale(1.18)`;
    const { shelfElement } = findDropTarget(event.clientX, event.clientY, drag.from);
    if (shelfElement !== drag.hoverElement) {
      if (drag.hoverElement) delete drag.hoverElement.dataset.dropHover;
      if (shelfElement) shelfElement.dataset.dropHover = "true";
      drag.hoverElement = shelfElement;
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved) {
      endDrag(drag, false);
      return;
    }
    // Der auf das Loslassen folgende Klick darf die Ware nicht zusätzlich auswählen.
    suppressClickUntilRef.current = performance.now() + 350;
    const { position } = findDropTarget(event.clientX, event.clientY, drag.from);
    endDrag(drag, position === null);
    if (position) tryMove(drag.from, position);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) endDrag(drag, true);
  };

  const handleItemClick = (timeStamp: number, position: Position) => {
    if (phase !== "playing" || timeStamp < suppressClickUntilRef.current) return;
    lastActionRef.current = timeStamp;
    setHint(null);
    setSelected((current) => current && current.shelf === position.shelf && current.slot === position.slot ? null : position);
    playNotes([520], 0.05, "triangle");
  };

  const handleEmptyClick = (position: Position) => {
    if (phase !== "playing" || !selected) return;
    tryMove(selected, position);
  };

  const config = levelConfig(level);
  const totalSeconds = levelSeconds(level, difficulty);
  const playing = phase === "playing";
  const paused = phase === "paused";
  const timeShare = Math.max(0, Math.min(1, seconds / totalSeconds));
  const levelStars = progress.stars[level] ?? 0;
  const status = notice
    || (combo > 1 ? `Combo ×${Math.min(combo, 5)}!` : "")
    || (hint ? "Tipp: Schau auf die wackelnde Ware!" : "")
    || (selected ? "Tippe jetzt auf einen freien Platz." : "")
    || (playing ? "Ziehe drei gleiche Waren in ein Fach." : "")
    || (paused ? "Pause" : "");

  return (
    <main className="game-shell waren-game-shell">
      <section className="game-card waren-game-card" aria-labelledby="waren-title">
        <div className="waren-topbar">
          <a className="back-link" href={sitePath("/")}>← Hanna&apos;s Spiele</a>
          <div className="waren-controls">
            <button onClick={toggleSound} aria-pressed={soundEnabled} aria-label={soundEnabled ? "Ton ausschalten" : "Ton einschalten"}>{soundEnabled ? "🔊" : "🔇"}</button>
            <button onClick={paused ? resumeGame : pauseGame} disabled={!playing && !paused} aria-label={paused ? "Weiterspielen" : "Pause"}>{paused ? "▶" : "⏸"}</button>
            <button onClick={() => startLevel(level)} disabled={!playing && !paused} aria-label="Level neu starten">↻</button>
          </div>
        </div>
        <header>
          <div><p className="eyebrow">SORTIERSPIEL</p><h1 id="waren-title">Waren sortieren</h1></div>
          <div className="stats">
            <span>Level <b>{level}</b> · {difficulty.name}</span>
            <span><b>{score}</b> Punkte</span>
            <span className={frozen ? "waren-stat-frozen" : undefined}><b>{seconds}</b> Sek.{frozen ? " ❄️" : ""}</span>
          </div>
        </header>

        <div
          className="waren-timebar"
          role="progressbar"
          aria-label="Verbleibende Zeit"
          aria-valuemin={0}
          aria-valuemax={totalSeconds}
          aria-valuenow={seconds}
          data-low={timeShare <= 0.2 || undefined}
          data-frozen={frozen || undefined}
        >
          <i style={{ width: `${timeShare * 100}%` }} />
        </div>

        <div className="waren-boosters">
          <button className="waren-booster" onClick={castWand} disabled={!playing || boosters.wand === 0} title="Entfernt drei gleiche Waren">
            <span aria-hidden="true">🪄</span><em>Zauberstab</em><b>{boosters.wand}</b>
          </button>
          <button className="waren-booster" onClick={mixGoods} disabled={!playing || boosters.shuffle === 0} title="Mischt alle Waren neu">
            <span aria-hidden="true">🔀</span><em>Mischen</em><b>{boosters.shuffle}</b>
          </button>
          <button className="waren-booster" onClick={freezeClock} disabled={!playing || boosters.freeze === 0 || frozen} title="Hält die Uhr 10 Sekunden an">
            <span aria-hidden="true">❄️</span><em>Eiszeit</em><b>{boosters.freeze}</b>
          </button>
        </div>

        <p className="waren-status" aria-live="polite" data-combo={!notice && combo > 1 || undefined}>{status}</p>

        <div className="waren-stage">
          {board && (
            <div className="waren-board" data-shelves={board.shelves.length} data-selecting={selected !== null || undefined}>
              {board.shelves.map((shelf, shelfIndex) => {
                const locked = shelf.lock > 0;
                return (
                  <div
                    className="waren-shelf"
                    key={shelfIndex}
                    role="group"
                    aria-label={`Regal ${shelfIndex + 1}${locked ? `, gesperrt, noch ${shelf.lock} Treffer` : ""}`}
                    data-shelf={shelfIndex}
                    data-locked={locked || undefined}
                  >
                    {shelf.layers[1] && (
                      <div className="waren-row waren-back" aria-hidden="true">
                        {shelf.layers[1].map((slot, slotIndex) => <span key={slot ? slot.id : `leer-${slotIndex}`}>{slot ? GOODS[slot.good].symbol : ""}</span>)}
                      </div>
                    )}
                    <div className="waren-row waren-front">
                      {shelf.layers[0].map((slot, slotIndex) => {
                        const position = { shelf: shelfIndex, slot: slotIndex };
                        if (!slot) {
                          return (
                            <button
                              className="waren-empty"
                              key={`leer-${slotIndex}`}
                              onClick={() => handleEmptyClick(position)}
                              disabled={!playing || locked}
                              aria-label={`Freier Platz ${slotIndex + 1} in Regal ${shelfIndex + 1}`}
                              data-hint={hint?.to.shelf === shelfIndex && hint.to.slot === slotIndex || undefined}
                            />
                          );
                        }
                        const isSelected = selected?.shelf === shelfIndex && selected.slot === slotIndex;
                        return (
                          <button
                            className="waren-item"
                            key={slot.id}
                            onPointerDown={(event) => handlePointerDown(event, position)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerCancel}
                            onClick={(event) => handleItemClick(event.timeStamp, position)}
                            disabled={!playing || locked}
                            aria-pressed={isSelected}
                            aria-label={`${GOODS[slot.good].name} in Regal ${shelfIndex + 1}`}
                            data-hint={hint?.from.shelf === shelfIndex && hint.from.slot === slotIndex || undefined}
                          >
                            {GOODS[slot.good].symbol}
                          </button>
                        );
                      })}
                    </div>
                    {shelf.layers.length > 1 && (
                      <span className="waren-depth" title={`${shelf.layers.length - 1} Reihen dahinter`} aria-hidden="true">
                        {shelf.layers.slice(1).map((_, index) => <i key={index} />)}
                      </span>
                    )}
                    {locked && <div className="waren-lock" aria-hidden="true"><span>🔒</span><b>noch {shelf.lock}</b></div>}
                    {effects.filter((effect) => effect.shelf === shelfIndex).map((effect) => (
                      <div className="waren-effect" key={effect.id} aria-hidden="true">
                        {effect.goods.map((good, index) => <span key={index}>{GOODS[good].symbol}</span>)}
                        {effect.label && <b>{effect.label}</b>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {phase === "ready" && (
            <div className="waren-panel">
              <div className="waren-logo" aria-hidden="true">🍎🥛🧸</div>
              <h2>Räume den Laden auf!</h2>
              <p>Stelle drei gleiche Waren nebeneinander in ein Fach, dann verschwinden sie. Dahinter warten schon die nächsten.</p>
              <div className="waren-difficulty" role="radiogroup" aria-label="Schwierigkeit">
                {DIFFICULTIES.map((entry, index) => (
                  <button key={entry.id} role="radio" aria-checked={index === difficultyIndex} onClick={() => chooseDifficulty(index)}>{entry.name}</button>
                ))}
              </div>
              <small className="waren-difficulty-note">{difficulty.summary}</small>
              <div className="waren-level-picker">
                <button onClick={() => chooseLevel(level - 1)} disabled={level <= 1} aria-label="Vorheriges Level">◀</button>
                <div aria-live="polite">
                  <strong>Level {level}</strong>
                  <Stars count={levelStars} />
                  <small>{config.shelves} Regale · {config.triples * SLOTS} Waren · {totalSeconds} Sek.</small>
                </div>
                <button onClick={() => chooseLevel(level + 1)} disabled={level >= progress.unlocked} aria-label="Nächstes Level">▶</button>
              </div>
              <button className="start-button" onClick={() => startLevel(level)}>Spiel starten</button>
            </div>
          )}

          {paused && (
            <div className="waren-overlay" data-pause>
              <div className="waren-panel">
                <div className="waren-logo" aria-hidden="true">⏸</div>
                <h2>Pause</h2>
                <p>Die Uhr steht. Das Regal bleibt so lange verdeckt.</p>
                <div className="start-actions">
                  <button className="start-button" onClick={resumeGame}>Weiterspielen</button>
                  <button className="reset-button" onClick={() => startLevel(level)}>Level neu starten</button>
                  <button className="reset-button" onClick={openLevelSelect}>Level auswählen</button>
                </div>
              </div>
            </div>
          )}

          {phase === "won" && result && (
            <div className="waren-overlay">
              <div className="waren-panel">
                <Stars count={result.stars} />
                <h2>Level {level} geschafft!</h2>
                <p>{score} Punkte + {result.bonus} Zeitbonus = <b>{result.total} Punkte</b>{(progress.best[level] ?? 0) > result.total ? ` · Bestwert ${progress.best[level]}` : " · Neuer Bestwert!"}</p>
                <div className="start-actions">
                  <button className="start-button" onClick={() => startLevel(level + 1)}>Nächstes Level</button>
                  <button className="reset-button" onClick={() => startLevel(level)}>Nochmal spielen</button>
                </div>
              </div>
            </div>
          )}

          {phase === "lost" && (
            <div className="waren-overlay">
              <div className="waren-panel">
                <div className="waren-logo" aria-hidden="true">⏰</div>
                <h2>Die Zeit ist um!</h2>
                <p>Du hast {score} Punkte gesammelt. Beim nächsten Versuch klappt es bestimmt.</p>
                <div className="start-actions">
                  <button className="start-button" onClick={() => startLevel(level)}>Nochmal versuchen</button>
                  <button className="reset-button" onClick={openLevelSelect}>Level auswählen</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
