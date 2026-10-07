import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, cacheDir: "work/waren-sortieren/vite-tests", server: { middlewareMode: true } });
after(() => vite.close());
const {
  DIFFICULTIES, LEVELS, SLOTS, canMove, cloneBoard, countItems, createLevel, findHint, hasUsefulMove, isCleared,
  levelConfig, levelSeconds, moveItem, mulberry32, removeTriple, shuffleBoard, solveBoard,
} = await vite.ssrLoadModule("/app/waren-sortieren/engine.ts");

let nextId = 1000;
const item = (good) => good === null ? null : { id: nextId++, good };
const shelf = (layers, lock = 0) => ({ lock, layers: layers.map((layer) => layer.map(item)) });
const goodsOf = (board) => board.shelves.flatMap((entry) => entry.layers.flat()).filter(Boolean).map((entry) => entry.good).sort((a, b) => a - b);

test("every level starts solvable, unsorted and with free space", () => {
  LEVELS.forEach((config, index) => {
    for (let seed = 1; seed <= 25; seed++) {
      const board = createLevel(config, mulberry32(index * 1000 + seed));
      const label = `level ${index + 1}, seed ${seed}`;
      assert.equal(board.shelves.length, config.shelves, label);
      assert.equal(countItems(board), config.triples * SLOTS, label);

      const perGood = new Map();
      for (const good of goodsOf(board)) perGood.set(good, (perGood.get(good) ?? 0) + 1);
      assert.equal(perGood.size, config.goods, label);
      for (const count of perGood.values()) assert.equal(count % SLOTS, 0, label);

      for (const entry of board.shelves) {
        assert.ok(entry.layers.length >= 1 && entry.layers.length <= config.layers, `${label}: layer count`);
        entry.layers.forEach((layer, depth) => {
          assert.equal(layer.length, SLOTS, label);
          assert.ok(depth === 0 || layer.some(Boolean), `${label}: empty back layer`);
          assert.ok(!(layer[0] && layer.every((slot) => slot?.good === layer[0].good)), `${label}: sorted at start`);
        });
      }
      assert.deepEqual(board.shelves.map((entry) => entry.lock).filter(Boolean).sort(), [...config.locks].sort(), label);
      const free = board.shelves.filter((entry) => entry.lock === 0).flatMap((entry) => entry.layers[0]).filter((slot) => slot === null).length;
      assert.ok(free >= 3, `${label}: only ${free} free slots`);

      const solution = solveBoard(board);
      assert.ok(solution, `${label}: no solution`);
      const replay = cloneBoard(board);
      for (const move of solution) assert.ok(moveItem(replay, move.from, move.to), `${label}: illegal solution move`);
      assert.ok(isCleared(replay), `${label}: solution leaves goods behind`);
    }
  });
});

test("levels beyond the table keep the hardest configuration", () => {
  assert.equal(levelConfig(0), LEVELS[0]);
  assert.equal(levelConfig(1), LEVELS[0]);
  assert.equal(levelConfig(LEVELS.length + 7), LEVELS.at(-1));
});

test("three equal goods clear the shelf and the next row moves forward", () => {
  const board = { shelves: [shelf([[1, 1, null], [2, 3, null]]), shelf([[1, 4, null]])] };
  const outcome = moveItem(board, { shelf: 1, slot: 0 }, { shelf: 0, slot: 2 });
  assert.deepEqual(outcome.matches, [{ shelf: 0, good: 1 }]);
  assert.deepEqual(outcome.advanced, [0]);
  assert.deepEqual(board.shelves[0].layers.map((layer) => layer.map((slot) => slot?.good ?? null)), [[2, 3, null]]);
});

test("moving the last good away reveals the row behind and can chain", () => {
  const board = { shelves: [shelf([[5, null, null], [2, 2, 2], [7, null, null]]), shelf([[null, null, null]])] };
  const outcome = moveItem(board, { shelf: 0, slot: 0 }, { shelf: 1, slot: 1 });
  assert.deepEqual(outcome.matches, [{ shelf: 0, good: 2 }]);
  assert.deepEqual(outcome.advanced, [0, 0]);
  assert.deepEqual(board.shelves[0].layers.map((layer) => layer.map((slot) => slot?.good ?? null)), [[7, null, null]]);
});

test("occupied targets, empty sources and locked shelves reject moves", () => {
  const board = { shelves: [shelf([[1, 2, null]]), shelf([[3, null, null]]), shelf([[4, 5, null]], 2)] };
  const before = JSON.stringify(board);
  assert.equal(canMove(board, { shelf: 0, slot: 0 }, { shelf: 1, slot: 0 }), false);
  assert.equal(canMove(board, { shelf: 0, slot: 2 }, { shelf: 1, slot: 1 }), false);
  assert.equal(canMove(board, { shelf: 0, slot: 0 }, { shelf: 2, slot: 2 }), false);
  assert.equal(canMove(board, { shelf: 2, slot: 0 }, { shelf: 1, slot: 1 }), false);
  assert.equal(canMove(board, { shelf: 0, slot: 0 }, { shelf: 0, slot: 0 }), false);
  assert.equal(moveItem(board, { shelf: 2, slot: 0 }, { shelf: 1, slot: 1 }), null);
  assert.equal(JSON.stringify(board), before);
  assert.ok(moveItem(board, { shelf: 0, slot: 0 }, { shelf: 0, slot: 2 }), "rearranging inside a shelf is allowed");
});

