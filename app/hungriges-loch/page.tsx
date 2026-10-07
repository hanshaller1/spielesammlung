"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { sitePath } from "../site-paths";
import { DIFFICULTIES, HoleEngine, KINDS, MAX_SIZE, TIER_XP, difficultyLevel, type Booster, type Difficulty } from "./engine";
import { FLOATER_TIME, STICK_RADIUS, drawGame, type Floater, type Stick } from "./render";

type Phase = "ready" | "playing" | "paused" | "won" | "lost";
/** best speichert je Level die schnellste Zeit in Sekunden. */
type Progress = { unlocked: number; stars: Record<string, number>; best: Record<string, number> };
type Goal = { kind: number; need: number; left: number };
type Hud = { seconds: number; size: number; growth: number; goals: Goal[]; magnet: boolean; giant: boolean; freeze: boolean };
type Result = { stars: number; used: number; record: boolean };

const PROGRESS_KEY = "hannas-spiele-hungriges-loch-fortschritt";
const DIFFICULTY_KEY = "hannas-spiele-hungriges-loch-schwierigkeit";
const EMPTY_PROGRESS: Progress = { unlocked: 1, stars: {}, best: {} };
const BOOSTER_BUTTONS: Array<{ id: Booster; icon: string; label: string; title: string }> = [
  { id: "magnet", icon: "🧲", label: "Magnet", title: "Zieht alles an, was ins Loch passt" },
  { id: "giant", icon: "🍄", label: "Riesig", title: "Macht das Loch kurz viel größer" },
  { id: "freeze", icon: "❄️", label: "Eiszeit", title: "Hält die Uhr 10 Sekunden an" },
];
const KEY_DIRECTIONS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0],
  ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
};

/** Der Fortschritt wird je Schwierigkeit getrennt gespeichert; "leicht" behält den bisherigen Schlüssel. */
function progressKey(difficulty: Difficulty): string {
  return difficulty.id === "leicht" ? PROGRESS_KEY : `${PROGRESS_KEY}-${difficulty.id}`;
}

