// The scenery uses the same 400 × 560 world coordinates as the route and its actors.
type Brush = CanvasRenderingContext2D;
type Opening = { center: number; width: number };
type TrailSegment = Opening & { y: number; detailSeed: number; corner: boolean; trailIndex?: number };
type OpeningAt = (y: number) => Opening;

const TAU = 2 * Math.PI;
const daylight = {
  deep: "#123c37", moss: "#346850", leaf: "#548a52", leafLight: "#94b968",
  needle: "#2b654c", needleTip: "#62935e", bark: "#644c37", barkLight: "#be9360",
  bank: "#809f57", earth: "#705238", path: "#c1975e", pathLight: "#dcb77e",
  water: "#248b9a", pool: "#155b72", ripple: "#acf7df", glow: "#ffe9a0",
  plank: "#b7824e", plankAlt: "#c29257", plankEdge: "#f2c98a", rope: "#e2bf89",
};
const moonlight: typeof daylight = {
  deep: "#101c37", moss: "#233b50", leaf: "#35566a", leafLight: "#6a8990",
  needle: "#243953", needleTip: "#516680", bark: "#494155", barkLight: "#91859a",
  bank: "#586579", earth: "#4d4a61", path: "#8b8291", pathLight: "#afa0a6",
  water: "#377ca6", pool: "#203c6b", ripple: "#9de5f8", glow: "#c5e9ff",
  plank: "#8c7580", plankAlt: "#a38a88", plankEdge: "#d5bfad", rope: "#b1beca",
};
type Palette = typeof daylight;

function ellipse(c: Brush, x: number, y: number, rx: number, ry: number, color: string, angle = 0) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, angle, 0, TAU);
  c.fill();
}

function diamond(c: Brush, x: number, y: number, radius: number, color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y - radius);
  c.quadraticCurveTo(x + 1, y - 1, x + radius * .7, y);
  c.quadraticCurveTo(x + 1, y + 1, x, y + radius);
  c.quadraticCurveTo(x - 1, y + 1, x - radius * .7, y);
  c.quadraticCurveTo(x - 1, y - 1, x, y - radius);
  c.fill();
}

function tree(c: Brush, x: number, y: number, size: number, p: Palette, fir: boolean) {
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  ellipse(c, 5, 9, 21, 10, "#07171555", -.15);
  c.fillStyle = p.bark;
  c.fillRect(-3, -12, 7, 23);
  c.fillStyle = p.barkLight;
  c.fillRect(-2, -8, 2, 18);
  if (fir) {
    for (let tier = 0; tier < 3; tier++) {
      const w = 23 - tier * 5, y = 2 - tier * 12;
      c.fillStyle = tier === 0 ? p.deep : p.needle;
      c.beginPath();
      c.moveTo(-w, y);
      c.quadraticCurveTo(-w * .38, y - 10, -1, y - 27);
      c.quadraticCurveTo(w * .65, y - 7, w, y);
      c.lineTo(w * .25, y - 2); c.lineTo(3, y + 3); c.lineTo(-5, y - 1);
      c.closePath(); c.fill();
      c.strokeStyle = p.needleTip; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-w + 4, y - 2); c.quadraticCurveTo(-w * .45, y - 10, -1, y - 24); c.stroke();
    }
  } else {
    ellipse(c, 2, -15, 25, 20, p.deep, -.2);
    ellipse(c, -9, -19, 16, 13, p.leaf, -.3);
    ellipse(c, 9, -23, 15, 15, p.moss, .2);
    ellipse(c, -2, -31, 15, 11, p.leaf, -.35);
    ellipse(c, -8, -35, 8, 3, p.leafLight, -.4);
    ellipse(c, -18, -21, 5, 2, p.leafLight, -.65);
  }
  c.restore();
}

