"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sitePath } from "../site-paths";

const GAME_TIME = 20;
type Position = { x: number; y: number };
type Round = "single" | "sequence";
type Difficulty = "easy" | "medium" | "hard";
type Highscores = Record<Difficulty, number>;
type SpecialEvent = { atElapsedSecond: number; count: 2 | 3 | 4 };

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const BEST_KEYS: Record<Difficulty, string> = {
  easy: "stern-best-easy",
  medium: "stern-best-medium",
  hard: "stern-best-hard",
};
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Leicht",
  medium: "Mittel",
  hard: "Schwer",
};
const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  easy: "Immer nur ein Stern – jeder Treffer zählt.",
  medium: "Feste Folgen mit zwei, drei und vier Sternen.",
  hard: "Nach jeder Folge kommt ein weiterer Stern dazu.",
};

function randomPosition(): Position {
  return { x: 8 + Math.random() * 84, y: 8 + Math.random() * 84 };
}

function randomPositions(count: number): Position[] {
  const columns = count <= 15 ? 3 : count <= 20 ? 4 : Math.ceil(Math.sqrt(count * 1.4));
  const rows = count <= 20 ? 5 : Math.ceil(count / columns);
  const positions = Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: 8 + ((column + 0.5) / columns) * 84,
      y: 8 + ((row + 0.5) / rows) * 84,
    };
  });

  return shuffled(positions).slice(0, count);
}

function shuffled<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function createMediumSchedule(): SpecialEvent[] {
  const counts = shuffled<Array<2 | 3 | 4>[number]>([2, 2, 2, 2, 3, 3, 4]);
  const slotLength = (GAME_TIME - 2) / counts.length;

  return counts.map((count, index) => ({
    count,
    atElapsedSecond: 1 + index * slotLength + Math.random() * slotLength * 0.65,
  }));
}

