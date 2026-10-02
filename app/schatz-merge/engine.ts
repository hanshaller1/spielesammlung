import Matter from "matter-js";
import { SPRITE_PROFILES } from "./sprite-profiles";
import { QUALITY, type QualityLevel } from "./quality";
import type { TreasureSprites } from "./assets";
import type { FrameMetrics } from "./performance";

export type ColliderType = "nugget" | "circle" | "stack" | "gem" | "sack" | "box" | "goblet" | "wide";

export type TreasureDefinition = {
  id: string;
  name: string;
  tier: number;
  sprite: string;
  colliderType: ColliderType;
  size: number;
  densityScale: number;
  friction: number;
  restitution: number;
  score: number;
};

// Legacy size progression remains documented; PNG geometry now drives both art
// and colliders at a shared scale. densityScale preserves the material tuning.
export const TREASURES: TreasureDefinition[] = [
  { id: "nugget", name: "Goldnugget", tier: 1, sprite: "nugget", colliderType: "nugget", size: 1, densityScale: 1, friction: 0.2, restitution: 0.035, score: 0 },
  { id: "coin", name: "Goldmünze", tier: 2, sprite: "coin", colliderType: "circle", size: 1.22, densityScale: 1.02, friction: 0.12, restitution: 0.045, score: 10 },
  { id: "coin-stack", name: "2er-Münzstapel", tier: 3, sprite: "coin-stack", colliderType: "stack", size: 1.49, densityScale: 1.04, friction: 0.24, restitution: 0.03, score: 20 },
  { id: "small-gem", name: "Kleiner Edelstein", tier: 4, sprite: "small-gem", colliderType: "gem", size: 1.82, densityScale: 1.06, friction: 0.16, restitution: 0.035, score: 40 },
  { id: "large-gem", name: "Großer Edelstein", tier: 5, sprite: "large-gem", colliderType: "gem", size: 2.22, densityScale: 1.08, friction: 0.15, restitution: 0.035, score: 80 },
  { id: "gem-pouch", name: "Gold-/Edelsteinbeutel", tier: 6, sprite: "gem-pouch", colliderType: "sack", size: 2.55, densityScale: 1.1, friction: 0.3, restitution: 0.025, score: 160 },
  { id: "jewel-box", name: "Schatzkästchen", tier: 7, sprite: "jewel-box", colliderType: "box", size: 2.93, densityScale: 1.12, friction: 0.42, restitution: 0.02, score: 320 },
  { id: "goblet", name: "Goldener Kelch", tier: 8, sprite: "goblet", colliderType: "goblet", size: 3.37, densityScale: 1.14, friction: 0.2, restitution: 0.025, score: 640 },
  { id: "crown", name: "Krone", tier: 9, sprite: "crown", colliderType: "wide", size: 3.88, densityScale: 1.16, friction: 0.34, restitution: 0.02, score: 1280 },
  { id: "treasure-chest", name: "Schatztruhe", tier: 10, sprite: "treasure-chest", colliderType: "box", size: 4.46, densityScale: 1.18, friction: 0.46, restitution: 0.015, score: 2560 },
  { id: "king-treasure", name: "Königsschatz", tier: 11, sprite: "king-treasure", colliderType: "wide", size: 5.13, densityScale: 1.2, friction: 0.36, restitution: 0.015, score: 5120 },
  { id: "golden-throne", name: "Goldener Thron", tier: 12, sprite: "golden-throne", colliderType: "wide", size: 5.9, densityScale: 1.22, friction: 0.48, restitution: 0.01, score: 10240 },
];

const DROP_WEIGHTS = [44, 32, 18, 6];
// Matter's gravity scale; sprite geometry is scaled independently below.
const BODY_SCALE = 0.001;
const FIXED_STEP_MS = 1000 / 60;
// The tallest legal drop must fit above the line, with the existing top margin.
// This single common scale preserves all intrinsic PNG size relationships.
const MAX_DROP_IMAGE_HEIGHT = Math.max(...SPRITE_PROFILES.slice(0, 6).map(p => p.game[3]));
const REFERENCE_SPRITE_SCALE = (620 * .2 - 16) / MAX_DROP_IMAGE_HEIGHT;
/** Kompatibilitätshilfe für einzelne Stichproben; Spielrunden verwenden DropShuffleBag. */
export function randomDropTier(random = Math.random): number {
  const roll = random() * DROP_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  let boundary = 0;
  for (let index = 0; index < DROP_WEIGHTS.length; index += 1) {
    boundary += DROP_WEIGHTS[index];
    if (roll < boundary) return index + 1;
  }
  return 4;
}

