import assert from "node:assert/strict";
import test from "node:test";
import Matter from "matter-js";
import { randomDropTier, SchatzMergeEngine, TREASURES } from "../app/schatz-merge/engine.ts";

function createGame(overrides = {}) {
  const events = [];
  const game = new SchatzMergeEngine({
    onMerge: (event) => events.push({ type: "merge", ...event }),
    onGameOver: () => { events.push({ type: "game-over" }); },
    onDrop: () => { events.push({ type: "drop" }); },
    onImpact: (tier) => { events.push({ type: "impact", tier }); },
    ...overrides,
  });
  game.resize(390, 620);
  return { game, events };
}

function activeBodies(game) {
  return Matter.Composite.allBodies(game.engine.world).filter((body) => !body.isStatic);
}

function assertHealthy(game) {
  const bodies = activeBodies(game);
  assert.equal(bodies.length, game.bodies.size, "every live physics body must have one game record");
  for (const body of bodies) {
    for (const value of [body.position.x, body.position.y, body.velocity.x, body.velocity.y, body.angle, body.angularVelocity]) {
      assert.ok(Number.isFinite(value), `body ${body.id} has a non-finite physics value`);
    }
    assert.ok(body.bounds.min.x > -2, `body ${body.id} crossed the left wall`);
    assert.ok(body.bounds.max.x < game.boardWidth + 2, `body ${body.id} crossed the right wall`);
  }
}

test("12 Schatzstufen haben eine steigende Größe und Drops bleiben bei Stufe 1 bis 4", () => {
  assert.equal(TREASURES.length, 12);
  assert.deepEqual(TREASURES.map((treasure) => treasure.tier), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.ok(TREASURES.every((treasure, index) => index === 0 || treasure.size > TREASURES[index - 1].size));
  assert.equal(randomDropTier(() => 0), 1);
  assert.equal(randomDropTier(() => 0.44), 2);
  assert.equal(randomDropTier(() => 0.999), 4);
});

test("gleiche Schätze mergen einmalig und erlauben eine Kettenreaktion", () => {
  const { game, events } = createGame();
  const step = (count) => { for (let index = 0; index < count; index += 1) game.update(16.7); };

  game.drop(2, 195);
  step(110);
  game.drop(2, 195);
  step(180);
  assert.equal(events.filter((event) => event.type === "merge" && event.tier === 2).length, 1);
  assert.ok([...game.bodies.values()].some((meta) => meta.tier === 3));
  const coinStack = activeBodies(game).find((body) => game.bodies.get(body.id)?.tier === 3);
  assert.ok(coinStack, "a coin merge must create a live stack body");
  assert.ok(coinStack.bounds.max.y < 622, "the merged stack must stay above the bottom of the board");
  assert.ok(coinStack.bounds.max.x < game.boardWidth + 2, "the merged stack bounds must stay aligned with its position");

  game.drop(3, 195);
  step(180);
  assert.equal(events.filter((event) => event.type === "merge" && event.tier === 3).length, 1);
  assert.ok([...game.bodies.values()].some((meta) => meta.tier === 4));
  step(240);
  assert.equal(events.filter((event) => event.type === "merge" && (event.tier === 2 || event.tier === 3)).length, 2);
  assertHealthy(game);

  game.reset();
  events.length = 0;
  game.drop(12, 195);
  step(170);
  game.drop(12, 195);
  step(170);
  const throneMerge = events.find((event) => event.type === "merge" && event.tier === 12);
  assert.equal(throneMerge?.terminal, true);
  assert.equal(throneMerge?.nextTier, null);
  assert.equal(throneMerge?.points, 10240);
  assert.equal([...game.bodies.values()].some((meta) => meta.tier > 12), false);
});

test("Goldmünze am rechten Rand bleibt auf dem Schatzkästchen liegen", () => {
  const { game } = createGame();
  const step = (count) => { for (let index = 0; index < count; index += 1) game.update(16.7); };

  game.drop(7, 365);
  step(160);
  game.drop(2, 365);
  step(240);

  const chest = activeBodies(game).find((body) => game.bodies.get(body.id)?.tier === 7);
  const coin = activeBodies(game).find((body) => game.bodies.get(body.id)?.tier === 2);
  assert.ok(chest && coin, "both the chest and the coin should remain in the world");
  assert.ok(coin.position.y < chest.position.y, "the coin must be supported by the chest rather than pass through it");
  assert.ok(coin.bounds.max.y < 622, "the coin must not leave through the bottom of the board");
});

test("300 Drops, Größenwechsel und Resets erzeugen keine NaN-Bodies oder Wanddurchgänge", () => {
  const { game, events } = createGame();
  let submitted = 0;
  for (let index = 0; index < 300; index += 1) {
    if (index % 12 === 0) game.reset();
    const x = 24 + ((index * 53) % 342);
    game.drop((index % 4) + 1, x);
    submitted += 1;
    for (let frame = 0; frame < 12; frame += 1) {
      game.update(16.7);
      assertHealthy(game);
    }
    if (index % 17 === 0) {
      game.resize(344, 548);
      game.resize(390, 620);
      assertHealthy(game);
    }
  }
  assert.equal(events.filter((event) => event.type === "drop").length, submitted);

  game.reset();
  game.drop(12, -500);
  const throne = activeBodies(game)[0];
  assert.ok(throne.bounds.min.x >= 7, "the widest drop must start fully inside the side wall");
  assert.ok(throne.bounds.max.x <= game.boardWidth - 7, "the widest drop must stay inside the opposite wall");
});

test("kurzer Kontakt an der Gefahrenlinie löst kein Game Over aus, ein voller Kasten schon", () => {
  const { game, events } = createGame();
  const step = (count) => { for (let index = 0; index < count; index += 1) game.update(16.7); };
  game.drop(1, 195);
  step(35);
  assert.equal(events.some((event) => event.type === "game-over"), false);

  game.reset();
  game.resize(200, 300);
  const sequence = [9, 10, 11, 12];
  for (let index = 0; index < 110 && !events.some((event) => event.type === "game-over"); index += 1) {
    game.drop(sequence[index % sequence.length], 100);
    for (let frame = 0; frame < 19; frame += 1) game.update(16.7);
  }
  step(160);
  assert.equal(events.some((event) => event.type === "game-over"), true, "bodies kept above the danger line for 1.5 seconds should end the round");
});