function drawCrossing(c: Brush, y: number, seed: number, now: number, p: Palette, openingAt: OpeningAt) {
  const offset = seed * TAU;
  const waterline = (x: number) => y + 13 * Math.sin(x / 73 + offset) + 5 * Math.sin(x / 37);
  const ribbon = (half: number, color: string) => {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(-10, waterline(-10) - half);
    for (let x = 0; x <= 420; x += 10) c.lineTo(x, waterline(x) - half);
    for (let x = 420; x >= -10; x -= 10) c.lineTo(x, waterline(x) + half);
    c.closePath(); c.fill();
  };
  ribbon(25, p.earth);
  ribbon(22, p.water);
  ribbon(15, p.pool);
  c.strokeStyle = p.ripple; c.lineWidth = 1.25; c.beginPath();
  for (let i = 0; i < 30; i++) {
    const x = (i * 47 + now * .035 + seed * 240) % 435 - 22;
    const h = waterline(x) + Math.sin(i * 8 + now / 650) * 11;
    c.moveTo(x, h);
    c.quadraticCurveTo(x + 5, h + 2.4, x + 10 + (i % 4), h - 1);
  }
  c.stroke();

  // The deck and both rails follow the collision boundaries even on a sharp bend.
  const edge = (py: number, side: number) => {
    const { center, width } = openingAt(py);
    return center + side * (width / 2 + 3);
  };
  for (let i = 0; i < 11; i++) {
    const top = y - 49.5 + i * 9;
    const bottom = top + 9;
    const l = edge(top, -1), r = edge(top, 1);
    c.fillStyle = i % 3 === 0 ? p.plankAlt : p.plank;
    c.beginPath(); c.moveTo(l, top); c.lineTo(r, top);
    c.lineTo(edge(bottom, 1), bottom + .5); c.lineTo(edge(bottom, -1), bottom + .5); c.closePath(); c.fill();
    c.lineWidth = 1.7; c.strokeStyle = p.earth; c.beginPath();
    c.moveTo(l, top); c.lineTo(r, top + .3); c.stroke();
    c.lineWidth = .9; c.strokeStyle = p.plankEdge; c.beginPath();
    c.moveTo(l + 4, top + 2); c.lineTo(r - 5, top + 2); c.stroke();
    const knot = l + (r - l) * (.18 + ((i * .31 + seed) % .64));
    ellipse(c, knot, top + 5, 4.5, 1.1, p.earth);
    c.fillStyle = p.earth;
    c.fillRect(l + 6, top + 4, 2, 2); c.fillRect(r - 8, top + 4, 2, 2);
  }
  for (const side of [-1, 1]) {
    let lastX = 0, lastY = 0;
    for (let i = 0; i < 4; i++) {
      const py = y - 47 + i * 31, px = edge(py, side) + side * 2;
      c.fillStyle = p.bark; c.fillRect(px - 3, py - 10, 6, 14);
      ellipse(c, px, py - 10, 3.5, 2.1, p.plankEdge);
      if (i > 0) {
        c.strokeStyle = p.rope; c.lineWidth = 2; c.beginPath();
        c.moveTo(lastX, lastY - 9); c.quadraticCurveTo((lastX + px) / 2 - side * 2, (lastY + py) / 2 - 3, px, py - 9); c.stroke();
      }
      lastX = px; lastY = py;
    }
  }
}

function traceTrailBank(c: Brush, segments: readonly TrailSegment[], side: -1 | 1) {
  const left = side === -1;
  const start = left ? 0 : segments.length - 1;
  let from = segments[start];
  if (!from) return;
  let x = from.center + side * from.width / 2;
  if (left) c.moveTo(x, from.y);
  else c.lineTo(x, from.y);
  for (let step = 1; step < segments.length; step++) {
    const to = segments[left ? step : start - step];
    const endX = to.center + side * to.width / 2;
    if ((left ? from : to).corner) {
      // With linear y, these controls reproduce the collision curve t²(3 − 2t).
      const third = (to.y - from.y) / 3;
      c.bezierCurveTo(x, from.y + third, endX, to.y - third, endX, to.y);
    } else {
      c.lineTo(endX, to.y);
    }
    from = to;
    x = endX;
  }
}

