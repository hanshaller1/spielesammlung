// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright entry point.
// Browser measurements use the actual engine, fixed seed and identical scene setup.
import { createServer } from "vite";
import { writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const baseline = process.argv.includes("--baseline");
if (baseline) {
  await mkdir("work/schatz-profile", { recursive: true });
  let source = execFileSync("git", ["show", "0.4.15:app/schatz-merge/engine.ts"], { encoding: "utf8" });
  source = source.replace('  draw(context:', '  metrics = { physics: 0, background: 0, treasures: 0, particles: 0, preview: 0, steps: 0 };\n  draw(context:')
    .replace('    if (this.gameOver) return;\n    this.accumulator', '    this.metrics.physics = 0; this.metrics.steps = 0;\n    if (this.gameOver) return;\n    this.accumulator')
    .replace('      Engine.update(this.engine, FIXED_STEP_MS);', '      const pt = performance.now();\n      Engine.update(this.engine, FIXED_STEP_MS);\n      this.metrics.physics += performance.now() - pt; this.metrics.steps++;')
    .replace('    const { width, height } = this;', '    let stamp = performance.now();\n    const { width, height } = this;')
    .replace('    for (const body of Composite.allBodies(this.engine.world)) {\n      const meta = this.bodies.get(body.id);\n      if (!meta) continue;\n      this.drawBody', '    this.metrics.background = performance.now() - stamp; stamp = performance.now();\n    for (const body of Composite.allBodies(this.engine.world)) {\n      const meta = this.bodies.get(body.id);\n      if (!meta) continue;\n      this.drawBody')
    .replace('    for (const particle of this.particles) {', '    this.metrics.treasures = performance.now() - stamp; stamp = performance.now();\n    for (const particle of this.particles) {')
    .replace('    if (preview && !this.previewBlockedByPendingDrop) {', '    this.metrics.particles = performance.now() - stamp; stamp = performance.now();\n    if (preview && !this.previewBlockedByPendingDrop) {')
    .replace('  }\n\n  private radiusForTier', '    this.metrics.preview = performance.now() - stamp;\n  }\n\n  private radiusForTier');
  await writeFile("work/schatz-profile/baseline-engine.ts", source);
}
const output = process.env.BENCHMARK_OUTPUT || `work/schatz-profile/${baseline ? "before" : "after"}.json`;
const server = await createServer({ configFile: false, root: process.cwd(), cacheDir: "work/schatz-profile/vite-benchmark", server: { host: "127.0.0.1", port: 5190, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const results = [];
try {
  const profiles = [{ name: "desktop", cpu: 1, dpr: 2 }, { name: "tablet-6x", cpu: 6, dpr: 2 }].filter(p => !process.env.BENCHMARK_PROFILE || p.name === process.env.BENCHMARK_PROFILE);
  const cases = process.env.BENCHMARK_CASES ? process.env.BENCHMARK_CASES.split(",").map(v => Number(v) || v) : [5, 10, 20, 30, "small", "compound", "chains"];
  for (const profile of profiles) {
    if (process.env.BENCHMARK_DPR) profile.renderDpr = Number(process.env.BENCHMARK_DPR);
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: profile.dpr });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
    if (process.env.BENCHMARK_NO_BLUR) await page.addInitScript(() => {
      const descriptor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "shadowBlur");
      Object.defineProperty(CanvasRenderingContext2D.prototype, "shadowBlur", { ...descriptor, set() { descriptor.set.call(this, 0); } });
    });
    await page.goto("http://127.0.0.1:5190/scripts/schatz-merge-benchmark.html");
    await page.waitForFunction(() => !!window.BenchmarkMatter);
    for (const scenario of cases) {
      const result = await page.evaluate(async ({ baseline, scenario, profile }) => {
        const engineModule = await import(baseline ? "/work/schatz-profile/baseline-engine.ts" : "/app/schatz-merge/engine.ts");
        const Matter = window.BenchmarkMatter;
        let seed = 137;
        Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
        const game = new engineModule.SchatzMergeEngine({ onMerge() {}, onGameOver() {}, onDrop() {}, onImpact() {} });
        game.resize(390, 620);
        game.diagnosticsEnabled = true;
        if (!baseline) {
          const { loadTreasureSprites } = await import("/app/schatz-merge/assets.ts");
          const sprites = await loadTreasureSprites("");
          game.setSprites(sprites);
          game.setQuality(profile.name === "desktop" ? "HIGH" : "LOW");
        }
        // Count scenarios keep their bodies, isolating render/solver cost from merging.
        if (scenario !== "chains") game.tryMerge = () => false;
        game.checkForGameOver = () => {};
        const count = typeof scenario === "number" ? scenario : scenario === "compound" ? 6 : 30;
        for (let i = 0; i < count; i++) {
          const tier = scenario === "compound" ? [8, 9, 12][i % 3] : scenario === "small" || scenario === "chains" ? 1 : 1 + i % 6;
          const x = 40 + i % 5 * 75, y = 585 - Math.floor(i / 5) * 70;
          const body = game.createTreasureBody(tier, x, y);
          Matter.Composite.add(game.engine.world, body);
          game.bodies.set(body.id, game.createBodyMeta(tier, body, x, y));
        }
        for (let i = 0; i < 180; i++) game.update(1000 / 60);
        const canvas = document.querySelector("canvas");
        const dpr = profile.renderDpr || (baseline || profile.name === "desktop" ? 2 : 1);
        canvas.width = 390 * dpr; canvas.height = 620 * dpr;
        const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const rows = [];
        let previous = performance.now();
        await new Promise(resolve => {
          const frame = now => {
            const interval = now - previous; previous = now;
            const start = performance.now();
            if (scenario === "chains" && rows.length % 12 === 0) game.drop(1, 195);
            if (rows.length % 60 === 0) for (const body of Matter.Composite.allBodies(game.engine.world)) {
              if (!body.isStatic) { Matter.Sleeping.set(body, false); Matter.Body.setVelocity(body, { x: .2, y: -.4 }); }
            }
            game.update(interval);
            game.draw(ctx, { tier: 3, x: 180 });
            const metrics = game.metrics;
            rows.push({ interval, work: performance.now() - start, ...metrics });
            if (rows.length < 180) requestAnimationFrame(frame); else resolve();
          }; requestAnimationFrame(frame);
        });
        const samples = rows.slice(20);
        const avg = key => samples.reduce((sum, row) => sum + (row[key] || 0), 0) / samples.length;
        const percentile = key => samples.map(row => row[key] || 0).sort((a,b) => a-b)[Math.floor(samples.length * .95)];
        const bodies = Matter.Composite.allBodies(game.engine.world).filter(b => !b.isStatic);
        return { profile: profile.name, scenario, fps: 1000 / avg("interval"), frameMean: avg("interval"), frameP95: percentile("interval"), workMean: avg("work"), workP95: percentile("work"), physics: avg("physics"), background: avg("background"), treasures: avg("treasures"), particles: avg("particles"), preview: avg("preview"), steps: avg("steps"), bodies: bodies.length, parts: bodies.reduce((n,b) => n + (b.parts.length > 1 ? b.parts.length - 1 : 1), 0), particleCount: game.particles.length, canvas: [canvas.width, canvas.height], dpr };
      }, { baseline, scenario, profile });
      results.push(result);
      console.log(JSON.stringify(result));
    }
    await context.close();
  }
  await mkdir("work/schatz-profile", { recursive: true });
  await writeFile(output, JSON.stringify({ date: new Date().toISOString(), engine: baseline ? "0.4.15" : "working-tree", chromium: browser.version(), results }, null, 2));
} finally { await browser.close(); await server.close(); }
