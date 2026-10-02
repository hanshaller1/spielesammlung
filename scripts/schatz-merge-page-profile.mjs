import { pathToFileURL } from "node:url";
import { writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const results=[];
try {
  const context=await browser.newContext({ viewport:{width:800,height:1280},deviceScaleFactor:2,isMobile:true,hasTouch:true });
  const page=await context.newPage();const cdp=await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate",{rate:6});
  await page.goto(`${process.env.GAME_URL || "http://127.0.0.1:5174"}/schatz-merge?smDebug=1`);
  await page.waitForFunction(()=>window.__schatzMerge?.game.sprites.length===12);
  for(const scenario of [{bodies:5,guide:true},{bodies:20,guide:true},{bodies:20,guide:false}]) {
    if(!scenario.guide) await page.getByRole("button",{name:"◆ Schatzfolge",exact:true}).click();
    await page.evaluate(n=>window.__schatzMerge.stress(n),scenario.bodies);
    await page.waitForTimeout(3500);
    const result=await page.evaluate(async()=>{
      const rows=[];let previous=performance.now();
      await new Promise(resolve=>{const frame=now=>{rows.push({interval:now-previous,...window.__schatzMerge.game.metrics});previous=now;if(rows.length<120)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});
      const samples=rows.slice(10);const avg=k=>samples.reduce((n,r)=>n+r[k],0)/samples.length;
      const sorted=samples.map(r=>r.interval).sort((a,b)=>a-b);
      const s=window.__schatzMerge.snapshot();
      return {fps:1000/avg("interval"),frameMean:avg("interval"),frameP95:sorted[Math.floor(sorted.length*.95)],physics:avg("physics"),background:avg("background"),treasures:avg("treasures"),steps:avg("steps"),bodies:s.bodies,parts:s.parts,canvas:s.canvas,dpr:s.dpr,quality:s.quality,deviceDpr:s.deviceDpr,resizes:s.resizes,uiCommits:s.uiCommits};
    });
    results.push({...scenario,...result});console.log(JSON.stringify(results.at(-1)));
  }
  await writeFile("work/schatz-profile/real-page.json",JSON.stringify(results,null,2));
} finally {await browser.close();}