function storedScore(key: string): number {
  const value = Number(localStorage.getItem(key) ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export default function Home() {
  const [score, setScore] = useState(0);
  const [highscores, setHighscores] = useState<Highscores>({ easy: 0, medium: 0, hard: 0 });
  const [difficulty, setDifficulty] = useState<Difficulty>("hard");
  const [time, setTime] = useState(GAME_TIME);
  const [playing, setPlaying] = useState(false);
  const [round, setRound] = useState<Round>("single");
  const [position, setPosition] = useState<Position>({ x: 50, y: 50 });
  const [sequencePositions, setSequencePositions] = useState<Position[]>([]);
  const [sequenceCount, setSequenceCount] = useState(2);
  const [expected, setExpected] = useState(1);
  const [wrong, setWrong] = useState(false);
  const scheduleRef = useRef<SpecialEvent[]>([]);
  const nextEventRef = useRef(0);
  const deadlineRef = useRef(0);
  const wrongTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const legacyHardScore = storedScore("stern-best");
    const savedHighscores = {
      easy: storedScore(BEST_KEYS.easy),
      medium: storedScore(BEST_KEYS.medium),
      hard: Math.max(storedScore(BEST_KEYS.hard), legacyHardScore),
    };
    if (savedHighscores.hard > 0) localStorage.setItem(BEST_KEYS.hard, String(savedHighscores.hard));
    // The stored scores are only available after the client has mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighscores(savedHighscores);
  }, []);

  useEffect(() => {
    if (!playing) return;

    const updateClock = () => {
      const millisecondsLeft = Math.max(0, deadlineRef.current - performance.now());
      const secondsLeft = Math.ceil(millisecondsLeft / 1000);
      setTime((current) => current === secondsLeft ? current : secondsLeft);

      if (millisecondsLeft === 0) {
        setPlaying(false);
        setRound("single");
        setSequencePositions([]);
      }
    };

    const timer = window.setInterval(updateClock, 100);
    return () => window.clearInterval(timer);
  }, [playing]);

  const addPoints = useCallback((points: number) => {
    setScore((current) => {
      const next = current + points;
      setHighscores((currentHighscores) => {
        if (next <= currentHighscores[difficulty]) return currentHighscores;
        localStorage.setItem(BEST_KEYS[difficulty], String(next));
        return { ...currentHighscores, [difficulty]: next };
      });
      return next;
    });
  }, [difficulty]);

  const showSequence = useCallback((count: number) => {
    setWrong(false);
    setExpected(1);
    setSequenceCount(count);
    setSequencePositions(randomPositions(count));
    setRound("sequence");
  }, []);

  const start = useCallback(() => {
    scheduleRef.current = difficulty === "medium" ? createMediumSchedule() : [];
    nextEventRef.current = 0;
    deadlineRef.current = performance.now() + GAME_TIME * 1000;
    if (wrongTimeoutRef.current !== null) window.clearTimeout(wrongTimeoutRef.current);
    setScore(0);
    setTime(GAME_TIME);
    setPlaying(true);
    setExpected(1);
    setWrong(false);
    if (difficulty === "hard") {
      setRound("sequence");
      setSequenceCount(2);
      setSequencePositions(randomPositions(2));
    } else {
      setRound("single");
      setSequencePositions([]);
      setPosition(randomPosition());
    }
  }, [difficulty]);

  const resetHighscore = useCallback(() => {
    localStorage.removeItem(BEST_KEYS[difficulty]);
    if (difficulty === "hard") localStorage.removeItem("stern-best");
    setHighscores((current) => ({ ...current, [difficulty]: 0 }));
  }, [difficulty]);

  const advanceMediumRound = useCallback(() => {
    const elapsedSeconds = GAME_TIME - Math.max(0, deadlineRef.current - performance.now()) / 1000;
    const event = scheduleRef.current[nextEventRef.current];
    if (event && elapsedSeconds >= event.atElapsedSecond) {
      nextEventRef.current += 1;
      showSequence(event.count);
      return;
    }
    setPosition(randomPosition());
    setRound("single");
  }, [showSequence]);

  const hitSingle = useCallback(() => {
    if (!playing || round !== "single") return;
    addPoints(1);
    if (difficulty === "easy") {
      setPosition(randomPosition());
    } else if (difficulty === "medium") {
      advanceMediumRound();
    } else {
      showSequence(2);
    }
  }, [playing, round, addPoints, difficulty, advanceMediumRound, showSequence]);

  const hitNumber = (number: number) => {
    if (!playing || round !== "sequence") return;
    if (number !== expected) {
      setWrong(true);
      if (wrongTimeoutRef.current !== null) window.clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = window.setTimeout(() => setWrong(false), 350);
      return;
    }
    if (number === sequenceCount) {
      addPoints(sequenceCount);
      if (difficulty === "medium") advanceMediumRound();
      else showSequence(sequenceCount + 1);
    } else {
      setExpected(number + 1);
    }
  };

  useEffect(() => () => {
    if (wrongTimeoutRef.current !== null) window.clearTimeout(wrongTimeoutRef.current);
  }, []);

  const starStyle = (starPosition: Position, count = 1) => ({
    left: `clamp(38px, ${starPosition.x}%, calc(100% - 38px))`,
    top: `clamp(38px, ${starPosition.y}%, calc(100% - 38px))`,
    "--star-size": count === 1
      ? "min(76px, 22vw, 15svh)"
      : `min(${Math.max(36, Math.min(64, 220 / Math.sqrt(count)))}px, 16vw, 9svh)`,
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      if (!playing) start();
      else if (round === "single") hitSingle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, round, hitSingle, start]);

  return (
    <main className="game-shell">
      <section className="game-card" aria-labelledby="title">
                <a className="back-link" href={sitePath("/")}>← Hanna&apos;s Spiele</a>
        <header>
          <div><p className="eyebrow">MINI-SPIEL</p><h1 id="title">Fang den Stern!</h1></div>
          <div className="stats" aria-live="polite">
            <span><b>{score}</b> Punkte</span><span><b>{time}</b> Sek.</span><span><b>{highscores[difficulty]}</b> Bestwert</span>
          </div>
        </header>

        <div className={`field ${wrong ? "field-wrong" : ""}`}>
          <div className="sky-dot dot-one" /><div className="sky-dot dot-two" /><div className="sky-dot dot-three" />
          {playing && round === "single" && (
            <button className="star" style={starStyle(position)} onPointerDown={hitSingle} aria-label="Stern fangen">★</button>
          )}
          {playing && round === "sequence" && (
            <>
              {sequencePositions.map((starPosition, index) => {
                const number = index + 1;
                return (
                  <button
                    key={number}
                    className={`star number-star number-${number} ${number < expected ? "star-done" : ""}`}
                    style={starStyle(starPosition, sequenceCount)}
                    onPointerDown={() => hitNumber(number)}
                    aria-label={`Stern Nummer ${number}`}
                    disabled={number < expected}
                  >
                    <span aria-hidden="true">★</span><b>{number}</b>
                  </button>
                );
              })}
            </>
          )}
          {!playing && (
            <div className="star-start-panel" role="dialog" aria-modal="true" aria-labelledby="star-start-title">
              <div className="star-start-content">
                <a className="star-start-back" href={sitePath("/")}>← Hanna&apos;s Spiele</a>
                <div className="big-star" aria-hidden="true">★</div>
                <h2 id="star-start-title">{time === 0 ? `Geschafft: ${score} Punkte!` : "Bist du schnell genug?"}</h2>
                <div className="star-difficulty-picker" aria-label="Schwierigkeit auswählen">
                  <span>Schwierigkeit</span>
                  <div className="difficulty-options">
                    {DIFFICULTIES.map((option) => (
                      <button
                        className={`difficulty-choice ${difficulty === option ? "difficulty-choice-selected" : ""}`}
                        type="button"
                        key={option}
                        aria-pressed={difficulty === option}
                        onClick={() => setDifficulty(option)}
                      >
                        {DIFFICULTY_LABELS[option]}
                      </button>
                    ))}
                  </div>
                  <small>{DIFFICULTY_DESCRIPTIONS[difficulty]}</small>
                </div>
                <p className="star-rules">{difficulty === "easy"
                  ? "Tippe in 20 Sekunden so oft wie möglich auf den einzelnen Stern."
                  : difficulty === "medium"
                    ? "Zusätzlich erscheinen viermal zwei, zweimal drei und einmal vier nummerierte Sterne. Tippe sie der Reihe nach an."
                    : "Beginne mit zwei Sternen. Tippe danach immer längere Zahlenfolgen in der richtigen Reihenfolge an."}</p>
                <div className="star-record">🏆 Highscore {DIFFICULTY_LABELS[difficulty]}: <b>{highscores[difficulty]} Punkte</b></div>
                <div className="start-actions">
                  <button className="start-button" onClick={start}>{time === 0 ? "Nochmal spielen" : "Spiel starten"}</button>
                  <button className="reset-button" onClick={resetHighscore}>Highscore zurücksetzen</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
