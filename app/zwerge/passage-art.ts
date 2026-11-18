const width = 400;
const height = 560;
const center = width / 2;

export function easeTravel(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * (3 - 2 * t);
}

// The last frame before changing scenes and the first frame afterwards share
// the same dark surround. The lit rim follows the opening on both sides.
export function drawIris(ctx: CanvasRenderingContext2D, x: number, y: number, openness: number, accent: string) {
  if (openness >= 1) return;
  const extent = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 18;
  const radius = easeTravel(openness) * extent;
  ctx.save();
  ctx.fillStyle = "#0b151a";
  ctx.beginPath();
  ctx.rect(-2, -2, width + 4, height + 4);
  ctx.moveTo(x + radius, y);
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill("evenodd");
  if (radius > 2) {
    ctx.strokeStyle = accent;
    ctx.globalAlpha = .7;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBossGate(ctx: CanvasRenderingContext2D, y: number, now: number, entry: number,
  accent: string, forest: boolean, bossName: string, ready: boolean) {
  ctx.save();
  ctx.translate(center, y);
  const pulse = .5 + .5 * Math.sin(now / 340);
  const light = ctx.createRadialGradient(0, 39, 4, 0, 39, 100);
  light.addColorStop(0, accent + "81");
  light.addColorStop(1, accent + "00");
  ctx.fillStyle = light;
  ctx.fillRect(-100, -61, 200, 200);
  ctx.beginPath();
  ctx.roundRect(-49, -27, 98, 105, [48, 48, 5, 5]);
  ctx.fillStyle = "#101d22";
  ctx.fill();
  ctx.lineWidth = 11;
  ctx.strokeStyle = forest ? "#594a33" : "#485059";
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  const gap = 7 + easeTravel(entry) * 49;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.translate(gap, 0);
    const door = ctx.createLinearGradient(0, 0, 51, 0);
    door.addColorStop(0, forest ? "#9b8255" : "#737583");
    door.addColorStop(.18, forest ? "#58472f" : "#414854");
    door.addColorStop(1, "#222e34");
    ctx.fillStyle = door;
    ctx.fillRect(0, -27, 50, 107);
    ctx.strokeStyle = accent + "99";
    ctx.beginPath();
    ctx.moveTo(1, 76); ctx.lineTo(1, -19);
    ctx.moveTo(1, 42); ctx.lineTo(18, 25); ctx.lineTo(18, 3);
    ctx.moveTo(1, 60); ctx.lineTo(36, 24);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const lift = (now / 40 + i * 14) % 42;
      const x = side * (50 + i * 4 + Math.sin(now / 510 + i) * 4);
      ctx.fillStyle = accent;
      ctx.globalAlpha = .65 * Math.sin(lift / 42 * Math.PI);
      ctx.fillRect(x, 63 - lift, 2, 3);
    }
  }
  ctx.globalAlpha = 1 - easeTravel(entry);
  ctx.textAlign = "center";
  ctx.font = "bold 15px Georgia, serif";
  const labelWidth = Math.max(108, ctx.measureText(bossName).width + 26);
  ctx.fillStyle = "#122026ef";
  ctx.beginPath(); ctx.roundRect(-labelWidth / 2, -59, labelWidth, 26, 8); ctx.fill();
  ctx.fillStyle = accent; ctx.fillText(bossName, 0, -41);
  if (ready) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 96 + pulse * 3); ctx.lineTo(0, 89 + pulse * 3); ctx.lineTo(8, 96 + pulse * 3);
    ctx.stroke();
  }
  ctx.restore();
}
