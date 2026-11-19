type Point = { x: number; y: number };
type Gesture = { forehead: number; opacity: number; reach: number; grasp: number; lift: number; lower: number };

// Bind points in the original 480 × 600 front portrait, in pixels.
const shoulder = { x: 99, y: 259 };
const elbow = { x: 93, y: 314 };
const fingers = { x: 77, y: 407 };
const brim = { x: -27, y: -5 };
const capScale = .96 * 480 / 176;
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

function makeMasks() {
  // The cut runs under the mantle and along the edge of the tunic.
  const socket = "M0 279 L45 279 Q53 291 63 273 Q72 257 88 263 Q108 268 125 277 L139 263 Q133 299 120 324 Q115 344 101 359 Q99 382 97 400 L88 435 L83 442 H0 Z";
  const body = new Path2D(socket);
  body.rect(0, 0, 480, 600);
  return {
    body,
    sleeve: new Path2D("M34 275 Q68 248 99 251 Q124 251 139 265 Q133 299 120 325 Q109 346 83 345 Q46 337 30 320 Z"),
    forearm: new Path2D("M30 321 Q45 299 71 297 Q101 291 116 312 Q122 326 112 344 L100 360 Q95 380 96 400 L84 435 L81 441 H18 Z"),
    fingertips: new Path2D("M73 382 Q82 376 92 381 L95 398 Q89 411 80 405 Q74 402 73 393 Z M39 397 Q53 404 65 408 Q81 410 81 422 Q80 437 65 438 Q43 434 33 417 Z"),
  };
}
// Path2D is a browser API. The same module is also imported during prerendering.
let masks: ReturnType<typeof makeMasks> | undefined;

function positionLimb(ctx: CanvasRenderingContext2D, from: Point, to: Point, start: Point, end: Point) {
  ctx.translate(start.x, start.y);
  ctx.rotate(Math.atan2(end.y - start.y, end.x - start.x));
  ctx.scale(distance(start, end) / distance(from, to), 1);
  ctx.rotate(-Math.atan2(to.y - from.y, to.x - from.x));
  ctx.translate(-from.x, -from.y);
}

// Solve the elbow from the actual grip point. The elbow swings out to the
// dwarf's right as the hand passes his shoulder, leaving his face visible.
function bendElbow(start: Point, grip: Point, raised: number): Point {
  const span = distance(start, grip);
  const dx = (grip.x - start.x) / span;
  const dy = (grip.y - start.y) / span;
  const upper = distance(shoulder, elbow) + 30 * raised;
  const lower = distance(elbow, fingers) + 10 * raised;
  const along = Math.min(upper, (upper * upper - lower * lower + span * span) / (2 * span));
  const bend = Math.sqrt(Math.max(0, upper * upper - along * along));
  return { x: start.x + along * dx + bend * dy, y: start.y + along * dy - bend * dx };
}

export function drawHatGesture(
  ctx: CanvasRenderingContext2D, hero: HTMLImageElement | null, pose: Gesture,
  paintCap: () => void, paintFallbackBody: () => void,
) {
  const { reach, grasp, lift, lower, opacity } = pose;
  const outlines = masks ??= makeMasks();
  const onHead = { x: 240 + brim.x * capScale, y: pose.forehead + brim.y * capScale };
  const raised = reach * (1 - lower);
  const socket = { x: shoulder.x + 29 * raised, y: shoulder.y - (61 + 10 * lift) * raised };
  const raisedHandX = mix(fingers.x, onHead.x, reach) - 63 * Math.sin(Math.PI * reach) - 54 * lift;
  const raisedHandY = mix(fingers.y, onHead.y, reach) - 19 * lift;
  const grip = { x: mix(raisedHandX, fingers.x, lower) - 57 * Math.sin(Math.PI * lower), y: mix(raisedHandY, fingers.y, lower) };
  const joint = bendElbow(socket, grip, raised);
  function paintPart(image: HTMLImageElement, mask: Path2D, rule: CanvasFillRule = "nonzero") {
    ctx.save(); ctx.clip(mask, rule); ctx.drawImage(image, 0, 0, 480, 600); ctx.restore();
  }
  function paintForearm(image: HTMLImageElement, mask: Path2D) {
    ctx.save(); positionLimb(ctx, elbow, fingers, joint, grip);
    // Fold the curled fingers toward the thumb at the last knuckle, leaving
    // the wrist and cuff in place. Both sides of the brim use the same pose.
    const knuckle = 402;
    ctx.save(); ctx.clip(mask);
    ctx.drawImage(image, 0, 0, 480, knuckle, 0, 0, 480, knuckle); ctx.restore();
    ctx.translate(0, knuckle); ctx.transform(1, 0, .14 * grasp, 1 - .48 * grasp, 0, 0); ctx.translate(0, -knuckle);
    ctx.clip(mask); ctx.drawImage(image, 0, knuckle, 480, 42, 0, knuckle, 480, 42);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha *= opacity;
  if (hero) {
    ctx.save(); positionLimb(ctx, shoulder, elbow, socket, joint); paintPart(hero, outlines.sleeve); ctx.restore();
    paintPart(hero, outlines.body, "evenodd");
    paintForearm(hero, outlines.forearm);
  } else {
    paintFallbackBody();
    ctx.lineCap = "round"; ctx.lineWidth = 37; ctx.strokeStyle = "#285781";
    ctx.beginPath(); ctx.moveTo(socket.x, socket.y); ctx.lineTo(joint.x, joint.y);
    ctx.lineTo(grip.x, grip.y); ctx.stroke();
    ctx.fillStyle = "#d99a67"; ctx.beginPath(); ctx.arc(grip.x, grip.y, 17, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // The cap stays seated throughout the reach. At contact both anchors
  // coincide. From then on the brim pivots around the fingers, including the bow.
  const anchor = reach < 1 ? onHead : grip;
  ctx.save(); ctx.translate(anchor.x, anchor.y);
  ctx.rotate(-.48 * lift - 2.22 * lower);
  const size = capScale * (1 - .30 * lower);
  ctx.scale(size, size); ctx.translate(-brim.x, -brim.y); paintCap(); ctx.restore();
  if (reach > .9) {
    ctx.save(); ctx.globalAlpha *= Math.min(1, (reach - .9) * 10);
    if (hero) paintForearm(hero, outlines.fingertips);
    else {
      ctx.fillStyle = "#ebac79"; ctx.beginPath(); ctx.ellipse(grip.x + 3, grip.y, 8, 11, .4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
