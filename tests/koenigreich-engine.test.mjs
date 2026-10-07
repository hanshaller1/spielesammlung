import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, cacheDir: "work/koenigreich/vite-tests", server: { middlewareMode: true } });
after(() => vite.close());
const {
  DIFFICULTIES, LEVELS, OWLS_PER_HOUSE, applyTool, cellAt, createGame, findHint, hasMove, isGoalComplete, kingsBonus,
  levelConfig, levelGoals, levelMoves, listMoves, mulberry32, placeStartPowers, shuffleState, starsFor, swapTiles, tapPower,
} = await vite.ssrLoadModule("/app/koenigreich/engine.ts");
const { DISTRICTS, EMPTY_KINGDOM, build, canBuild, currentDistrict, sanitizeKingdom } = await vite.ssrLoadModule("/app/koenigreich/kingdom.ts");

const POWER_CODES = { R: "rocketH", V: "rocketV", D: "dynamite", S: "spinner", E: "electro" };

/**
 * Baut einen Spielstand aus Zeichen: Ziffer = Farbe, a–f = Farbe 0–5 mit Ranken,
 * R/V/D/S/E = Power-up, c/C = Kiste, h = Vogelhaus, # = Lücke.
 */
function makeState(rows, { moves = 10, goals = [], boss = null, colors = 5 } = {}) {
  let id = 1;
  const cells = [];
  for (const row of rows) {
    for (const symbol of row) {
      if (symbol === "#") cells.push({ hole: true, tile: null, blocker: null });
      else if (symbol === "c" || symbol === "C") cells.push({ hole: false, tile: null, blocker: { kind: "crate", hp: symbol === "C" ? 2 : 1 } });
      else if (symbol === "h") cells.push({ hole: false, tile: null, blocker: { kind: "birdhouse", hp: OWLS_PER_HOUSE } });
      else if (POWER_CODES[symbol]) cells.push({ hole: false, tile: { id: id++, color: -1, power: POWER_CODES[symbol], vines: false }, blocker: null });
      else if (symbol >= "a" && symbol <= "f") cells.push({ hole: false, tile: { id: id++, color: symbol.charCodeAt(0) - 97, power: null, vines: true }, blocker: null });
      else cells.push({ hole: false, tile: { id: id++, color: Number(symbol), power: null, vines: false }, blocker: null });
    }
  }
  return {
    board: { width: rows[0].length, height: rows.length, cells },
    colors,
    moves,
    goals: goals.map((goal) => ({ color: -1, done: 0, ...goal })),
    boss,
    score: 0,
    nextId: id,
  };
}

const tileAt = (state, x, y) => cellAt(state.board, x, y).tile;
const firstStep = (resolution) => resolution.steps[0];
const clearedColors = (step) => step.cleared.filter((burst) => burst.color >= 0);

/** Kein Feld außer Lücken und Hindernissen darf nach einem Zug leer bleiben. */
function assertFilled(board, label) {
  board.cells.forEach((cell, index) => {
    if (!cell.hole && !cell.blocker) assert.ok(cell.tile, `${label}: empty cell ${index}`);
  });
}

function hasMatch(board) {
  const color = (x, y) => {
    const tile = cellAt(board, x, y)?.tile;
    return tile && !tile.power ? tile.color : -1;
  };
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const c = color(x, y);
      if (c < 0) continue;
      if (color(x + 1, y) === c && color(x + 2, y) === c) return true;
      if (color(x, y + 1) === c && color(x, y + 2) === c) return true;
      if (color(x + 1, y) === c && color(x, y + 1) === c && color(x + 1, y + 1) === c) return true;
    }
  }
  return false;
}

test("every level starts without matches, with moves and goals that fit the map", () => {
  LEVELS.forEach((config, index) => {
    for (let seed = 1; seed <= 15; seed++) {
      const label = `level ${index + 1}, seed ${seed}`;
      const state = createGame(config, config.moves, mulberry32(index * 100 + seed));
      assert.equal(state.board.width * state.board.height, state.board.cells.length, label);
      assert.ok(!hasMatch(state.board), `${label}: match at start`);
      assert.ok(listMoves(state.board).length > 0, `${label}: no move at start`);
      assert.ok(state.goals.length > 0, label);
      for (const cell of state.board.cells) {
        if (cell.tile) assert.ok(cell.tile.color >= 0 && cell.tile.color < config.colors, label);
      }
      const symbols = config.map.join("");
      for (const goal of state.goals) {
        if (goal.kind === "crate") assert.equal(goal.target, [...symbols].filter((s) => s === "c" || s === "C").length, label);
        if (goal.kind === "vine") assert.equal(goal.target, [...symbols].filter((s) => s === "v").length, label);
        if (goal.kind === "owl") assert.equal(goal.target, [...symbols].filter((s) => s === "h").length * OWLS_PER_HOUSE, label);
        if (goal.kind === "boss") assert.equal(goal.target, config.boss.hp, label);
        if (goal.kind === "color") assert.ok(goal.color < config.colors, label);
      }
      assert.deepEqual(state.goals, levelGoals(config), label);
    }
  });
});

