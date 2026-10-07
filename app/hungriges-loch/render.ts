import { HOLE_RADIUS, KINDS, type HoleEngine, type Item } from "./engine";

export type Floater = { x: number; y: number; text: string; color: string; size: number; age: number };
export type Stick = { pointerId: number; originX: number; originY: number; x: number; y: number };

export const STICK_RADIUS = 46;
export const FLOATER_TIME = 0.9;

const SPRITE_SIZE = 128;
const TILE = 80;
const VIEW_PADDING = 30;
const sprites = new Map<string, HTMLCanvasElement>();

/** Emojis werden einmal vorgezeichnet; drawImage ist deutlich schneller als fillText pro Bild. */
function sprite(symbol: string): HTMLCanvasElement {
  let canvas = sprites.get(symbol);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = canvas.height = SPRITE_SIZE;
    const context = canvas.getContext("2d");
    if (context) {
      context.font = `${SPRITE_SIZE * 0.72}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(symbol, SPRITE_SIZE / 2, SPRITE_SIZE * 0.54);
    }
    sprites.set(symbol, canvas);
  }
  return canvas;
}

function circle(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.beginPath();
  context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function drawItem(context: CanvasRenderingContext2D, item: Item, x: number, y: number, scale: number, angle: number) {
  const size = item.radius * 2.5 * scale;
  context.save();
  context.translate(x, y);
  if (angle !== 0) context.rotate(angle);
  context.drawImage(sprite(KINDS[item.kind].symbol), -size / 2, -size / 2, size, size);
  context.restore();
}

/** Zeichnet einen Frame in CSS-Pixeln; time läuft in Sekunden und treibt nur Animationen. */
export function drawGame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  game: HoleEngine,
  floaters: Floater[],
  stick: Stick | null,
  time: number,
) {
  const { hole } = game;
  const scale = Math.min(width, height) * 0.072 / HOLE_RADIUS[0] * Math.pow(HOLE_RADIUS[0] / hole.radius, 0.55);
  const viewWidth = width / scale;
  const viewHeight = height / scale;
  const cameraX = viewWidth >= game.width + VIEW_PADDING * 2 ? game.width / 2 : clamp(hole.x, viewWidth / 2 - VIEW_PADDING, game.width - viewWidth / 2 + VIEW_PADDING);
  const cameraY = viewHeight >= game.height + VIEW_PADDING * 2 ? game.height / 2 : clamp(hole.y, viewHeight / 2 - VIEW_PADDING, game.height - viewHeight / 2 + VIEW_PADDING);
  const left = cameraX - viewWidth / 2;
  const top = cameraY - viewHeight / 2;

  context.fillStyle = "#1d4a35";
  context.fillRect(0, 0, width, height);

  context.save();
  context.scale(scale, scale);
  context.translate(-left, -top);

  // Wiese mit Kacheln, damit die Bewegung der Kamera sichtbar bleibt.
  context.fillStyle = "#7cc47a";
  context.fillRect(0, 0, game.width, game.height);
  context.fillStyle = "#72ba71";
  const firstColumn = Math.max(0, Math.floor(left / TILE));
  const firstRow = Math.max(0, Math.floor(top / TILE));
  for (let row = firstRow; row * TILE < Math.min(game.height, top + viewHeight); row++) {
    for (let column = firstColumn; column * TILE < Math.min(game.width, left + viewWidth); column++) {
      if ((row + column) % 2 === 0) continue;
      context.fillRect(column * TILE, row * TILE, Math.min(TILE, game.width - column * TILE), Math.min(TILE, game.height - row * TILE));
    }
  }
  context.lineWidth = 8;
  context.strokeStyle = "#e9c98a";
  context.strokeRect(-4, -4, game.width + 8, game.height + 8);

  const visible = (item: Item) => item.x + item.radius * 2 > left && item.x - item.radius * 2 < left + viewWidth
    && item.y + item.radius * 2 > top && item.y - item.radius * 2 < top + viewHeight;
  const standing = game.items.filter((item) => item.fall < 0 && visible(item)).sort((a, b) => a.y - b.y);

  const pulse = 0.55 + Math.sin(time * 5) * 0.2;
  for (const item of standing) {
    if (game.isTarget(item.kind)) {
      const glow = context.createRadialGradient(item.x, item.y, item.radius * 0.4, item.x, item.y, item.radius * 1.7);
      glow.addColorStop(0, `rgba(255,236,150,${pulse})`);
      glow.addColorStop(1, "rgba(255,236,150,0)");
      context.fillStyle = glow;
      circle(context, item.x, item.y, item.radius * 1.7);
      context.fill();
    }
    context.fillStyle = "rgba(0,40,20,.22)";
    context.beginPath();
    context.ellipse(item.x, item.y + item.radius * 0.82, item.radius * 0.85, item.radius * 0.3, 0, 0, Math.PI * 2);
    context.fill();
  }

  if (game.active.magnet > 0) {
    context.strokeStyle = `rgba(150,215,255,${0.3 + Math.sin(time * 8) * 0.15})`;
    context.lineWidth = 5;
    circle(context, hole.x, hole.y, Math.max(170, hole.radius * 3.2) * (0.86 + (time * 1.2 % 1) * 0.14));
    context.stroke();
  }
  context.fillStyle = game.active.giant > 0 ? "#ffd166" : "#8f7bff";
  circle(context, hole.x, hole.y, hole.radius + 4);
  context.fill();
  const wall = context.createLinearGradient(0, hole.y - hole.radius, 0, hole.y + hole.radius);
  wall.addColorStop(0, "#54469e");
  wall.addColorStop(0.55, "#1a1238");
  wall.addColorStop(1, "#07040f");
  context.fillStyle = wall;
  circle(context, hole.x, hole.y, hole.radius);
  context.fill();

  context.save();
  circle(context, hole.x, hole.y, hole.radius);
  context.clip();
  context.fillStyle = "#000";
  circle(context, hole.x, hole.y + hole.radius * 0.24, hole.radius * 0.93);
  context.fill();
  for (const item of game.items) {
    if (item.fall < 0) continue;
    const fall = Math.min(1, item.fall);
    context.globalAlpha = 1 - fall * fall;
    drawItem(context, item, item.x, item.y + fall * hole.radius * 0.3, 1 - fall * 0.7, fall * 1.6);
  }
  context.restore();

  for (const item of standing) {
    const shake = item.wobble > 0 ? Math.sin(time * 42 + item.id) * 0.11 : 0;
    drawItem(context, item, item.x + shake * item.radius * 0.5, item.y, 1, shake);
  }
  context.restore();

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  for (const floater of floaters) {
    const progress = floater.age / FLOATER_TIME;
    context.globalAlpha = 1 - progress * progress;
    context.font = `900 ${floater.size}px ui-rounded,"Arial Rounded MT Bold",Arial,sans-serif`;
    const x = (floater.x - left) * scale;
    const y = (floater.y - top) * scale - 14 - progress * 34;
    context.lineWidth = 4;
    context.strokeStyle = "#0c0820";
    context.strokeText(floater.text, x, y);
    context.fillStyle = floater.color;
    context.fillText(floater.text, x, y);
  }
  context.globalAlpha = 1;

  drawPointer(context, width, height, game, left, top, scale);

  if (stick) {
    const dx = stick.x - stick.originX;
    const dy = stick.y - stick.originY;
    const reach = Math.min(1, STICK_RADIUS / Math.max(1, Math.hypot(dx, dy)));
    context.fillStyle = "rgba(255,255,255,.16)";
    context.strokeStyle = "rgba(255,255,255,.5)";
    context.lineWidth = 2;
    circle(context, stick.originX, stick.originY, STICK_RADIUS);
    context.fill();
    context.stroke();
    context.fillStyle = "rgba(255,255,255,.75)";
    circle(context, stick.originX + dx * reach, stick.originY + dy * reach, 19);
    context.fill();
  }
}

/** Zeigt am Rand zum nächsten passenden Ziel, sobald keines davon im Bild ist. */
function drawPointer(context: CanvasRenderingContext2D, width: number, height: number, game: HoleEngine, left: number, top: number, scale: number) {
  const { hole } = game;
  let nearest: Item | null = null;
  let nearestDistance = Infinity;
  let nearestIsTarget = false;
  for (const item of game.items) {
    if (item.fall >= 0 || !game.fits(item)) continue;
    const target = game.isTarget(item.kind);
    if (nearestIsTarget && !target) continue;
    const distance = Math.hypot(item.x - hole.x, item.y - hole.y);
    if ((target && !nearestIsTarget) || distance < nearestDistance) {
      nearest = item;
      nearestDistance = distance;
      nearestIsTarget = target;
    }
  }
  if (!nearest) return;
  const x = (nearest.x - left) * scale;
  const y = (nearest.y - top) * scale;
  if (x > 0 && x < width && y > 0 && y < height) return;

  const inset = 34;
  const badgeX = clamp(x, inset, width - inset);
  const badgeY = clamp(y, inset, height - inset);
  const angle = Math.atan2(y - badgeY, x - badgeX);
  context.save();
  context.translate(badgeX, badgeY);
  context.fillStyle = "rgba(20,14,48,.82)";
  context.strokeStyle = nearestIsTarget ? "#ffe27a" : "#d9d0ff";
  context.lineWidth = 3;
  circle(context, 0, 0, 22);
  context.fill();
  context.stroke();
  context.drawImage(sprite(KINDS[nearest.kind].symbol), -17, -17, 34, 34);
  context.rotate(angle);
  context.fillStyle = context.strokeStyle;
  context.beginPath();
  context.moveTo(33, 0);
  context.lineTo(24, -7);
  context.lineTo(24, 7);
  context.closePath();
  context.fill();
  context.restore();
}