export function drawForestGround(c: Brush, segments: readonly TrailSegment[], world: number, now: number, openingAt: OpeningAt) {
  const night = world === 4;
  const p = night ? moonlight : daylight;
  c.save();
  c.fillStyle = p.moss; c.fillRect(-8, -8, 416, 576);
  // Draw the route outline once and reuse it for the raised bank and path.
  c.beginPath();
  traceTrailBank(c, segments, -1);
  traceTrailBank(c, segments, 1);
  c.closePath();
  c.lineJoin = "round";
  c.strokeStyle = p.bank; c.lineWidth = 13; c.stroke();
  c.strokeStyle = p.earth; c.lineWidth = 4; c.stroke();
  const dust = c.createLinearGradient(8, 0, 384, 310);
  dust.addColorStop(0, p.path); dust.addColorStop(.45, p.pathLight); dust.addColorStop(1, p.path);
  c.fillStyle = dust; c.fill();

  for (const s of segments) {
    const i = s.trailIndex ?? 0, seed = s.detailSeed;
    const left = s.center - s.width / 2, right = s.center + s.width / 2;
    for (const side of [-1, 1]) {
      const x = side < 0 ? left : right;
      tree(c, x + side * (25 + seed * 15), s.y + seed * 4, .84 + seed * .22, p, night || i % 4 === 0);
      if (x < 45 || x > 355) continue;
      tree(c, x + side * (74 + seed * 10), s.y + 12, 1 + seed * .23, p, night);
    }
    // Low-contrast leaf litter and pools of light track the ground as it scrolls.
    const glade = left + (.18 + seed * .64) * s.width;
    if (i % 3 === 0) {
      c.save(); c.translate(glade, s.y); c.rotate(-.42); c.scale(1, .28);
      const light = c.createRadialGradient(0, 0, 2, 0, 0, 42);
      light.addColorStop(0, night ? "#b9daff26" : "#ffe7a458"); light.addColorStop(1, "#fff7bf00");
      c.fillStyle = light; c.fillRect(-42, -42, 84, 84); c.restore();
    }
    for (let leaf = 0; leaf < 3; leaf++) {
      const phase = (seed * 19 + leaf * .37) % 1;
      const x = leaf % 2 ? right - 4 - phase * 15 : left + 4 + phase * 15;
      ellipse(c, x, s.y + phase * 22 - 11, 4.8, 1.7, night ? "#666978" : "#ad894a", phase * 2 - 1);
    }
    const pebble = left + (.08 + seed * .72) * s.width;
    ellipse(c, pebble, s.y + 2, 2.8, 1.4, p.path);
    ellipse(c, pebble + 5, s.y - 1, 1.5, .9, p.path);
    const flowerX = i % 2 === 0 ? left - 4 : right + 4;
    c.strokeStyle = p.leaf; c.lineWidth = 1.5; c.beginPath();
    c.moveTo(flowerX - 5, s.y + 7); c.lineTo(flowerX - 2, s.y + 2); c.lineTo(flowerX, s.y + 9); c.lineTo(flowerX + 3, s.y); c.stroke();
    if (i % 3 === 0) {
      ellipse(c, flowerX + 3, s.y, 2.7, 1.8, night ? "#ccb7ef" : "#fff1bc");
      ellipse(c, flowerX - 5, s.y + 3, 1.8, 1.6, night ? "#91bbe4" : "#f4c57d");
    }
  }
  // A crossing clips the screen before its anchor segment scrolls into view.
  // Extrapolating one segment on each end keeps a bridge from popping in.
  const first = segments[0], last = segments.at(-1);
  if (first && last) {
    const interval = night ? 17 : 15;
    for (let index = (last.trailIndex ?? 0) - 2; index <= (first.trailIndex ?? 0) + 2; index++) {
      if ((index - 7) % interval !== 0) continue;
      const h = first.y + ((first.trailIndex ?? 0) - index) * 34;
      if (h < -55 || h > 615) continue;
      drawCrossing(c, h, Math.abs(Math.sin(index * 13.17)), now, p, openingAt);
    }
  }

  for (const s of segments) {
    if ((s.trailIndex ?? 0) % 3 !== 0) continue;
    const side = (s.trailIndex ?? 0) % 2 ? -1 : 1;
    const phase = now / 850 + s.detailSeed * TAU;
    const x = s.center + side * (s.width / 2 + 13) + Math.sin(phase) * 9;
    const y = s.y - 8 + Math.cos(phase * .78) * 6;
    c.globalAlpha = .48 + .3 * Math.sin(phase);
    if (night) {
      ellipse(c, x, y, 4.3, 4.3, "#9ddbca55");
      diamond(c, x, y, 2.8, p.glow);
    } else {
      ellipse(c, x, y, 3.3, 1.5, "#ffe7a1", Math.sin(phase) * .7);
    }
  }
  c.restore();
}

