import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, cacheDir: "work/hungriges-loch/vite-tests", server: { middlewareMode: true } });
after(() => vite.close());
const {
  BOOSTER_TIME, DIFFICULTIES, FIT_FACTOR, GIANT_FACTOR, HOLE_RADIUS, HoleEngine, KINDS, LEVELS, MAX_SIZE, TIER_RADIUS, TIER_XP, XP_STEPS,
  difficultyLevel, levelConfig, mulberry32,
} = await vite.ssrLoadModule("/app/hungriges-loch/engine.ts");

const STEP = 1 / 30;
const kindOf = (symbol) => KINDS.findIndex((kind) => kind.symbol === symbol);
const emptyLevel = (targets = { "🍒": 1 }, seconds = 30) => ({ width: 600, height: 600, seconds, spawn: {}, targets });

/** Stellt eine einzelne Sache gezielt auf die Karte. */
function put(game, symbol, x, y) {
  const kind = kindOf(symbol);
  const item = { id: 1000 + game.items.length, kind, x, y, radius: TIER_RADIUS[KINDS[kind].tier - 1], fall: -1, wobble: 0 };
  game.items.push(item);
  return item;
}

function run(game, seconds, dirX = 0, dirY = 0) {
  for (let time = 0; time < seconds && game.status === "playing"; time += STEP) game.step(STEP, dirX, dirY);
}

/** Einfacher Spieler: steuert immer die nächste passende Sache an und bevorzugt Ziele. */
function playGreedy(config, seed) {
  const game = new HoleEngine(config, mulberry32(seed));
  while (game.status === "playing") {
    let best = null;
    let bestScore = Infinity;
    for (const item of game.items) {
      if (item.fall >= 0 || !game.fits(item)) continue;
      const score = Math.hypot(item.x - game.hole.x, item.y - game.hole.y) - (game.isTarget(item.kind) ? 150 : 0);
      if (score < bestScore) {
        best = item;
        bestScore = score;
      }
    }
    if (best) game.step(STEP, best.x - game.hole.x, best.y - game.hole.y);
    else if (game.items.some((item) => item.fall >= 0)) game.step(STEP, 0, 0);
    else return { game, stuck: true };
  }
  return { game, stuck: false };
}

test("the size table lets size n swallow exactly up to tier n", () => {
  assert.equal(HOLE_RADIUS.length, MAX_SIZE);
  assert.equal(TIER_RADIUS.length, MAX_SIZE);
  assert.equal(XP_STEPS.length, MAX_SIZE - 1);
  HOLE_RADIUS.forEach((radius, index) => {
    TIER_RADIUS.forEach((itemRadius, tier) => {
      assert.equal(itemRadius <= radius * FIT_FACTOR, tier <= index, `size ${index + 1}, tier ${tier + 1}`);
    });
  });
});

test("every level places all goods inside the map without overlap and away from the start", () => {
  LEVELS.forEach((config, index) => {
    for (let seed = 1; seed <= 15; seed++) {
      const game = new HoleEngine(config, mulberry32(index * 100 + seed));
      const label = `level ${index + 1}, seed ${seed}`;
      assert.equal(game.items.length, Object.values(config.spawn).reduce((sum, count) => sum + count, 0), label);
      for (const [symbol, need] of Object.entries(config.targets)) {
        assert.ok(need <= (config.spawn[symbol] ?? 0), `${label}: more ${symbol} wanted than placed`);
      }
      game.items.forEach((item, position) => {
        assert.ok(item.x >= item.radius && item.x <= config.width - item.radius, `${label}: outside horizontally`);
        assert.ok(item.y >= item.radius && item.y <= config.height - item.radius, `${label}: outside vertically`);
        assert.ok(Math.hypot(item.x - game.hole.x, item.y - game.hole.y) > item.radius + HOLE_RADIUS[0], `${label}: on the start`);
        for (const other of game.items.slice(position + 1)) {
          assert.ok(Math.hypot(item.x - other.x, item.y - other.y) >= item.radius + other.radius, `${label}: overlap`);
        }
      });
    }
  });
});

test("a simple player finishes every level with plenty of time left", () => {
  LEVELS.forEach((config, index) => {
    for (let seed = 1; seed <= 12; seed++) {
      const { game, stuck } = playGreedy(config, index * 50 + seed);
      const label = `level ${index + 1}, seed ${seed}`;
      assert.equal(stuck, false, `${label}: nothing left that fits`);
      assert.equal(game.status, "won", label);
      assert.ok(game.timeLeft >= config.seconds * 0.5, `${label}: only ${game.timeLeft.toFixed(1)}s left`);
      assert.ok([...game.remaining.values()].every((count) => count === 0), label);
    }
  });
});

test("levels beyond the table keep the largest map", () => {
  assert.equal(levelConfig(0), LEVELS[0]);
  assert.equal(levelConfig(LEVELS.length + 3), LEVELS.at(-1));
});

test("a fitting thing above the hole falls in, counts and disappears", () => {
  const game = new HoleEngine(emptyLevel({ "🍒": 2 }));
  put(game, "🍒", 300, 300);
  put(game, "🍒", 560, 560);
  game.step(STEP, 0, 0);
  assert.deepEqual(game.events, [{ type: "swallow", kind: kindOf("🍒"), x: 300, y: 300, target: true }]);
  assert.equal(game.remaining.get(kindOf("🍒")), 1);
  assert.equal(game.xp, TIER_XP[0]);
  run(game, 0.5);
  assert.equal(game.items.length, 1, "the swallowed thing is removed after its fall");
  assert.equal(game.status, "playing");
});