test("levels beyond the table repeat the second half", () => {
  assert.equal(levelConfig(0), LEVELS[0]);
  assert.equal(levelConfig(LEVELS.length), LEVELS.at(-1));
  assert.equal(levelConfig(LEVELS.length + 1), LEVELS[LEVELS.length / 2]);
  assert.equal(levelConfig(LEVELS.length * 2), LEVELS.at(-1));
  assert.equal(levelMoves(1, DIFFICULTIES[0]), LEVELS[0].moves);
  assert.ok(levelMoves(1, DIFFICULTIES[2]) < LEVELS[0].moves);
});

test("three in a row clear, count toward goals and the board refills", () => {
  const state = makeState(["0012", "2301", "3232", "2323"], { goals: [{ kind: "color", color: 0, target: 5 }] });
  const resolution = swapTiles(state, { x: 2, y: 0 }, { x: 2, y: 1 }, mulberry32(1));
  assert.ok(resolution);
  assert.equal(resolution.state.moves, 9);
  assert.equal(clearedColors(firstStep(resolution)).filter((burst) => burst.color === 0).length, 3);
  assert.ok(resolution.state.goals[0].done >= 3);
  assertFilled(resolution.state.board, "refill");
  assert.equal(state.moves, 10, "input state stays untouched");
});

test("a swap without a match is rejected", () => {
  const state = makeState(["0123", "1230", "2301", "3012"]);
  assert.equal(swapTiles(state, { x: 0, y: 0 }, { x: 1, y: 0 }), null);
  assert.equal(swapTiles(state, { x: 0, y: 0 }, { x: 2, y: 0 }), null, "not adjacent");
});

test("match shapes create the matching power-ups", () => {
  const four = swapTiles(makeState(["00103", "21024", "34234", "42342"]), { x: 2, y: 0 }, { x: 2, y: 1 }, mulberry32(2));
  assert.equal(tileAt({ board: firstStep(four).afterClear }, 2, 0)?.power, "rocketV", "horizontal four → vertical rocket");

  const square = swapTiles(makeState(["0012", "0314", "2023", "4231"]), { x: 1, y: 2 }, { x: 1, y: 1 }, mulberry32(3));
  assert.deepEqual(firstStep(square).created, [{ x: 1, y: 1 }]);
  assert.equal(tileAt({ board: firstStep(square).afterClear }, 1, 1)?.power, "spinner");

  const ell = swapTiles(makeState(["0123", "0231", "1003", "0312"]), { x: 0, y: 3 }, { x: 0, y: 2 }, mulberry32(4));
  assert.deepEqual(firstStep(ell).created, [{ x: 0, y: 2 }]);
  assert.equal(tileAt({ board: firstStep(ell).afterClear }, 0, 2)?.power, "dynamite");

  const five = swapTiles(makeState(["00100", "21023", "34234", "42342"]), { x: 2, y: 0 }, { x: 2, y: 1 }, mulberry32(5));
  assert.equal(tileAt({ board: firstStep(five).afterClear }, 2, 0)?.power, "electro");
});