export function drawForestArena(c: Brush, world: number, now: number) {
  const night = world === 4;
  const p = night ? moonlight : daylight;
  c.save();
  const sky = c.createLinearGradient(0, 0, 0, 560);
  sky.addColorStop(0, night ? "#171933" : "#84b9a2");
  sky.addColorStop(.46, night ? "#39516c" : "#c0c88a"); sky.addColorStop(1, p.deep);
  c.fillStyle = sky; c.fillRect(-8, -8, 416, 576);
  const halo = c.createRadialGradient(308, 81, 4, 308, 81, 89);
  halo.addColorStop(0, night ? "#e7e8ff99" : "#fff7b899"); halo.addColorStop(1, "#ffffff00");
  c.fillStyle = halo; c.fillRect(216, -10, 187, 184);
  ellipse(c, 308, 81, 20, 20, night ? "#f5ecff" : "#ffedaa");
  if (night) {
    ellipse(c, 315, 76, 15, 16, "#545477");
    for (let i = 0; i < 15; i++) diamond(c, (i * 69 + 17) % 399, (i * 31) % 140, 1.2 + (i % 3) * .5, "#d8e7f5");
  }
  for (let i = 0; i < 11; i++) {
    const x = i * 42 - 10, y = 150 + Math.sin(i * 1.7) * 10;
    tree(c, x, y, 1.2 + (i % 4) * .25, p, true);
  }
  const floor = c.createLinearGradient(0, 145, 0, 560);
  floor.addColorStop(0, p.moss); floor.addColorStop(.46, night ? "#3b4a62" : "#808c5e"); floor.addColorStop(1, p.deep);
  c.fillStyle = floor; c.fillRect(-8, 149, 416, 419);
  for (let i = 0; i < 7; i++) {
    const y = i * 78 + 137;
    tree(c, 14 - i % 2 * 11, y, 1.45, p, night);
    tree(c, 391 + i % 2 * 8, y + 27, 1.65, p, night);
  }
  // Low river behind the enemy, with standing stones at its bank.
  c.beginPath(); c.moveTo(19, 173);
  c.bezierCurveTo(114, 166, 229, 196, 382, 155); c.lineTo(384, 169);
  c.bezierCurveTo(225, 212, 99, 177, 19, 184); c.closePath(); c.fillStyle = p.water; c.fill();
  c.strokeStyle = p.ripple; c.lineWidth = 1; c.beginPath();
  for (let i = 0; i < 14; i++) {
    const x = 22 + ((i * 45 + now * .026) % 348);
    const y = 177 + 9 * Math.sin(Math.PI * x / 390) - 18 * (x / 390) ** 4;
    c.moveTo(x, y); c.quadraticCurveTo(x + 5, y - 1, x + 9, y);
  }
  c.stroke();
  for (const side of [-1, 1]) {
    const x = 200 + side * 151;
    c.fillStyle = night ? "#50657c" : "#70795b"; c.strokeStyle = p.deep; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - 10, 167); c.lineTo(x - 7, 128); c.lineTo(x + 1, 119);
    c.lineTo(x + 8, 128); c.lineTo(x + 11, 167); c.closePath(); c.fill(); c.stroke();
    diamond(c, x, 139, 5, p.glow);
  }
  c.restore();
}