export type MergeEvent = {
  tier: number;
  nextTier: number | null;
  points: number;
  x: number;
  y: number;
  terminal: boolean;
};

type EngineCallbacks = {
  onMerge: (event: MergeEvent) => void;
  onGameOver: () => void;
  onDrop: () => void;
  onImpact: (tier: number) => void;
  onPreviewReady?: () => void;
};

type BodyMeta = {
  tier: number;
  merged: boolean;
  renderOffsetXFactor: number;
  renderOffsetYFactor: number;
  awaitingPreviewAfterDrop: boolean;
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number };

const { Bodies, Body, Composite, Engine, Events, Vector, Query, Sleeping } = Matter;

type RelativePoint = readonly [number, number];

function createPolygonBody(
  x: number,
  y: number,
  radius: number,
  points: ReadonlyArray<RelativePoint>,
  options: Matter.IChamferableBodyDefinition,
): Matter.Body {
  const vertices = points.map(([px, py]) => ({ x: x + px * radius, y: y + py * radius }));
  let twiceArea = 0;
  let centroidX = 0;
  let centroidY = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [px, py] = points[index];
    const [nextX, nextY] = points[(index + 1) % points.length];
    const cross = px * nextY - nextX * py;
    twiceArea += cross;
    centroidX += (px + nextX) * cross;
    centroidY += (py + nextY) * cross;
  }
  const centerX = points.length > 0 && Math.abs(twiceArea) > Number.EPSILON
    ? x + (centroidX / (3 * twiceArea)) * radius
    : x;
  const centerY = points.length > 0 && Math.abs(twiceArea) > Number.EPSILON
    ? y + (centroidY / (3 * twiceArea)) * radius
    : y;
  return Bodies.fromVertices(centerX, centerY, [vertices], options, true) ?? Bodies.circle(centerX, centerY, radius * 0.5, options, 10);
}

function createCompoundBody(parts: Matter.Body[], options: Matter.IChamferableBodyDefinition): Matter.Body {
  // Teil-Collider liegen bereits in Weltkoordinaten. Ein Startpunkt an (x, y)
  // würde den von Matter erzeugten Parent-Hull nochmals um diese Position verschieben.
  return Body.create({ ...options, position: { x: 0, y: 0 }, parts });
}

export class SchatzMergeEngine {
  private readonly engine = Engine.create({ enableSleeping: true });
  private readonly callbacks: EngineCallbacks;
  private readonly bodies = new Map<number, BodyMeta>();
  private readonly walls: Matter.Body[] = [];
  private readonly particles: Particle[] = [];
  private width = 1;
  private height = 1;
  private elapsed = 0;
  private accumulator = 0;
  private lastImpactAt = Number.NEGATIVE_INFINITY;
  private dangerStartedAt: number | null = null;
  private previewBlockedByPendingDrop = false;
  private gameOver = false;
  private stressScene: string | null = null;
  private readonly pendingMerges: Array<[Matter.Body, Matter.Body]> = [];
  private sprites: TreasureSprites = [];
  private quality: QualityLevel = "HIGH";
  private background: OffscreenCanvas | HTMLCanvasElement | null = null;
  private backgroundDpr = 0;
  diagnosticsEnabled = false;
  debugColliders = false;
  resizeCount = 0;
  metrics: FrameMetrics = { physics: 0, background: 0, treasures: 0, particles: 0, preview: 0, steps: 0 };

  setSprites(sprites: TreasureSprites): void { this.sprites = sprites; }
  setQuality(level: QualityLevel): void {
    this.quality = level;
    this.particles.length = Math.min(this.particles.length, QUALITY[level].particles);
  }
  debugSnapshot() {
    const bodies = Composite.allBodies(this.engine.world).filter(body => this.bodies.has(body.id));
    return { bodies: bodies.length, parts: bodies.reduce((n, b) => n + (b.parts.length > 1 ? b.parts.length - 1 : 1), 0), sleeping: bodies.filter(b => b.isSleeping).length, particles: this.particles.length, quality: this.quality, resizes: this.resizeCount, pendingDrop: this.previewBlockedByPendingDrop };
  }