function startBoosters(difficulty: Difficulty): Record<Booster, number> {
  return { magnet: difficulty.boosters, giant: difficulty.boosters, freeze: difficulty.boosters };
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

function previewHud(level: number, difficulty: Difficulty): Hud {
  const config = difficultyLevel(level, difficulty);
  const goals = Object.entries(config.targets).map(([symbol, need]) => ({ kind: KINDS.findIndex((kind) => kind.symbol === symbol), need, left: need }));
  return { seconds: config.seconds, size: 1, growth: 0, goals, magnet: false, giant: false, freeze: false };
}

function readHud(game: HoleEngine): Hud {
  return {
    seconds: Math.ceil(game.timeLeft),
    size: game.size,
    growth: Math.round(game.growth * 50) / 50,
    goals: game.goals.map((goal) => ({ ...goal, left: game.remaining.get(goal.kind) ?? 0 })),
    magnet: game.active.magnet > 0,
    giant: game.active.giant > 0,
    freeze: game.active.freeze > 0,
  };
}

function Stars({ count }: { count: number }) {
  return (
    <span className="loch-stars" role="img" aria-label={`${count} von 3 Sternen`}>
      {[1, 2, 3].map((star) => <i key={star} data-earned={star <= count || undefined}>★</i>)}
    </span>
  );
}

export default function HungrigesLochPage() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [level, setLevel] = useState(1);
  const [difficultyIndex, setDifficultyIndex] = useState(0);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [hud, setHud] = useState<Hud>(() => previewHud(1, DIFFICULTIES[0]));
  const [boosters, setBoosters] = useState(() => startBoosters(DIFFICULTIES[0]));
  const [result, setResult] = useState<Result | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [steered, setSteered] = useState(false);

  const difficulty = DIFFICULTIES[difficultyIndex];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HoleEngine | null>(null);
  const phaseRef = useRef<Phase>("ready");
  const levelRef = useRef(1);
  const difficultyRef = useRef(DIFFICULTIES[0]);
  const progressRef = useRef<Progress>(EMPTY_PROGRESS);
  const hudKeyRef = useRef("");
  const stickRef = useRef<Stick | null>(null);
  const keysRef = useRef(new Set<string>());
  const floatersRef = useRef<Floater[]>([]);
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
        gain.gain.exponentialRampToValueAtTime(0.09, startAt + 0.012);
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
      setHud(previewHud(stored.unlocked, DIFFICULTIES[index]));
    });
    return () => {
      mounted = false;
      void audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  const finishLevel = useCallback((game: HoleEngine) => {
    const won = game.status === "won";
    if (won) {
      const finished = levelRef.current;
      const used = Math.max(1, Math.round(game.seconds - game.timeLeft));
      const share = game.timeLeft / game.seconds;
      const stars = share >= 0.4 ? 3 : share >= 0.15 ? 2 : 1;
      const previous = progressRef.current;
      const record = previous.best[finished] === undefined || used < previous.best[finished];
      const next: Progress = {
        unlocked: Math.max(previous.unlocked, finished + 1),
        stars: { ...previous.stars, [finished]: Math.max(previous.stars[finished] ?? 0, stars) },
        best: { ...previous.best, [finished]: record ? used : previous.best[finished] },
      };
      progressRef.current = next;
      setProgress(next);
      try {
        window.localStorage.setItem(progressKey(difficultyRef.current), JSON.stringify(next));
      } catch {
        // Das Spiel bleibt auch ohne verfügbaren Browserspeicher spielbar.
      }
      setResult({ stars, used, record });
      playNotes([523, 659, 784, 1047], 0.3, "triangle");
    } else {
      playNotes([392, 311, 233], 0.4, "triangle");
    }
    stickRef.current = null;
    keysRef.current.clear();
    phaseRef.current = won ? "won" : "lost";
    setPhase(phaseRef.current);
  }, [playNotes]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const game = engineRef.current;
      if (!game) return;
      // Nach einer Pause im Hintergrund läuft das Spiel weiter, statt die Zeit auf einmal abzuziehen.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      let dirX = 0;
      let dirY = 0;
      const stick = stickRef.current;
      if (stick) {
        dirX = (stick.x - stick.originX) / STICK_RADIUS;
        dirY = (stick.y - stick.originY) / STICK_RADIUS;
        if (Math.hypot(dirX, dirY) < 0.15) dirX = dirY = 0;
      }
      for (const key of keysRef.current) {
        dirX += KEY_DIRECTIONS[key][0];
        dirY += KEY_DIRECTIONS[key][1];
      }
      game.step(dt, dirX, dirY);

      const floaters = floatersRef.current;
      for (const floater of floaters) floater.age += dt;
      for (const event of game.events) {
        if (event.type === "swallow") {
          const tier = KINDS[event.kind].tier;
          floaters.push(event.target
            ? { x: event.x, y: event.y, text: `${KINDS[event.kind].symbol} ✓`, color: "#ffe27a", size: 22, age: 0 }
            : { x: event.x, y: event.y, text: `+${TIER_XP[tier - 1]}`, color: "#ffffff", size: 15, age: 0 });
          if (event.target) playNotes([660 + tier * 40, 990 + tier * 60], 0.14);
          else playNotes([300 + tier * 45], 0.07, "triangle");
        } else if (event.type === "grow") {
          floaters.push({ x: game.hole.x, y: game.hole.y - game.hole.radius, text: event.size === MAX_SIZE ? "Riesig!" : "Größer!", color: "#b9ffcf", size: 26, age: 0 });
          playNotes([392, 523, 659, 784], 0.16, "triangle");
        } else if (event.type === "blocked") {
          floaters.push({ x: event.x, y: event.y, text: "Noch zu groß!", color: "#ffb3b3", size: 16, age: 0 });
          playNotes([150], 0.1, "triangle");
        } else {
          finishLevel(game);
        }
      }
      game.events.length = 0;
      floatersRef.current = floaters.filter((floater) => floater.age < FLOATER_TIME);

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 1 || height < 1) return;
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawGame(context, width, height, game, floatersRef.current, stickRef.current, now / 1000, difficultyRef.current.pointer);

      const next = readHud(game);
      const key = JSON.stringify(next);
      if (key !== hudKeyRef.current) {
        hudKeyRef.current = key;
        setHud(next);
      }
    };
    frame = requestAnimationFrame(loop);

    const keys = keysRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (!(key in KEY_DIRECTIONS) || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      keys.add(key);
      setSteered(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    };
    const releaseKeys = () => keys.clear();
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releaseKeys);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseKeys);
      keys.clear();
    };
  }, [phase, finishLevel, playNotes]);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    stickRef.current = null;
    phaseRef.current = "paused";
    setPhase("paused");
  }, []);

  // Die Spielschleife läuft nur in der Phase "playing"; die Engine bleibt bis dahin unverändert stehen.
  const resumeGame = useCallback(() => {
    if (phaseRef.current !== "paused") return;
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
    const game = new HoleEngine(difficultyLevel(nextLevel, difficultyRef.current));
    engineRef.current = game;
    floatersRef.current = [];
    stickRef.current = null;
    hudKeyRef.current = "";
    levelRef.current = nextLevel;
    setLevel(nextLevel);
    setHud(readHud(game));
    setBoosters(startBoosters(difficultyRef.current));
    setResult(null);
    phaseRef.current = "playing";
    setPhase("playing");
    playNotes([392, 523], 0.14, "triangle");
  }, [playNotes]);

  const activateBooster = (booster: Booster) => {
    if (phase !== "playing" || boosters[booster] === 0 || !engineRef.current?.activate(booster)) return;
    setBoosters((current) => ({ ...current, [booster]: current[booster] - 1 }));
    playNotes(booster === "freeze" ? [1047, 1319] : [784, 988, 1175], 0.2);
  };

  const toggleSound = () => {
    soundEnabledRef.current = !soundEnabledRef.current;
    setSoundEnabled(soundEnabledRef.current);
  };

  const chooseLevel = (nextLevel: number) => {
    levelRef.current = nextLevel;
    setLevel(nextLevel);
    setHud(previewHud(nextLevel, difficulty));
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
    setHud(previewHud(stored.unlocked, next));
    try {
      window.localStorage.setItem(DIFFICULTY_KEY, next.id);
    } catch {
      // Ohne Browserspeicher gilt die Auswahl nur für diesen Besuch.
    }
  };

  const openLevelSelect = () => {
    engineRef.current = null;
    phaseRef.current = "ready";
    setPhase("ready");
    setHud(previewHud(level, difficulty));
  };

  const pointOnCanvas = (event: ReactPointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "playing" || stickRef.current || event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ohne Capture endet die Steuerung nur früher, sobald der Zeiger das Spielfeld verlässt.
    }
    const [x, y] = pointOnCanvas(event);
    stickRef.current = { pointerId: event.pointerId, originX: x, originY: y, x, y };
    setSteered(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stick = stickRef.current;
    if (!stick || stick.pointerId !== event.pointerId) return;
    [stick.x, stick.y] = pointOnCanvas(event);
    // Der Steuerkreis wandert mit, damit ein Richtungswechsel nie den ganzen Weg zurück braucht.
    const dx = stick.x - stick.originX;
    const dy = stick.y - stick.originY;
    const distance = Math.hypot(dx, dy);
    if (distance > STICK_RADIUS) {
      stick.originX += dx * (1 - STICK_RADIUS / distance);
      stick.originY += dy * (1 - STICK_RADIUS / distance);
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (stickRef.current?.pointerId === event.pointerId) stickRef.current = null;
  };

  const config = difficultyLevel(level, difficulty);
  const playing = phase === "playing";
  const paused = phase === "paused";
  const timeShare = Math.max(0, Math.min(1, hud.seconds / config.seconds));
  const lowTime = timeShare <= 0.2;
  const levelStars = progress.stars[level] ?? 0;
  const bestTime = progress.best[level];
  const missing = hud.goals.filter((goal) => goal.left > 0);

  return (
    <main className="game-shell loch-game-shell">
      <section className="game-card loch-game-card" aria-labelledby="loch-title">
        <div className="loch-topbar">
          <a className="back-link" href={sitePath("/")} aria-label="Zurück zu Hanna's Spiele">←<span>&nbsp;Hanna&apos;s Spiele</span></a>
          <h1 id="loch-title">Hungriges Loch</h1>
          <div className="loch-controls">
            <button onClick={toggleSound} aria-pressed={soundEnabled} aria-label={soundEnabled ? "Ton ausschalten" : "Ton einschalten"}>{soundEnabled ? "🔊" : "🔇"}</button>
            <button onClick={paused ? resumeGame : pauseGame} disabled={!playing && !paused} aria-label={paused ? "Weiterspielen" : "Pause"}>{paused ? "▶" : "⏸"}</button>
            <button onClick={() => startLevel(level)} disabled={!playing && !paused} aria-label="Level neu starten">↻</button>
          </div>
        </div>

        <div className="loch-board">
          <canvas
            className="loch-canvas"
            ref={canvasRef}
            tabIndex={0}
            role="img"
            aria-label="Spielfeld: Bewege das Loch mit dem Finger, der Maus oder den Pfeiltasten."
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onLostPointerCapture={handlePointerEnd}
          />
          {phase !== "ready" && (
            <div className="loch-hud">
              <div
                className="loch-timebar"
                role="progressbar"
                aria-label="Verbleibende Zeit"
                aria-valuemin={0}
                aria-valuemax={config.seconds}
                aria-valuenow={hud.seconds}
                data-low={lowTime || undefined}
                data-frozen={hud.freeze || undefined}
              >
                <i style={{ width: `${timeShare * 100}%` }} />
              </div>
              <div className="loch-hud-row">
                <div className="loch-chip">Level <b>{level}</b><em>· {difficulty.name}</em></div>
                <div className="loch-chip loch-size" aria-label={`Lochgröße ${hud.size} von ${MAX_SIZE}`}>
                  Größe <b aria-hidden="true">{hud.size}</b>
                  <i style={{ "--loch-growth": `${Math.min(1, hud.growth) * 100}%` } as React.CSSProperties} />
                </div>
                <div className="loch-chip loch-time" data-low={lowTime || undefined} data-frozen={hud.freeze || undefined} aria-label={`Noch ${hud.seconds} Sekunden`}>
                  <span aria-hidden="true">{hud.freeze ? "❄️" : "⏱️"}</span><b aria-hidden="true">{hud.seconds}</b>
                </div>
              </div>
              <div className="loch-hud-row" aria-label="Ziele">
                {hud.goals.map((goal) => (
                  <div className="loch-chip" key={goal.kind} data-done={goal.left === 0 || undefined} aria-label={`${KINDS[goal.kind].name}: ${goal.need - goal.left} von ${goal.need}`}>
                    <span aria-hidden="true">{KINDS[goal.kind].symbol}</span>
                    <b aria-hidden="true">{goal.left === 0 ? "✓" : `${goal.need - goal.left}/${goal.need}`}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
          {playing && !steered && <p className="loch-hint">Ziehe mit dem Finger, um das Loch zu bewegen.</p>}

          {phase === "ready" && (
            <div className="loch-overlay">
              <div className="loch-panel">
                <div className="loch-logo" aria-hidden="true">🍩</div>
                <h2>Friss dich groß!</h2>
                <p>Was ins Loch passt, fällt hinein und lässt es wachsen. Schnapp dir alle Ziele, bevor die Zeit um ist.</p>
                <div className="loch-difficulty" role="radiogroup" aria-label="Schwierigkeit">
                  {DIFFICULTIES.map((entry, index) => (
                    <button key={entry.id} role="radio" aria-checked={index === difficultyIndex} onClick={() => chooseDifficulty(index)}>{entry.name}</button>
                  ))}
                </div>
                <small className="loch-difficulty-note">{difficulty.summary}</small>
                <div className="loch-level-picker">
                  <button onClick={() => chooseLevel(level - 1)} disabled={level <= 1} aria-label="Vorheriges Level">◀</button>
                  <div aria-live="polite">
                    <strong>Level {level}</strong>
                    <Stars count={levelStars} />
                    <small>{hud.goals.map((goal) => `${KINDS[goal.kind].symbol}×${goal.need}`).join("  ")} · {config.seconds} Sek.{bestTime ? ` · Bestzeit ${bestTime}` : ""}</small>
                  </div>
                  <button onClick={() => chooseLevel(level + 1)} disabled={level >= progress.unlocked} aria-label="Nächstes Level">▶</button>
                </div>
                <button className="start-button" onClick={() => startLevel(level)}>Spiel starten</button>
              </div>
            </div>
          )}

          {paused && (
            <div className="loch-overlay" data-pause>
              <div className="loch-panel">
                <div className="loch-logo" aria-hidden="true">⏸</div>
                <h2>Pause</h2>
                <p>Die Uhr steht. Die Karte bleibt so lange verdeckt.</p>
                <div className="start-actions">
                  <button className="start-button" onClick={resumeGame}>Weiterspielen</button>
                  <button className="reset-button" onClick={() => startLevel(level)}>Level neu starten</button>
                  <button className="reset-button" onClick={openLevelSelect}>Level auswählen</button>
                </div>
              </div>
            </div>
          )}

          {phase === "won" && result && (
            <div className="loch-overlay" data-result>
              <div className="loch-panel">
                <Stars count={result.stars} />
                <h2>Level {level} geschafft!</h2>
                <p>Alles verputzt in <b>{result.used} Sekunden</b>{result.record ? " · Neue Bestzeit!" : ` · Bestzeit ${bestTime}`}</p>
                <div className="start-actions">
                  <button className="start-button" onClick={() => startLevel(level + 1)}>Nächstes Level</button>
                  <button className="reset-button" onClick={() => startLevel(level)}>Nochmal spielen</button>
                </div>
              </div>
            </div>
          )}

          {phase === "lost" && (
            <div className="loch-overlay" data-result>
              <div className="loch-panel">
                <div className="loch-logo" aria-hidden="true">⏰</div>
                <h2>Die Zeit ist um!</h2>
                <p>Es fehlen noch: <b>{missing.map((goal) => `${KINDS[goal.kind].symbol}×${goal.left}`).join("  ")}</b></p>
                <div className="start-actions">
                  <button className="start-button" onClick={() => startLevel(level)}>Nochmal versuchen</button>
                  <button className="reset-button" onClick={openLevelSelect}>Level auswählen</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="loch-boosters">
          {BOOSTER_BUTTONS.map((button) => (
            <button
              className="loch-booster"
              key={button.id}
              onClick={() => activateBooster(button.id)}
              disabled={!playing || boosters[button.id] === 0 || hud[button.id]}
              data-active={playing && hud[button.id] || undefined}
              title={button.title}
            >
              <span aria-hidden="true">{button.icon}</span><em>{button.label}</em><b>{boosters[button.id]}</b>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
