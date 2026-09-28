import Matter from "matter-js";

export type ColliderType = "nugget" | "circle" | "stack" | "gem" | "sack" | "box" | "goblet" | "wide";

export type TreasureDefinition = {
  id: string;
  name: string;
  tier: number;
  sprite: string;
  colliderType: ColliderType;
  size: number;
  mass: number;
  friction: number;
  restitution: number;
  score: number;
};

export const TREASURES: TreasureDefinition[] = [
  { id: "nugget", name: "Goldnugget", tier: 1, sprite: "nugget", colliderType: "nugget", size: 1, mass: 1, friction: 0.2, restitution: 0.035, score: 0 },
  { id: "coin", name: "Goldmünze", tier: 2, sprite: "coin", colliderType: "circle", size: 1.12, mass: 1.12, friction: 0.12, restitution: 0.045, score: 10 },
  { id: "coin-stack", name: "2er-Münzstapel", tier: 3, sprite: "coin-stack", colliderType: "stack", size: 1.24, mass: 1.3, friction: 0.24, restitution: 0.03, score: 20 },
  { id: "small-gem", name: "Kleiner Edelstein", tier: 4, sprite: "small-gem", colliderType: "gem", size: 1.36, mass: 1.5, friction: 0.16, restitution: 0.035, score: 40 },
  { id: "large-gem", name: "Großer Edelstein", tier: 5, sprite: "large-gem", colliderType: "gem", size: 1.5, mass: 1.75, friction: 0.15, restitution: 0.035, score: 80 },
  { id: "gem-pouch", name: "Gold-/Edelsteinbeutel", tier: 6, sprite: "gem-pouch", colliderType: "sack", size: 1.67, mass: 2.1, friction: 0.3, restitution: 0.025, score: 160 },
  { id: "jewel-box", name: "Schatzkästchen", tier: 7, sprite: "jewel-box", colliderType: "box", size: 1.84, mass: 2.55, friction: 0.42, restitution: 0.02, score: 320 },
  { id: "goblet", name: "Goldener Kelch", tier: 8, sprite: "goblet", colliderType: "goblet", size: 2.02, mass: 2.9, friction: 0.2, restitution: 0.025, score: 640 },
  { id: "crown", name: "Krone", tier: 9, sprite: "crown", colliderType: "wide", size: 2.2, mass: 3.4, friction: 0.34, restitution: 0.02, score: 1280 },
  { id: "treasure-chest", name: "Schatztruhe", tier: 10, sprite: "treasure-chest", colliderType: "box", size: 2.42, mass: 4.1, friction: 0.46, restitution: 0.015, score: 2560 },
  { id: "king-treasure", name: "Königsschatz", tier: 11, sprite: "king-treasure", colliderType: "wide", size: 2.66, mass: 4.8, friction: 0.36, restitution: 0.015, score: 5120 },
  { id: "golden-throne", name: "Goldener Thron", tier: 12, sprite: "golden-throne", colliderType: "wide", size: 2.9, mass: 5.8, friction: 0.48, restitution: 0.01, score: 10240 },
];

const DROP_WEIGHTS = [44, 32, 18, 6];
const BASE_RADIUS = 0.038;
const BODY_SCALE = 0.001;
const FIXED_STEP_MS = 1000 / 60;
const SHAPES: Record<ColliderType, ReadonlyArray<readonly [number, number]>> = {
  nugget: [[-0.95, -0.24], [-0.72, -0.78], [-0.12, -0.96], [0.72, -0.68], [0.96, 0.08], [0.46, 0.78], [-0.52, 0.9], [-0.98, 0.34]],
  circle: [],
  stack: [],
  gem: [[0, -1], [0.75, -0.48], [0.84, 0.2], [0.5, 0.86], [-0.5, 0.86], [-0.84, 0.2], [-0.75, -0.48]],
  sack: [[-0.68, -0.52], [-0.24, -0.86], [0.15, -0.78], [0.68, -0.52], [0.94, 0.12], [0.62, 0.75], [0, 0.94], [-0.68, 0.68], [-0.94, 0.12]],
  box: [],
  goblet: [[-0.82, -0.82], [0.82, -0.82], [0.6, -0.16], [0.2, 0.22], [0.17, 0.68], [0.64, 0.72], [0.72, 0.94], [-0.72, 0.94], [-0.64, 0.72], [-0.17, 0.68], [-0.2, 0.22], [-0.6, -0.16]],
  wide: [],
};

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
};

