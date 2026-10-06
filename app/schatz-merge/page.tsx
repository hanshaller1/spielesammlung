"use client";

import { Profiler, useCallback, useEffect, useRef, useState } from "react";
import { publicBasePath, sitePath } from "../site-paths";
import { DropShuffleBag } from "./drop-shuffle-bag";
import { SchatzMergeEngine, TREASURES, type MergeEvent } from "./engine";

import { loadTreasureSprites, treasureAssetPath, type SpriteUse } from "./assets";
import { SPRITE_PROFILES } from "./sprite-profiles";
import { RenderQuality, type QualityLevel } from "./quality";
import { FrameProfiler } from "./performance";

type Mode = "ready" | "playing" | "paused" | "over";

const HIGH_SCORE_KEY = "hannas-spiele-schatz-merge-highscore";
function loadHighScore(): number {
  try {
    const value = Number(window.localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function TreasureArtIcon({ tier, size, className, use }: { tier: number; size: number; className: string; use: SpriteUse }) {
  const [x, y, width, height] = SPRITE_PROFILES[tier - 1][use];
  const scale = size / Math.max(width, height);
  // Display a source rectangle without modifying or re-encoding the supplied asset.
  return <span className={className} style={{ position: "relative", display: "block", overflow: "hidden" }} aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element -- fixed local sprites shared with the canvas renderer */}
    <img src={sitePath(treasureAssetPath(tier, use))} alt="" width={size} height={size} draggable={false} style={{ position: "absolute", width: `${362 * scale / size * 100}%`, height: `${362 * scale / size * 100}%`, maxWidth: "none", left: `${((size - width * scale) / 2 - x * scale) / size * 100}%`, top: `${((size - height * scale) / 2 - y * scale) / size * 100}%` }} />
  </span>;
}

export default function SchatzMergePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SchatzMergeEngine | null>(null);
  const modeRef = useRef<Mode>("ready");
  const currentTierRef = useRef(1);
  const nextTierRef = useRef(1);
  const activePointerRef = useRef<number | null>(null);
  const ignoredPointersRef = useRef(new Set<number>());
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
  const [showGuide, setShowGuide] = useState(true);
  const profilerRef = useRef<FrameProfiler | null>(null);
  const activeVoicesRef = useRef(0);
  const [assetError, setAssetError] = useState("");
  const [dropBag] = useState(() => new DropShuffleBag());


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
        if (activeVoicesRef.current >= 24) break;
        activeVoicesRef.current++;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.onended = () => {
          oscillator.disconnect(); gain.disconnect();
          activeVoicesRef.current = Math.max(0, activeVoicesRef.current - 1);
        };
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

  const handlePreviewReady = useCallback(() => {
    const promoted = nextTierRef.current;
    const following = dropBag.next();
    currentTierRef.current = promoted;
    nextTierRef.current = following;
    setCurrentTier(promoted);
    setNextTier(following);
  }, [dropBag]);

  const handleGameOver = useCallback(() => {
    modeRef.current = "over";
    setMode("over");
    playNotes([392, 311, 233], 0.45, "sawtooth");
  }, [playNotes]);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      const stored = loadHighScore();
      highScoreRef.current = stored;
      setHighScore(stored);
    });
    return () => { mounted = false; };
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
      onPreviewReady: () => handlePreviewReady(),
    });
    engineRef.current = game;

    const params = new URLSearchParams(window.location.search);
    const debug = params.get("smDebug") === "1";
    const requested = params.get("smQuality");
    const override = debug && (requested === "HIGH" || requested === "MEDIUM" || requested === "LOW") ? requested as QualityLevel : undefined;
    const device = navigator as Navigator & { deviceMemory?: number };
    const quality = new RenderQuality(override, window.matchMedia("(pointer: coarse)").matches || (device.deviceMemory ?? 8) <= 4 || navigator.hardwareConcurrency <= 4);
    const profiler = debug ? new FrameProfiler() : null;
    profilerRef.current = profiler;
    game.diagnosticsEnabled = debug;
    game.debugColliders = debug && params.get("smColliders") === "1";
    game.setQuality(quality.level);
    let disposed = false;
    let dirty = true;
    let needsResize = true;
    let cssWidth = 0, cssHeight = 0;
    let lastDpr = 0;
    let debugPanel: HTMLPreElement | null = null;
    const debugWindow = window as Window & { __schatzMerge?: { game: SchatzMergeEngine; snapshot: () => object; canvas: HTMLCanvasElement; stress: (count: number, kind?: string) => void } };
    if (debug && profiler) {
      debugWindow.__schatzMerge = { game, canvas, stress: (count, kind) => { game.loadDebugScene(count, kind); modeRef.current = "playing"; setMode("playing"); }, snapshot: () => ({ ...profiler.snapshot(), ...game.debugSnapshot(), uiDropPending: game.previewBlockedByPendingDrop, mode: modeRef.current, currentTier: currentTierRef.current, nextTier: nextTierRef.current, canvas: [canvas.width, canvas.height], dpr: lastDpr, deviceDpr: window.devicePixelRatio, audioVoices: activeVoicesRef.current }) };
      debugPanel = document.createElement("pre");
      debugPanel.style.cssText = "position:fixed;bottom:8px;left:8px;z-index:100;max-width:390px;max-height:28vh;overflow:auto;background:#071522e8;color:#aef4cd;font:10px monospace;padding:6px;pointer-events:none";
      document.body.appendChild(debugPanel);
    }
    void loadTreasureSprites(publicBasePath).then(sprites => {
      if (disposed) return;
      game.setSprites(sprites); dirty = true;
    }).catch(error => { if (!disposed) setAssetError(error instanceof Error ? error.message : "Schatzgrafiken konnten nicht geladen werden."); });
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const changed = Math.abs(rect.width - cssWidth) >= .5 || Math.abs(rect.height - cssHeight) >= .5;
      if (changed) {
        cssWidth = rect.width; cssHeight = rect.height;
        game.resize(cssWidth, cssHeight);
        previewXRef.current = game.clampX(previewXRef.current, currentTierRef.current);
        if (profiler) profiler.resizes++;
      }
      const pixelRatio = Math.min(quality.dpr, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(cssWidth * pixelRatio)), height = Math.max(1, Math.round(cssHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width; canvas.height = height;
        // Use actual rounded backing dimensions to avoid uncovered edge pixels.
        context.setTransform(width / cssWidth, 0, 0, height / cssHeight, 0, 0);
        if (profiler) profiler.backingResizes++;
        dirty = true;
      }
      lastDpr = pixelRatio;
      needsResize = false;
    };
    const observer = new ResizeObserver(() => { needsResize = true; });
    observer.observe(canvas);
    let frameId = 0;
    let previousFrame = performance.now();
    let lastDebug = 0;
    const frame = (now: number) => {
      const interval = now - previousFrame || 16.7;
      previousFrame = now;
      const start = debug ? performance.now() : 0;
      const playing = modeRef.current === "playing";
      if (playing && !document.hidden && quality.observe(interval)) {
        game.setQuality(quality.level); needsResize = true;
      }
      if (Math.min(quality.dpr, window.devicePixelRatio || 1) !== lastDpr) needsResize = true;
      if (needsResize) resize();
      if (playing) game.update(interval);
      if (playing || dirty) {
        const preview = playing && game.canDrop ? { tier: currentTierRef.current, x: previewXRef.current } : null;
        game.draw(context, preview); dirty = false;
        if (profiler && playing) profiler.record(interval, performance.now() - start, game.metrics);
      }
      if (debugPanel && now - lastDebug > 1000) {
        lastDebug = now;
        debugPanel.textContent = JSON.stringify(debugWindow.__schatzMerge?.snapshot(), null, 1);
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      debugPanel?.remove();
      delete debugWindow.__schatzMerge;
      profilerRef.current = null;
      observer.disconnect();
      engineRef.current = null;
      const audio = audioContextRef.current;
      audioContextRef.current = null;
      if (audio && audio.state !== "closed") void audio.close().catch(() => {});
    };
  }, [handleGameOver, handleMerge, handlePreviewReady, playNotes]);

  const startRun = () => {
    engineRef.current?.reset();
    dropBag.reset();
    activePointerRef.current = null;
    ignoredPointersRef.current.clear();
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
    if (modeRef.current !== "playing" || !engineRef.current?.canDrop) return;
    const game = engineRef.current;
    if (!game) return;
    game.drop(currentTierRef.current, previewXRef.current);
  };

  const movePreview = (clientX: number, canvas: HTMLElement) => {
    const game = engineRef.current;
    if (!game) return;
    const rect = canvas.getBoundingClientRect();
    previewXRef.current = game.clampX(clientX - rect.left, currentTierRef.current);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (modeRef.current !== "playing" || !engineRef.current?.canDrop) return;
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
    <Profiler id="Schatz-Merge" onRender={(_id, _phase, duration) => {
      const profiler = profilerRef.current;
      if (profiler) { profiler.uiCommits++; profiler.uiMs += duration; }
    }}>
    <main className="treasure-game-shell">
      <div className="treasure-game-card">
        {assetError && <p role="alert">{assetError}</p>}
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

        <div className={`treasure-layout ${showGuide ? "treasure-layout-guide-open" : ""}`}>
          <div className="treasure-toolbar">
            <div className="treasure-controls" aria-label="Spielsteuerung">
              {mode === "playing"
                ? <button type="button" onClick={() => { modeRef.current = "paused"; setMode("paused"); }}>Ⅱ Pause</button>
                : mode === "paused"
                  ? <button type="button" onClick={() => { modeRef.current = "playing"; setMode("playing"); }}>▶ Weiter</button>
                  : <button type="button" onClick={startRun}>{mode === "over" ? "↻ Nochmal" : "▶ Start"}</button>}
              <button type="button" onClick={startRun}>↻ Neu</button>
              <button type="button" aria-pressed={soundEnabled} onClick={() => { soundEnabledRef.current = !soundEnabledRef.current; setSoundEnabled(soundEnabledRef.current); }}>{soundEnabled ? "♫ Ton an" : "♫ Ton aus"}</button>
              <button className="treasure-guide-toggle" type="button" aria-expanded={showGuide} aria-controls="treasure-guide-panel" onClick={() => setShowGuide((value) => !value)}>◆ Schatzfolge</button>
            </div>
            <div className="treasure-item-preview-row" aria-label="Aktueller und nächster Schatz">
              <section className="treasure-current-card" aria-live="polite">
                <span className="treasure-card-eyebrow">AKTUELL</span>
                <span className="treasure-current-symbol" aria-hidden="true"><TreasureArtIcon tier={currentTier} size={40} className="treasure-preview-icon" use="preview" /></span>
                <strong>{currentDefinition.name}</strong>
              </section>
              <section className="treasure-next-card" aria-live="polite">
                <span className="treasure-card-eyebrow">ALS NÄCHSTES</span>
                <span className="treasure-next-symbol" aria-hidden="true"><TreasureArtIcon tier={nextTier} size={40} className="treasure-preview-icon" use="preview" /></span>
                <strong>{nextDefinition.name}</strong>
              </section>
            </div>
          </div>

          <div id="treasure-guide-panel" className={`treasure-guide ${showGuide ? "treasure-guide-open" : ""}`}>
            <h2>Schatzfolge</h2>
            <ol>
              {TREASURES.map((treasure, index) => (
                <li aria-label={`${treasure.name}, Stufe ${treasure.tier}`} className={currentTier === treasure.tier ? "treasure-guide-current" : ""} key={treasure.id}>
                  <span className="treasure-guide-art"><TreasureArtIcon tier={treasure.tier} size={28} className="treasure-guide-icon" use="guide" /></span>
                  <span>{treasure.name}</span>
                  {index < TREASURES.length - 1 && <b aria-hidden="true">↓</b>}
                </li>
              ))}
            </ol>
          </div>

          <section className="treasure-board-column" aria-label="Schatz-Merge-Spielfeld">
            <div
              className="treasure-board"
              onPointerMove={(event) => {
                const activePointer = activePointerRef.current;
                if (ignoredPointersRef.current.has(event.pointerId)) return;
                if (!engineRef.current?.canDrop || (activePointer !== null && activePointer !== event.pointerId)) return;
                movePreview(event.clientX, event.currentTarget);
              }}
              onPointerDown={(event) => {
                if (modeRef.current !== "playing") return;
                if (ignoredPointersRef.current.has(event.pointerId)) return;
                if (!engineRef.current?.canDrop || (activePointerRef.current !== null && activePointerRef.current !== event.pointerId)) {
                  ignoredPointersRef.current.add(event.pointerId);
                  event.currentTarget.setPointerCapture(event.pointerId);
                  return;
                }
                activePointerRef.current = event.pointerId;
                movePreview(event.clientX, event.currentTarget);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerUp={(event) => {
                if (ignoredPointersRef.current.delete(event.pointerId)) return;
                if (activePointerRef.current !== event.pointerId) return;
                activePointerRef.current = null;
                if (modeRef.current !== "playing" || !engineRef.current?.canDrop) return;
                movePreview(event.clientX, event.currentTarget);
                dropCurrent();
              }}
              onPointerCancel={(event) => {
                ignoredPointersRef.current.delete(event.pointerId);
                if (activePointerRef.current === event.pointerId) activePointerRef.current = null;
              }}
              onKeyDown={handleKeyDown}
            >
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
    </Profiler>
  );
}
