import { createServer } from "vite";
import Matter from "matter-js";
import { mkdir, writeFile } from "node:fs/promises";
const vite = await createServer({ configFile: false, cacheDir: "work/schatz-profile/vite-tests", server: { middlewareMode: true } });
const { SchatzMergeEngine } = await vite.ssrLoadModule("/app/schatz-merge/engine.ts");
const results = [];
try {
  for (const [position, velocity, sleeping] of [[8,6,true], [10,7,true], [12,8,true], [8,6,false]]) {
    let seed = 619, drops = 0, merges = 0, peakSpeed = 0, peakDepth = 0, persistentDepth = 0, frames = 0, time = 0;
    const random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
    const game = new SchatzMergeEngine({ onMerge() { merges++; }, onDrop() { drops++; }, onGameOver() {}, onImpact() {} });
    game.resize(390,620);
    game.engine.positionIterations = position; game.engine.velocityIterations = velocity; game.engine.enableSleeping = sleeping;
    const durations = new Map();
    const step = () => {
      const start = performance.now(); game.update(1000/60); time += performance.now() - start; frames++;
      const bodies = Matter.Composite.allBodies(game.engine.world).filter(b => !b.isStatic);
      peakSpeed = Math.max(peakSpeed, ...bodies.map(b => b.speed));
      const active = new Set();
      for (const pair of game.engine.pairs.list) {
        if (!pair.isActive || pair.bodyA.isStatic || pair.bodyB.isStatic || !game.bodies.has(pair.bodyA.parent.id) || !game.bodies.has(pair.bodyB.parent.id)) continue;
        const c = Matter.Collision.collides(pair.bodyA, pair.bodyB);
        const depth = c?.depth || 0;
        peakDepth = Math.max(peakDepth, depth);
        if (depth > 3) {
          active.add(pair.id); const duration = (durations.get(pair.id) || 0) + 1; durations.set(pair.id, duration);
          if (duration >= 30) persistentDepth = Math.max(persistentDepth, depth);
        } else durations.delete(pair.id);
      }
      for (const id of durations.keys()) if (!active.has(id)) durations.delete(id);
    };
    for (let i = 0; i < 120; i++) {
      for (let f = 0; f < 240 && game.previewBlockedByPendingDrop && !game.gameOver; f++) step();
      if (game.gameOver) { game.reset(); durations.clear(); }
      game.drop(1 + Math.floor(random()*6), random()*390);
      for (let f = 0; f < 120; f++) step();
    }
    game.diagnosticsEnabled = true;
    game.loadDebugScene(20,"mixed");
    for (let i=0;i<600;i++) game.update(1000/60);
    let steadyTime=0;
    for(let i=0;i<600;i++) {
      if(i%60===0) for(const b of Matter.Composite.allBodies(game.engine.world)) if(!b.isStatic) { Matter.Sleeping.set(b,false); Matter.Body.setVelocity(b,{x:.2,y:-.4}); }
      const start=performance.now(); game.update(1000/60); steadyTime+=performance.now()-start;
    }
    results.push({ position, velocity, sleeping, drops, merges, frames, physicsMsPerFrame: time/frames, steady20PhysicsMs: steadyTime/600, peakSpeed, peakDepth, persistentDepth });
  }
  await mkdir("work/schatz-profile", { recursive: true });
  await writeFile("work/schatz-profile/solver.json", JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
} finally { await vite.close(); }
