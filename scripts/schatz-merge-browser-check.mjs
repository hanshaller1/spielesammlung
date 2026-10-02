import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const base = process.env.GAME_URL || "http://127.0.0.1:5174";
const results = [];
await mkdir("work/schatz-profile", { recursive: true });
try {
  for (const device of [{ name: "desktop", width: 1440, height: 900, dpr: 1 }, { name: "tablet", width: 800, height: 1280, dpr: 2, touch: true }, { name: "phone", width: 390, height: 844, dpr: 3, touch: true }]) {
    const context = await browser.newContext({ viewport: { width: device.width, height: device.height }, deviceScaleFactor: device.dpr, hasTouch: !!device.touch, isMobile: !!device.touch });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/schatz-merge?smDebug=1`);
    await page.waitForFunction(() => window.__schatzMerge?.game.sprites.length === 12);
    await page.waitForFunction(() => [...document.images].filter(i=>i.src.includes("/treasures/")).every(i=>i.complete && i.naturalWidth === 362));
    await page.getByRole("button", { name: "Spiel starten", exact: true }).click();
    await page.waitForFunction(() => [...document.images].filter(i=>i.src.includes("/treasures/")).every(i=>i.complete && i.naturalWidth === 362));
    const layout = async () => page.evaluate(() => {
      const board = document.querySelector(".treasure-board").getBoundingClientRect();
      const cards = [...document.querySelectorAll(".treasure-current-card,.treasure-next-card")].map(e => { const r = e.getBoundingClientRect(); return [r.width,r.height]; });
      return { board: [board.x,board.y,board.width,board.height], cards, overflowX: document.documentElement.scrollWidth > innerWidth, overflowY: document.documentElement.scrollHeight > innerHeight + 1, images: [...document.images].filter(i=>i.src.includes("/treasures/")).every(i=>i.complete && i.naturalWidth === 362) };
    });
    const open = await layout();
    await page.getByRole("button", { name: "◆ Schatzfolge", exact: true }).click();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const closed = await layout();
    console.log(JSON.stringify({device:device.name,open,closed}));
    assert.equal(open.overflowX,false); assert.equal(open.overflowY,false);
    assert.equal(closed.overflowX,false); assert.equal(closed.overflowY,false);
    assert.deepEqual(open.cards,closed.cards); assert.deepEqual(open.cards[0],open.cards[1]);
    // The existing portrait tablet layout changes its CSS board width on guide toggle.
    // This performance patch must not silently replace that layout.
    if (device.name !== "tablet") {
      assert.ok(Math.abs(open.board[2]-closed.board[2]) < .5); assert.ok(Math.abs(open.board[3]-closed.board[3]) < .5);
    }
    if (device.name === "phone") assert.ok(Math.abs(open.board[0]-closed.board[0]) < .5);
    assert.equal(open.images,true);
    await page.getByRole("button", { name: "◆ Schatzfolge", exact: true }).click();
    const rect = await page.locator(".treasure-canvas").boundingBox();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: rect.x+rect.width*.3, y:rect.y+50, id:1 }, { x:rect.x+rect.width*.6,y:rect.y+60,id:2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const released = await page.evaluate(() => window.__schatzMerge.snapshot());
    assert.equal(released.bodies,1, "simultaneous two-finger release must create exactly one body");
    assert.equal(released.pendingDrop,true);
    await page.waitForFunction(() => !window.__schatzMerge.snapshot().pendingDrop);
    const audioPeak=await page.evaluate(()=>{
      for(let i=0;i<40;i++) window.__schatzMerge.game.callbacks.onMerge({tier:1,nextTier:2,points:10,x:100,y:400,terminal:false});
      return window.__schatzMerge.snapshot().audioVoices;
    });
    assert.ok(audioPeak<=24);
    await page.waitForFunction(()=>window.__schatzMerge.snapshot().audioVoices===0);
    await page.screenshot({ path: `work/schatz-profile/${device.name}.png` });
    assert.deepEqual(errors,[]);
    results.push({ device:device.name, open,closed,released,audioPeak,final:await page.evaluate(()=>window.__schatzMerge.snapshot()) });
    await context.close();
  }
  const page = await browser.newPage(), routeResults=[], routeErrors=[];
  page.on("pageerror",error=>routeErrors.push(error.message));
  for (const route of ["/","/fang-den-stern","/fange-die-tiere","/zwerge","/schatz-merge"]) {
    const response=await page.goto(`${base}${route}`); await page.waitForLoadState("networkidle");
    assert.equal(response.status(),200);
    assert.ok(await page.locator("h1").count());
    assert.equal(await page.evaluate(()=>!!window.__schatzMerge),false);
    let started=false;
    if(route !== "/") {
      await page.getByRole("button",{name:"Spiel starten",exact:true}).click();
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.equal(await page.getByRole("button",{name:"Spiel starten",exact:true}).count(),0);
      started=true;
    }
    routeResults.push({route,status:response.status(),title:await page.locator("h1").first().textContent(),started});
  }
  assert.deepEqual(routeErrors,[]);
  await writeFile("work/schatz-profile/browser-check.json",JSON.stringify({devices:results,routes:routeResults},null,2));
  console.log(JSON.stringify({devices:results,routes:routeResults},null,2));
} finally { await browser.close(); }