test("things that are too big only wobble until the hole has grown", () => {
  const game = new HoleEngine(emptyLevel({ "🍎": 1 }));
  const apple = put(game, "🍎", 300, 300);
  run(game, 1);
  assert.equal(apple.fall, -1);
  assert.ok(apple.wobble > 0);
  assert.deepEqual(game.events.map((event) => event.type), ["blocked"], "the hint is throttled");

  game.events.length = 0;
  for (let index = 0; index < XP_STEPS[0]; index++) put(game, "🍒", 300, 300);
  run(game, 1.5);
  assert.equal(game.size, 2);
  assert.ok(game.events.some((event) => event.type === "grow" && event.size === 2));
  assert.ok(game.hole.radius > HOLE_RADIUS[0] && game.hole.radius <= HOLE_RADIUS[1], "the hole grows smoothly towards its new size");
  assert.equal(game.status, "won", "the apple fell in once the hole was big enough");
});

test("growth follows the point table up to the maximum size", () => {
  const game = new HoleEngine(emptyLevel({ "🎡": 1 }, 600));
  assert.equal(game.growth, 0);
  let fed = 0;
  XP_STEPS.forEach((threshold, index) => {
    while (fed < threshold) {
      put(game, "🍒", game.hole.x, game.hole.y);
      fed++;
      game.step(STEP, 0, 0);
      if (fed === threshold - 1 && index === 0) assert.ok(game.growth > 0.9 && game.growth < 1);
    }
    assert.equal(game.size, index + 2);
  });
  assert.equal(game.size, MAX_SIZE);
  assert.equal(game.growth, 1);
});

test("the hole moves with the input, faster when bigger, and stays on the map", () => {
  const game = new HoleEngine(emptyLevel());
  run(game, 1, 1, 0);
  const small = game.hole.x - 300;
  assert.ok(small > 150 && small < 260, `moved ${small}`);
  assert.equal(game.hole.y, 300);
  run(game, 5, 40, 0);
  assert.equal(game.hole.x, 600, "long input vectors are normalised and clamped to the map");
  run(game, 5, -1, -1);
  assert.equal(game.hole.x, 0);
  assert.equal(game.hole.y, 0);

  const slow = new HoleEngine(emptyLevel());
  run(slow, 1, 0.5, 0);
  assert.ok(Math.abs((slow.hole.x - 300) - small / 2) < 2, "half a push gives half the speed");
});

test("the clock ends the level, the freeze booster holds it", () => {
  const game = new HoleEngine(emptyLevel({ "🍒": 1 }, 2));
  put(game, "🍒", 560, 560);
  assert.equal(game.activate("freeze"), true);
  assert.equal(game.activate("freeze"), false, "a running booster cannot be stacked");
  run(game, BOOSTER_TIME.freeze - 0.5);
  assert.equal(game.timeLeft, 2);
  run(game, 3);
  assert.equal(game.status, "lost");
  assert.equal(game.timeLeft, 0);
  assert.deepEqual(game.events.at(-1), { type: "lost" });
  const before = { ...game.hole };
  game.step(STEP, 1, 1);
  assert.deepEqual(game.hole, before, "a finished level no longer moves");
  assert.equal(game.activate("magnet"), false);
});

test("the magnet pulls distant fitting things in, the giant booster swallows one tier more", () => {
  const plain = new HoleEngine(emptyLevel({ "🍒": 1 }));
  const far = put(plain, "🍒", 420, 300);
  run(plain, 2);
  assert.equal(far.x, 420, "without a magnet nothing moves at that distance");

  const magnet = new HoleEngine(emptyLevel({ "🍒": 1 }));
  put(magnet, "🍒", 420, 300);
  put(magnet, "🍎", 380, 300);
  magnet.activate("magnet");
  run(magnet, 2);
  assert.equal(magnet.status, "won");
  assert.equal(magnet.items.find((item) => item.kind === kindOf("🍎")).x, 380, "too big things stay put");

  const giant = new HoleEngine(emptyLevel({ "🍎": 1 }));
  put(giant, "🍎", 300, 300);
  giant.activate("giant");
  assert.equal(giant.targetRadius, HOLE_RADIUS[0] * GIANT_FACTOR);
  run(giant, 1);
  assert.equal(giant.status, "won");
  assert.equal(giant.size, 1, "the booster does not change the earned size");
});

test("every grade only shortens the clock, harder grades more, and all stay winnable", () => {
  assert.deepEqual(DIFFICULTIES.map((entry) => entry.id), ["leicht", "mittel", "schwer"]);
  const [easy, medium, hard] = DIFFICULTIES;
  assert.deepEqual({ time: easy.timeFactor, boosters: easy.boosters, pointer: easy.pointer }, { time: 0.9, boosters: 2, pointer: true });
  assert.ok(medium.boosters <= easy.boosters && hard.boosters <= medium.boosters);
  assert.equal(hard.pointer, false);
  LEVELS.forEach((config, index) => {
    const seconds = DIFFICULTIES.map((entry) => difficultyLevel(index + 1, entry).seconds);
    assert.ok(config.seconds > seconds[0] && seconds[0] > seconds[1] && seconds[1] > seconds[2], `level ${index + 1}: ${seconds}`);
    for (const entry of DIFFICULTIES) assert.deepEqual({ ...difficultyLevel(index + 1, entry), seconds: config.seconds }, config);
    for (let seed = 1; seed <= 8; seed++) {
      const { game, stuck } = playGreedy(difficultyLevel(index + 1, hard), index * 70 + seed);
      assert.equal(stuck, false, `level ${index + 1}, seed ${seed}`);
      assert.equal(game.status, "won", `level ${index + 1}, seed ${seed}: the simple player ran out of time on hard`);
    }
  });
});