type BodyMeta = { tier: number; merged: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number };
type Pop = { x: number; y: number; tier: number; time: number; duration: number };

const { Bodies, Body, Composite, Engine, Events, Vector } = Matter;

export class SchatzMergeEngine {
  private readonly engine = Engine.create({ enableSleeping: true });
  private readonly callbacks: EngineCallbacks;
  private readonly bodies = new Map<number, BodyMeta>();
  private readonly walls: Matter.Body[] = [];
  private readonly particles: Particle[] = [];
  private readonly pops: Pop[] = [];
  private width = 1;
  private height = 1;
  private elapsed = 0;
  private accumulator = 0;
  private lastImpactAt = Number.NEGATIVE_INFINITY;
  private dangerStartedAt: number | null = null;
  private gameOver = false;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.engine.gravity.x = 0;
    this.engine.gravity.y = 1;
    this.engine.gravity.scale = BODY_SCALE;
    this.engine.positionIterations = 8;
    this.engine.velocityIterations = 6;
    this.engine.constraintIterations = 4;
    Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        if (!this.tryMerge(pair.bodyA, pair.bodyB)) this.tryImpact(pair.bodyA, pair.bodyB);
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
    const scaleX = safeWidth / this.width;
    const scaleY = safeHeight / this.height;
    const needsScale = this.width > 1 && this.height > 1 && (Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01);