function drawAlder(c: Brush, now: number, enraged: boolean) {
  const sway = Math.sin(now / 540) * 2.6;
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1);
    c.strokeStyle = "#382b26"; c.lineWidth = 13; c.lineCap = "round";
    c.beginPath(); c.moveTo(17, 10); c.quadraticCurveTo(39, 4 + sway, 41, -21 + sway); c.stroke();
    c.strokeStyle = "#8d6947"; c.lineWidth = 7; c.stroke();
    c.strokeStyle = "#795c42"; c.lineWidth = 4; c.beginPath();
    c.moveTo(39, -8 + sway); c.lineTo(49, -17 + sway); c.lineTo(51, -25 + sway); c.stroke();
    ellipse(c, 42, -24 + sway, 10, 6, "#799656", -.6);
    c.restore();
  }
  const bark = c.createLinearGradient(-29, 0, 28, 0);
  bark.addColorStop(0, "#543f30"); bark.addColorStop(.4, "#b99161"); bark.addColorStop(.72, "#886242"); bark.addColorStop(1, "#413c31");
  c.fillStyle = bark; c.strokeStyle = "#362d26"; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-24, -23); c.quadraticCurveTo(-21, 13, -35, 36);
  c.lineTo(-17, 32); c.lineTo(-10, 40); c.lineTo(-1, 31); c.lineTo(11, 39); c.lineTo(18, 30); c.lineTo(33, 34);
  c.quadraticCurveTo(19, 9, 25, -25); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = "#66482f"; c.lineWidth = 2; c.beginPath();
  c.moveTo(-18, -12); c.quadraticCurveTo(-9, 12, -22, 28); c.moveTo(17, -19); c.quadraticCurveTo(10, -4, 17, 22);
  c.moveTo(-6, 17); c.quadraticCurveTo(0, 22, -1, 30); c.stroke();
  ellipse(c, -13, -27, 20, 13, "#315944", -.3);
  ellipse(c, 7, -35, 24, 15, "#508153", .05);
  ellipse(c, -4, -43, 15, 8, "#89a658", -.25);
  ellipse(c, 23, -24, 11, 9, "#3b714c");
  ellipse(c, 15, -34, 5, 2.5, "#c5bd67", -.25);
  for (const side of [-1, 1]) {
    ellipse(c, side * 11, -8, 8, 5, "#392f24", -side * .3);
    ellipse(c, side * 11, -7, 4.2, 2.5, enraged ? "#ffae4e" : "#ffdf75", -side * .3);
  }
  c.fillStyle = "#715238"; c.beginPath(); c.moveTo(-1, -8); c.lineTo(-5, 7); c.lineTo(4, 5); c.fill();
  c.strokeStyle = "#462f26"; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-8, 14); c.quadraticCurveTo(0, 9, 8, 13); c.stroke();
}