  loadDebugScene(count: number, kind = "mixed"): void {
    if (!this.diagnosticsEnabled) return;
    this.reset(); this.stressScene = kind;
    for (let i = 0; i < Math.min(30, Math.max(0, count)); i++) {
      const tier = kind === "compound" ? [8, 9, 12][i % 3] : kind === "small" || kind === "chains" ? 1 : 1 + i % 6;
      const x = this.width * (.1 + (i % 5) * .19), y = this.height - 40 - Math.floor(i / 5) * this.height * .11;
      const body = this.createTreasureBody(tier, x, y);
      Composite.add(this.engine.world, body);
      this.bodies.set(body.id, this.createBodyMeta(tier, body, x, y));
    }
  }

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.engine.gravity.x = 0;
    this.engine.gravity.y = 1;
    this.engine.gravity.scale = BODY_SCALE;
    this.engine.positionIterations = 10;
    this.engine.velocityIterations = 7;
    this.engine.constraintIterations = 4;
    Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        const first = pair.bodyA.parent, second = pair.bodyB.parent;
        const a = this.bodies.get(first.id), b = this.bodies.get(second.id);
        if (a && b && a.tier === b.tier) this.pendingMerges.push([first, second]);
        else this.tryImpact(first, second);
      }
    });
  }

  get dangerLine(): number {
    return this.height * 0.2;
  }

  get boardWidth(): number {
    return this.width;
  }

  resize(width: number, height: number): void {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    if (Math.abs(safeWidth - this.width) < 0.5 && Math.abs(safeHeight - this.height) < 0.5) return;
    this.resizeCount++;
    this.background = null;
    const scaleX = safeWidth / this.width;
    const scaleY = safeHeight / this.height;
    const needsScale = this.width > 1 && this.height > 1;

    if (needsScale) {
      const scale = Math.min(scaleX, scaleY);
      for (const body of Composite.allBodies(this.engine.world)) {
        if (body.isStatic || !this.bodies.has(body.id)) continue;
        Body.scale(body, scale, scale);
        Body.setPosition(body, { x: body.position.x * scaleX, y: body.position.y * scaleY });
        Body.setVelocity(body, { x: body.velocity.x * scaleX, y: body.velocity.y * scaleY });
        Sleeping.set(body, false);
      }
    }

    this.width = safeWidth;
    this.height = safeHeight;
    this.rebuildWalls();
  }

  clampX(x: number, tier: number): number {
    const halfWidth = this.halfWidthForTier(tier);
    return Math.max(halfWidth + 8, Math.min(this.width - halfWidth - 8, x));
  }

  drop(tier: number, x: number): void {
    if (this.gameOver || this.previewBlockedByPendingDrop) return;
    const safeTier = Math.max(1, Math.min(TREASURES.length, tier));
    const safeX = this.clampX(x, safeTier);
    const y = this.spawnY(safeTier);
    const body = this.createTreasureBody(safeTier, safeX, y);
    WorldAdd(this.engine.world, body);
    this.bodies.set(body.id, this.createBodyMeta(safeTier, body, safeX, y, false, true));
    this.previewBlockedByPendingDrop = true;
    this.callbacks.onDrop();
  }

  reset(): void {
    for (const body of Composite.allBodies(this.engine.world)) {
      if (!body.isStatic) Composite.remove(this.engine.world, body);
    }
    this.bodies.clear();
    this.pendingMerges.length = 0;
    this.particles.length = 0;
    this.elapsed = 0;
    this.accumulator = 0;
    this.lastImpactAt = Number.NEGATIVE_INFINITY;
    this.dangerStartedAt = null;
    this.previewBlockedByPendingDrop = false;
    this.gameOver = false;
    this.stressScene = null;
  }

  update(deltaMs: number): void {
    this.metrics.physics = 0;
    this.metrics.steps = 0;
    if (this.gameOver) return;
    // At most three fixed steps; missed wall time is discarded, never accumulated forever.
    this.accumulator = Math.min(FIXED_STEP_MS * 3, this.accumulator + Math.max(0, Math.min(50, deltaMs)));
    while (this.accumulator + 1e-6 >= FIXED_STEP_MS && this.metrics.steps < 3) {
      this.elapsed += FIXED_STEP_MS;
      const start = this.diagnosticsEnabled ? performance.now() : 0;
      Engine.update(this.engine, FIXED_STEP_MS);
      // World mutations happen after the solver finishes using its body/pair snapshot.
      for (const [first, second] of this.pendingMerges) this.tryMerge(first, second);
      this.pendingMerges.length = 0;
      this.stabilizeContacts();
      if (this.diagnosticsEnabled) this.metrics.physics += performance.now() - start;
      this.metrics.steps++;
      this.updateEffects(FIXED_STEP_MS);
      this.accumulator -= FIXED_STEP_MS;
    }
    this.updatePreviewGate();
    this.checkForGameOver();
  }

  draw(context: CanvasRenderingContext2D, preview: { tier: number; x: number } | null): void {
    let stamp = this.diagnosticsEnabled ? performance.now() : 0;
    const mark = (key: "background" | "treasures" | "particles" | "preview") => {
      if (this.diagnosticsEnabled) { const now = performance.now(); this.metrics[key] = now - stamp; stamp = now; }
    };
    this.drawBackground(context);
    const dangerProgress = this.dangerStartedAt === null ? 0 : Math.min(1, (this.elapsed - this.dangerStartedAt) / 1500);
    if (dangerProgress > 0) {
      context.fillStyle = `rgba(255, 87, 76, ${0.06 + dangerProgress * 0.1})`;
      context.fillRect(12, 0, this.width - 24, this.dangerLine);
    }
    mark("background");
    for (const body of Composite.allBodies(this.engine.world)) {
      const meta = this.bodies.get(body.id);
      if (meta) this.drawBody(context, body, meta);
    }
    mark("treasures");
    for (const particle of this.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      context.globalAlpha = alpha;
      context.fillStyle = `hsl(${particle.hue} 95% 70%)`;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * (0.65 + alpha * 0.55), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    mark("particles");
    if (preview && !this.previewBlockedByPendingDrop) {
      const x = this.clampX(preview.x, preview.tier), y = this.spawnY(preview.tier);
      this.drawSprite(context, preview.tier, x, y);
      context.save();
      context.globalAlpha = 0.38;
      context.strokeStyle = "#ffe9b2";
      context.setLineDash([3, 6]);
      context.beginPath();
      context.moveTo(x, y + this.radiusForTier(preview.tier) + 7);
      context.lineTo(x, this.height - 18);
      context.stroke();
      context.restore();
    }
    mark("preview");
    if (this.debugColliders) this.drawColliderDebug(context);
  }

  private drawBackground(context: CanvasRenderingContext2D): void {
    const { width, height } = this;
    const dpr = context.canvas.width / width;
    if (!this.background || Math.abs(this.backgroundDpr - dpr) > .01) {
      const pixelsWide = Math.max(1, Math.round(width * dpr)), pixelsHigh = Math.max(1, Math.round(height * dpr));
      const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(pixelsWide, pixelsHigh) : document.createElement("canvas");
      canvas.width = pixelsWide; canvas.height = pixelsHigh;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#1c4368"); gradient.addColorStop(.44, "#122d4d"); gradient.addColorStop(1, "#09172c");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 26; i++) {
        ctx.globalAlpha = i % 4 === 0 ? .32 : .16;
        ctx.fillStyle = i % 3 === 0 ? "#ffe29a" : "#d7eeff";
        ctx.beginPath(); ctx.arc(((i * 79 + 29) % 997) / 997 * width, ((i * 137 + 31) % 991) / 991 * height, i % 5 === 0 ? 1.6 : 1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const side = ctx.createLinearGradient(0, 0, width, 0);
      side.addColorStop(0, "#9a6127"); side.addColorStop(.5, "#d99c44"); side.addColorStop(1, "#603716");
      ctx.fillStyle = side; ctx.fillRect(0, 0, 12, height); ctx.fillRect(width - 12, 0, 12, height);
      ctx.fillStyle = "#a5682c"; ctx.fillRect(0, height - 15, width, 15);
      ctx.fillStyle = "#ffd280"; ctx.fillRect(11, height - 16, width - 22, 3);
      ctx.setLineDash([7, 7]); ctx.strokeStyle = "#ff8178"; ctx.lineWidth = 2; ctx.globalAlpha = .72;
      ctx.beginPath(); ctx.moveTo(13, this.dangerLine); ctx.lineTo(width - 13, this.dangerLine); ctx.stroke();
      this.background = canvas; this.backgroundDpr = dpr;
    }
    context.drawImage(this.background, 0, 0, width, height);
  }

  // One common scale preserves the intrinsic progression baked into the game PNGs.
  // Legacy size multipliers are intentionally not applied a second time.
  private spriteScale(): number { return REFERENCE_SPRITE_SCALE * Math.min(this.width / 390, this.height / 620); }
  private radiusForTier(tier: number): number {
    const [, , width, height] = SPRITE_PROFILES[tier - 1].game;
    return Math.max(width, height) * this.spriteScale() / 2;
  }
  private halfWidthForTier(tier: number): number { return SPRITE_PROFILES[tier - 1].game[2] * this.spriteScale() / 2; }
  private spawnY(tier: number): number {
    const halfHeight = SPRITE_PROFILES[tier - 1].game[3] * this.spriteScale() / 2;
    return Math.max(halfHeight + 14 * Math.min(this.width / 390, this.height / 620), this.height * .08);
  }

  private createTreasureBody(tier: number, x: number, y: number): Matter.Body {
    const definition = TREASURES[tier - 1], profile = SPRITE_PROFILES[tier - 1];
    const [sx, sy, sw, sh] = profile.game;
    const scale = this.spriteScale();
    const options: Matter.IChamferableBodyDefinition = {
      label: `schatz-merge-${definition.id}`, density: .0011 * definition.densityScale,
      friction: definition.friction, frictionStatic: definition.friction + .22,
      frictionAir: .012, restitution: definition.restitution, sleepThreshold: 50,
    };
    const polygon = (points: ReadonlyArray<RelativePoint>) => createPolygonBody(x, y, 1,
      points.map(([px, py]) => [(px - sx - sw / 2) * scale, (py - sy - sh / 2) * scale] as RelativePoint), options);
    // Only the goblet needs a compound: bowl, stem and foot avoid a large invisible hull.
    if (tier === 8) return createCompoundBody([
      polygon([[59,0],[285,0],[278,97],[231,137],[137,137],[76,97]]),
      polygon([[148,134],[216,134],[215,192],[143,192]]),
      polygon([[145,183],[215,183],[250,208],[254,235],[225,252],[111,252],[91,232],[103,211]]),
    ], options);
    return polygon(profile.hull);
  }

  private drawSprite(context: CanvasRenderingContext2D, tier: number, x: number, y: number): void {
    const image = this.sprites[tier - 1];
    if (!image) return;
    const [sx, sy, sw, sh] = SPRITE_PROFILES[tier - 1].game, scale = this.spriteScale();
    context.drawImage(image, sx, sy, sw, sh, x - sw * scale / 2, y - sh * scale / 2, sw * scale, sh * scale);
  }

  private drawColliderDebug(context: CanvasRenderingContext2D): void {
    context.save(); context.lineWidth = 1; context.font = "10px monospace";
    for (const body of Composite.allBodies(this.engine.world)) {
      const meta = this.bodies.get(body.id); if (!meta) continue;
      context.strokeStyle = body.isSleeping ? "#ffcc44" : "#66ffbb";
      for (const part of body.parts.length > 1 ? body.parts.slice(1) : [body]) {
        context.beginPath(); part.vertices.forEach((v, i) => i === 0 ? context.moveTo(v.x,v.y) : context.lineTo(v.x,v.y)); context.closePath(); context.stroke();
      }
      const { min, max } = body.bounds; context.strokeStyle = "#7fcfff";
      context.strokeRect(min.x,min.y,max.x-min.x,max.y-min.y);
      context.fillStyle = "white"; context.fillRect(body.position.x-2,body.position.y-2,4,4);
      context.fillText(`${meta.tier}/${body.id}${body.isSleeping ? " z" : ""}`,body.position.x+4,body.position.y);
    }
    context.restore();
  }

  private createBodyMeta(
    tier: number,
    body: Matter.Body,
    anchorX: number,
    anchorY: number,
    merged = false,
    awaitingPreviewAfterDrop = false,
  ): BodyMeta {
    return {
      tier,
      merged,
      renderOffsetXFactor: (anchorX - body.position.x) / this.radiusForTier(tier),
      renderOffsetYFactor: (anchorY - body.position.y) / this.radiusForTier(tier),
      awaitingPreviewAfterDrop,
    };
  }

  private updatePreviewGate(): void {
    if (!this.previewBlockedByPendingDrop) return;

    for (const body of Composite.allBodies(this.engine.world)) {
      const meta = this.bodies.get(body.id);
      if (!meta?.awaitingPreviewAfterDrop) continue;
      const [, , width, height] = SPRITE_PROFILES[meta.tier - 1].game;
      const radius = this.radiusForTier(meta.tier), scale = this.spriteScale();
      const cos = Math.cos(body.angle), sin = Math.sin(body.angle);
      const centerY = body.position.y + radius * (meta.renderOffsetXFactor * sin + meta.renderOffsetYFactor * cos);
      const visualTop = centerY - Math.abs(sin) * width * scale / 2 - Math.abs(cos) * height * scale / 2;
      if (Math.min(body.bounds.min.y, visualTop) > this.dangerLine) meta.awaitingPreviewAfterDrop = false;
    }

    const stillWaiting = [...this.bodies.values()].some((meta) => meta.awaitingPreviewAfterDrop);
    if (!stillWaiting) {
      this.previewBlockedByPendingDrop = false;
      this.callbacks.onPreviewReady?.();
    }
  }

  private rebuildWalls(): void {
    for (const wall of this.walls) Composite.remove(this.engine.world, wall);
    this.walls.length = 0;
    const wallThickness = 28;
    this.walls.push(
      Bodies.rectangle(-wallThickness / 2 + 5, this.height / 2, wallThickness, this.height + 100, { isStatic: true, friction: 0.8, label: "left-wall" }),
      Bodies.rectangle(this.width + wallThickness / 2 - 5, this.height / 2, wallThickness, this.height + 100, { isStatic: true, friction: 0.8, label: "right-wall" }),
      Bodies.rectangle(this.width / 2, this.height + 7, this.width + 80, 30, { isStatic: true, friction: 0.85, label: "floor" }),
    );
    Composite.add(this.engine.world, this.walls);
  }

  private tryMerge(firstPart: Matter.Body, secondPart: Matter.Body): boolean {
    if (this.stressScene && this.stressScene !== "chains") return false;
    const first = firstPart.parent ?? firstPart;
    const second = secondPart.parent ?? secondPart;
    const firstMeta = this.bodies.get(first.id);
    const secondMeta = this.bodies.get(second.id);
    if (!firstMeta || !secondMeta || firstMeta.merged || secondMeta.merged || firstMeta.tier !== secondMeta.tier) return false;

    firstMeta.merged = true;
    secondMeta.merged = true;
    const tier = firstMeta.tier;
    const awaitingPreviewAfterDrop = firstMeta.awaitingPreviewAfterDrop || secondMeta.awaitingPreviewAfterDrop;
    const terminal = tier === TREASURES.length;
    const nextTier = terminal ? null : tier + 1;
    const x = (first.position.x + second.position.x) / 2;
    const y = (first.position.y + second.position.y) / 2;
    const changedBounds = {
      min: { x: Math.min(first.bounds.min.x, second.bounds.min.x), y: Math.min(first.bounds.min.y, second.bounds.min.y) },
      max: { x: Math.max(first.bounds.max.x, second.bounds.max.x), y: Math.max(first.bounds.max.y, second.bounds.max.y) },
    };
    const velocity = Vector.mult(Vector.add(first.velocity, second.velocity), 0.5);
    const angularVelocity = (first.angularVelocity + second.angularVelocity) / 2;
    Composite.remove(this.engine.world, first);
    Composite.remove(this.engine.world, second);
    this.bodies.delete(first.id);
    this.bodies.delete(second.id);

    if (nextTier !== null) {
      const merged = this.createTreasureBody(nextTier, x, y);
      const meta = this.createBodyMeta(nextTier, merged, x, y, false, awaitingPreviewAfterDrop);
      this.placeMergedBody(merged);
      changedBounds.min.x = Math.min(changedBounds.min.x, merged.bounds.min.x);
      changedBounds.max.x = Math.max(changedBounds.max.x, merged.bounds.max.x);
      Body.setVelocity(merged, velocity);
      Body.setAngularVelocity(merged, angularVelocity);
      Composite.add(this.engine.world, merged);
      this.bodies.set(merged.id, meta);
    }

    this.wakeAfterSupportChange(changedBounds);
    this.spawnParticles(x, y, tier, terminal);
    this.callbacks.onMerge({ tier, nextTier, points: TREASURES[tier - 1].score, x, y, terminal });
    return true;
  }

  private wakeAfterSupportChange(changed: Matter.Bounds): void {
    const candidates = Composite.allBodies(this.engine.world).filter(b => this.bodies.has(b.id));
    // Propagate up through the affected support columns, including sleeping bridges.
    const regions = [changed];
    const visited = new Set<number>();
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      for (const body of candidates) {
        if (visited.has(body.id) || body.bounds.min.y > region.max.y + 6 || body.bounds.max.x < region.min.x - 6 || body.bounds.min.x > region.max.x + 6) continue;
        visited.add(body.id); Sleeping.set(body, false); regions.push(body.bounds);
      }
    }
  }

  private physicalBounds(body: Matter.Body): Matter.Bounds {
    return {
      min: { x: Math.min(...body.vertices.map(v => v.x)), y: Math.min(...body.vertices.map(v => v.y)) },
      max: { x: Math.max(...body.vertices.map(v => v.x)), y: Math.max(...body.vertices.map(v => v.y)) },
    };
  }

  private constrainToContainer(body: Matter.Body): void {
    const bounds = this.physicalBounds(body);
    const dx = bounds.min.x < 4.7 ? 5 - bounds.min.x : bounds.max.x > this.width - 4.7 ? this.width - 5 - bounds.max.x : 0;
    const dy = bounds.max.y > this.height - 7.7 ? this.height - 8 - bounds.max.y : 0;
    if (!dx && !dy) return;
    // Exact static wall planes close the finite solver's residual penetration.
    // Translating both current and previous positions adds no kinetic energy.
    if (body.isSleeping) Sleeping.set(body, false);
    Body.translate(body, { x: dx, y: dy });
    Body.setVelocity(body, { x: dx && body.velocity.x * dx < 0 ? 0 : body.velocity.x, y: dy && body.velocity.y > 0 ? 0 : body.velocity.y });
  }

  private stabilizeContacts(): void {
    const live = Composite.allBodies(this.engine.world).filter(b => this.bodies.has(b.id));
    for (const body of live) if (!body.isSleeping) this.constrainToContainer(body);
    // Re-evaluate only contacts with a large residual. More global solver iterations
    // did not prevent a large merge pushing a lighter neighbor through a side wall.
    for (let pass = 0; pass < 3; pass++) {
      for (const pair of this.engine.pairs.list) {
        if (!pair.isActive || pair.isSensor) continue;
        const a = pair.bodyA.parent, b = pair.bodyB.parent;
        if ((!a.isStatic && !this.bodies.has(a.id)) || (!b.isStatic && !this.bodies.has(b.id))) continue;
        if ((a.isStatic || a.isSleeping) && (b.isStatic || b.isSleeping)) continue;
        const collision = Matter.Collision.collides(pair.bodyA, pair.bodyB);
        if (!collision || collision.depth < 1) continue;
        const { normal } = collision;
        const mobility = (body: Matter.Body, sign: number) => {
          if (body.isStatic) return 0;
          const bounds = this.physicalBounds(body);
          if ((normal.x * sign < -.1 && bounds.min.x <= 5.1) || (normal.x * sign > .1 && bounds.max.x >= this.width - 5.1) || (normal.y * sign > .1 && bounds.max.y >= this.height - 8.1)) return 0;
          return body.inverseMass;
        };
        const ma = mobility(a, 1), mb = mobility(b, -1), total = ma + mb;
        if (!total) continue;
        for (const [body, share, sign] of [[a, ma / total, 1], [b, mb / total, -1]] as const) {
          const distance = Math.min(4, (collision.depth - .5) * share);
          if (distance <= 0) continue;
          if (body.isSleeping) Sleeping.set(body, false);
          Body.translate(body, { x: normal.x * distance * sign, y: normal.y * distance * sign });
          this.constrainToContainer(body);
        }
      }
    }
  }

  private placeMergedBody(body: Matter.Body): void {
    const neighbors = Composite.allBodies(this.engine.world);
    const clampToWorld = () => {
      const dx = body.bounds.min.x < 6 ? 6 - body.bounds.min.x : body.bounds.max.x > this.width - 6 ? this.width - 6 - body.bounds.max.x : 0;
      const dy = body.bounds.max.y > this.height - 8 ? this.height - 8 - body.bounds.max.y : 0;
      if (dx || dy) Body.translate(body, { x: dx, y: dy });
    };
    clampToWorld();
    const origin = { ...body.position };
    const cost = () => Query.collides(body, neighbors).reduce((sum, c) => sum + c.depth * c.depth, 0);
    let bestCost = cost(), best = origin;
    const span = Math.min(48, (body.bounds.max.y - body.bounds.min.y) * .4);
    for (const [dx, dy] of [[0,-span/3],[0,-span*2/3],[0,-span],[-span/3,-span/3],[span/3,-span/3],[-span/3,-span*2/3],[span/3,-span*2/3],[-span/3,-span],[span/3,-span]]) {
      Body.setPosition(body, { x: origin.x + dx, y: origin.y + dy }); clampToWorld();
      const candidateCost = cost();
      if (candidateCost < bestCost) { bestCost = candidateCost; best = { ...body.position }; }
      if (bestCost < .01) break;
    }
    Body.setPosition(body, best);
  }

  private tryImpact(firstPart: Matter.Body, secondPart: Matter.Body): void {
    const first = firstPart.parent ?? firstPart;
    const second = secondPart.parent ?? secondPart;
    const meta = this.bodies.get(first.id) ?? this.bodies.get(second.id);
    if (!meta || this.elapsed - this.lastImpactAt < 150) return;
    const relativeSpeed = Vector.magnitude(Vector.sub(first.velocity, second.velocity));
    if (relativeSpeed < 2.1) return;
    this.lastImpactAt = this.elapsed;
    this.callbacks.onImpact(meta.tier);
  }

  private checkForGameOver(): void {
    if (this.stressScene) return;
    const hasSettledAboveLine = Composite.allBodies(this.engine.world).some((body) => {
      const meta = this.bodies.get(body.id);
      return Boolean(meta && !meta.merged && body.bounds.min.y < this.dangerLine && body.speed < 1.6);
    });

    if (!hasSettledAboveLine) {
      this.dangerStartedAt = null;
      return;
    }

    if (this.dangerStartedAt === null) this.dangerStartedAt = this.elapsed;
    if (this.elapsed - this.dangerStartedAt >= 1500) {
      this.gameOver = true;
      this.callbacks.onGameOver();
    }
  }

  private updateEffects(delta: number): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life -= delta;
      particle.x += particle.vx * delta / 16.7;
      particle.y += particle.vy * delta / 16.7;
      particle.vy += 0.09 * delta / 16.7;
      if (particle.life <= 0) this.particles.splice(index, 1);
    }

  }

  private spawnParticles(x: number, y: number, tier: number, terminal: boolean): void {
    const budget = QUALITY[this.quality];
    const count = Math.min(terminal ? budget.burst * 2 : budget.burst, budget.particles - this.particles.length);
    const life = terminal ? 1900 : 620 + tier * 30;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (terminal ? 2.3 : 1.2) + Math.random() * (terminal ? 5 : 2.7);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.4,
        life: life * (0.62 + Math.random() * 0.55),
        maxLife: life,
        size: (terminal ? 2.8 : 1.8) + Math.random() * (terminal ? 4.8 : 2.4),
        hue: tier >= 8 ? 43 + Math.random() * 31 : 35 + Math.random() * 22,
      });
    }
  }

  private drawBody(context: CanvasRenderingContext2D, body: Matter.Body, meta: BodyMeta): void {
    context.save();
    context.translate(body.position.x, body.position.y);
    context.rotate(body.angle);
    this.drawSprite(context, meta.tier, this.radiusForTier(meta.tier) * meta.renderOffsetXFactor, this.radiusForTier(meta.tier) * meta.renderOffsetYFactor);
    context.restore();
  }
}

function WorldAdd(world: Matter.World, body: Matter.Body): void {
  Composite.add(world, body);
}
