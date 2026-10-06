import assert from "node:assert/strict";
import test, { after } from "node:test";
import Matter from "matter-js";
import { createServer } from "vite";
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, ssr: { external: ["matter-js"] }, cacheDir: "work/schatz-profile/vite-tests", server: { middlewareMode: true } });
after(() => vite.close());
const { randomDropTier, SchatzMergeEngine, TREASURES } = await vite.ssrLoadModule("/app/schatz-merge/engine.ts");

function createGame(overrides = {}) {
  const events = [];
  const game = new SchatzMergeEngine({
    onMerge: (event) => events.push({ type: "merge", ...event }),
    onGameOver: () => { events.push({ type: "game-over" }); },
    onDrop: () => { events.push({ type: "drop" }); },
    onPreviewReady: () => { events.push({ type: "preview-ready" }); },
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
    // Matter bounds include a predictive velocity margin even after the contact solver.
    // Physical vertices, rather than that broad-phase margin, establish a wall passage.
    const vertices = (body.parts.length > 1 ? body.parts.slice(1) : [body]).flatMap(part => part.vertices);
    assert.ok(Math.min(...vertices.map(v => v.x)) > -2, `body ${body.id} crossed the left wall`);
    assert.ok(Math.max(...vertices.map(v => v.x)) < game.boardWidth + 2, `body ${body.id} crossed the right wall`);
    assert.ok(Math.max(...vertices.map(v => v.y)) < game.height + 2, `body ${body.id} crossed the floor`);
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
    // A real user cannot drop again until the complete previous figure crossed the line.
    for (let frame = 0; frame < 240 && game.previewBlockedByPendingDrop && !game.gameOver; frame++) game.update(16.7);
    if (game.gameOver) game.reset();
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

test("ein Drop bleibt sichtbar und sperrt Folge-Drops bis vollständig unter der Linie", () => {
  let ready = 0;
  const { game, events } = createGame({ onPreviewReady: () => ready++ });
  game.drop(6, 200);
  const first = activeBodies(game)[0];
  assert.equal(first.position.y, game.spawnY(6) - game.radiusForTier(6) * game.bodies.get(first.id).renderOffsetYFactor);
  game.drop(2, 200);
  assert.equal(activeBodies(game).length, 1);
  for (let i = 0; i < 120 && !ready; i++) {
    const wasWaiting = game.previewBlockedByPendingDrop;
    game.update(1000 / 60);
    if (wasWaiting && first.bounds.min.y <= game.dangerLine) assert.equal(ready, 0);
  }
  assert.equal(ready, 1);
  game.drop(2, 200);
  assert.equal(events.filter(e => e.type === "drop").length, 2);
});

test("nach Support-Merge wachen schlafende Nachbarn auf und fallen mit normaler Gravitation", () => {
  const { game } = createGame();
  const add = (tier, x, y) => {
    const body = game.createTreasureBody(tier, x, y);
    Matter.Composite.add(game.engine.world, body);
    game.bodies.set(body.id, game.createBodyMeta(tier, body, x, y));
    return body;
  };
  const left = add(2, 154, 574), right = add(2, 202, 574);
  const upper = add(1, 250, 527);
  const distant = add(1, 45, 400);
  Matter.Sleeping.set(upper, true); Matter.Sleeping.set(distant, true);
  game.tryMerge(left, right);
  assert.equal(upper.isSleeping, false);
  assert.equal(distant.isSleeping, true, "unaffected support column should remain asleep");
  for (let i = 0; i < 150; i++) game.update(1000 / 60);
  assert.ok(upper.position.y > 560, "unsupported neighbor must fall rather than float");
  assertHealthy(game);
});

test("Particles sind begrenzt, Resize bleibt bei identischer Größe ohne Wirkung, Catch-up maximal drei Schritte", () => {
  const { game } = createGame();
  game.drop(1, 100);
  const body = activeBodies(game)[0], area = body.area, count = game.resizeCount;
  for (let i = 0; i < 100; i++) game.resize(390, 620);
  assert.equal(body.area, area); assert.equal(game.resizeCount, count);
  game.setQuality("LOW");
  for (let i = 0; i < 40; i++) game.spawnParticles(200, 300, 12, true);
  assert.equal(game.particles.length, 24);
  game.update(10000);
  assert.ok(game.metrics.steps <= 3);
  assert.ok(game.accumulator < 1000 / 60);
});

test("adaptive Qualität reagiert auf dauerhafte Last mit Pause zwischen zwei Reduktionen", async () => {
  const { RenderQuality } = await vite.ssrLoadModule("/app/schatz-merge/quality.ts");
  const quality = new RenderQuality();
  for (let i = 0; i < 120; i++) quality.observe(30);
  assert.equal(quality.level, "MEDIUM");
  for (let i = 0; i < 120; i++) quality.observe(30);
  assert.equal(quality.level, "MEDIUM");
  for (let i = 0; i < 600; i++) quality.observe(30);
  assert.equal(quality.level, "LOW");
  const fixed = new RenderQuality("HIGH");
  for (let i = 0; i < 1000; i++) fixed.observe(40);
  assert.equal(fixed.level, "HIGH");
});

test("Frame-Diagnose startet ohne erfundene FPS und hält höchstens 600 Messungen", async () => {
  const { FrameProfiler } = await vite.ssrLoadModule("/app/schatz-merge/performance.ts");
  const profiler = new FrameProfiler();
  assert.equal(profiler.snapshot().fps, 0);
  const metrics = { physics: 1, background: 2, treasures: 3, particles: 4, preview: 5, steps: 1 };
  for (let i = 0; i < 1000; i++) profiler.record(1000 / 60, 15, metrics);
  const result = profiler.snapshot();
  assert.equal(result.samples, 600);
  assert.ok(Math.abs(result.fps - 60) < .001);
  assert.equal(result.workP95, 15);
  assert.equal(result.physics, 1);
  assert.equal(result.preview, 5);
});

test("600 gültige Drops über sechs Läufe: keine NaN-Werte, Durchgänge oder explosive Geschwindigkeiten", () => {
  let seed = 619;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  let drops = 0, merges = 0, maximumSpeed = 0;
  for (let run = 0; run < 6; run++) {
    const { game } = createGame({ onMerge: () => merges++, onDrop: () => drops++ });
    game.resize(run % 2 ? 344 : 390, run % 2 ? 548 : 620);
    for (let drop = 0; drop < 100; drop++) {
      for (let frame = 0; frame < 240 && game.previewBlockedByPendingDrop && !game.gameOver; frame++) game.update(1000 / 60);
      if (game.gameOver) game.reset();
      game.drop(1 + Math.floor(random() * 6), random() * game.boardWidth);
      for (let frame = 0; frame < 100; frame++) {
        game.update(1000 / 60);
        maximumSpeed = Math.max(maximumSpeed, ...activeBodies(game).map(b => b.speed));
        assertHealthy(game);
      }
    }
  }
  assert.equal(drops, 600);
  assert.ok(merges > 100);
  assert.ok(maximumSpeed < 25, `maximum speed ${maximumSpeed}`);
});

test("alle zwölf Collider bleiben nach seitlichen Kontakten und Ruhephase stabil", () => {
  for (let tier = 1; tier <= 12; tier++) {
    const { game } = createGame();
    game.drop(tier, tier % 2 ? 0 : 390);
    for (let frame = 0; frame < 420; frame++) { game.update(1000 / 60); assertHealthy(game); }
    const body = activeBodies(game)[0];
    assert.ok(body.isSleeping, `tier ${tier} should settle instead of oscillating forever`);
    assert.ok(body.parts.length <= 4, "compound complexity must remain small");
    assert.ok(Matter.Query.collides(body, game.walls).every(c => c.depth < 1), "settled floor/wall penetration must stay below one pixel");
  }
});

test("alle sechs Drop-Grafiken passen vollständig über die rote Linie; Rendergröße und Collider sind konsistent", () => {
  const { game } = createGame();
  for (let tier = 1; tier <= 12; tier++) {
    const body = game.createTreasureBody(tier, 195, 300);
    const meta = game.createBodyMeta(tier, body, 195, 300);
    const image = { tier };
    game.setSprites(Array.from({ length: 12 }, () => image));
    let rectangle;
    game.drawSprite({ drawImage: (_image,_sx,_sy,_sw,_sh,x,y,width,height) => { rectangle={x,y,width,height}; } },tier,195,300);
    const physical = game.physicalBounds(body);
    assert.ok(physical.min.x >= rectangle.x - 1 && physical.max.x <= rectangle.x + rectangle.width + 1);
    assert.ok(physical.min.y >= rectangle.y - 1 && physical.max.y <= rectangle.y + rectangle.height + 1);
    assert.ok(Math.abs(body.position.x + meta.renderOffsetXFactor * game.radiusForTier(tier) - 195) < 1e-8);
    assert.ok(Math.abs(body.position.y + meta.renderOffsetYFactor * game.radiusForTier(tier) - 300) < 1e-8);
    if (tier <= 6) assert.ok(game.spawnY(tier) + rectangle.height / 2 < game.dangerLine);
  }
});

test("Shuffle-Bag bleibt gleichverteilt auf Stufen 1 bis 6 begrenzt", async () => {
  const { DropShuffleBag } = await vite.ssrLoadModule("/app/schatz-merge/drop-shuffle-bag.ts");
  let seed=199;
  const bag=new DropShuffleBag(()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296));
  let previous=0, streak=0, maximum=0;
  for(let pool=0;pool<100;pool++) {
    const items=Array.from({length:6},()=>bag.next());
    assert.deepEqual([...items].sort(),[1,2,3,4,5,6]);
    for(const tier of items) { streak=tier===previous?streak+1:1; maximum=Math.max(maximum,streak); previous=tier; }
  }
  assert.ok(maximum <= 2);
});


function addTreasure(game, tier, x = 195, y = 300) {
  const body = game.createTreasureBody(tier, x, y);
  Matter.Composite.add(game.engine.world, body);
  game.bodies.set(body.id, game.createBodyMeta(tier, body, x, y));
  return body;
}
function assertPendingInvariant(game) {
  const snapshot = game.debugSnapshot();
  if (!snapshot.gameOver && snapshot.previewBlocked) {
    assert.equal(snapshot.awaitingPreviewAfterDrop, 1, "one live blocker owns the accepted drop");
    assert.notEqual(snapshot.pendingBodyId, null);
    assert.ok(Math.min(snapshot.physicalTop, snapshot.visualTop) <= snapshot.dangerLine + snapshot.lineClearance);
    assert.equal(snapshot.canDrop, false);
  } else {
    assert.equal(snapshot.awaitingPreviewAfterDrop, 0);
    assert.equal(snapshot.previewBlocked, false);
  }
}
function steps(game, count) {
  for (let frame = 0; frame < count; frame++) { game.update(1000 / 60); assertPendingInvariant(game); }
}

test("direkter Merge des ursprünglichen Drops gibt Preview genau einmal frei", () => {
  const { game, events } = createGame();
  assert.equal(game.drop(2, 195), true);
  assert.equal(game.drop(2, 195), false, "rejected input cannot consume another preview");
  const original = activeBodies(game)[0];
  const partner = addTreasure(game, 2, 195, 300);
  Matter.Body.setPosition(original, { x: 195, y: 300 });
  assert.equal(game.tryMerge(original, partner), true);
  assert.equal(game.bodies.has(original.id), false);
  steps(game, 180);
  assert.equal(events.filter(e => e.type === "preview-ready").length, 1);
  assert.equal(game.canDrop, true);
});

test("Kettenmerge nach ursprünglicher Überquerung vergrößert die Drop-Sperre nicht erneut", () => {
  const { game, events } = createGame();
  game.drop(1, 195);
  let original = activeBodies(game)[0];
  Matter.Body.translate(original, { x: 0, y: game.dangerLine + 1 - game.lineTops(original, game.bodies.get(original.id)).top });
  for (let tier = 1; tier <= 8; tier++) {
    const partner = addTreasure(game, tier, original.position.x, original.position.y);
    game.tryMerge(original, partner);
    original = activeBodies(game)[0];
  }
  assert.ok(game.lineTops(original, game.bodies.get(original.id)).top < game.dangerLine, "larger successor grew back above line");
  game.update(1000 / 60);
  assert.equal(game.canDrop, true, "clearance cannot be revoked by subsequent growth");
  assert.equal(events.filter(e => e.type === "preview-ready").length, 1);
  steps(game, 180);
  assert.equal(events.filter(e => e.type === "preview-ready").length, 1);
});

test("Merge und Kettenmerge vor der Überquerung behalten nur einen tatsächlichen Blocker", () => {
  const { game, events } = createGame();
  game.drop(1, 195);
  let blocker = activeBodies(game)[0];
  for (let tier = 1; tier <= 6; tier++) {
    const partner = addTreasure(game, tier, blocker.position.x, blocker.position.y);
    game.tryMerge(blocker, partner);
    blocker = activeBodies(game)[0];
    assertPendingInvariant(game);
  }
  Matter.Sleeping.set(blocker, true);
  steps(game, 180);
  assert.equal(game.gameOver, true, "settled near-line successor must end the round");
  assert.equal(events.filter(e => e.type === "game-over").length, 1);
  assert.equal(events.filter(e => e.type === "preview-ready").length, 0);
  assert.equal(game.drop(1, 100), false);
});

test("Regression: gedrehter schlafender Beutel hat Collider unter, Grafik über der Linie", () => {
  const { game, events } = createGame();
  game.drop(6, 195);
  const body = activeBodies(game)[0];
  Matter.Body.setAngle(body, Math.PI / 4);
  Matter.Body.translate(body, { x: 0, y: game.dangerLine + 1 - body.bounds.min.y });
  Matter.Sleeping.set(body, true);
  const snapshot = game.debugSnapshot();
  assert.ok(snapshot.physicalTop > snapshot.dangerLine);
  assert.ok(snapshot.visualTop < snapshot.dangerLine);
  steps(game, 360);
  assert.equal(game.gameOver, true, "old code stayed blocked forever with no game-over");
  assert.equal(events.filter(e => e.type === "game-over").length, 1);
});

test("Sleeping unterhalb der Linie gibt frei; subpixel Solver-Jitter verhindert Game Over nicht", () => {
  const { game, events } = createGame();
  game.drop(6, 195);
  const body = activeBodies(game)[0];
  Matter.Body.translate(body, { x: 0, y: game.dangerLine + 3 - game.lineTops(body, game.bodies.get(body.id)).top });
  Matter.Sleeping.set(body, true);
  game.update(1000 / 60);
  assert.equal(game.canDrop, true);
  assert.equal(events.filter(e => e.type === "preview-ready").length, 1);
  game.reset();
  game.drop(6, 195);
  const blocked = activeBodies(game)[0];
  for (let frame = 0; frame < 180 && !game.gameOver; frame++) {
    const top = game.lineTops(blocked, game.bodies.get(blocked.id)).top;
    Matter.Body.translate(blocked, { x: 0, y: game.dangerLine + (frame % 2 ? .2 : -.2) - top });
    Matter.Sleeping.set(blocked, true);
    game.update(1000 / 60);
    assertPendingInvariant(game);
  }
  assert.equal(game.gameOver, true);
});

test("terminaler Merge entfernt Pending vollständig, ohne auf Nachfolger zu warten", () => {
  const { game, events } = createGame();
  game.drop(12, 195);
  const body = activeBodies(game)[0];
  const partner = addTreasure(game, 12, body.position.x, body.position.y);
  assert.equal(game.tryMerge(body, partner), true);
  steps(game, 180);
  assert.equal(activeBodies(game).length, 0);
  assert.equal(game.canDrop, true);
  assert.equal(events.filter(e => e.type === "preview-ready").length, 1);
});

test("verwaister Pending-Body oder Metadatensatz wird zustandsbasiert einmalig freigegeben", () => {
  for (const remove of ["body", "metadata"]) {
    const { game, events } = createGame();
    game.drop(1, 195);
    const body = activeBodies(game)[0];
    if (remove === "body") Matter.Composite.remove(game.engine.world, body);
    else game.bodies.delete(body.id);
    steps(game, 20);
    const snapshot = game.debugSnapshot();
    assert.equal(game.canDrop, true);
    assert.equal(snapshot.pendingRecoveries, 1);
    assert.match(snapshot.lastPendingRecovery, /Missing pending/);
    assert.equal(events.filter(e => e.type === "preview-ready").length, 1);
  }
});

test("Preview-Gate besitzt keinen festen Timeout für einen noch gültigen Drop", () => {
  const { game, events } = createGame();
  game.drop(6, 195);
  game.elapsed = 10000;
  game.updatePreviewGate();
  assert.equal(game.canDrop, false);
  assert.equal(game.debugSnapshot().pendingRecoveries, 0);
  assert.equal(events.filter(e => e.type === "preview-ready").length, 0);
  assertPendingInvariant(game);
  game.reset();
  assert.equal(game.canDrop, true);
});

test("400 zufällige Drops: Invariante pro Frame, binnen 6 Simulationssekunden ready oder Game Over", () => {
  let seed = 4716, ready = 0, over = 0, merges = 0;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const { game } = createGame({ onPreviewReady: () => ready++, onGameOver: () => over++, onMerge: () => merges++ });
  for (let drop = 0; drop < 400; drop++) {
    if (game.gameOver) game.reset();
    if (drop % 37 === 0) game.resize(drop % 2 ? 344 : 390, drop % 2 ? 548 : 620);
    const beforeReady = ready, beforeOver = over;
    assert.equal(game.drop(1 + Math.floor(random() * 6), random() * game.boardWidth), true);
    for (let frame = 0; frame < 360 && !game.canDrop && !game.gameOver; frame++) {
      game.update(1000 / 60);
      assertPendingInvariant(game);
      assertHealthy(game);
    }
    assert.ok(game.canDrop || game.gameOver, `drop ${drop} stuck: ${JSON.stringify(game.debugSnapshot())}`);
    assert.equal((ready - beforeReady) + (over - beforeOver), 1, "exactly one lifecycle completion");
    steps(game, 35);
  }
  assert.ok(over > 0, "must exercise full boards without stress bypass");
  assert.ok(merges > 100, "must exercise many merges");
  assert.equal(game.debugSnapshot().pendingRecoveries, 0, "normal physics must need no failsafe");
});
