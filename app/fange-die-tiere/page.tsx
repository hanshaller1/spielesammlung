"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const GAME_TIME = 40;

const animals = [
  { id: "tiger", name: "Tiger", face: "🐯" },
  { id: "affe", name: "Affe", face: "🐵" },
  { id: "koala", name: "Koala", face: "🐨" },
  { id: "vogel", name: "Vogel", face: "🐦" },
] as const;

type AnimalId = (typeof animals)[number]["id"];
type Cell = { animal: AnimalId; changesAt: number };

function randomAnimal(): AnimalId {
  return animals[Math.floor(Math.random() * animals.length)].id;
}

function nextChangeTime(now = performance.now()): number {
  return now + (2 + Math.floor(Math.random() * 3)) * 1000;
}

function createGrid(): Cell[] {
  const now = performance.now();
  return Array.from({ length: 20 }, () => ({
    animal: randomAnimal(),
    changesAt: nextChangeTime(now),
  }));
}

export default function CatchTheAnimals() {
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [time, setTime] = useState(GAME_TIME);
  const [playing, setPlaying] = useState(false);
  const [target, setTarget] = useState<AnimalId>("tiger");
  const [cells, setCells] = useState<Cell[]>([]);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const deadlineRef = useRef(0);
  const wrongTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // The stored score is only available after the client has mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBest(Number(localStorage.getItem("tiere-best") ?? 0));
    setTarget(randomAnimal());
  }, []);

  const finishGame = useCallback(() => {
    setPlaying(false);
    setWrongCell(null);
    setTarget(randomAnimal());
  }, []);

  useEffect(() => {
    if (!playing) return;

    const updateGame = () => {
      const now = performance.now();
      const millisecondsLeft = Math.max(0, deadlineRef.current - now);
      const secondsLeft = Math.ceil(millisecondsLeft / 1000);
      setTime((current) => current === secondsLeft ? current : secondsLeft);

      if (millisecondsLeft === 0) {
        finishGame();
        return;
      }

      setCells((current) => {
        let changed = false;
        const next = current.map((cell) => {
          if (now < cell.changesAt) return cell;
          changed = true;
          return { animal: randomAnimal(), changesAt: nextChangeTime(now) };
        });
        return changed ? next : current;
      });
    };

    const timer = window.setInterval(updateGame, 100);
    return () => window.clearInterval(timer);
  }, [playing, finishGame]);

  useEffect(() => () => {
    if (wrongTimeoutRef.current !== null) window.clearTimeout(wrongTimeoutRef.current);
  }, []);

  const updateScore = useCallback((change: number) => {
    setScore((current) => {
      const next = current + change;
      setBest((currentBest) => {
        if (next > currentBest) {
          localStorage.setItem("tiere-best", String(next));
          return next;
        }
        return currentBest;
      });
      return next;
    });
  }, []);

  const start = useCallback(() => {
    if (wrongTimeoutRef.current !== null) window.clearTimeout(wrongTimeoutRef.current);
    deadlineRef.current = performance.now() + GAME_TIME * 1000;
    setCells(createGrid());
    setScore(0);
    setTime(GAME_TIME);
    setWrongCell(null);
    setPlaying(true);
  }, []);

  const resetHighscore = useCallback(() => {
    localStorage.removeItem("tiere-best");
    setBest(0);
  }, []);

  const chooseCell = (index: number) => {
    if (!playing) return;

    if (cells[index].animal === target) {
      updateScore(1);
      setCells((current) => current.map((cell, cellIndex) => (
        cellIndex === index
          ? { animal: randomAnimal(), changesAt: nextChangeTime() }
          : cell
      )));
      return;
    }

    updateScore(-1);
    setWrongCell(index);
    if (wrongTimeoutRef.current !== null) window.clearTimeout(wrongTimeoutRef.current);
    wrongTimeoutRef.current = window.setTimeout(() => setWrongCell(null), 300);
  };

  const targetAnimal = animals.find((animal) => animal.id === target)!;

  return (
    <main className="game-shell animal-game-shell">
      <section className="game-card animal-game-card" aria-labelledby="animal-title">
        <Link className="back-link" href="/">← Hanna&apos;s Spiele</Link>
        <header>
          <div><p className="eyebrow">SUCHSPIEL</p><h1 id="animal-title">Fange die Tiere</h1></div>
          <div className="stats" aria-live="polite">
            <span><b>{score}</b> Punkte</span><span><b>{time}</b> Sek.</span><span><b>{best}</b> Bestwert</span>
          </div>
        </header>

        <div className="animal-target" aria-live="polite">
          <span>Finde alle</span>
          <strong aria-label={targetAnimal.name}>{targetAnimal.face}</strong>
          <b>{targetAnimal.name}</b>
        </div>

        <div className="animal-board" aria-label="Spielfeld mit 20 Tieren">
          {playing && cells.map((cell, index) => {
            const animal = animals.find((item) => item.id === cell.animal)!;
            return (
              <button
                className={`animal-cell ${wrongCell === index ? "animal-cell-wrong" : ""}`}
                key={index}
                onPointerDown={() => chooseCell(index)}
                aria-label={animal.name}
              >
                <span aria-hidden="true">{animal.face}</span>
              </button>
            );
          })}

          {!playing && (
            <div className="animal-start-panel">
              <div className="animal-trio" aria-hidden="true">🐯 🐵 🐨 🐦</div>
              <h2>{time === 0 ? `Geschafft: ${score} Punkte!` : "Finde das richtige Tier!"}</h2>
              <p>Tippe nur auf das Tier, das oben gesucht wird.</p>
              <div className="start-actions">
                <button className="start-button" onClick={start}>{time === 0 ? "Nochmal spielen" : "Spiel starten"}</button>
                <button className="reset-button" onClick={resetHighscore}>Highscore zurücksetzen</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
