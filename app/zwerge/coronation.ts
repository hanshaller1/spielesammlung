import { sitePath } from "../site-paths";
import { drawHatGesture } from "./coronation-arm";

export const CORONATION_DURATION = 8400;
export const ARENA_FADE_TIME = 850;
const CROWN_LANDING = 5320;
const TAU = Math.PI * 2;

export type HatStyle = { light: string; mid: string; dark: string; band: string; stitch: string; coronationColumn: 0 | 1 | 2 };

function loadPlate(name: string) {
  const image = new Image();
  image.src = sitePath(`/zwergengold/${name}.webp`);
  return image;
}

export function loadCoronationArt() {
  return {
    hall: loadPlate("mondhalle"),
    profile: loadPlate("kroenung-drehung"),
    hero: loadPlate("kroenung-zwerg"),
    caps: loadPlate("kroenung-muetzen"),
    crown: loadPlate("kristallkrone"),
  };
}
type Art = ReturnType<typeof loadCoronationArt>;
const drawable = (image: HTMLImageElement) => image.complete && image.naturalWidth > 0;

function ease(time: number, start: number, end: number) {
  const t = Math.max(0, Math.min(1, (time - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

// A short composed cadence. Each cue belongs to the scene clock so that a
// pause or sound toggle cannot start a second, out-of-sync accompaniment.
const score = [
  [180, 146.83, 2.6], [620, 220, 1.8], [1080, 293.66, 2.0],
  [1840, 349.23, 1.8], [2470, 440, 1.6], [3120, 392, 1.8],
  [3810, 293.66, 2.0], [4220, 369.99, 1.7], [4640, 440, 1.4],
  [5050, 554.37, 1.1], [CROWN_LANDING, 587.33, 2.2], [CROWN_LANDING, 196, 2.8],
  [5810, 739.99, 1.7], [6350, 880, 1.9], [6870, 587.33, 2.8], [6870, 293.66, 2.9],
] as const;

export function playCoronationCues(previous: number, elapsed: number, note: (hz: number, seconds: number, volume: number) => void) {
  for (const [at, frequency, duration] of score) {
    if (at > previous && at <= elapsed && elapsed - at < 160) note(frequency, duration, frequency < 250 ? .10 : .16);
  }
}

function glint(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.quadraticCurveTo(x + .55, y - .6, x + radius * .67, y);
  ctx.quadraticCurveTo(x + .55, y + .6, x, y + radius);
  ctx.quadraticCurveTo(x - .55, y + .6, x - radius * .67, y);
  ctx.quadraticCurveTo(x - .55, y - .6, x, y - radius);
  ctx.fill();
}

function drawCap(ctx: CanvasRenderingContext2D, caps: HTMLImageElement, palette: HatStyle) {
  if (drawable(caps)) {
    const columnWidth = caps.naturalWidth / 3;
    // The brim sits 90% down each square. Keep it at the local origin as the cap turns into the hand.
    ctx.drawImage(caps, palette.coronationColumn * columnWidth, 0, columnWidth, caps.naturalHeight, -39, -70, 78, 78);
    return;
  }
  const cloth = ctx.createLinearGradient(-25, -35, 26, 0);
  cloth.addColorStop(0, palette.dark);
  cloth.addColorStop(.39, palette.light);
  cloth.addColorStop(.61, palette.mid);
  cloth.addColorStop(1, palette.dark);
  ctx.fillStyle = cloth;
  ctx.strokeStyle = palette.dark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-33, -3);
  ctx.bezierCurveTo(-33, -22, -24, -44, 1, -49);
  ctx.bezierCurveTo(13, -51, 22, -52, 28, -59);
  ctx.bezierCurveTo(29, -45, 14, -42, 21, -33);
  ctx.quadraticCurveTo(32, -24, 34, -3);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = palette.dark;
  ctx.beginPath();
  ctx.moveTo(-27, -13); ctx.quadraticCurveTo(-14, -28, 5, -31);
  ctx.moveTo(1, -39); ctx.quadraticCurveTo(13, -41, 17, -46);
  ctx.stroke();
  ctx.fillStyle = palette.band;
  ctx.beginPath();
  ctx.moveTo(-34, -10); ctx.quadraticCurveTo(-3, -15, 34, -10);
  ctx.quadraticCurveTo(39, -6, 34, 0); ctx.quadraticCurveTo(0, -5, -34, 0);
  ctx.quadraticCurveTo(-38, -4, -34, -10); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = palette.stitch;
  ctx.lineWidth = 1;
  ctx.setLineDash([2.4, 2.8]);
  ctx.beginPath(); ctx.moveTo(-32, -7); ctx.quadraticCurveTo(0, -12, 32, -7); ctx.stroke();
  ctx.setLineDash([]);
}

function drawCrown(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  if (drawable(image)) {
    ctx.drawImage(image, -42, -33.6, 84, 33.6);
    return;
  }
  ctx.fillStyle = "#83def3"; ctx.strokeStyle = "#f1d289"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-31, -4); ctx.lineTo(-36, -20); ctx.lineTo(-19, -11);
  ctx.lineTo(-12, -25); ctx.lineTo(-6, -14); ctx.lineTo(0, -34); ctx.lineTo(8, -14);
  ctx.lineTo(16, -25); ctx.lineTo(20, -11); ctx.lineTo(36, -20); ctx.lineTo(31, -4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#c89846"; ctx.fillRect(-31, -6, 62, 6);
}

export function drawCoronation(
  ctx: CanvasRenderingContext2D, art: Art, elapsed: number, palette: HatStyle,
  fallbackHero: (ctx: CanvasRenderingContext2D) => void,
) {
  const t = Math.min(CORONATION_DURATION, Math.max(0, elapsed));
  const turn = ease(t, 830, 1230);
  const reach = ease(t, 1230, 2140);
  const grasp = ease(t, 2070, 2310);
  const lift = ease(t, 2340, 2820);
  const lower = ease(t, 2690, 3780);
  const appear = ease(t, 3140, 4100);
  const descent = ease(t, 3840, CROWN_LANDING);
  const settle = ease(t, CROWN_LANDING, 5750);
  const bow = ease(t, 3560, 4790) * (1 - ease(t, 5400, 6360));
  const glow = ease(t, 4100, CROWN_LANDING) * (1 - ease(t, 5570, 7350));
  const camera = ease(t, 0, 6800);

  ctx.save();
  ctx.fillStyle = "#071525"; ctx.fillRect(0, 0, 400, 560);
  // The stonework moves more slowly than the foreground during the push-in.
  ctx.save(); ctx.translate(200, 275); ctx.scale(1 + .055 * camera, 1 + .055 * camera);
  if (drawable(art.hall)) ctx.drawImage(art.hall, -200, -275, 400, 560);
  ctx.restore();
  const light = ctx.createRadialGradient(201, 217, 8, 201, 231, 168);
  light.addColorStop(0, `rgba(142,222,236,${.06 + .17 * glow})`);
  light.addColorStop(1, "rgba(111,196,228,0)");
  ctx.fillStyle = light; ctx.fillRect(0, 53, 400, 348);

  // Slow deterministic motes, with one restrained sweep of light on landing.
  for (let i = 0; i < 32; i++) {
    const x = 24 + (i * 137.5) % 352 + 7 * Math.sin(t / 1940 + i);
    const y = 318 - (i * 61.7 + t * (.004 + i % 3 * .001)) % 273;
    ctx.globalAlpha = (.12 + .28 * Math.sin(i + t / 1350) ** 2) * (.65 + glow * .35);
    ctx.fillStyle = i % 3 === 0 ? "#ffe6a7" : "#c4f9ff";
    glint(ctx, x, y, 1 + i % 3);
  }
  ctx.globalAlpha = 1;
  ctx.translate(200, 349 + 5 * camera);
  const zoom = .77 + .30 * camera;
  ctx.scale(zoom, zoom);
  const shadow = ctx.createRadialGradient(0, 0, 1, 0, 0, 68);
  shadow.addColorStop(0, "#051522c9"); shadow.addColorStop(1, "#05152200");
  ctx.save(); ctx.scale(1, .15); ctx.fillStyle = shadow; ctx.fillRect(-70, -70, 140, 140); ctx.restore();

  const height = 219 + Math.sin(t / 890) * .52 - 9 * bow;
  const width = 176;
  const forehead = -height + 16;
  // Anchor both painted poses at the boots and turn the shoulder into the light.
  ctx.save();
  ctx.translate((1 - turn) * -5, 0);
  if (drawable(art.profile) && turn < 1) ctx.drawImage(art.profile, -88, -height, width, height);
  ctx.translate(-width / 2, -height);
  ctx.scale(width / 480, height / 600);
  drawHatGesture(ctx, drawable(art.hero) ? art.hero : null, {
    forehead: 16 * 600 / height, opacity: drawable(art.profile) ? turn : 1, reach, grasp, lift, lower,
  }, () => drawCap(ctx, art.caps, palette), () => {
    ctx.save(); ctx.translate(240, 450); ctx.scale(3.05 * 480 / width, 600 / 67); fallbackHero(ctx); ctx.restore();
  });
  ctx.restore();

  if (appear > 0) {
    ctx.save();
    ctx.translate(0, forehead - 71 * (1 - descent) + Math.sin(Math.PI * settle) * 1.6);
    ctx.rotate(-.09 * (1 - descent)); ctx.globalAlpha = appear;
    const scale = .82 + .18 * appear;
    ctx.scale(scale, scale);
    drawCrown(ctx, art.crown);
    const shine = ease(t, 5390, 6030);
    ctx.globalAlpha = Math.sin(shine * Math.PI);
    ctx.fillStyle = "#fff8d8"; glint(ctx, -26 + 51 * shine, -8 - 11 * Math.sin(shine * Math.PI), 6);
    ctx.restore();
  }
  ctx.restore();
  const title = ease(t, 6090, 7310);
  if (title > 0) {
    ctx.save(); ctx.globalAlpha = title;
    const shade = ctx.createLinearGradient(0, 380, 0, 560);
    shade.addColorStop(0, "#08152500"); shade.addColorStop(.48, "#081525e5"); shade.addColorStop(1, "#071423e8");
    ctx.fillStyle = shade; ctx.fillRect(0, 380, 400, 180);
    ctx.translate(200, 425 + (1 - title) * 6);
    ctx.fillStyle = "#e9cb83"; glint(ctx, 0, 0, 5);
    ctx.strokeStyle = "#c6a86c"; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(-61, 0); ctx.lineTo(-10, 0); ctx.moveTo(10, 0); ctx.lineTo(61, 0); ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = "bold 31px Georgia, serif";
    ctx.fillStyle = "#fff0c8"; ctx.fillText("Die Kristallkrone", 0, 37);
    ctx.font = "16px Georgia, serif";
    ctx.fillStyle = "#deeef0"; ctx.fillText("Das Zwergenreich ist gerettet.", 0, 66);
    ctx.restore();
  }
  // Fade through the same ink blue that closes the last battle.
  ctx.save(); ctx.fillStyle = `rgba(7,21,37,${1 - ease(t, 0, 880)})`; ctx.fillRect(0, 0, 400, 560); ctx.restore();
}