function drawStag(c: Brush, now: number, enraged: boolean) {
  const glint = enraged ? "#ffd595" : "#d5f5ff";
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1); c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = "#6990ab"; c.lineWidth = 6;
    c.beginPath(); c.moveTo(12, -15); c.bezierCurveTo(36, -28, 41, -35, 31, -54);
    c.moveTo(25, -24); c.quadraticCurveTo(22, -33, 24, -39);
    c.moveTo(36, -32); c.quadraticCurveTo(47, -35, 49, -47);
    c.moveTo(36, -40); c.quadraticCurveTo(42, -48, 40, -54); c.stroke();
    c.strokeStyle = glint; c.lineWidth = 2.3; c.stroke();
    c.fillStyle = "#75809e"; c.strokeStyle = "#292c4c"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(12, -5); c.quadraticCurveTo(20, -22, 32, -19);
    c.quadraticCurveTo(29, -3, 15, 0); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  const fur = c.createLinearGradient(-21, -10, 24, 30);
  fur.addColorStop(0, "#adc7cf"); fur.addColorStop(.52, "#6e819d"); fur.addColorStop(1, "#393c61");
  c.fillStyle = fur; c.strokeStyle = "#242c49"; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(-11, 2); c.quadraticCurveTo(-28, 10, -25, 33);
  c.lineTo(-14, 30); c.lineTo(-9, 42); c.lineTo(-2, 36); c.lineTo(4, 43); c.lineTo(14, 31);
  c.lineTo(24, 33); c.quadraticCurveTo(30, 8, 10, 1); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-16, -17); c.quadraticCurveTo(0, -27, 16, -17);
  c.quadraticCurveTo(21, -2, 10, 9); c.quadraticCurveTo(5, 20, 0, 19);
  c.quadraticCurveTo(-5, 20, -10, 9); c.quadraticCurveTo(-21, -2, -16, -17); c.closePath(); c.fill(); c.stroke();
  for (const side of [-1, 1]) {
    ellipse(c, side * 10, -2, 4, 2, glint, -side * .45);
    ellipse(c, side * 16, 17, 2.3, 3.5, "#b9d4de", side * .3);
  }
  ellipse(c, 0, 13, 4.8, 3, "#262b46");
  diamond(c, 0, -13, 6.5 + Math.sin(now / 310), glint);
}

export function drawForestBoss(c: Brush, x: number, y: number, world: number, now: number, enraged: boolean) {
  c.save();
  c.translate(x, y);
  ellipse(c, 0, 35, 35, 8, "#10151e66");
  const breathing = Math.sin(now / (enraged ? 158 : 270));
  c.translate(0, breathing * 2); c.rotate(breathing * .025);
  if (world === 4) drawStag(c, now, enraged);
  else drawAlder(c, now, enraged);
  c.restore();
}

export function drawForestProjectile(c: Brush, x: number, y: number, rotation: number, world: number, special: boolean) {
  c.save(); c.translate(x, y); c.rotate(rotation);
  if (world === 4) {
    c.fillStyle = special ? "#ffe9a0" : "#c9eeff"; c.strokeStyle = special ? "#97642e" : "#4d80a2"; c.lineWidth = 2;
    c.beginPath();
    if (special) {
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 7 : 17;
        if (!i) c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
    } else {
      c.moveTo(7, -14); c.bezierCurveTo(-18, -14, -16, 16, 10, 12);
      c.bezierCurveTo(-4, 6, -4, -4, 7, -14);
    }
    c.closePath(); c.fill(); c.stroke();
  } else if (special) {
    ellipse(c, 0, 0, 12, 17, "#573c30");
    for (let i = 0; i < 3; i++) {
      ellipse(c, -5, -8 + i * 7, 6.3, 4.1, "#ba8854", .45);
      ellipse(c, 5, -7 + i * 7, 6.3, 4.1, "#9f7049", -.45);
    }
  } else {
    ellipse(c, 0, 1, 10, 13, "#bf8542");
    ellipse(c, -3, 3, 2.6, 5.4, "#e4bb6d", -.25);
    ellipse(c, 0, -6, 11.5, 6, "#634b39");
    c.strokeStyle = "#ac9b6b"; c.lineWidth = 3; c.beginPath();
    c.moveTo(0, -10); c.quadraticCurveTo(1, -14, 4, -15); c.stroke();
  }
  c.restore();
}