test("matches hit neighbouring crates and birdhouses, vines hold a stone until freed", () => {
  const state = makeState(["1023", "0102", "C3h2", "2a23"], { goals: [{ kind: "crate", target: 1 }, { kind: "owl", target: 3 }] });
  const step = firstStep(swapTiles(state, { x: 1, y: 0 }, { x: 1, y: 1 }, mulberry32(6)));
  assert.equal(clearedColors(step).length, 3);
  assert.equal(cellAt(step.afterClear, 0, 2).blocker.hp, 1, "the crate below loses a layer");
  assert.equal(cellAt(step.afterClear, 2, 2).blocker.hp, OWLS_PER_HOUSE - 1, "the birdhouse below frees an owl");
  assert.ok(cellAt(step.afterClear, 1, 3).tile.vines, "vines further away stay");

  const row = tapPower(makeState(["1R23", "C3h2", "2a23"], { goals: [{ kind: "vine", target: 1 }] }), { x: 1, y: 0 }, mulberry32(7));
  assert.ok(row);
  assert.equal(row.state.moves, 9);
  assert.equal(firstStep(row).effects[0].kind, "row");

  const hammer = applyTool(makeState(["1a23", "C3h2", "2323"], { goals: [{ kind: "vine", target: 1 }, { kind: "crate", target: 1 }, { kind: "owl", target: 3 }] }), "hammer", { x: 1, y: 0 }, mulberry32(8));
  assert.equal(hammer.state.moves, 10, "tools cost no move");
  assert.equal(hammer.state.goals[0].done, 1);
  assert.equal(cellAt(firstStep(hammer).afterClear, 1, 0).tile.color, 0, "the stone stays after the vines are cut");
  assert.equal(cellAt(firstStep(hammer).afterClear, 1, 0).tile.vines, false);

  const crate = applyTool(makeState(["1023", "C3h2", "2323"], { goals: [{ kind: "crate", target: 1 }] }), "hammer", { x: 0, y: 1 }, mulberry32(9));
  assert.equal(crate.state.goals[0].done, 0, "two-layer crate needs two hits");
  const crate2 = applyTool(crate.state, "hammer", { x: 0, y: 1 }, mulberry32(9));
  assert.equal(crate2.state.goals[0].done, 1);
  assert.equal(cellAt(crate2.state.board, 0, 1).blocker, null);

  const house = applyTool(makeState(["1023", "C3h2", "2323"], { goals: [{ kind: "owl", target: 3 }] }), "cannon", { x: 2, y: 0 }, mulberry32(10));
  assert.equal(cellAt(firstStep(house).afterClear, 2, 1).blocker.hp, OWLS_PER_HOUSE - 1, "each hit frees one owl");
  assert.ok(house.state.goals[0].done >= 1);
});

test("stones slide diagonally past blockers so the board never stays empty", () => {
  const state = makeState(["01234", "1C2c3", "20103", "34241"], { goals: [{ kind: "color", color: 0, target: 99 }] });
  const resolution = applyTool(state, "arrow", { x: 0, y: 2 }, mulberry32(11));
  assertFilled(resolution.state.board, "diagonal refill");
});

test("power-up combinations", () => {
  const both = swapTiles(makeState(["R123", "V231", "2312", "3123"]), { x: 0, y: 0 }, { x: 0, y: 1 }, mulberry32(12));
  assert.deepEqual(firstStep(both).effects.map((effect) => effect.kind).sort(), ["column", "row"]);

  const electro = swapTiles(makeState(["EE12", "1231", "2312", "3123"], { goals: [{ kind: "color", color: 1, target: 99 }] }), { x: 0, y: 0 }, { x: 1, y: 0 }, mulberry32(13));
  assert.ok(clearedColors(firstStep(electro)).length >= 14, "two electro balls clear the whole board");

  const color = swapTiles(makeState(["E123", "1231", "2312", "3123"], { goals: [{ kind: "color", color: 1, target: 99 }] }), { x: 0, y: 0 }, { x: 1, y: 0 }, mulberry32(14));
  const bursts = clearedColors(firstStep(color));
  assert.ok(bursts.length >= 4 && bursts.every((burst) => burst.color === 1), "electro + stone clears that colour");
  assert.ok(color.state.goals[0].done >= 4);

  const big = swapTiles(makeState(["DD123", "12312", "23123", "31231", "12312"]), { x: 0, y: 0 }, { x: 1, y: 0 }, mulberry32(15));
  assert.equal(firstStep(big).effects[0].radius, 4);
});

test("the Dark King attacks after his countdown, but not after helpers", () => {
  const boss = { hp: 500, maxHp: 500, every: 2, countdown: 2, strength: 2 };
  let state = makeState(["01234", "12340", "23401", "34012", "40123"], { moves: 10, boss, goals: [{ kind: "boss", target: 500 }] });
  state = shuffleState(state, mulberry32(16)).state;
  const helper = applyTool(state, "hammer", { x: 2, y: 2 }, mulberry32(17));
  assert.equal(helper.state.boss.countdown, 2, "helpers do not count as a move");
  assert.ok(helper.state.boss.hp < 500, "helper hits still damage the king");

  let current = helper.state;
  const random = mulberry32(18);
  let attacks = 0;
  for (let turn = 0; turn < 4; turn++) {
    const move = listMoves(current.board)[0];
    const resolution = swapTiles(current, move.a, move.b, random);
    attacks += resolution.steps.filter((step) => step.effects.some((effect) => effect.kind === "attack")).length;
    current = resolution.state;
    assert.equal(current.goals[0].done, 500 - current.boss.hp);
  }
  assert.equal(attacks, 2);
  assert.ok(current.board.cells.some((cell) => cell.blocker?.kind === "crate"), "attacks leave crates");
});