    if (needsScale) {
      const scale = Math.min(scaleX, scaleY);
      for (const body of Composite.allBodies(this.engine.world)) {
        if (body.isStatic || !this.bodies.has(body.id)) continue;
        Body.scale(body, scale, scale);
        Body.setPosition(body, { x: body.position.x * scaleX, y: body.position.y * scaleY });
        Body.setVelocity(body, { x: body.velocity.x * scaleX, y: body.velocity.y * scaleY });
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
    if (this.gameOver) return;
    const safeTier = Math.max(1, Math.min(TREASURES.length, tier));
    const body = this.createTreasureBody(safeTier, this.clampX(x, safeTier), this.spawnY(safeTier));
    WorldAdd(this.engine.world, body);
    this.bodies.set(body.id, { tier: safeTier, merged: false });
    this.callbacks.onDrop();
  }

  reset(): void {
    for (const body of Composite.allBodies(this.engine.world)) {
      if (!body.isStatic) Composite.remove(this.engine.world, body);
    }
    this.bodies.clear();
    this.particles.length = 0;
    this.pops.length = 0;
    this.elapsed = 0;
    this.accumulator = 0;
    this.lastImpactAt = Number.NEGATIVE_INFINITY;
    this.dangerStartedAt = null;
    this.gameOver = false;
  }

  update(deltaMs: number): void {
    if (this.gameOver) return;
    this.accumulator += Math.max(1, Math.min(34, deltaMs));
    while (this.accumulator >= FIXED_STEP_MS) {
      this.elapsed += FIXED_STEP_MS;
      Engine.update(this.engine, FIXED_STEP_MS);
      this.updateEffects(FIXED_STEP_MS);
      this.accumulator -= FIXED_STEP_MS;
    }
    this.checkForGameOver();
  }

  draw(context: CanvasRenderingContext2D, preview: { tier: number; x: number } | null): void {
    const { width, height } = this;
    context.clearRect(0, 0, width, height);

    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#1c4368");
    background.addColorStop(0.44, "#122d4d");
    background.addColorStop(1, "#09172c");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.save();
    for (let index = 0; index < 26; index += 1) {
      const x = ((index * 79 + 29) % 997) / 997 * width;
      const y = ((index * 137 + 31) % 991) / 991 * height;
      context.globalAlpha = index % 4 === 0 ? 0.32 : 0.16;
      context.fillStyle = index % 3 === 0 ? "#ffe29a" : "#d7eeff";
      context.beginPath();
      context.arc(x, y, index % 5 === 0 ? 1.6 : 1, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();

    const side = context.createLinearGradient(0, 0, width, 0);
    side.addColorStop(0, "#9a6127");
    side.addColorStop(0.5, "#d99c44");
    side.addColorStop(1, "#603716");
    context.fillStyle = side;
    context.fillRect(0, 0, 12, height);
    context.fillRect(width - 12, 0, 12, height);
    context.fillStyle = "#a5682c";
    context.fillRect(0, height - 15, width, 15);
    context.fillStyle = "#ffd280";
    context.fillRect(11, height - 16, width - 22, 3);

    context.save();
    context.setLineDash([7, 7]);
    context.strokeStyle = "#ff8178";
    context.lineWidth = 2;
    context.globalAlpha = 0.72;
    context.beginPath();
    context.moveTo(13, this.dangerLine);
    context.lineTo(width - 13, this.dangerLine);
    context.stroke();
    context.restore();

    const dangerProgress = this.dangerStartedAt === null ? 0 : Math.min(1, (this.elapsed - this.dangerStartedAt) / 1500);
    if (dangerProgress > 0) {
      context.fillStyle = `rgba(255, 87, 76, ${0.06 + dangerProgress * 0.1})`;
      context.fillRect(12, 0, width - 24, this.dangerLine);
    }

    for (const body of Composite.allBodies(this.engine.world)) {
      const meta = this.bodies.get(body.id);
      if (meta) this.drawBody(context, body, meta.tier);
    }

    for (const particle of this.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = `hsl(${particle.hue} 95% 70%)`;
      context.shadowColor = context.fillStyle;
      context.shadowBlur = 12;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * (0.65 + alpha * 0.55), 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    if (preview) {
      const x = this.clampX(preview.x, preview.tier);
      const y = Math.max(this.radiusForTier(preview.tier) + 17, this.height * 0.075);
      context.save();
      context.globalAlpha = 0.94;
      context.shadowColor = "#ffe5a0";
      context.shadowBlur = 18;
      drawTreasure(context, preview.tier, x, y, this.radiusForTier(preview.tier));
      context.restore();
      context.save();
      context.globalAlpha = 0.45;
      context.strokeStyle = "#ffe9b2";
      context.setLineDash([3, 6]);
      context.beginPath();
      context.moveTo(x, y + this.radiusForTier(preview.tier) + 7);
      context.lineTo(x, height - 18);
      context.stroke();
      context.restore();
    }
  }

  private radiusForTier(tier: number): number {
    const scale = Math.min(this.width / 390, this.height / 620);
    return Math.max(8, this.width * BASE_RADIUS * TREASURES[tier - 1].size * Math.max(0.64, scale));
  }

  private halfWidthForTier(tier: number): number {
    const radius = this.radiusForTier(tier);
    const colliderType = TREASURES[tier - 1].colliderType;
    if (colliderType === "stack") return radius * 1.125;
    if (colliderType === "box") return radius * 1.025;
    if (colliderType === "wide") return radius * 1.15;
    return radius;
  }

  private spawnY(tier: number): number {
    return Math.max(this.radiusForTier(tier) + 14, this.height * 0.08);
  }

  private createTreasureBody(tier: number, x: number, y: number): Matter.Body {
    const definition = TREASURES[tier - 1];
    const radius = this.radiusForTier(tier);
    const options: Matter.IChamferableBodyDefinition = {
      label: `schatz-merge-${definition.id}`,
      density: 0.0011 * definition.mass,
      friction: definition.friction,
      frictionStatic: definition.friction + 0.22,
      frictionAir: 0.012,
      restitution: definition.restitution,
      sleepThreshold: 50,
    };

    if (definition.colliderType === "circle") return Bodies.circle(x, y, radius, options, 16);
    if (definition.colliderType === "stack") return Bodies.rectangle(x, y, radius * 2.25, radius * 1.32, options);
    if (definition.colliderType === "box") return Bodies.rectangle(x, y, radius * 2.05, radius * 1.6, options);
    if (definition.colliderType === "wide") return Bodies.rectangle(x, y, radius * 2.3, radius * 1.5, options);
    const points = SHAPES[definition.colliderType].map(([px, py]) => ({ x: x + px * radius, y: y + py * radius }));
    const body = Bodies.fromVertices(x, y, [points], options, true);
    return body ?? Bodies.circle(x, y, radius, options, 10);
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

  private tryMerge(first: Matter.Body, second: Matter.Body): boolean {
    const firstMeta = this.bodies.get(first.id);
    const secondMeta = this.bodies.get(second.id);
    if (!firstMeta || !secondMeta || firstMeta.merged || secondMeta.merged || firstMeta.tier !== secondMeta.tier) return false;

    firstMeta.merged = true;
    secondMeta.merged = true;
    const tier = firstMeta.tier;
    const terminal = tier === TREASURES.length;
    const nextTier = terminal ? null : tier + 1;
    const x = (first.position.x + second.position.x) / 2;
    const y = (first.position.y + second.position.y) / 2;
    const velocity = Vector.mult(Vector.add(first.velocity, second.velocity), 0.5);
    const angularVelocity = (first.angularVelocity + second.angularVelocity) / 2;
    Composite.remove(this.engine.world, first);
    Composite.remove(this.engine.world, second);
    this.bodies.delete(first.id);
    this.bodies.delete(second.id);

    if (nextTier !== null) {
      const merged = this.createTreasureBody(nextTier, x, y);
      Body.setVelocity(merged, velocity);
      Body.setAngularVelocity(merged, angularVelocity);
      Composite.add(this.engine.world, merged);
      this.bodies.set(merged.id, { tier: nextTier, merged: false });
    }

    this.pops.push({ x, y, tier, time: 0, duration: tier >= 8 ? 660 : 420 });
    this.spawnParticles(x, y, tier, terminal);
    this.callbacks.onMerge({ tier, nextTier, points: TREASURES[tier - 1].score, x, y, terminal });
    return true;
  }

  private tryImpact(first: Matter.Body, second: Matter.Body): void {
    const meta = this.bodies.get(first.id) ?? this.bodies.get(second.id);
    if (!meta || this.elapsed - this.lastImpactAt < 150) return;
    const relativeSpeed = Vector.magnitude(Vector.sub(first.velocity, second.velocity));
    if (relativeSpeed < 2.1) return;
    this.lastImpactAt = this.elapsed;
    this.callbacks.onImpact(meta.tier);
  }

  private checkForGameOver(): void {
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
    for (let index = this.pops.length - 1; index >= 0; index -= 1) {
      this.pops[index].time += delta;
      if (this.pops[index].time >= this.pops[index].duration) this.pops.splice(index, 1);
    }
  }

  private spawnParticles(x: number, y: number, tier: number, terminal: boolean): void {
    const count = terminal ? 64 : 8 + tier * 2;
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

  private drawBody(context: CanvasRenderingContext2D, body: Matter.Body, tier: number): void {
    const pop = this.pops.find((effect) => effect.tier === tier && Math.hypot(effect.x - body.position.x, effect.y - body.position.y) < this.radiusForTier(tier) * (tier >= 8 ? 3.4 : 2.4));
    let scale = 1;
    if (pop) {
      const progress = pop.time / pop.duration;
      scale = 1 + Math.sin(Math.min(1, progress) * Math.PI) * (tier >= 8 ? 0.3 : 0.2);
    }
    context.save();
    context.translate(body.position.x, body.position.y);
    context.rotate(body.angle);
    context.scale(scale, scale);
    context.shadowColor = tier >= 8 ? "#ffc95799" : "#050d1a88";
    context.shadowBlur = tier >= 8 ? 19 : 9;
    context.shadowOffsetY = 4;
    drawTreasure(context, tier, 0, 0, this.radiusForTier(tier));
    context.restore();
  }
}

function WorldAdd(world: Matter.World, body: Matter.Body): void {
  Composite.add(world, body);
}

function roundedBox(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawTreasure(context: CanvasRenderingContext2D, tier: number, x: number, y: number, radius: number): void {
  const gold = context.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  gold.addColorStop(0, "#fff2a4");
  gold.addColorStop(0.3, "#ffd24d");
  gold.addColorStop(0.72, "#d78a20");
  gold.addColorStop(1, "#fff0a2");
  const darkGold = "#9b5b17";
  const ruby = "#b52f3c";
  const blue = "#5cd5f5";
  const emerald = "#29b884";
  const outline = "#784219";
  const path = (points: Array<[number, number]>, fill: string | CanvasGradient | CanvasPattern, stroke = outline) => {
    context.beginPath();
    points.forEach(([px, py], index) => (index === 0 ? context.moveTo(x + px * radius, y + py * radius) : context.lineTo(x + px * radius, y + py * radius)));
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.lineWidth = Math.max(1.2, radius * 0.09);
    context.strokeStyle = stroke;
    context.stroke();
  };
  const sparkle = (sx: number, sy: number, size: number) => {
    context.save();
    context.fillStyle = "#fff8cf";
    context.beginPath();
    context.ellipse(x + sx * radius, y + sy * radius, size * radius, size * radius * 1.8, -0.6, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  if (tier === 1) {
    path([[-0.92, -0.17], [-0.62, -0.67], [-0.12, -0.9], [0.62, -0.69], [0.9, -0.05], [0.55, 0.73], [-0.48, 0.86], [-0.9, 0.39]], gold);
    path([[-0.54, -0.33], [-0.08, -0.7], [0.4, -0.51], [0.22, -0.16]], "#fff09b", "#e3a42d");
    sparkle(0.28, 0.25, 0.07);
    return;
  }

  if (tier === 2) {
    context.beginPath();
    context.ellipse(x, y, radius * 0.85, radius * 0.85, 0, 0, Math.PI * 2);
    context.fillStyle = gold;
    context.fill();
    context.lineWidth = Math.max(1.5, radius * 0.1);
    context.strokeStyle = darkGold;
    context.stroke();
    context.beginPath();
    context.ellipse(x, y, radius * 0.64, radius * 0.64, 0, 0, Math.PI * 2);
    context.strokeStyle = "#fff0a1";
    context.lineWidth = Math.max(1.2, radius * 0.055);
    context.stroke();
    context.fillStyle = "#fff0a1";
    context.font = `900 ${radius * 0.82}px Georgia`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("✦", x, y + radius * 0.02);
    sparkle(-0.34, -0.38, 0.055);
    return;
  }

  if (tier === 3) {
    for (let layer = 0; layer < 2; layer += 1) {
      context.beginPath();
      context.ellipse(x, y + radius * (0.22 - layer * 0.38), radius * 0.88, radius * 0.35, 0, 0, Math.PI * 2);
      context.fillStyle = layer === 1 ? "#ffe16c" : "#cc7a20";
      context.fill();
      context.strokeStyle = darkGold;
      context.lineWidth = Math.max(1.2, radius * 0.07);
      context.stroke();
      context.beginPath();
      context.ellipse(x, y + radius * (0.4 - layer * 0.3), radius * 0.66, radius * 0.18, 0, Math.PI, Math.PI * 2);
      context.strokeStyle = "#fff1a2";
      context.stroke();
    }
    return;
  }

  if (tier === 4 || tier === 5) {
    const fill = tier === 4 ? blue : "#fa5168";
    const points: Array<[number, number]> = [[0, -0.98], [0.72, -0.49], [0.86, 0.22], [0.49, 0.84], [-0.49, 0.84], [-0.86, 0.22], [-0.72, -0.49]];
    path(points, fill, tier === 4 ? "#176e9b" : "#86212e");
    path([[0, -0.7], [0.49, -0.35], [0, 0.06]], "#d9fbff", "#b6efff");
    path([[0, -0.7], [0, 0.06], [-0.5, -0.35]], tier === 4 ? "#92f0f7" : "#ffadb0", tier === 4 ? "#5ebbd7" : "#e06c78");
    path([[0, 0.06], [0.49, -0.35], [0.55, 0.23], [0, 0.7]], tier === 4 ? "#2693c5" : "#c3294a", tier === 4 ? "#176e9b" : "#86212e");
    path([[0, 0.06], [0, 0.7], [-0.55, 0.23], [-0.49, -0.35]], tier === 4 ? "#4ac5dc" : "#e33b54", tier === 4 ? "#176e9b" : "#86212e");
    return;
  }

  if (tier === 6) {
    context.beginPath();
    context.moveTo(x - radius * 0.68, y - radius * 0.38);
    context.quadraticCurveTo(x - radius, y + radius * 0.36, x - radius * 0.25, y + radius * 0.83);
    context.quadraticCurveTo(x + radius * 0.7, y + radius * 0.97, x + radius * 0.82, y + radius * 0.1);
    context.quadraticCurveTo(x + radius * 0.82, y - radius * 0.35, x + radius * 0.42, y - radius * 0.56);
    context.lineTo(x + radius * 0.18, y - radius * 0.83);
    context.quadraticCurveTo(x, y - radius * 0.51, x - radius * 0.18, y - radius * 0.81);
    context.closePath();
    context.fillStyle = "#a83f2c";
    context.fill();
    context.lineWidth = Math.max(1.5, radius * 0.09);
    context.strokeStyle = outline;
    context.stroke();
    context.beginPath();
    context.moveTo(x - radius * 0.5, y - radius * 0.47);
    context.quadraticCurveTo(x, y - radius * 0.18, x + radius * 0.48, y - radius * 0.48);
    context.strokeStyle = gold;
    context.lineWidth = Math.max(2, radius * 0.16);
    context.stroke();
    context.beginPath();
    context.arc(x + radius * 0.13, y + radius * 0.13, radius * 0.28, 0, Math.PI * 2);
    context.fillStyle = emerald;
    context.fill();
    context.strokeStyle = "#d3fff1";
    context.lineWidth = Math.max(1.2, radius * 0.06);
    context.stroke();
    sparkle(-0.46, -0.14, 0.055);
    return;
  }

  if (tier === 7 || tier === 10) {
    const chestWidth = radius * (tier === 7 ? 1.55 : 1.95);
    const chestHeight = radius * (tier === 7 ? 1.13 : 1.38);
    const lidHeight = chestHeight * 0.56;
    context.beginPath();
    context.moveTo(x - chestWidth * 0.5, y - chestHeight * 0.1);
    context.quadraticCurveTo(x - chestWidth * 0.48, y - chestHeight * 0.56, x - chestWidth * 0.27, y - chestHeight * 0.57);
    context.lineTo(x + chestWidth * 0.27, y - chestHeight * 0.57);
    context.quadraticCurveTo(x + chestWidth * 0.49, y - chestHeight * 0.51, x + chestWidth * 0.5, y - chestHeight * 0.08);
    context.lineTo(x + chestWidth * 0.46, y + chestHeight * 0.02);
    context.lineTo(x - chestWidth * 0.46, y + chestHeight * 0.02);
    context.closePath();
    context.fillStyle = "#a45324";
    context.fill();
    context.strokeStyle = outline;
    context.lineWidth = Math.max(1.5, radius * 0.085);
    context.stroke();
    roundedBox(context, x - chestWidth * 0.5, y - chestHeight * 0.05, chestWidth, chestHeight * 0.68, radius * 0.12);
    context.fillStyle = "#b76427";
    context.fill();
    context.strokeStyle = outline;
    context.stroke();
    context.fillStyle = gold;
    context.fillRect(x - chestWidth * 0.44, y + chestHeight * 0.12, chestWidth * 0.88, Math.max(2, radius * 0.14));
    context.fillRect(x - chestWidth * 0.09, y - chestHeight * 0.48, Math.max(3, radius * 0.18), chestHeight * 1.08);
    context.beginPath();
    context.arc(x, y + chestHeight * 0.26, radius * 0.15, 0, Math.PI * 2);
    context.fillStyle = "#fff09d";
    context.fill();
    context.strokeStyle = darkGold;
    context.stroke();
    return;
  }

  if (tier === 8) {
    path([[-0.72, -0.78], [0.72, -0.78], [0.47, -0.08], [0.22, 0.2], [0.18, 0.52], [0.52, 0.58], [0.7, 0.82], [-0.7, 0.82], [-0.52, 0.58], [-0.18, 0.52], [-0.22, 0.2], [-0.47, -0.08]], gold);
    context.beginPath();
    context.ellipse(x, y - radius * 0.76, radius * 0.72, radius * 0.22, 0, 0, Math.PI * 2);
    context.fillStyle = "#fff0a5";
    context.fill();
    context.strokeStyle = darkGold;
    context.lineWidth = Math.max(1.4, radius * 0.07);
    context.stroke();
    return;
  }

  if (tier === 9) {
    path([[-0.9, -0.22], [-0.82, -0.78], [-0.34, -0.35], [0, -0.98], [0.34, -0.35], [0.82, -0.78], [0.9, -0.22], [0.72, 0.6], [-0.72, 0.6]], gold);
    context.fillStyle = "#bd2d42";
    roundedBox(context, x - radius * 0.75, y + radius * 0.24, radius * 1.5, radius * 0.3, radius * 0.08);
    context.fill();
    context.strokeStyle = outline;
    context.lineWidth = Math.max(1, radius * 0.05);
    context.stroke();
    for (const gemX of [-0.55, 0, 0.55]) {
      context.beginPath();
      context.arc(x + gemX * radius, y + radius * 0.36, radius * 0.1, 0, Math.PI * 2);
      context.fillStyle = blue;
      context.fill();
    }
    return;
  }

  if (tier === 11) {
    context.beginPath();
    context.ellipse(x, y + radius * 0.25, radius * 0.94, radius * 0.62, 0, 0, Math.PI * 2);
    context.fillStyle = "#a94424";
    context.fill();
    context.lineWidth = Math.max(1.5, radius * 0.09);
    context.strokeStyle = outline;
    context.stroke();
    context.beginPath();
    context.ellipse(x, y + radius * 0.16, radius * 0.85, radius * 0.5, 0, Math.PI, Math.PI * 2);
    context.fillStyle = gold;
    context.fill();
    context.strokeStyle = darkGold;
    context.stroke();
    for (let index = 0; index < 6; index += 1) {
      const angle = Math.PI + (index / 5) * Math.PI;
      context.beginPath();
      context.arc(x + Math.cos(angle) * radius * 0.58, y + radius * 0.17 + Math.sin(angle) * radius * 0.27, radius * 0.105, 0, Math.PI * 2);
      context.fillStyle = [blue, ruby, emerald][index % 3];
      context.fill();
      context.strokeStyle = "#fff2ba";
      context.lineWidth = Math.max(1, radius * 0.04);
      context.stroke();
    }
    sparkle(-0.4, 0.06, 0.06);
    return;
  }

  // Goldener Thron: bewusst breite, stabile Silhouette mit roter Polsterung.
  roundedBox(context, x - radius * 0.63, y - radius * 0.92, radius * 1.26, radius * 0.84, radius * 0.19);
  context.fillStyle = "#ad302c";
  context.fill();
  context.strokeStyle = darkGold;
  context.lineWidth = Math.max(1.5, radius * 0.09);
  context.stroke();
  context.fillStyle = gold;
  context.fillRect(x - radius * 0.75, y + radius * 0.12, radius * 1.5, radius * 0.22);
  roundedBox(context, x - radius * 0.52, y - radius * 0.25, radius * 1.04, radius * 0.68, radius * 0.12);
  context.fillStyle = "#bd3b35";
  context.fill();
  context.strokeStyle = darkGold;
  context.stroke();
  roundedBox(context, x - radius * 0.92, y - radius * 0.16, radius * 0.36, radius * 0.68, radius * 0.12);
  context.fillStyle = gold;
  context.fill();
  context.stroke();
  roundedBox(context, x + radius * 0.56, y - radius * 0.16, radius * 0.36, radius * 0.68, radius * 0.12);
  context.fillStyle = gold;
  context.fill();
  context.stroke();
  context.fillStyle = darkGold;
  context.fillRect(x - radius * 0.64, y + radius * 0.36, radius * 0.17, radius * 0.55);
  context.fillRect(x + radius * 0.47, y + radius * 0.36, radius * 0.17, radius * 0.55);
  context.fillStyle = "#fff2a3";
  context.beginPath();
  context.arc(x, y - radius * 0.57, radius * 0.14, 0, Math.PI * 2);
  context.fill();
}