test("matches count down chains and open the shelf", () => {
  const board = { shelves: [shelf([[1, 1, null]]), shelf([[1, 2, 2]]), shelf([[2, null, null]]), shelf([[3, 3, 3]], 2)] };
  const first = moveItem(board, { shelf: 1, slot: 0 }, { shelf: 0, slot: 2 });
  assert.deepEqual(first.unlocked, []);
  assert.equal(board.shelves[3].lock, 1);
  // Beim Öffnen wird der bereits sortierte Inhalt sofort abgeräumt.
  const second = moveItem(board, { shelf: 2, slot: 0 }, { shelf: 1, slot: 0 });
  assert.deepEqual(second.unlocked, [3]);
  assert.deepEqual(second.matches, [{ shelf: 1, good: 2 }, { shelf: 3, good: 3 }]);
  assert.ok(isCleared(board));
});

test("shuffling keeps every good and leaves chained shelves untouched", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const config = LEVELS[10];
    const board = createLevel(config, mulberry32(seed));
    const locked = JSON.stringify(board.shelves.filter((entry) => entry.lock > 0));
    const shuffled = shuffleBoard(board, config.layers, mulberry32(seed + 99));
    assert.deepEqual(goodsOf(shuffled), goodsOf(board));
    assert.equal(JSON.stringify(shuffled.shelves.filter((entry) => entry.lock > 0)), locked);
    assert.ok(solveBoard(shuffled), `seed ${seed}: shuffled board unsolvable`);
    assert.ok(hasUsefulMove(shuffled));
  }
});

test("a jammed shelf has no useful move and a shuffle frees it", () => {
  const board = { shelves: [shelf([[1, 2, 3]]), shelf([[1, 2, 3]]), shelf([[1, 2, 3]])] };
  assert.equal(hasUsefulMove(board), false);
  assert.equal(findHint(board), null);
  const shuffled = shuffleBoard(board, 1, mulberry32(4));
  assert.deepEqual(goodsOf(shuffled), goodsOf(board));
  assert.ok(hasUsefulMove(shuffled));
  assert.ok(solveBoard(shuffled));
});

test("an unsolvable chained layout is reopened by shuffling", () => {
  const board = { shelves: [shelf([[1, 1, null]]), shelf([[null, null, null]]), shelf([[1, 2, 2]], 3), shelf([[2, null, null]])] };
  const shuffled = shuffleBoard(board, 1, mulberry32(7));
  assert.ok(shuffled.shelves.every((entry) => entry.lock === 0));
  assert.deepEqual(goodsOf(shuffled), goodsOf(board));
  assert.ok(solveBoard(shuffled));
});

test("the hint is the first step of a solution", () => {
  const board = { shelves: [shelf([[1, 1, null]]), shelf([[1, 2, 2]]), shelf([[2, null, null]])] };
  const hint = findHint(board);
  assert.ok(canMove(board, hint.from, hint.to));
  assert.deepEqual(hint, solveBoard(board)[0]);
});

test("the wand removes exactly one triple and counts as a match", () => {
  const board = { shelves: [shelf([[1, 2, null], [1, 3, 3]]), shelf([[2, 1, null]]), shelf([[2, 3, null]], 1)] };
  const outcome = removeTriple(board);
  assert.deepEqual(outcome.removed.map((entry) => entry.good), [1, 1, 1]);
  assert.deepEqual(outcome.unlocked, [2]);
  assert.deepEqual(goodsOf(board), [2, 2, 2, 3, 3, 3]);
  for (let seed = 1; seed <= 10; seed++) {
    const level = createLevel(LEVELS[9], mulberry32(seed));
    let guard = 0;
    while (!isCleared(level)) {
      const before = countItems(level);
      const step = removeTriple(level);
      assert.ok(step, "wand found nothing on a filled board");
      assert.equal(before - countItems(level), SLOTS * (1 + step.matches.length));
      assert.ok(++guard <= LEVELS[9].triples);
    }
  }
  assert.equal(removeTriple({ shelves: [shelf([[null, null, null]])] }), null);
});

test("every grade shortens the level time, harder grades more and with fewer helpers", () => {
  assert.deepEqual(DIFFICULTIES.map((entry) => entry.id), ["leicht", "mittel", "schwer"]);
  const [easy, medium, hard] = DIFFICULTIES;
  assert.deepEqual({ time: easy.timeFactor, boosters: easy.boosters, hint: easy.hintDelay }, { time: 0.9, boosters: 2, hint: 10 });
  assert.ok(medium.boosters <= easy.boosters && hard.boosters <= medium.boosters);
  assert.ok(medium.hintDelay > easy.hintDelay);
  assert.equal(hard.hintDelay, null);
  LEVELS.forEach((config, index) => {
    const seconds = DIFFICULTIES.map((entry) => levelSeconds(index + 1, entry));
    assert.ok(config.seconds > seconds[0] && seconds[0] > seconds[1] && seconds[1] > seconds[2], `level ${index + 1}: ${seconds}`);
    // Auch auf "schwer" bleibt mehr als eine Sekunde je Ware.
    assert.ok(seconds[2] >= config.triples * SLOTS, `level ${index + 1}: only ${seconds[2]}s`);
  });
  assert.equal(levelSeconds(LEVELS.length + 4, hard), levelSeconds(LEVELS.length, hard));
});
