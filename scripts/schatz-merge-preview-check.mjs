import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const browser = await chromium.launch({ headless: true, args: ["--enable-logging=stderr"], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const base = process.env.GAME_URL || "http://127.0.0.1:5174";
const results = [];
try {
  for (const device of [{ name: "desktop", width: 1440, height: 900 }, { name: "tablet", width: 800, height: 1280, touch: true }, { name: "phone", width: 390, height: 844, touch: true }]) {
    const context = await browser.newContext({ viewport: { width: device.width, height: device.height }, hasTouch: !!device.touch, isMobile: !!device.touch });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/schatz-merge?smDebug=1`);
    await page.waitForFunction(() => window.__schatzMerge?.game.sprites.length === 12);
    await page.getByRole("button", { name: "Spiel starten", exact: true }).click();
    await page.evaluate(() => {
      const game = window.__schatzMerge.game;
      const totals = window.__previewCheck = { drops: 0, ready: 0, over: 0, merges: 0, highestTier: 0 };
      for (const [callback, key] of [["onDrop", "drops"], ["onPreviewReady", "ready"], ["onGameOver", "over"], ["onMerge", "merges"]]) {
        const original = game.callbacks[callback];
        game.callbacks[callback] = (...args) => { totals[key]++; if (key === "merges") totals.highestTier = Math.max(totals.highestTier, args[0].nextTier || 12); original?.(...args); };
      }
    });
    const started = Date.now();
    for (let drop = 0; drop < 100; drop++) {
      const before = await page.evaluate(() => ({ ...window.__previewCheck, ...window.__schatzMerge.snapshot() }));
      if (before.gameOver) await page.getByRole("button", { name: "↻ Neu", exact: true }).click();
      const rect = await page.locator(".treasure-canvas").boundingBox();
      // Alternate lanes, edge drops, and center stacks to exercise support shifts.
      const fraction = drop % 23 < 12 ? .5 : [.08, .25, .42, .58, .75, .92][drop % 6];
      if (device.touch) await page.touchscreen.tap(rect.x + rect.width * fraction, rect.y + 40);
      else await page.mouse.click(rect.x + rect.width * fraction, rect.y + 40);
      await page.waitForFunction(() => window.__schatzMerge.snapshot().canDrop || window.__schatzMerge.snapshot().gameOver, null, { timeout: 8000 });
      const after = await page.evaluate(() => ({ ...window.__previewCheck, ...window.__schatzMerge.snapshot() }));
      assert.equal(after.drops - before.drops, 1, "each input must accept exactly one drop");
      assert.equal((after.ready - before.ready) + (after.over - before.over), 1, "each drop finishes ready or game-over exactly once");
      assert.equal(after.uiDropPending, after.previewBlocked);
      assert.equal(after.pendingRecoveries, 0, "normal rounds must not require orphan recovery");
      if (drop === 30) {
        await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
        const paused = await page.evaluate(() => window.__schatzMerge.snapshot());
        assert.equal(paused.mode, "paused");
        await page.getByRole("button", { name: "▶ Weiter", exact: true }).click();
      }
      await page.waitForTimeout(100);
    }
    assert.deepEqual(errors, []);
    const totals = await page.evaluate(() => window.__previewCheck);
    assert.equal(totals.drops, 100);
    assert.ok(totals.merges > 10);
    assert.ok(totals.over > 0);
    results.push({ device: device.name, seconds: (Date.now() - started) / 1000, ...totals, errors });
    console.log(JSON.stringify(results.at(-1)));
    await context.close();
  }
  await mkdir("work/schatz-profile", { recursive: true });
  await writeFile("work/schatz-profile/preview-browser.json", JSON.stringify(results, null, 2));
} finally { await browser.close(); }
