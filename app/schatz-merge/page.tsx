"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sitePath } from "../site-paths";
import { DropShuffleBag } from "./drop-shuffle-bag";
import { SchatzMergeEngine, TREASURES, type MergeEvent } from "./engine";

type Mode = "ready" | "playing" | "paused" | "over";

const HIGH_SCORE_KEY = "hannas-spiele-schatz-merge-highscore";
const TREASURE_SYMBOLS = ["🟡", "🪙", "🪙", "💎", "🔴", "💰", "🧰", "🏆", "👑", "🧰", "💎", "🪑"];

function loadHighScore(): number {
  try {
    const value = Number(window.localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export default function SchatzMergePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SchatzMergeEngine | null>(null);
  const modeRef = useRef<Mode>("ready");
  const currentTierRef = useRef(1);
  const nextTierRef = useRef(1);
  const previewXRef = useRef(180);
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const soundEnabledRef = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [mode, setMode] = useState<Mode>("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentTier, setCurrentTier] = useState(1);
  const [nextTier, setNextTier] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [dropBag] = useState(() => new DropShuffleBag());

  modeRef.current = mode;
  currentTierRef.current = currentTier;
  nextTierRef.current = nextTier;
  soundEnabledRef.current = soundEnabled;

  const playNotes = useCallback((frequencies: number[], duration = 0.12, type: OscillatorType = "sine") => {
    if (!soundEnabledRef.current || typeof window === "undefined") return;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;

    try {
      const audio = audioContextRef.current && audioContextRef.current.state !== "closed"
        ? audioContextRef.current
        : new AudioContextConstructor();
      audioContextRef.current = audio;
      if (audio.state === "suspended") void audio.resume().catch(() => {});
      const startAt = audio.currentTime;
      for (const [index, frequency] of frequencies.entries()) {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startAt + index * 0.045);
        gain.gain.setValueAtTime(0.0001, startAt + index * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.12, startAt + index * 0.045 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + index * 0.045 + duration);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(startAt + index * 0.045);
        oscillator.stop(startAt + index * 0.045 + duration + 0.01);
      }
    } catch {
      // WebAudio kann je nach Browserrichtlinie nicht verfügbar sein.
    }
  }, []);

  const handleMerge = useCallback((event: MergeEvent) => {
    scoreRef.current += event.points;
    setScore(scoreRef.current);
    if (scoreRef.current > highScoreRef.current) {
      highScoreRef.current = scoreRef.current;
      setHighScore(highScoreRef.current);
      try {
        window.localStorage.setItem(HIGH_SCORE_KEY, String(highScoreRef.current));
      } catch {
        // Das Spiel bleibt auch ohne verfügbaren Browserspeicher spielbar.
      }
    }
    if (event.terminal) playNotes([392, 494, 587, 784, 988], 0.48, "triangle");
    else if (event.tier >= 8) playNotes([392 + event.tier * 23, 523 + event.tier * 27, 784 + event.tier * 31], 0.3, "triangle");
    else playNotes([370 + event.tier * 38, 555 + event.tier * 41], 0.17, "sine");
  }, [playNotes]);

  const handleGameOver = useCallback(() => {
    modeRef.current = "over";
    setMode("over");
    playNotes([392, 311, 233], 0.45, "sawtooth");
  }, [playNotes]);

  useEffect(() => {
    setHighScore(loadHighScore());
    highScoreRef.current = loadHighScore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const game = new SchatzMergeEngine({
      onMerge: (event) => handleMerge(event),
      onGameOver: () => handleGameOver(),
      onDrop: () => playNotes([174, 130], 0.09, "triangle"),
      onImpact: (tier) => playNotes([104 + tier * 17], 0.06, "triangle"),
    });
    engineRef.current = game;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      game.resize(rect.width, rect.height);
      previewXRef.current = game.clampX(previewXRef.current, currentTierRef.current);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    let frameId = 0;
    let previousFrame = performance.now();
    const frame = (now: number) => {
      const delta = Math.min(34, now - previousFrame || 16.7);
      previousFrame = now;
      if (modeRef.current === "playing") game.update(delta);
      const preview = modeRef.current === "playing"
        ? { tier: currentTierRef.current, x: previewXRef.current }
        : null;
      game.draw(context, preview);
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      engineRef.current = null;
      const audio = audioContextRef.current;
      audioContextRef.current = null;
      if (audio && audio.state !== "closed") void audio.close().catch(() => {});
    };
  }, [handleGameOver, handleMerge, playNotes]);

  const startRun = () => {
    engineRef.current?.reset();
    dropBag.reset();
    scoreRef.current = 0;
    setScore(0);
    const first = dropBag.next();
    const second = dropBag.next();
    currentTierRef.current = first;
    nextTierRef.current = second;
    setCurrentTier(first);
    setNextTier(second);
    previewXRef.current = (engineRef.current?.boardWidth ?? 360) / 2;
    modeRef.current = "playing";
    setMode("playing");
  };

  const dropCurrent = () => {
    if (modeRef.current !== "playing") return;
    const game = engineRef.current;
    if (!game) return;
    game.drop(currentTierRef.current, previewXRef.current);
    const promoted = nextTierRef.current;
    const following = dropBag.next();
    currentTierRef.current = promoted;
    nextTierRef.current = following;
    setCurrentTier(promoted);
    setNextTier(following);
  };

  const movePreview = (clientX: number, canvas: HTMLElement) => {
    const game = engineRef.current;
    if (!game) return;
    const rect = canvas.getBoundingClientRect();
    previewXRef.current = game.clampX(clientX - rect.left, currentTierRef.current);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (modeRef.current !== "playing") return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      previewXRef.current += event.key === "ArrowLeft" ? -20 : 20;
      const game = engineRef.current;
      if (game) previewXRef.current = game.clampX(previewXRef.current, currentTierRef.current);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      dropCurrent();
    }
  };

  const nextDefinition = TREASURES[nextTier - 1];
  const currentDefinition = TREASURES[currentTier - 1];

  return (
    <main className="treasure-game-shell">
      <div className="treasure-game-card">
        <div className="treasure-header">
          <a className="back-link" href={sitePath("/")}>← Hanna&apos;s Spiele</a>
          <div className="treasure-title-row">
            <div>
              <p className="eyebrow">SCHÄTZE FALLEN LASSEN · GLEICHE MERGEN</p>
              <h1>Schatz-Merge</h1>
            </div>
            <div className="treasure-header-stats">
              <div className="treasure-header-stat" aria-label={`Punkte ${score}`}><span>Punkte</span><b>{score.toLocaleString("de-DE")}</b></div>
              <div className="treasure-header-stat" aria-label={`Rekord ${highScore}`}><span>Rekord</span><b>{highScore.toLocaleString("de-DE")}</b></div>
            </div>
          </div>
        </div>

        <div className="treasure-layout">
          <div className="treasure-toolbar">
            <div className="treasure-controls" aria-label="Spielsteuerung">
              {mode === "playing"
                ? <button type="button" onClick={() => { modeRef.current = "paused"; setMode("paused"); }}>Ⅱ Pause</button>
                : mode === "paused"
                  ? <button type="button" onClick={() => { modeRef.current = "playing"; setMode("playing"); }}>▶ Weiter</button>
                  : <button type="button" onClick={startRun}>{mode === "over" ? "↻ Nochmal" : "▶ Start"}</button>}
              <button type="button" onClick={startRun}>↻ Neu</button>
              <button type="button" aria-pressed={soundEnabled} onClick={() => setSoundEnabled((value) => !value)}>{soundEnabled ? "♫ Ton an" : "♫ Ton aus"}</button>
              <button className="treasure-guide-toggle" type="button" aria-expanded={showGuide} onClick={() => setShowGuide((value) => !value)}>◆ Schatzfolge</button>
            </div>
            <div className="treasure-item-preview-row" aria-label="Aktueller und nächster Schatz">
              <section className="treasure-current-card" aria-live="polite">
                <span className="treasure-card-eyebrow">AKTUELL</span>
                <span className="treasure-current-symbol" aria-hidden="true">{TREASURE_SYMBOLS[currentTier - 1]}</span>
                <strong>{currentDefinition.name}</strong>
                <small>Stufe {currentTier}</small>
              </section>
              <section className="treasure-next-card" aria-live="polite">
                <span className="treasure-card-eyebrow">ALS NÄCHSTES</span>
                <span className="treasure-next-symbol" aria-hidden="true">{TREASURE_SYMBOLS[nextTier - 1]}</span>
                <strong>{nextDefinition.name}</strong>
                <small>Stufe {nextTier}</small>
              </section>
            </div>
          </div>

          <div className={`treasure-guide ${showGuide ? "treasure-guide-open" : ""}`}>
            <h2>Schatzfolge</h2>
            <ol>
              {TREASURES.map((treasure, index) => (
                <li className={currentTier === treasure.tier ? "treasure-guide-current" : ""} key={treasure.id}>
                  <span>{TREASURE_SYMBOLS[index]}</span>
                  <span>{treasure.name}</span>
                  {index < TREASURES.length - 1 && <b aria-hidden="true">↓</b>}
                </li>
              ))}
            </ol>
          </div>

          <section className="treasure-board-column" aria-label="Schatz-Merge-Spielfeld">
            <div className="treasure-board" onPointerMove={(event) => movePreview(event.clientX, event.currentTarget)} onPointerDown={(event) => { if (modeRef.current !== "playing") return; movePreview(event.clientX, event.currentTarget); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={(event) => { if (modeRef.current !== "playing") return; movePreview(event.clientX, event.currentTarget); dropCurrent(); }} onKeyDown={handleKeyDown}>
              <canvas ref={canvasRef} className="treasure-canvas" role="button" tabIndex={0} aria-label={`Aktuell: ${currentDefinition.name}. Mit den Pfeiltasten bewegen und mit Leertaste fallen lassen.`} />
              {mode !== "playing" && (
                <div className="treasure-overlay">
                  <div className="treasure-overlay-card">
                    {mode === "ready" && <>
                      <div className="treasure-logo" aria-hidden="true">👑</div>
                      <p className="eyebrow">DAS KÖNIGREICH BRAUCHT MEHR GLANZ</p>
                      <h2>Schatz-Merge</h2>
                      <p>Lass Schätze fallen und verbinde zwei gleiche Gegenstände zu einem wertvolleren Schatz.</p>
                      <button className="treasure-primary-button" type="button" onClick={startRun}>Spiel starten</button>
                    </>}
                    {mode === "paused" && <>
                      <div className="treasure-logo" aria-hidden="true">⏸</div>
                      <h2>Spiel pausiert</h2>
                      <p>Deine Schätze warten auf dich.</p>
                      <button className="treasure-primary-button" type="button" onClick={() => { modeRef.current = "playing"; setMode("playing"); }}>Weiter spielen</button>
                      <button className="treasure-secondary-button" type="button" onClick={startRun}>Neu anfangen</button>
                    </>}
                    {mode === "over" && <>
                      <div className="treasure-logo" aria-hidden="true">🪙</div>
                      <p className="eyebrow">DER SCHATZKASTEN IST VOLL</p>
                      <h2>Spiel vorbei</h2>
                      <p>Du hast <b>{score.toLocaleString("de-DE")}</b> Punkte gesammelt.</p>
                      <button className="treasure-primary-button" type="button" onClick={startRun}>Nochmal spielen</button>
                    </>}
                    <a className="treasure-overlay-back" href={sitePath("/")}>← Zurück zur Spielesammlung</a>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