test("helpers, shuffles and hints keep the board playable", () => {
  const state = createGame(LEVELS[3], 20, mulberry32(19));
  const shuffled = shuffleState(state, mulberry32(20)).state;
  assert.ok(!hasMatch(shuffled.board));
  assert.ok(hasMove(shuffled.board));
  const hint = findHint(state.board);
  assert.ok(hint && swapTiles(state, hint.a, hint.b, mulberry32(21)));

  const powered = placeStartPowers(state, ["rocketH", "dynamite", "electro"], mulberry32(22));
  assert.deepEqual(powered.board.cells.flatMap((cell) => cell.tile?.power ? [cell.tile.power] : []).sort(), ["dynamite", "electro", "rocketH"]);
});

test("the king's bonus turns leftover moves into points", () => {
  const state = createGame(LEVELS[0], 5, mulberry32(23));
  const bonus = kingsBonus(state, mulberry32(24));
  assert.equal(bonus.state.moves, 0);
  assert.ok(bonus.state.score >= 5 * 50);
  assert.deepEqual(bonus.state.goals, state.goals, "the bonus does not change goals");
  assert.equal(starsFor(10, 20), 3);
  assert.equal(starsFor(3, 20), 2);
  assert.equal(starsFor(0, 20), 1);
});

/** Gieriger Spieler, der nachfallende Steine nicht vorhersieht. */
function playGreedy(config, moves, seed) {
  const random = mulberry32(seed);
  let state = createGame(config, moves, random);
  const value = (next) => next.goals.reduce((sum, goal) => sum + goal.done / goal.target * 100 + (goal.done >= goal.target ? 30 : 0), 0)
    + next.board.cells.filter((cell) => cell.tile?.power).length * 2;
  while (state.moves > 0 && !isGoalComplete(state)) {
    const options = listMoves(state.board).map((move) => (rng) => swapTiles(state, move.a, move.b, rng));
    state.board.cells.forEach((cell, index) => {
      if (cell.tile?.power && !cell.tile.vines) options.push((rng) => tapPower(state, { x: index % state.board.width, y: Math.floor(index / state.board.width) }, rng));
    });
    let best = null;
    let bestValue = -Infinity;
    for (const option of options) {
      const outcome = option(mulberry32(seed * 7 + state.moves * 13));
      if (outcome && value(outcome.state) > bestValue) {
        bestValue = value(outcome.state);
        best = option;
      }
    }
    assert.ok(best, "the board must always offer a move");
    state = best(random).state;
    assertFilled(state.board, "after move");
  }
  return isGoalComplete(state);
}

test("a simple player wins every level on easy and still some on hard", () => {
  LEVELS.forEach((config, index) => {
    let easy = 0;
    let hard = 0;
    for (let seed = 1; seed <= 6; seed++) {
      if (playGreedy(config, levelMoves(index + 1, DIFFICULTIES[0]), 1000 * index + seed)) easy++;
      if (playGreedy(config, levelMoves(index + 1, DIFFICULTIES[2]), 2000 * index + seed)) hard++;
    }
    assert.ok(easy >= 5, `level ${index + 1}: only ${easy}/6 wins on easy`);
    assert.ok(hard >= 1, `level ${index + 1}: no win on hard`);
  });
});

test("the kingdom is built district by district with potions", () => {
  let kingdom = { ...EMPTY_KINGDOM, potions: 1 };
  assert.equal(currentDistrict(kingdom), DISTRICTS[0]);
  assert.ok(!canBuild(kingdom, "baum"), "too expensive");
  assert.ok(!canBuild(kingdom, "stand"), "later district");
  kingdom = build(kingdom, "brunnen");
  assert.deepEqual(kingdom, { potions: 0, built: ["brunnen"] });
  assert.equal(build(kingdom, "blumen"), kingdom, "no potions left");

  const all = DISTRICTS[0].tasks.map((task) => task.id);
  kingdom = { potions: 50, built: all };
  assert.equal(currentDistrict(kingdom), DISTRICTS[1]);
  const total = DISTRICTS.reduce((sum, district) => sum + district.tasks.reduce((part, task) => part + task.cost, 0), 0);
  assert.ok(total >= LEVELS.length * 2, "the kingdom lasts beyond the first round of levels");
  assert.equal(currentDistrict({ potions: 0, built: DISTRICTS.flatMap((district) => district.tasks.map((task) => task.id)) }), null);

  assert.deepEqual(sanitizeKingdom(null), EMPTY_KINGDOM);
  assert.deepEqual(sanitizeKingdom({ potions: "7", built: ["brunnen", "brunnen", "unbekannt", 3] }), { potions: 7, built: ["brunnen"] });
  assert.deepEqual(sanitizeKingdom({ potions: -4 }), EMPTY_KINGDOM);
});
