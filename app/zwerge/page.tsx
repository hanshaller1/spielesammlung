"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sitePath } from "../site-paths";
import { ACTIVE_LEVEL_SET, createLevelSet, type LevelSet } from "./level-templates";

let ACTIVE_RUNTIME_LEVEL_SET: LevelSet = ACTIVE_LEVEL_SET;
let NORMAL_LEVEL = ACTIVE_RUNTIME_LEVEL_SET.normal;
let BONUS_LEVEL = ACTIVE_RUNTIME_LEVEL_SET.bonus;
let BOSS_LEVEL = ACTIVE_RUNTIME_LEVEL_SET.boss;

const WIDTH = 400;
const HEIGHT = 560;
const DWARF_Y = 474;
const DWARF_RADIUS = 16;
const DWARF_HIT_RADIUS = 12;
const GAP = 34;
// Slightly quicker than the original 13.5 px step so branching paths stay fair.
const MOVE_STEP = 18;
const PICKAXE_SPEED = 310;
const SHOT_COOLDOWN = 900;
const BOSS_COMPLETION_TIME = 9000;
const TRIUMPH_MUSIC = { notes: [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5, 783.99], intervalMs: 360, leadDuration: 1.8, leadVolume: 0.2, bassDuration: 2.8, bassVolume: 0.12 };
let BONUS_DURATION = BONUS_LEVEL.durationMs;
let BONUS_TUNNEL_WIDTH = BONUS_LEVEL.tunnel.width;
let BONUS_SPEED = BONUS_LEVEL.tunnel.speed;
let BONUS_EXIT_WALL_Y = BONUS_LEVEL.exit.wallY;
let BONUS_EXIT_APPROACH_TIME = BONUS_LEVEL.exit.approachTimeMs;
let BONUS_EXIT_MIN_WIDTH = BONUS_LEVEL.tunnel.exitWidth;
let BONUS_EXIT_TAPER_LENGTH = BONUS_LEVEL.tunnel.taperLength;
let BONUS_CANDY_INTERVAL_MIN = BONUS_LEVEL.candy.intervalMinMs;
let BONUS_CANDY_INTERVAL_RANGE = BONUS_LEVEL.candy.intervalRangeMs;
let BONUS_EXIT_TIME = BONUS_LEVEL.exit.waitingTimeMs;
let BONUS_CLIMB_TIME = BONUS_LEVEL.exit.climbTimeMs;
const BONUS_LADDER_X = WIDTH / 2;
let BONUS_LADDER_REACH = BONUS_LEVEL.exit.ladderReach;
let FIRST_HATCH_DELAY_MIN = NORMAL_LEVEL.hatch.firstDelayMinMs;
let FIRST_HATCH_DELAY_RANGE = NORMAL_LEVEL.hatch.firstDelayRangeMs;
let NEXT_HATCH_DELAY_MIN = NORMAL_LEVEL.hatch.nextDelayMinMs;
let NEXT_HATCH_DELAY_RANGE = NORMAL_LEVEL.hatch.nextDelayRangeMs;
let HATCH_RETRY_DELAY = NORMAL_LEVEL.hatch.retryDelayMs;
let BOSS_TRIGGER_TIME = BOSS_LEVEL.triggerTimeMs;
let BOSS_APPROACH_TIME = BOSS_LEVEL.transition.approachTimeMs;
let BOSS_ENTER_TIME = BOSS_LEVEL.transition.enterTimeMs;
let BOSS_MAX_HEALTH = BOSS_LEVEL.enemy.maximumHealth;
let BOSS_VICTORY_TIME = BOSS_LEVEL.victory.durationMs;

function activateLevelSet(world: number) {
  ACTIVE_RUNTIME_LEVEL_SET = createLevelSet(world);
  NORMAL_LEVEL = ACTIVE_RUNTIME_LEVEL_SET.normal;
  BONUS_LEVEL = ACTIVE_RUNTIME_LEVEL_SET.bonus;
  BOSS_LEVEL = ACTIVE_RUNTIME_LEVEL_SET.boss;
  BONUS_DURATION = BONUS_LEVEL.durationMs;
  BONUS_TUNNEL_WIDTH = BONUS_LEVEL.tunnel.width;
  BONUS_SPEED = BONUS_LEVEL.tunnel.speed;
  BONUS_EXIT_WALL_Y = BONUS_LEVEL.exit.wallY;
  BONUS_EXIT_APPROACH_TIME = BONUS_LEVEL.exit.approachTimeMs;
  BONUS_EXIT_MIN_WIDTH = BONUS_LEVEL.tunnel.exitWidth;
  BONUS_EXIT_TAPER_LENGTH = BONUS_LEVEL.tunnel.taperLength;
  BONUS_CANDY_INTERVAL_MIN = BONUS_LEVEL.candy.intervalMinMs;
  BONUS_CANDY_INTERVAL_RANGE = BONUS_LEVEL.candy.intervalRangeMs;
  BONUS_EXIT_TIME = BONUS_LEVEL.exit.waitingTimeMs;
  BONUS_CLIMB_TIME = BONUS_LEVEL.exit.climbTimeMs;
  BONUS_LADDER_REACH = BONUS_LEVEL.exit.ladderReach;
  FIRST_HATCH_DELAY_MIN = NORMAL_LEVEL.hatch.firstDelayMinMs;
  FIRST_HATCH_DELAY_RANGE = NORMAL_LEVEL.hatch.firstDelayRangeMs;
  NEXT_HATCH_DELAY_MIN = NORMAL_LEVEL.hatch.nextDelayMinMs;
  NEXT_HATCH_DELAY_RANGE = NORMAL_LEVEL.hatch.nextDelayRangeMs;
  HATCH_RETRY_DELAY = NORMAL_LEVEL.hatch.retryDelayMs;
  BOSS_TRIGGER_TIME = BOSS_LEVEL.triggerTimeMs;
  BOSS_APPROACH_TIME = BOSS_LEVEL.transition.approachTimeMs;
  BOSS_ENTER_TIME = BOSS_LEVEL.transition.enterTimeMs;
  BOSS_MAX_HEALTH = BOSS_LEVEL.enemy.maximumHealth;
  BOSS_VICTORY_TIME = BOSS_LEVEL.victory.durationMs;
}
const LEGACY_HIGHSCORE_KEY = "hannas-spiele-zwergengold-highscore";

type HatColor = "blue" | "yellow" | "red";
type Difficulty = "easy" | "normal";
type Highscores = Record<Difficulty, number>;
const HIGHSCORE_KEYS: Record<Difficulty, string> = {
  easy: "hannas-spiele-zwergengold-highscore-easy",
  normal: "hannas-spiele-zwergengold-highscore-normal",
};
type ForcedObstacle = "random" | "wood" | "rock" | "chest";
type RockTestState = "none" | "whole" | "cracked" | "fractured";
type DeveloperStartLevel = "normal1" | "normal2" | "bonus1" | "bonus2" | "boss1" | "boss2";
type DeveloperSettings = {
  enabled: boolean;
  startLevel: DeveloperStartLevel;
  axeLevel: number;
  destroyedWood: number;
  unlimitedLives: boolean;
  invulnerable: boolean;
  speed: number;
  obstacleInterval: number;
  forcedObstacle: ForcedObstacle;
  spawnGold: boolean;
  spawnShield: boolean;
  spawnChest: boolean;
  rockTestState: RockTestState;
  rockHeartChance: number;
  rockGoldChance: number;
  showHitboxes: boolean;
  showFairness: boolean;
  tunnelWidth: number;
  instantCorner: boolean;
  startGold: number;
  randomSeed: string;
};
type TunnelOpening = { center: number; width: number };
type TunnelSegment = {
  y: number;
  center: number;
  width: number;
  turn: number;
  widthChange: number;
  corner: boolean;
  detailSeed: number;
  symmetric?: boolean;
  lightZone?: "bright" | "dim";
  torch?: boolean;
  openings: TunnelOpening[];
};
type Obstacle = { kind: "wood" | "rock" | "chest" | "candyChest"; x: number; y: number; width: number; height: number; angle: number; hits: number };
type Hatch = { x: number; y: number; width: number; height: number; hits: number; open: boolean };
type CandyKind = "candy" | "lollipop" | "chocolate";
type ToyKind = "cake" | "slice" | "icecream";
type BonusPhase = "none" | "active" | "exit" | "climbing";
type BossPhase = "none" | "approach" | "entering" | "fight" | "victory" | "completed";
type Collectible = {
  kind: "gold" | "gold5" | "heart" | "shield" | CandyKind | ToyKind | "gem-white" | "gem-green" | "gem-red" | "gem-purple";
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  scatterUntil: number;
};
type Projectile = { x: number; y: number; vx: number; vy: number; rotation: number; level: number };
type BossAttack = { kind: "axe" | "rock"; x: number; y: number; vx: number; vy: number; rotation: number; radius: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type Feedback = { x: number; y: number; text: string; color: string; life: number };

const HAT_PALETTES: Record<HatColor, { light: string; mid: string; dark: string; band: string; stitch: string }> = {
  blue: { light: "#68bdff", mid: "#247dcc", dark: "#123f77", band: "#3c96df", stitch: "#a4d9ff" },
  yellow: { light: "#ffe56d", mid: "#e4a91e", dark: "#89580a", band: "#f7c83e", stitch: "#fff2a7" },
  red: { light: "#ff6a55", mid: "#c93237", dark: "#7e1f2a", band: "#eb4b48", stitch: "#ff9c7b" },
};

const DEFAULT_DEVELOPER_SETTINGS: DeveloperSettings = {
  enabled: false,
  startLevel: "normal1",
  axeLevel: 3,
  destroyedWood: 30,
  unlimitedLives: false,
  invulnerable: false,
  speed: NORMAL_LEVEL.movement.baseSpeed,
  obstacleInterval: 2.2,
  forcedObstacle: "random",
  spawnGold: false,
  spawnShield: false,
  spawnChest: false,
  rockTestState: "none",
  rockHeartChance: 15,
  rockGoldChance: 25,
  showHitboxes: false,
  showFairness: false,
  tunnelWidth: NORMAL_LEVEL.tunnel.width,
  instantCorner: false,
  startGold: 0,
  randomSeed: "zwergengold",
};

let gameRandom = Math.random;

function createSeededRandom(seed: string) {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function dwarfMotion(now: number) {
  const stride = Math.sin(now / 105);
  return {
    stride,
    bob: Math.abs(stride) * 1.35,
    rightHandY: 5 - stride * 5,
  };
}

function openingEdges(opening: TunnelOpening) {
  return { left: opening.center - opening.width / 2, right: opening.center + opening.width / 2 };
}

function combinedOpening(openings: TunnelOpening[]): TunnelOpening {
  const left = Math.min(...openings.map((opening) => openingEdges(opening).left));
  const right = Math.max(...openings.map((opening) => openingEdges(opening).right));
  return { center: (left + right) / 2, width: right - left };
}

function irregularEdge(seed: number, progress: number, side: -1 | 1) {
  const phase = seed * 31.7 + side * 2.4;
  const boundaryBlend = Math.sin(progress * Math.PI);
  return (Math.sin(progress * Math.PI * 5 + phase) * 2.2
    + Math.sin(progress * Math.PI * 11 + phase * 1.7) * 1.15) * boundaryBlend;
}

function openingsAt(segments: TunnelSegment[], y: number): TunnelOpening[] {
  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index];
    const next = segments[index + 1];
    if (y >= current.y && y <= next.y) {
      const linearProgress = (y - current.y) / (next.y - current.y);
      // Tight corners still turn quickly, but no longer jump in one perfectly
      // straight line. Both edges receive their own stable rocky contour.
      const progress = current.corner
        ? linearProgress * linearProgress * (3 - 2 * linearProgress)
        : linearProgress;
      return current.openings.map((opening, openingIndex) => {
        const nextOpening = next.openings[openingIndex] ?? next.openings[0];
        const center = opening.center + (nextOpening.center - opening.center) * progress;
        const width = opening.width + (nextOpening.width - opening.width) * progress;
        const symmetricDetail = current.symmetric ? irregularEdge(current.detailSeed, linearProgress, 1) : 0;
        const left = center - width / 2 + (current.symmetric ? symmetricDetail : irregularEdge(current.detailSeed, linearProgress, -1));
        const right = center + width / 2 + (current.symmetric ? symmetricDetail : irregularEdge(current.detailSeed, linearProgress, 1));
        return { center: (left + right) / 2, width: Math.max(80, right - left) };
      });
    }
  }
  return [{ center: WIDTH / 2, width: 210 }];
}

function openingForX(segments: TunnelSegment[], y: number, x: number) {
  const openings = openingsAt(segments, y);
  return openings.find((opening) => Math.abs(x - opening.center) <= opening.width / 2)
    ?? openings.reduce((closest, opening) => Math.abs(x - opening.center) < Math.abs(x - closest.center) ? opening : closest);
}

function pointFitsOpening(segments: TunnelSegment[], x: number, y: number, radius = 0, margin = 0) {
  return openingsAt(segments, y).some((opening) => {
    const { left, right } = openingEdges(opening);
    return x - radius >= left + margin && x + radius <= right - margin;
  });
}

function earlierSegment(previous: TunnelSegment, y: number, level: number, corner = false, fixedWidth?: number): TunnelSegment {
  const minimumWidth = Math.max(NORMAL_LEVEL.tunnel.minimumWidth, 150 - (level - 1) * NORMAL_LEVEL.tunnel.minimumWidthStep);
  const maximumWidth = Math.max(174, NORMAL_LEVEL.tunnel.maximumWidth - (level - 1) * NORMAL_LEVEL.tunnel.maximumWidthStep);
  let candidate: TunnelSegment;
  if (corner) {
    const width = Math.max(minimumWidth, Math.min(178, previous.width - 6));
    const direction = previous.center > WIDTH / 2 ? -1 : 1;
    const edge = width / 2 + 20;
    const center = Math.max(edge, Math.min(WIDTH - edge, previous.center + direction * Math.min(76, 58 + level * 3)));
    candidate = {
      y,
      center,
      width,
      turn: 0,
      widthChange: 3,
      corner: true,
      detailSeed: gameRandom(),
      lightZone: previous.lightZone,
      torch: previous.lightZone === "bright" && gameRandom() < 0.32,
      openings: [{ center, width }],
    };
  } else {
    let widthChange = previous.widthChange * 0.82 + (gameRandom() - 0.5) * (13 + level);
    if (previous.width < minimumWidth + 8) widthChange = Math.abs(widthChange) + 3;
    if (previous.width > maximumWidth - 8) widthChange = -Math.abs(widthChange) - 3;
    if (previous.width < minimumWidth + 24 && gameRandom() < 0.58) widthChange *= 0.35;
    const width = Math.max(minimumWidth, Math.min(maximumWidth, previous.width + widthChange));
    const turnLimit = Math.min(26, 18 + level * 1.4);
    const turn = Math.max(-turnLimit, Math.min(turnLimit, previous.turn * 0.88 + (gameRandom() - 0.5) * (12 + level * 1.4)));
    const edge = width / 2 + 20;
    const center = Math.max(edge, Math.min(WIDTH - edge, previous.center + turn));
    const lightZone = gameRandom() < 0.035
      ? previous.lightZone === "bright" ? "dim" : "bright"
      : previous.lightZone ?? "dim";
    candidate = { y, center, width, turn, widthChange, corner: false, detailSeed: gameRandom(), lightZone, torch: lightZone === "bright" && gameRandom() < 0.32, openings: [{ center, width }] };
  }

  if (fixedWidth !== undefined) candidate.width = Math.max(110, Math.min(280, fixedWidth));

  // Fairness: every new bend keeps a dwarf-wide overlap with the previous section.
  const safeOverlap = DWARF_RADIUS * 2 + 18;
  const previousLeft = previous.center - previous.width / 2 + DWARF_RADIUS + 8;
  const previousRight = previous.center + previous.width / 2 - DWARF_RADIUS - 8;
  const candidateHalf = candidate.width / 2 - DWARF_RADIUS - 8;
  candidate.center = Math.max(previousLeft + safeOverlap - candidateHalf, Math.min(previousRight - safeOverlap + candidateHalf, candidate.center));
  const outerEdge = candidate.width / 2 + 20;
  candidate.center = Math.max(outerEdge, Math.min(WIDTH - outerEdge, candidate.center));
  candidate.openings = [{ center: candidate.center, width: candidate.width }];
  return candidate;
}

function createTunnel(fixedWidth?: number): TunnelSegment[] {
  const width = fixedWidth === undefined ? NORMAL_LEVEL.tunnel.width : Math.max(110, Math.min(280, fixedWidth));
  const lightZone = gameRandom() < 0.5 ? "bright" : "dim";
  const segments: TunnelSegment[] = [{ y: HEIGHT + GAP, center: WIDTH / 2, width, turn: 0, widthChange: -5, corner: false, detailSeed: gameRandom(), lightZone, torch: lightZone === "bright", openings: [{ center: WIDTH / 2, width }] }];
  while (segments[0].y > -GAP) segments.unshift(earlierSegment(segments[0], segments[0].y - GAP, 1, false, fixedWidth));
  return segments;
}

function createBonusTunnel(): TunnelSegment[] {
  const segments: TunnelSegment[] = [{ y: HEIGHT + GAP, center: WIDTH / 2, width: BONUS_TUNNEL_WIDTH, turn: 0, widthChange: 0, corner: false, detailSeed: gameRandom(), symmetric: true, openings: [{ center: WIDTH / 2, width: BONUS_TUNNEL_WIDTH }] }];
  while (segments[0].y > -GAP) segments.unshift(earlierBonusSegment(segments[0], segments[0].y - GAP));
  return segments;
}

function earlierBonusSegment(previous: TunnelSegment, y: number): TunnelSegment {
  const normalLevelTurnLimit = 19.4;
  const turn = Math.max(-normalLevelTurnLimit, Math.min(normalLevelTurnLimit, previous.turn * 0.88 + (gameRandom() - 0.5) * 13.4));
  const edge = BONUS_TUNNEL_WIDTH / 2 + 20;
  const center = Math.max(edge, Math.min(WIDTH - edge, previous.center + turn));
  return { y, center, width: BONUS_TUNNEL_WIDTH, turn, widthChange: 0, corner: false, detailSeed: gameRandom(), symmetric: true, openings: [{ center, width: BONUS_TUNNEL_WIDTH }] };
}

function tunnelAt(segments: TunnelSegment[], y: number) {
  return combinedOpening(openingsAt(segments, y));
}

function lightLevelAtY(segments: TunnelSegment[], y: number) {
  const brightness = (segment: TunnelSegment) => segment.lightZone === "bright"
    ? NORMAL_LEVEL.lighting.maxBrightness
    : NORMAL_LEVEL.lighting.minBrightness;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index];
    const next = segments[index + 1];
    if (y >= current.y && y <= next.y) {
      const progress = Math.max(0, Math.min(1, (y - current.y) / Math.max(1, next.y - current.y)));
      const smooth = progress * progress * (3 - 2 * progress);
      return brightness(current) + (brightness(next) - brightness(current)) * smooth;
    }
  }
  return brightness(segments.reduce((closest, segment) => Math.abs(segment.y - y) < Math.abs(closest.y - y) ? segment : closest));
}

function inspectFairRoute(segments: TunnelSegment[], obstacles: Obstacle[]) {
  let reachable = openingsAt(segments, DWARF_Y).map((opening) => opening.center);
  const points: Array<{ x: number; y: number }> = [];
  for (let y = DWARF_Y; y >= -55; y -= 25) {
    const candidates: number[] = [];
    openingsAt(segments, y).forEach((opening) => {
      const { left, right } = openingEdges(opening);
      for (let x = left + DWARF_RADIUS + 10; x <= right - DWARF_RADIUS - 10; x += 9) {
        const blocked = obstacles.some((obstacle) => obstacle.kind === "rock"
          && Math.abs(x - obstacle.x) < obstacle.width / 2 + DWARF_RADIUS + 2
          && Math.abs(y - obstacle.y) < obstacle.height / 2 + DWARF_RADIUS + 4);
        if (!blocked && reachable.some((oldX) => Math.abs(oldX - x) <= MOVE_STEP * 2.25)) {
          candidates.push(x);
          points.push({ x, y });
        }
      }
    });
    if (!candidates.length) return { fair: false, points };
    reachable = candidates;
  }
  return { fair: true, points };
}

function hasFairRoute(segments: TunnelSegment[], obstacles: Obstacle[]) {
  return inspectFairRoute(segments, obstacles).fair;
}

function wood(x: number, y: number, width: number, hits = 1): Obstacle {
  const height = hits > 1 ? 38 : width < 74 ? 30 : 24;
  return { kind: "wood", x, y, width, height, angle: (gameRandom() - 0.5) * 0.22, hits };
}

function obstacleFitsTunnel(segments: TunnelSegment[], obstacle: Obstacle) {
  const cosine = Math.cos(obstacle.angle);
  const sine = Math.sin(obstacle.angle);
  const halfWidth = obstacle.width / 2;
  const halfHeight = obstacle.height / 2;
  const edgeSteps = [-1, -0.5, 0, 0.5, 1];
  const outline = edgeSteps.flatMap((step) => [
    { x: step * halfWidth, y: -halfHeight }, { x: step * halfWidth, y: halfHeight },
    { x: -halfWidth, y: step * halfHeight }, { x: halfWidth, y: step * halfHeight },
  ]);

  return outline.every((point) => {
    const x = obstacle.x + point.x * cosine - point.y * sine;
    const y = obstacle.y + point.x * sine + point.y * cosine;
    return pointFitsOpening(segments, x, y, 0, 10);
  });
}

function collectibleTouchesObstacle(item: Pick<Collectible, "x" | "y" | "radius">, obstacle: Obstacle, margin = 7) {
  const deltaX = item.x - obstacle.x;
  const deltaY = item.y - obstacle.y;
  if (obstacle.kind === "rock") {
    return Math.hypot(deltaX, deltaY) < obstacle.width / 2 + item.radius + margin;
  }

  const cosine = Math.cos(obstacle.angle);
  const sine = Math.sin(obstacle.angle);
  const localX = deltaX * cosine + deltaY * sine;
  const localY = -deltaX * sine + deltaY * cosine;
  const nearestX = Math.max(-obstacle.width / 2, Math.min(obstacle.width / 2, localX));
  const nearestY = Math.max(-obstacle.height / 2, Math.min(obstacle.height / 2, localY));
  return Math.hypot(localX - nearestX, localY - nearestY) < item.radius + margin;
}

function obstacleCandidate(segments: TunnelSegment[], level: number, forcedObstacle: ForcedObstacle = "random"): Obstacle[] {
  const availableOpenings = openingsAt(segments, -25).filter((opening) => opening.width >= 64);
  const tunnel = availableOpenings[Math.floor(gameRandom() * availableOpenings.length)] ?? tunnelAt(segments, -25);
  const random = forcedObstacle === "chest" ? 0.06
    : forcedObstacle === "rock" ? 0.25
      : forcedObstacle === "wood" ? 0.43 + gameRandom() * 0.56
        : gameRandom();
  const left = tunnel.center - tunnel.width / 2 + 18;
  const right = tunnel.center + tunnel.width / 2 - 18;
  if (random < 0.12) return [{ kind: "chest", x: tunnel.center, y: -30, width: 46, height: 34, angle: 0, hits: 2 }];
  if (random < 0.42) {
    const size = 31 + gameRandom() * 8;
    const side = gameRandom() < 0.5 ? -1 : 1;
    const offset = tunnel.width / 2 - size / 2 - 22;
    return [{ kind: "rock", x: tunnel.center + side * offset, y: -25, width: size, height: size, angle: 0, hits: 3 }];
  }
  if (random < 0.59 + level * 0.01) {
    // The visible opening also accounts for discrete 27 px movement steps.
    const opening = Math.max(88, 102 - level * 2);
    const partWidth = Math.max(34, (tunnel.width - opening - 30) / 2);
    return [wood(left + partWidth / 2, -25, partWidth), wood(right - partWidth / 2, -25, partWidth)];
  }
  if (random < 0.70 + level * 0.01) return [wood(tunnel.center, -25, tunnel.width - 34, 2)];
  const width = 56 + gameRandom() * Math.min(52, tunnel.width - 82);
  const available = Math.max(0, tunnel.width / 2 - width / 2 - 25);
  return [wood(tunnel.center + (gameRandom() - 0.5) * available * 2, -25, width)];
}

function obstacleTouchesHatch(obstacle: Obstacle, hatch: Hatch, margin = 15) {
  return Math.abs(obstacle.x - hatch.x) < obstacle.width / 2 + hatch.width / 2 + margin
    && Math.abs(obstacle.y - hatch.y) < obstacle.height / 2 + hatch.height / 2 + margin;
}

function createFairObstacles(segments: TunnelSegment[], existing: Obstacle[], collectibles: Collectible[], hatches: Hatch[], level: number, forcedObstacle: ForcedObstacle = "random") {
  const nearby = existing.filter((obstacle) => obstacle.y < 170);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = obstacleCandidate(segments, level, forcedObstacle);
    if (candidate.every((obstacle) => obstacleFitsTunnel(segments, obstacle))
      && candidate.every((obstacle) => !collectibles.some((item) => collectibleTouchesObstacle(item, obstacle, 9)))
      && candidate.every((obstacle) => !hatches.some((hatch) => obstacleTouchesHatch(obstacle, hatch)))
      && hasFairRoute(segments, [...nearby, ...candidate])) return candidate;
  }
  return [];
}

function createCollectible(segments: TunnelSegment[], kind: "gold" | "shield" | "gem-white" | "gem-green" | "gem-red" | "gem-purple", obstacles: Obstacle[]): Collectible | null {
  const y = -24;
  const radius = kind === "shield" ? 14 : kind.startsWith("gem-") ? 12 : 11;
  const verticalSamples = [-radius, -radius / 2, 0, radius / 2, radius];
  const spawnOpening = openingsAt(segments, y)[Math.floor(gameRandom() * openingsAt(segments, y).length)];
  const matching = verticalSamples.map((offset) => openingForX(segments, y + offset, spawnOpening.center));
  const left = Math.max(...matching.map((opening) => opening.center - opening.width / 2 + radius + 10));
  const right = Math.min(...matching.map((opening) => opening.center + opening.width / 2 - radius - 10));
  if (left > right) return null;
  const safePositions: number[] = [];
  for (let x = left; x <= right; x += 9) {
    const item = { x, y, radius };
    if (!obstacles.some((obstacle) => collectibleTouchesObstacle(item, obstacle, 12))) safePositions.push(x);
  }
  if (!safePositions.length) return null;
  return { kind, x: safePositions[Math.floor(gameRandom() * safePositions.length)], y, radius, vx: 0, vy: 0, scatterUntil: 0 };
}

function createHatch(segments: TunnelSegment[], obstacles: Obstacle[]): Hatch | null {
  const y = -28;
  const width = 72;
  const height = 34;
  const opening = tunnelAt(segments, y);
  const left = opening.center - opening.width / 2 + width / 2 + 18;
  const right = opening.center + opening.width / 2 - width / 2 - 18;
  if (left > right) return null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const x = left + gameRandom() * (right - left);
    const blocked = obstacles.some((obstacle) => Math.abs(obstacle.x - x) < obstacle.width / 2 + width / 2 + 18
      && Math.abs(obstacle.y - y) < obstacle.height / 2 + height / 2 + 30);
    if (!blocked) return { x, y, width, height, hits: 2, open: false };
  }
  return null;
}

function candyValue(kind: CandyKind) {
  return kind === "candy" ? 1 : kind === "lollipop" ? 2 : 3;
}

function collectibleGoldValue(kind: Collectible["kind"]) {
  if (kind === "gold") return 1;
  if (kind === "gold5") return 5;
  if (kind === "candy" || kind === "lollipop" || kind === "chocolate") return candyValue(kind);
  if (kind === "cake" || kind === "slice" || kind === "icecream") return kind === "cake" ? 1 : kind === "slice" ? 2 : 3;
  return 0;
}

function isGemKind(kind: Collectible["kind"]): kind is "gem-white" | "gem-green" | "gem-red" | "gem-purple" {
  return kind.startsWith("gem-");
}

function randomGemKind(): "gem-white" | "gem-green" | "gem-red" | "gem-purple" {
  return (["gem-white", "gem-green", "gem-red", "gem-purple"] as const)[Math.floor(gameRandom() * 4)];
}

function randomToyKind(): ToyKind {
  return (["cake", "slice", "icecream"] as ToyKind[])[Math.floor(gameRandom() * 3)];
}

function randomCandyKind(): CandyKind {
  const roll = gameRandom();
  return roll < 0.5 ? "candy" : roll < 0.8 ? "lollipop" : "chocolate";
}

function candyCollectible(kind: CandyKind | ToyKind, x: number, y: number, now = 0, scattered = false): Collectible {
  return {
    kind,
    x,
    y,
    radius: kind === "lollipop" ? 13 : kind === "chocolate" ? 12 : 10,
    vx: scattered ? (gameRandom() - 0.5) * 150 : 0,
    vy: scattered ? -120 - gameRandom() * 65 : 0,
    scatterUntil: scattered ? now + 850 + gameRandom() * 250 : 0,
  };
}

function gemCollectible(kind: ReturnType<typeof randomGemKind>, x: number, y: number, now = 0, scattered = false): Collectible {
  return { kind, x, y, radius: 12, vx: scattered ? (gameRandom() - 0.5) * 150 : 0, vy: scattered ? -120 - gameRandom() * 65 : 0, scatterUntil: scattered ? now + 1000 : 0 };
}

function createInitialBonusCandies(segments: TunnelSegment[]) {
  const positions = [18, 60, 102, 144, 186, 228, 270, 312, 354, 396, 438];
  const offsetPattern = [-0.24, 0.16, -0.08, 0.28, -0.18, 0.08, 0.24, -0.28, 0.14, -0.05, 0.2];
  return positions.map((y, index) => {
    const opening = tunnelAt(segments, y);
    const x = opening.center + offsetPattern[index] * (opening.width - 54);
    return candyCollectible(randomCandyKind(), x, y);
  });
}

function createInitialBonusToys(segments: TunnelSegment[]) {
  const positions = [18, 60, 102, 144, 186, 228, 270, 312, 354, 396, 438];
  return positions.map((y, index) => {
    const opening = tunnelAt(segments, y);
    const x = opening.center + [-.2, .16, -.08, .24, -.18, .1, .2, -.26, .12, -.05, .18][index] * (opening.width - 54);
    return candyCollectible(randomToyKind(), x, y);
  });
}

function dwarfTouchesObstacle(dwarfX: number, obstacle: Obstacle) {
  const deltaX = dwarfX - obstacle.x;
  const deltaY = DWARF_Y - obstacle.y;
  if (obstacle.kind === "rock") {
    // Rocks are drawn as circles, so their invisible square corners must not collide.
    return Math.hypot(deltaX, deltaY) < obstacle.width / 2 + DWARF_HIT_RADIUS - 2;
  }

  // Rotate the dwarf into the obstacle's local coordinates, then test circle vs rectangle.
  const cosine = Math.cos(obstacle.angle);
  const sine = Math.sin(obstacle.angle);
  const localX = deltaX * cosine + deltaY * sine;
  const localY = -deltaX * sine + deltaY * cosine;
  const distanceX = Math.max(Math.abs(localX) - Math.max(1, obstacle.width / 2 - 2), 0);
  const distanceY = Math.max(Math.abs(localY) - Math.max(1, obstacle.height / 2 - 1), 0);
  return distanceX * distanceX + distanceY * distanceY < DWARF_HIT_RADIUS * DWARF_HIT_RADIUS;
}

function addBurst(particles: Particle[], x: number, y: number, colors: string[], count = 12) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 105;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 28, life: 0.65 + Math.random() * 0.35, color: colors[index % colors.length], size: 2 + Math.random() * 4 });
  }
}

function drawDwarfFront(context: CanvasRenderingContext2D, x: number, y: number, hatColor: HatColor) {
  const hatPalette = HAT_PALETTES[hatColor];
  context.save();
  context.translate(x, y);

  // Sturdy boots, tunic and belt form a compact front-facing silhouette.
  context.fillStyle = "#00000066"; context.beginPath(); context.ellipse(0, 17, 25, 7, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#24170e";
  context.beginPath(); context.ellipse(-10, 11, 8, 6, -0.08, 0, Math.PI * 2); context.ellipse(10, 11, 8, 6, 0.08, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#6e4724";
  context.beginPath(); context.ellipse(-11, 9, 5, 2.4, 0, 0, Math.PI * 2); context.ellipse(9, 9, 5, 2.4, 0, 0, Math.PI * 2); context.fill();
  const tunic = context.createLinearGradient(-20, 0, 20, 0);
  tunic.addColorStop(0, "#123d61"); tunic.addColorStop(0.5, "#367eaa"); tunic.addColorStop(1, "#123d61");
  context.fillStyle = tunic; context.beginPath(); context.roundRect(-20, -17, 40, 28, 10); context.fill();
  context.strokeStyle = "#86bad2aa"; context.lineWidth = 1.5; context.beginPath(); context.moveTo(-8, -10); context.lineTo(-9, 1); context.moveTo(8, -10); context.lineTo(9, 1); context.stroke();
  context.fillStyle = "#573218"; context.fillRect(-20, 0, 40, 6);
  context.fillStyle = "#eab84f"; context.fillRect(-5, -1, 10, 8); context.fillStyle = "#402513"; context.fillRect(-2.5, 1, 5, 4);

  // Both arms and the small pickaxe are visible in the portrait.
  context.strokeStyle = "#1d4d77"; context.lineWidth = 9; context.lineCap = "round";
  context.beginPath(); context.moveTo(-16, -12); context.lineTo(-25, 1); context.moveTo(16, -12); context.lineTo(25, 1); context.stroke();
  context.fillStyle = "#d99a67"; context.beginPath(); context.arc(-25, 2, 5, 0, Math.PI * 2); context.arc(25, 2, 5, 0, Math.PI * 2); context.fill();
  context.save(); context.translate(25, 2); context.rotate(0.24);
  context.strokeStyle = "#b57a3c"; context.lineWidth = 4; context.beginPath(); context.moveTo(0, 5); context.lineTo(1, -18); context.stroke();
  context.strokeStyle = "#d5dcdd"; context.lineWidth = 4.5; context.beginPath(); context.moveTo(-8, -17); context.quadraticCurveTo(1, -22, 10, -16); context.stroke();
  context.restore();

  // Face, eyebrows and nose make the direction unmistakable even at phone size.
  context.fillStyle = "#d89b6a"; context.beginPath(); context.arc(-16, -29, 5, 0, Math.PI * 2); context.arc(16, -29, 5, 0, Math.PI * 2); context.fill();
  const skin = context.createRadialGradient(-5, -37, 2, 0, -31, 22);
  skin.addColorStop(0, "#f3c48f"); skin.addColorStop(1, "#c98254");
  context.fillStyle = skin; context.strokeStyle = "#8d573c"; context.lineWidth = 1.5;
  context.beginPath(); context.arc(0, -30, 18, 0, Math.PI * 2); context.fill(); context.stroke();
  context.strokeStyle = "#69432e"; context.lineWidth = 2; context.lineCap = "round";
  context.beginPath(); context.moveTo(-11, -36); context.lineTo(-4, -38); context.moveTo(4, -38); context.lineTo(11, -36); context.stroke();
  context.fillStyle = "#18252a"; context.beginPath(); context.arc(-7, -33, 2.1, 0, Math.PI * 2); context.arc(7, -33, 2.1, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#e2a36f"; context.strokeStyle = "#9f6445"; context.lineWidth = 1.2;
  context.beginPath(); context.ellipse(0, -27, 5, 6, 0, 0, Math.PI * 2); context.fill(); context.stroke();

  // A broad silver moustache and pointed beard frame the face from the front.
  const beard = context.createLinearGradient(0, -26, 0, 2);
  beard.addColorStop(0, "#fff8e9"); beard.addColorStop(1, "#b9b09f");
  context.fillStyle = beard; context.strokeStyle = "#aaa18f"; context.lineWidth = 1.2;
  context.beginPath(); context.moveTo(-15, -27); context.quadraticCurveTo(-21, -17, -13, -5); context.lineTo(-7, -9); context.lineTo(-3, 0); context.lineTo(1, -7); context.lineTo(6, 0); context.lineTo(9, -10); context.lineTo(15, -6); context.quadraticCurveTo(21, -17, 15, -27); context.quadraticCurveTo(8, -23, 0, -24); context.quadraticCurveTo(-8, -23, -15, -27); context.closePath(); context.fill(); context.stroke();
  context.fillStyle = "#f7efdf";
  context.beginPath(); context.ellipse(-7, -24, 8, 3.5, -0.22, 0, Math.PI * 2); context.ellipse(7, -24, 8, 3.5, 0.22, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "#c1b8a8"; context.lineWidth = 1.3; context.beginPath(); context.moveTo(-9, -16); context.quadraticCurveTo(-5, -8, -3, -3); context.moveTo(8, -16); context.quadraticCurveTo(5, -8, 2, -4); context.stroke();

  // The selected pointed cap is shared with the rear-view game character.
  const hat = context.createLinearGradient(-17, -58, 17, -35);
  hat.addColorStop(0, hatPalette.light); hat.addColorStop(0.55, hatPalette.mid); hat.addColorStop(1, hatPalette.dark);
  context.fillStyle = hat; context.strokeStyle = hatPalette.dark; context.lineWidth = 2;
  context.beginPath(); context.moveTo(-18, -43); context.quadraticCurveTo(-10, -57, 7, -61); context.quadraticCurveTo(5, -51, 18, -42); context.closePath(); context.fill(); context.stroke();
  context.fillStyle = hatPalette.band; context.beginPath(); context.roundRect(-21, -45, 42, 8, 4); context.fill();
  context.strokeStyle = hatPalette.dark; context.lineWidth = 1.2; context.beginPath(); context.moveTo(-13, -40); context.quadraticCurveTo(0, -37, 13, -40); context.stroke();
  context.fillStyle = hatPalette.stitch; context.beginPath(); context.arc(7, -57, 2.2, 0, Math.PI * 2); context.fill();
  context.restore();
}

function drawDwarf(context: CanvasRenderingContext2D, x: number, y: number, now: number, protectedNow: boolean, hatColor: HatColor, hasHandAxe: boolean) {
  const { stride, bob, rightHandY } = dwarfMotion(now);
  const leftFootX = -8;
  const rightFootX = 8;
  const leftFootY = 14 - stride * 3.2;
  const rightFootY = 14 + stride * 3.2;
  const leftLift = Math.max(0, stride);
  const rightLift = Math.max(0, -stride);
  context.save();
  context.translate(x, y);
  context.globalAlpha = protectedNow && Math.floor(now / 100) % 2 === 0 ? 0.35 : 1;

  // The shadow stays on the ground while the feet alternate in a real walking cycle.
  context.fillStyle = "#00000066"; context.beginPath(); context.ellipse(0, 17, 22, 8, 0, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "#163c5b"; context.lineWidth = 7; context.lineCap = "round";
  context.beginPath(); context.moveTo(-7, 6); context.lineTo(leftFootX, leftFootY); context.moveTo(7, 6); context.lineTo(rightFootX, rightFootY); context.stroke();
  context.fillStyle = "#24170e";
  context.beginPath(); context.ellipse(leftFootX, leftFootY, 5.6 - leftLift * 0.5, 8 - leftLift, -0.05, 0, Math.PI * 2); context.ellipse(rightFootX, rightFootY, 5.6 - rightLift * 0.5, 8 - rightLift, 0.05, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#64401f"; context.beginPath(); context.ellipse(leftFootX, leftFootY - 3.5, 3.6, 2.2, 0, 0, Math.PI * 2); context.ellipse(rightFootX, rightFootY - 3.5, 3.6, 2.2, 0, 0, Math.PI * 2); context.fill();
  context.translate(0, -bob);

  // Blue tunic, folds and belt seen from behind.
  const tunic = context.createLinearGradient(-17, 0, 17, 0);
  tunic.addColorStop(0, "#17476d"); tunic.addColorStop(0.5, "#2f79aa"); tunic.addColorStop(1, "#123d61");
  context.fillStyle = tunic; context.beginPath(); context.roundRect(-17, -10, 34, 23, 9); context.fill();
  context.strokeStyle = "#75a8c4aa"; context.lineWidth = 1.5; context.beginPath(); context.moveTo(-7, -5); context.lineTo(-8, 3); context.moveTo(7, -5); context.lineTo(8, 3); context.stroke();
  context.fillStyle = "#5c371b"; context.fillRect(-17, 3, 34, 5);
  context.fillStyle = "#eab84f"; context.fillRect(-4, 2, 8, 7); context.fillStyle = "#402513"; context.fillRect(-2, 4, 4, 3);

  // Arms swing opposite to the legs; the right hand carries a small pickaxe.
  const leftHandY = 5 + stride * 5;
  context.strokeStyle = "#1d4d77"; context.lineWidth = 8; context.lineCap = "round";
  context.beginPath(); context.moveTo(-13, -5); context.lineTo(-20, leftHandY); context.moveTo(13, -5); context.lineTo(20, rightHandY); context.stroke();
  context.fillStyle = "#d99a67"; context.beginPath(); context.arc(-20, leftHandY + 1, 4.5, 0, Math.PI * 2); context.arc(20, rightHandY + 1, 4.5, 0, Math.PI * 2); context.fill();
  if (hasHandAxe) {
    context.save(); context.translate(20, rightHandY + 1); context.rotate(0.18 - stride * 0.1);
    context.strokeStyle = "#b57a3c"; context.lineWidth = 3.5; context.beginPath(); context.moveTo(0, 4); context.lineTo(1, -15); context.stroke();
    context.strokeStyle = "#cbd4d6"; context.lineWidth = 4; context.beginPath(); context.moveTo(-7, -14); context.quadraticCurveTo(1, -19, 9, -13); context.stroke();
    context.restore();
  }

  // Back of the head with thick silver hair and two little braids.
  context.fillStyle = "#d89b6a"; context.beginPath(); context.arc(-14, -16, 4.8, 0, Math.PI * 2); context.arc(14, -16, 4.8, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#e8dfca"; context.strokeStyle = "#aaa18f"; context.lineWidth = 1.5;
  context.beginPath(); context.arc(0, -15, 16, 0, Math.PI * 2); context.fill(); context.stroke();
  context.strokeStyle = "#fff8e9"; context.lineWidth = 2;
  context.beginPath(); context.moveTo(-11, -23); context.quadraticCurveTo(-4, -12, -10, 0); context.moveTo(0, -28); context.quadraticCurveTo(7, -14, 2, -3); context.moveTo(11, -23); context.quadraticCurveTo(5, -11, 11, -1); context.stroke();
  context.strokeStyle = "#c2b8a5"; context.lineWidth = 4; context.beginPath(); context.moveTo(-10, -5); context.lineTo(-13, 6); context.moveTo(10, -5); context.lineTo(13, 6); context.stroke();
  context.fillStyle = "#eab84f"; context.beginPath(); context.arc(-13, 5, 2.5, 0, Math.PI * 2); context.arc(13, 5, 2.5, 0, Math.PI * 2); context.fill();

  // Folded pointed hat, clearly viewed from the rear.
  const hatPalette = HAT_PALETTES[hatColor];
  const hat = context.createLinearGradient(-14, -40, 14, -14);
  hat.addColorStop(0, hatPalette.light); hat.addColorStop(0.55, hatPalette.mid); hat.addColorStop(1, hatPalette.dark);
  context.fillStyle = hat; context.strokeStyle = hatPalette.dark; context.lineWidth = 2;
  context.beginPath(); context.moveTo(-15, -24); context.quadraticCurveTo(-7, -42, 5, -48); context.quadraticCurveTo(4, -36, 16, -24); context.closePath(); context.fill(); context.stroke();
  context.fillStyle = hatPalette.band; context.beginPath(); context.roundRect(-18, -27, 36, 7, 4); context.fill();
  context.strokeStyle = hatPalette.dark; context.lineWidth = 1.2; context.beginPath(); context.moveTo(-11, -23); context.quadraticCurveTo(0, -20, 11, -23); context.stroke();
  context.fillStyle = hatPalette.stitch; context.beginPath(); context.arc(5, -44, 2, 0, Math.PI * 2); context.fill();
  context.strokeStyle = hatPalette.stitch; context.lineWidth = 1.5; context.beginPath(); context.moveTo(8, -30); context.lineTo(13, -32); context.lineTo(14, -27); context.stroke();
  context.restore();
}

function drawLoosePickaxe(context: CanvasRenderingContext2D, x: number, y: number, rotation: number, level: number, hostile = false) {
  const hue = (level * 67 + 18) % 360;
  const metal = hostile ? "#ff6455" : level === 1 ? "#e6edef" : `hsl(${hue} 88% 68%)`;
  const glow = hostile ? "#ff321f" : level === 1 ? "#fff0b3" : `hsl(${hue} 100% 72%)`;
  context.save(); context.translate(x, y); context.rotate(rotation); context.shadowColor = glow; context.shadowBlur = hostile ? 13 : 8;
  context.strokeStyle = hostile ? "#512117" : "#c89555"; context.lineWidth = hostile ? 6 : 5;
  context.beginPath(); context.moveTo(0, 13); context.lineTo(0, -10); context.stroke();
  context.strokeStyle = metal; context.lineWidth = hostile ? 7 : 6;
  context.beginPath(); context.moveTo(-12, -9); context.quadraticCurveTo(0, -17, 12, -9); context.stroke();
  context.restore();
}

function drawBossEntrance(context: CanvasRenderingContext2D, gateY: number, enteringProgress: number) {
  context.save();
  const wallGradient = context.createLinearGradient(0, gateY - 42, 0, gateY + 74);
  wallGradient.addColorStop(0, "#11191d"); wallGradient.addColorStop(1, "#2f3c40");
  context.fillStyle = wallGradient; context.fillRect(0, gateY - 38, WIDTH, 116);
  for (let row = 0; row < 3; row += 1) {
    for (let column = -1; column < 11; column += 1) {
      const x = column * 43 + (row % 2) * 20;
      const y = gateY - 28 + row * 35 + (((column * 7 + row * 5) % 9) - 4);
      if (Math.abs(x + 20 - WIDTH / 2) < 50 && row > 0) continue;
      context.fillStyle = (column + row) % 3 === 0 ? "#526066" : (column + row) % 3 === 1 ? "#39474c" : "#263339";
      context.strokeStyle = "#0b1216"; context.lineWidth = 2;
      context.beginPath(); context.moveTo(x - 4, y + 8); context.lineTo(x + 7, y - 14); context.lineTo(x + 31, y - 17); context.lineTo(x + 44, y + 3); context.lineTo(x + 34, y + 27); context.lineTo(x + 8, y + 29); context.closePath(); context.fill(); context.stroke();
    }
  }
  const doorway = context.createRadialGradient(WIDTH / 2, gateY + 38, 4, WIDTH / 2, gateY + 38, 54);
  doorway.addColorStop(0, "#000"); doorway.addColorStop(0.7, "#050407"); doorway.addColorStop(1, "#2a1115");
  context.fillStyle = doorway; context.strokeStyle = "#7a302b"; context.lineWidth = 5;
  context.beginPath(); context.roundRect(WIDTH / 2 - 43, gateY - 14, 86, 98, [43, 43, 8, 8]); context.fill(); context.stroke();
  context.fillStyle = "#ff7b4433"; context.beginPath(); context.ellipse(WIDTH / 2, gateY + 67, 28, 8, 0, 0, Math.PI * 2); context.fill();
  if (enteringProgress > 0) {
    context.fillStyle = `rgba(0,0,0,${Math.min(1, enteringProgress)})`; context.fillRect(0, 0, WIDTH, HEIGHT);
  }
  context.restore();
}

function drawEvilBoss(context: CanvasRenderingContext2D, x: number, y: number, now: number, health: number) {
  const pulse = Math.sin(now / 145) * 2;
  context.save(); context.translate(x, y + pulse); context.scale(1.38, 1.38);
  context.fillStyle = "#00000088"; context.beginPath(); context.ellipse(0, 26, 31, 9, 0, 0, Math.PI * 2); context.fill();
  const tunic = context.createLinearGradient(-25, 0, 25, 0); tunic.addColorStop(0, "#351019"); tunic.addColorStop(.5, "#8a2730"); tunic.addColorStop(1, "#2b0b13");
  context.fillStyle = tunic; context.strokeStyle = "#1a070b"; context.lineWidth = 2; context.beginPath(); context.roundRect(-25, -7, 50, 35, 10); context.fill(); context.stroke();
  context.fillStyle = "#21130e"; context.fillRect(-25, 12, 50, 7); context.fillStyle = "#d49a26"; context.fillRect(-6, 10, 12, 10);
  context.fillStyle = "#bd794e"; context.beginPath(); context.arc(0, -20, 23, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#fff1c7"; context.beginPath(); context.moveTo(-20, -17); context.lineTo(-13, 8); context.lineTo(-5, 1); context.lineTo(0, 14); context.lineTo(7, 1); context.lineTo(15, 8); context.lineTo(21, -17); context.quadraticCurveTo(0, -8, -20, -17); context.fill();
  context.strokeStyle = "#35100e"; context.lineWidth = 4; context.lineCap = "round"; context.beginPath(); context.moveTo(-15, -29); context.lineTo(-5, -25); context.moveTo(15, -29); context.lineTo(5, -25); context.stroke();
  context.shadowColor = "#ff2b16"; context.shadowBlur = health <= BOSS_LEVEL.enemy.enrageAtHealth ? 16 : 8; context.fillStyle = "#ff3b20"; context.beginPath(); context.arc(-8, -24, 3, 0, Math.PI * 2); context.arc(8, -24, 3, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
  const hat = context.createLinearGradient(-20, -62, 20, -31); hat.addColorStop(0, "#ff4938"); hat.addColorStop(.5, "#8c1724"); hat.addColorStop(1, "#340713");
  context.fillStyle = hat; context.strokeStyle = "#270710"; context.lineWidth = 2.5; context.beginPath(); context.moveTo(-23, -36); context.quadraticCurveTo(-8, -62, 13, -69); context.quadraticCurveTo(6, -52, 24, -36); context.closePath(); context.fill(); context.stroke();
  context.fillStyle = "#50101b"; context.beginPath(); context.roundRect(-27, -40, 54, 9, 4); context.fill();
  context.restore();
}

function drawCrystalBoss(context: CanvasRenderingContext2D, x: number, y: number, now: number, health: number) {
  // Boss 2 keeps Boss 1's readable evil-dwarf silhouette, but uses a colder
  // palette, a forked cap, a blue-gray beard and crystal shoulder guards.
  const pulse = Math.sin(now / 170) * 2;
  context.save(); context.translate(x, y + pulse); context.scale(1.38, 1.38);
  context.fillStyle = "#00000099"; context.beginPath(); context.ellipse(0, 26, 31, 9, 0, 0, Math.PI * 2); context.fill();
  context.shadowColor = health <= BOSS_LEVEL.enemy.enrageAtHealth ? "#7cf6ff" : "#a66bff"; context.shadowBlur = 12;
  const tunic = context.createLinearGradient(-25, 0, 25, 0); tunic.addColorStop(0, "#101c3b"); tunic.addColorStop(.5, "#314e87"); tunic.addColorStop(1, "#0b142e");
  context.fillStyle = tunic; context.strokeStyle = "#080e22"; context.lineWidth = 2; context.beginPath(); context.roundRect(-25, -7, 50, 35, 10); context.fill(); context.stroke();
  context.fillStyle = "#17213a"; context.fillRect(-25, 12, 50, 7); context.fillStyle = "#80d8e8"; context.fillRect(-6, 10, 12, 10);
  context.shadowBlur = 0; context.fillStyle = "#a86f4e"; context.beginPath(); context.arc(0, -20, 23, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#51657b"; context.beginPath(); context.moveTo(-20, -17); context.lineTo(-13, 8); context.lineTo(-5, 1); context.lineTo(0, 15); context.lineTo(7, 1); context.lineTo(15, 8); context.lineTo(21, -17); context.quadraticCurveTo(0, -7, -20, -17); context.fill();
  context.strokeStyle = "#16213b"; context.lineWidth = 4; context.lineCap = "round"; context.beginPath(); context.moveTo(-15, -29); context.lineTo(-5, -25); context.moveTo(15, -29); context.lineTo(5, -25); context.stroke();
  context.shadowColor = health <= BOSS_LEVEL.enemy.enrageAtHealth ? "#b8ffff" : "#64eaff"; context.shadowBlur = 14; context.fillStyle = "#72efff"; context.beginPath(); context.arc(-8, -24, 3, 0, Math.PI * 2); context.arc(8, -24, 3, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
  const hat = context.createLinearGradient(-20, -62, 20, -31); hat.addColorStop(0, "#6b7cff"); hat.addColorStop(.5, "#293d91"); hat.addColorStop(1, "#101b4d");
  context.fillStyle = hat; context.strokeStyle = "#090f2e"; context.lineWidth = 2.5; context.beginPath(); context.moveTo(-23, -36); context.quadraticCurveTo(-15, -53, -8, -67); context.lineTo(0, -53); context.lineTo(10, -72); context.quadraticCurveTo(13, -53, 24, -36); context.closePath(); context.fill(); context.stroke();
  context.fillStyle = "#1e2c68"; context.beginPath(); context.roundRect(-27, -40, 54, 9, 4); context.fill();
  context.fillStyle = "#a8f5ff"; context.strokeStyle = "#243d81"; context.lineWidth = 2; context.beginPath(); context.moveTo(-23, 1); context.lineTo(-31, -9); context.lineTo(-22, -15); context.lineTo(-14, 2); context.closePath(); context.fill(); context.stroke(); context.beginPath(); context.moveTo(23, 1); context.lineTo(31, -9); context.lineTo(22, -15); context.lineTo(14, 2); context.closePath(); context.fill(); context.stroke();
  context.restore();
}

function drawBossArena(
  context: CanvasRenderingContext2D, dwarfX: number, bossX: number, now: number, protectedUntil: number,
  hatColor: HatColor, handEmptyUntil: number, playerProjectiles: Projectile[], bossAttacks: BossAttack[],
  warningXs: number[], warningUntil: number, bossHealth: number, bossPhase: BossPhase,
  particles: Particle[], feedback: Feedback[], shield: number, impactUntil: number, phaseStartedAt: number,
) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  const shake = now < impactUntil ? Math.sin(now * .1) * 5 : 0;
  context.save(); context.translate(shake, shake / 2);
  const bossTheme = BOSS_LEVEL.theme;
  const cavern = context.createRadialGradient(WIDTH / 2, 250, 30, WIDTH / 2, 250, 360);
  cavern.addColorStop(0, bossTheme.cavern[0]); cavern.addColorStop(.55, bossTheme.cavern[1]); cavern.addColorStop(1, bossTheme.cavern[2]); context.fillStyle = cavern; context.fillRect(-8, -8, WIDTH + 16, HEIGHT + 16);
  for (let row = 0; row < 13; row += 1) {
    for (let side = 0; side < 2; side += 1) {
      const x = side === 0 ? 12 + (row % 2) * 7 : WIDTH - 12 - (row % 2) * 7;
      const y = row * 47 + 8; context.fillStyle = bossTheme.wall[(row % 3) + 2]; context.strokeStyle = "#0b1115"; context.lineWidth = 2;
      context.beginPath(); context.moveTo(x - 23, y - 20); context.lineTo(x + 17, y - 24); context.lineTo(x + 28, y + 4); context.lineTo(x + 12, y + 24); context.lineTo(x - 25, y + 18); context.closePath(); context.fill(); context.stroke();
    }
  }
  context.fillStyle = bossTheme.floor[0]; context.fillRect(42, 150, WIDTH - 84, 24); context.strokeStyle = "#704a2e"; context.lineWidth = 4; context.strokeRect(42, 150, WIDTH - 84, 24);
  context.fillStyle = bossTheme.floor[2]; context.beginPath(); context.moveTo(55, 150); context.lineTo(74, 133); context.lineTo(112, 139); context.lineTo(146, 126); context.lineTo(190, 139); context.lineTo(225, 128); context.lineTo(272, 140); context.lineTo(319, 130); context.lineTo(345, 150); context.closePath(); context.fill();
  context.fillStyle = bossTheme.floor[1]; context.fillRect(34, 504, WIDTH - 68, 56); context.strokeStyle = "#7d5932"; context.lineWidth = 4; context.beginPath(); context.moveTo(34, 504); for (let x = 34; x <= WIDTH - 34; x += 34) context.lineTo(x, 501 + Math.sin(x * .15) * 5); context.stroke();

  context.fillStyle = "#1c090c"; context.fillRect(60, 22, WIDTH - 120, 17); context.fillStyle = bossHealth <= 3 ? "#ff3828" : "#c93638"; context.fillRect(63, 25, (WIDTH - 126) * Math.max(0, bossHealth) / BOSS_MAX_HEALTH, 11);
  context.fillStyle = "#fff1dc"; context.font = "900 13px Arial"; context.textAlign = "center"; context.fillText(`${BOSS_LEVEL.enemy.name.toUpperCase()}  ${Math.max(0, bossHealth)}/${BOSS_MAX_HEALTH}`, WIDTH / 2, 17);
  if (bossPhase !== "completed") {
    if (BOSS_LEVEL.world === 2) drawEvilBoss(context, bossX, 128, now, bossHealth);
    else drawCrystalBoss(context, bossX, 128, now, bossHealth);
  }

  if (warningUntil > now) {
    const blink = Math.floor(now / 110) % 2 === 0;
    warningXs.forEach((x) => { context.strokeStyle = blink ? "#ff4a32" : "#ffbd3d"; context.lineWidth = 4; context.beginPath(); context.ellipse(x, DWARF_Y + 12, 25, 8, 0, 0, Math.PI * 2); context.stroke(); });
    context.fillStyle = "#ffb34e"; context.font = "900 15px Arial"; context.fillText("STEINSCHLAG!", WIDTH / 2, 205);
  }
  playerProjectiles.forEach((projectile) => drawLoosePickaxe(context, projectile.x, projectile.y, projectile.rotation, projectile.level));
  bossAttacks.forEach((attack) => {
    if (attack.kind === "axe") drawLoosePickaxe(context, attack.x, attack.y, attack.rotation, 4, true);
    else { context.save(); context.translate(attack.x, attack.y); context.rotate(attack.rotation); context.fillStyle = "#4d5557"; context.strokeStyle = "#14191a"; context.lineWidth = 3; context.beginPath(); context.moveTo(-17, -10); context.lineTo(-5, -20); context.lineTo(15, -14); context.lineTo(20, 5); context.lineTo(7, 19); context.lineTo(-15, 15); context.lineTo(-21, 0); context.closePath(); context.fill(); context.stroke(); context.restore(); }
  });
  particles.forEach((particle) => { context.globalAlpha = Math.max(0, particle.life); context.fillStyle = particle.color; context.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size); }); context.globalAlpha = 1;
  feedback.forEach((item) => { context.globalAlpha = Math.min(1, item.life * 2); context.fillStyle = item.color; context.font = "900 20px Arial"; context.shadowColor = "#000"; context.shadowBlur = 5; context.fillText(item.text, item.x, item.y); }); context.globalAlpha = 1; context.shadowBlur = 0;
  if (bossPhase === "victory") {
    context.shadowColor = "#ffd83d"; context.shadowBlur = 28; context.fillStyle = "#ffd83d"; context.beginPath(); context.moveTo(145, 300); context.lineTo(174, 322); context.lineTo(200, 282); context.lineTo(226, 322); context.lineTo(255, 300); context.lineTo(243, 358); context.lineTo(157, 358); context.closePath(); context.fill(); context.shadowBlur = 0;
    context.fillStyle = "#fff4a5"; context.font = "900 26px Arial"; context.fillText("BOSS BESIEGT!", WIDTH / 2, 258); context.font = "900 18px Arial"; context.fillText(`${BOSS_LEVEL.victory.rewardName.toUpperCase()} · +${BOSS_LEVEL.victory.gold} GOLD`, WIDTH / 2, 386);
  }
  if (bossPhase === "completed") {
    const elapsed = Math.max(0, now - phaseStartedAt);
    const bright = Math.min(1, Math.max(0, (elapsed - 4200) / 1200));
    context.fillStyle = `rgba(12, 8, 35, ${0.72 - bright * .28})`; context.fillRect(0, 0, WIDTH, HEIGHT);
    const shardProgress = Math.min(1, elapsed / 2600);
    for (let index = 0; index < 12; index += 1) {
      const angle = index * Math.PI / 6; const startX = WIDTH / 2 + Math.cos(angle) * (45 + index % 3 * 18); const startY = 185 + Math.sin(angle) * 42;
      const targetX = WIDTH / 2 + Math.cos(index * 2.4) * 38; const targetY = 260 + Math.sin(index * 2.4) * 20;
      const x = startX + (targetX - startX) * shardProgress; const y = startY + (targetY - startY) * shardProgress;
      context.save(); context.translate(x, y); context.rotate(now / 220 + index); context.globalAlpha = elapsed < 1200 ? 1 : Math.max(0, 1 - (elapsed - 2500) / 900); context.fillStyle = index % 3 === 0 ? "#fff2a1" : index % 3 === 1 ? "#73eaff" : "#d99aff"; context.shadowColor = context.fillStyle; context.shadowBlur = 14; context.beginPath(); context.moveTo(0, -12); context.lineTo(7, 2); context.lineTo(0, 14); context.lineTo(-7, 2); context.closePath(); context.fill(); context.restore();
    }
    const crownForm = Math.min(1, Math.max(0, (elapsed - 1900) / 1600));
    const crownLanding = Math.min(1, Math.max(0, (elapsed - 3500) / 1500));
    const crownY = crownLanding > 0 ? 278 - crownLanding * 190 : 278;
    if (crownForm > 0) {
      context.save(); context.translate(WIDTH / 2, crownY); context.scale(0.45 + crownForm * 0.55, 0.45 + crownForm * 0.55); context.rotate(crownLanding > .72 ? Math.sin(elapsed / 120) * .08 : 0);
      context.shadowColor = "#8de8ff"; context.shadowBlur = 24; context.fillStyle = "#a7f5ff"; context.beginPath(); context.moveTo(-72, -20); context.lineTo(-42, 14); context.lineTo(-18, -45); context.lineTo(8, 14); context.lineTo(39, -35); context.lineTo(68, 14); context.lineTo(55, 34); context.lineTo(-55, 34); context.closePath(); context.fill(); context.restore();
    }
    if (bright > 0) { context.fillStyle = `rgba(125, 239, 255, ${bright * .12})`; context.fillRect(0, 0, WIDTH, HEIGHT); }
    context.fillStyle = "#f9fdff"; context.font = "900 30px Arial"; context.fillText(elapsed > 5200 ? "KRONE EROBERT!" : "BOSS BESIEGT!", WIDTH / 2, 155);
    context.font = "900 17px Arial"; context.fillStyle = "#a9efff"; context.fillText(elapsed > 5200 ? "DAS ZWERGENREICH IST GERETTET" : "DIE KRISTALLKRAFT KEHRT ZURÜCK", WIDTH / 2, 188);
  }
  if (shield > 0) { context.strokeStyle = "#78efff"; context.lineWidth = 4; context.shadowColor = "#69efff"; context.shadowBlur = 16; context.beginPath(); context.arc(dwarfX, DWARF_Y - 5, 28, 0, Math.PI * 2); context.stroke(); context.shadowBlur = 0; }
  drawDwarf(context, dwarfX, DWARF_Y, now, now < protectedUntil, hatColor, now >= handEmptyUntil);
  if (bossPhase === "completed" && now - phaseStartedAt > 3500) {
    const crownY = DWARF_Y - 67; context.save(); context.translate(dwarfX, crownY); context.scale(now - phaseStartedAt > 5000 ? 1 : 1.18, now - phaseStartedAt > 5000 ? 1 : 1.18); context.fillStyle = "#9ef4ff"; context.strokeStyle = "#efffff"; context.lineWidth = 2; context.shadowColor = "#69eaff"; context.shadowBlur = 18; context.beginPath(); context.moveTo(-25, -10); context.lineTo(-12, 7); context.lineTo(0, -18); context.lineTo(11, 7); context.lineTo(25, -10); context.lineTo(20, 12); context.lineTo(-20, 12); context.closePath(); context.fill(); context.stroke(); context.restore();
  }
  context.restore();
  if (now < impactUntil) { context.fillStyle = "#ff493522"; context.fillRect(0, 0, WIDTH, HEIGHT); }
}

function drawTunnel(
  context: CanvasRenderingContext2D,
  segments: TunnelSegment[], dwarfX: number, now: number, protectedUntil: number,
  obstacles: Obstacle[], hatches: Hatch[], projectiles: Projectile[], collectibles: Collectible[],
  particles: Particle[], feedback: Feedback[], shield: number, impactUntil: number,
  hatColor: HatColor, handEmptyUntil: number, bonusPhase: BonusPhase, ladderProgress: number, bonusExitWallY: number,
  showHitboxes = false, showFairness = false,
) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  const shake = now < impactUntil ? Math.sin(now * 0.09) * 5 : 0;
  const inBonus = bonusPhase !== "none";
  const levelTheme = inBonus ? BONUS_LEVEL.theme : NORMAL_LEVEL.theme;
  context.save();
  context.translate(shake, shake / 2);
  const cavern = context.createRadialGradient(WIDTH / 2, HEIGHT * 0.55, 35, WIDTH / 2, HEIGHT * 0.55, 350);
  cavern.addColorStop(0, levelTheme.cavern[0]); cavern.addColorStop(0.62, levelTheme.cavern[1]); cavern.addColorStop(1, levelTheme.cavern[2]);
  context.fillStyle = cavern;
  context.fillRect(-8, -8, WIDTH + 16, HEIGHT + 16);

  // A stable, overlapping field of irregular stones makes the mountain feel
  // massive without bringing back the distracting horizontal wall lines.
  const wallColors = levelTheme.wall;
  segments.forEach((segment) => {
    for (let column = -1; column < 15; column += 1) {
      const seed = (segment.detailSeed * 97.31 + column * 0.6180339887) % 1;
      const secondSeed = (seed * 7.17 + segment.detailSeed * 3.41) % 1;
      const x = column * 42 + 12 + (seed - 0.5) * 25;
      const y = segment.y + (secondSeed - 0.5) * 18;
      const radiusX = 24 + seed * 11;
      const radiusY = 17 + secondSeed * 9;
      context.fillStyle = wallColors[Math.floor(seed * wallColors.length)];
      context.strokeStyle = "#0b1216";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x - radiusX, y - radiusY * 0.12);
      context.lineTo(x - radiusX * 0.48, y - radiusY);
      context.lineTo(x + radiusX * 0.28, y - radiusY * 0.86);
      context.lineTo(x + radiusX, y - radiusY * 0.2);
      context.lineTo(x + radiusX * 0.62, y + radiusY * 0.78);
      context.lineTo(x - radiusX * 0.22, y + radiusY);
      context.lineTo(x - radiusX * 0.9, y + radiusY * 0.48);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = "#73808720";
      context.beginPath();
      context.moveTo(x - radiusX * 0.48, y - radiusY);
      context.lineTo(x + radiusX * 0.28, y - radiusY * 0.86);
      context.lineTo(x + radiusX * 0.04, y - radiusY * 0.12);
      context.lineTo(x - radiusX * 0.6, y + radiusY * 0.08);
      context.closePath();
      context.fill();
      if (seed > 0.63) {
        context.strokeStyle = "#0e171b";
        context.lineWidth = 1.4;
        context.beginPath();
        context.moveTo(x + radiusX * 0.08, y - radiusY * 0.12);
        context.lineTo(x - radiusX * 0.13, y + radiusY * 0.2);
        context.lineTo(x + radiusX * 0.24, y + radiusY * 0.58);
        context.stroke();
      }
    }
  });

  // The fine raster supports several independent tunnels while overlapping
  // scanlines create one continuous floor without visible horizontal seams.
  const floor = context.createLinearGradient(0, 0, WIDTH, 0);
  floor.addColorStop(0, levelTheme.floor[0]); floor.addColorStop(0.16, levelTheme.floor[1]); floor.addColorStop(0.5, levelTheme.floor[2]); floor.addColorStop(0.84, levelTheme.floor[3]); floor.addColorStop(1, levelTheme.floor[4]);
  context.fillStyle = floor;
  // Eine zusammenhängende Fläche verhindert die früheren horizontalen
  // Rasterstreifen auf dem Boden.
  openingsAt(segments, -8).forEach((opening, openingIndex) => {
    const points: Array<{ x: number; y: number }> = [];
    for (let y = -8; y <= HEIGHT + 8; y += 5) {
      const current = openingsAt(segments, y)[openingIndex] ?? openingsAt(segments, y)[0];
      points.push({ x: openingEdges(current).left, y });
    }
    for (let y = HEIGHT + 8; y >= -8; y -= 5) {
      const current = openingsAt(segments, y)[openingIndex] ?? openingsAt(segments, y)[0];
      points.push({ x: openingEdges(current).right, y });
    }
    context.beginPath();
    points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
    context.closePath(); context.fill();
  });

  // Seeded rock faces and ore remain fixed while the mine scrolls.
  segments.forEach((segment) => {
    const detail = segment.detailSeed;
    segment.openings.forEach((opening, openingIndex) => {
      const { left, right } = openingEdges(opening);
      const offset = 7 + detail * 5;
      const edgeRockColor = detail > 0.58 ? levelTheme.edgeRock[2] : detail > 0.28 ? levelTheme.edgeRock[1] : levelTheme.edgeRock[0];
      context.strokeStyle = "#0c1418"; context.lineWidth = 2;
      const edgeRocks = inBonus
        ? [
          { x: left - 8, side: 0 }, { x: left - 34, side: 0 },
          { x: right + 8, side: 1 }, { x: right + 34, side: 1 },
        ]
        : [{ x: left - offset, side: 0 }, { x: right + offset, side: 1 }];
      edgeRocks.forEach(({ x, side }, rockIndex) => {
        const radius = inBonus ? 15 : 11 + ((detail * 11 + openingIndex * 3 + side * 5 + rockIndex) % 1) * 6;
        context.fillStyle = edgeRockColor;
        context.beginPath(); context.moveTo(x - radius, segment.y); context.lineTo(x - radius * .35, segment.y - radius); context.lineTo(x + radius * .75, segment.y - radius * .55); context.lineTo(x + radius, segment.y + radius * .4); context.lineTo(x, segment.y + radius); context.closePath(); context.fill(); context.stroke();
        context.fillStyle = "#77858a38";
        context.beginPath(); context.moveTo(x - radius * .35, segment.y - radius); context.lineTo(x + radius * .75, segment.y - radius * .55); context.lineTo(x + radius * .12, segment.y); context.lineTo(x - radius * .52, segment.y + radius * .12); context.closePath(); context.fill();
      });
      for (let grain = 0; grain < 2; grain += 1) {
        const grainSeed = (detail * (grain + 3) * 9.17 + openingIndex * .31) % 1;
        const x = grain % 2 === 0 ? left - 20 - grainSeed * 24 : right + 20 + grainSeed * 24;
        context.fillStyle = grain === 0 ? "#e5b64d" : "#a97822";
        context.beginPath(); context.arc(x, segment.y + grainSeed * 12, 1 + grainSeed * .7, 0, Math.PI * 2); context.fill();
      }
    });
  });

  if (!inBonus) {
    // Die Lichtzonen sind an die Segmente gebunden, werden aber als ein
    // einziger Verlauf gerendert. So entsteht kein sichtbarer Zeilensprung.
    const lightingGradient = context.createLinearGradient(0, 0, 0, HEIGHT);
    for (let y = 0; y <= HEIGHT; y += 18) {
      const brightness = lightLevelAtY(segments, y);
      const darkness = Math.max(0, Math.min(1, 0.46 - brightness * 0.42));
      lightingGradient.addColorStop(y / HEIGHT, `rgba(2, 4, 8, ${darkness})`);
    }
    context.fillStyle = lightingGradient;
    context.fillRect(-8, -8, WIDTH + 16, HEIGHT + 16);
    segments.forEach((segment) => {
      if (segment.lightZone === "bright" && segment.torch) {
        const opening = openingsAt(segments, segment.y)[0];
        const { left, right } = openingEdges(opening);
        [left - 8, right + 8].forEach((x, index) => {
          const side = index === 0 ? -1 : 1;
          const glow = context.createRadialGradient(x, segment.y - 7, 2, x, segment.y - 7, 54);
          glow.addColorStop(0, `${NORMAL_LEVEL.lighting.torchColor}66`); glow.addColorStop(1, `${NORMAL_LEVEL.lighting.torchColor}00`);
          context.fillStyle = glow; context.beginPath(); context.arc(x, segment.y - 7, 54, 0, Math.PI * 2); context.fill();
          context.strokeStyle = "#5d351e"; context.lineWidth = 5; context.lineCap = "round";
          context.beginPath(); context.moveTo(x, segment.y + 14); context.lineTo(x - side * 3, segment.y - 3); context.stroke();
          context.fillStyle = "#6f4324"; context.fillRect(x - 6, segment.y - 8, 12, 7);
          context.shadowColor = NORMAL_LEVEL.lighting.torchColor; context.shadowBlur = 12;
          context.fillStyle = NORMAL_LEVEL.lighting.torchColor; context.beginPath(); context.moveTo(x, segment.y - 28); context.quadraticCurveTo(x - 9, segment.y - 16, x, segment.y - 7); context.quadraticCurveTo(x + 9, segment.y - 16, x, segment.y - 28); context.fill();
          context.fillStyle = "#fff3a6"; context.beginPath(); context.moveTo(x, segment.y - 23); context.quadraticCurveTo(x - 4, segment.y - 16, x, segment.y - 11); context.quadraticCurveTo(x + 4, segment.y - 16, x, segment.y - 23); context.fill(); context.shadowBlur = 0;
        });
      }
    });
  }

  collectibles.forEach((item) => {
    context.save(); context.translate(item.x, item.y);
    if (isGemKind(item.kind)) {
      const colors = { "gem-white": "#f4fbff", "gem-green": "#4ee27c", "gem-red": "#ff536b", "gem-purple": "#c478ff" };
      context.rotate(Math.sin((now + item.x * 3) / 220) * .12); context.shadowColor = colors[item.kind]; context.shadowBlur = 16; context.fillStyle = colors[item.kind]; context.strokeStyle = "#ffffffcc"; context.lineWidth = 2;
      context.beginPath(); context.moveTo(0, -15); context.lineTo(12, -7); context.lineTo(8, 10); context.lineTo(0, 16); context.lineTo(-8, 10); context.lineTo(-12, -7); context.closePath(); context.fill(); context.stroke(); context.fillStyle = "#ffffff99"; context.beginPath(); context.moveTo(-7, -7); context.lineTo(0, -12); context.lineTo(-2, 2); context.closePath(); context.fill();
    } else if (item.kind === "cake" || item.kind === "slice" || item.kind === "icecream") {
      context.rotate(Math.sin((now + item.x * 4) / 240) * .1); context.shadowBlur = 12;
      if (item.kind === "cake") { context.shadowColor = "#ff86b8"; context.fillStyle = "#f39abb"; context.strokeStyle = "#fff0c8"; context.lineWidth = 2; context.beginPath(); context.roundRect(-16, -5, 32, 14, 3); context.fill(); context.stroke(); context.fillStyle = "#fff4dc"; context.fillRect(-15, -9, 30, 5); context.fillStyle = "#ffdd66"; context.fillRect(-8, -15, 3, 6); context.fillRect(5, -15, 3, 6); }
      else if (item.kind === "slice") { context.shadowColor = "#ffc56b"; context.fillStyle = "#eaa365"; context.strokeStyle = "#fff0c8"; context.lineWidth = 2; context.beginPath(); context.moveTo(-16, 9); context.lineTo(14, 9); context.lineTo(4, -13); context.closePath(); context.fill(); context.stroke(); context.fillStyle = "#ffe4a8"; context.beginPath(); context.moveTo(-12, 4); context.lineTo(11, 4); context.lineTo(4, -10); context.closePath(); context.fill(); context.fillStyle = "#f387ad"; context.beginPath(); context.arc(2, -7, 3, 0, Math.PI * 2); context.fill(); }
      else { context.shadowColor = "#7be9ff"; context.fillStyle = "#f0c77a"; context.strokeStyle = "#fff0c8"; context.lineWidth = 2; context.beginPath(); context.moveTo(-10, -10); context.lineTo(10, -10); context.lineTo(4, 14); context.lineTo(-4, 14); context.closePath(); context.fill(); context.stroke(); context.fillStyle = "#ff8bc1"; context.beginPath(); context.arc(0, -12, 11, Math.PI, 0); context.fill(); context.fillStyle = "#fff3fb"; context.beginPath(); context.arc(-5, -13, 3, 0, Math.PI * 2); context.fill(); }
    } else if (item.kind === "candy") {
      context.rotate(Math.sin((now + item.x * 8) / 230) * 0.16);
      context.shadowColor = "#ff77c8"; context.shadowBlur = 12;
      context.fillStyle = "#ffe183"; context.beginPath(); context.moveTo(-8, 0); context.lineTo(-16, -8); context.lineTo(-15, 8); context.closePath(); context.fill();
      context.fillStyle = "#7cecff"; context.beginPath(); context.moveTo(8, 0); context.lineTo(16, -8); context.lineTo(15, 8); context.closePath(); context.fill();
      context.fillStyle = "#ff5fae"; context.strokeStyle = "#fff0fa"; context.lineWidth = 2; context.beginPath(); context.roundRect(-9, -8, 18, 16, 7); context.fill(); context.stroke();
    } else if (item.kind === "lollipop") {
      context.rotate(Math.sin((now + item.x * 5) / 260) * 0.12);
      context.strokeStyle = "#fff4dd"; context.lineWidth = 4; context.beginPath(); context.moveTo(3, 4); context.lineTo(9, 18); context.stroke();
      context.shadowColor = "#77eaff"; context.shadowBlur = 13; context.fillStyle = "#65dfff"; context.strokeStyle = "#fff5ff"; context.lineWidth = 2;
      context.beginPath(); context.arc(0, -3, 11, 0, Math.PI * 2); context.fill(); context.stroke();
      context.strokeStyle = "#ff5fae"; context.lineWidth = 3; context.beginPath(); context.arc(0, -3, 6, -0.5, Math.PI * 1.35); context.stroke();
    } else if (item.kind === "chocolate") {
      context.rotate(Math.sin((now + item.x * 4) / 290) * 0.08);
      context.shadowColor = "#ffca73"; context.shadowBlur = 11; context.fillStyle = "#6f321b"; context.strokeStyle = "#ffc367"; context.lineWidth = 2;
      context.beginPath(); context.roundRect(-13, -10, 26, 20, 4); context.fill(); context.stroke();
      context.strokeStyle = "#a96132"; context.lineWidth = 1.5; context.beginPath(); context.moveTo(0, -9); context.lineTo(0, 9); context.moveTo(-12, 0); context.lineTo(12, 0); context.stroke();
    } else if (item.kind === "gold") {
      context.rotate(Math.sin((now + item.x * 7) / 260) * 0.08);
      context.fillStyle = "#00000066"; context.beginPath(); context.ellipse(1, 7, 12, 6, 0, 0, Math.PI * 2); context.fill();
      context.shadowColor = "#ffd84d"; context.shadowBlur = 14;
      const nugget = context.createLinearGradient(-10, -10, 10, 10);
      nugget.addColorStop(0, "#fff19a"); nugget.addColorStop(0.35, "#ffc928"); nugget.addColorStop(0.72, "#d99308"); nugget.addColorStop(1, "#8e5705");
      context.fillStyle = nugget; context.strokeStyle = "#fff0a0"; context.lineWidth = 2;
      context.beginPath(); context.moveTo(-11, 1); context.lineTo(-8, -7); context.lineTo(-2, -11); context.lineTo(7, -9); context.lineTo(12, -2); context.lineTo(9, 7); context.lineTo(2, 11); context.lineTo(-8, 8); context.closePath(); context.fill(); context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = "#fff6b8"; context.beginPath(); context.moveTo(-8, -6); context.lineTo(-2, -10); context.lineTo(1, -2); context.lineTo(-5, 1); context.closePath(); context.fill();
      context.fillStyle = "#e6a20d"; context.beginPath(); context.moveTo(1, -2); context.lineTo(7, -8); context.lineTo(11, -2); context.lineTo(7, 4); context.closePath(); context.fill();
      context.strokeStyle = "#a96605"; context.lineWidth = 1.2; context.beginPath(); context.moveTo(-5, 1); context.lineTo(2, 9); context.lineTo(7, 4); context.lineTo(1, -2); context.stroke();
    } else if (item.kind === "gold5") {
      context.rotate(Math.sin((now + item.x * 5) / 210) * 0.12);
      context.fillStyle = "#00000066"; context.beginPath(); context.ellipse(1, 8, 13, 6, 0, 0, Math.PI * 2); context.fill();
      context.shadowColor = "#ffd84d"; context.shadowBlur = 17;
      const coin = context.createRadialGradient(-4, -5, 1, 0, 0, 14);
      coin.addColorStop(0, "#fff4a7"); coin.addColorStop(0.38, "#ffd332"); coin.addColorStop(1, "#aa6505");
      context.fillStyle = coin; context.strokeStyle = "#fff1a0"; context.lineWidth = 2.2;
      context.beginPath(); context.arc(0, 0, 13, 0, Math.PI * 2); context.fill(); context.stroke();
      context.shadowBlur = 0; context.strokeStyle = "#b16d08"; context.lineWidth = 1.5;
      context.beginPath(); context.arc(0, 0, 9.5, 0, Math.PI * 2); context.stroke();
      context.fillStyle = "#704005"; context.font = "900 15px Arial"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText("5", 0, 1);
    } else if (item.kind === "heart") {
      context.shadowColor = "#ff4d63"; context.shadowBlur = 18; context.fillStyle = "#e72f4c"; context.strokeStyle = "#ff9aa9"; context.lineWidth = 2;
      context.beginPath(); context.moveTo(0, 12); context.bezierCurveTo(-4, 7, -13, 1, -13, -6); context.bezierCurveTo(-13, -15, -2, -17, 0, -9); context.bezierCurveTo(3, -17, 13, -15, 13, -6); context.bezierCurveTo(13, 1, 4, 7, 0, 12); context.closePath(); context.fill(); context.stroke();
      context.shadowBlur = 0; context.fillStyle = "#ffd4da"; context.beginPath(); context.ellipse(-5, -8, 3, 2, -0.5, 0, Math.PI * 2); context.fill();
    } else {
      context.shadowColor = "#6befff"; context.shadowBlur = 18; context.fillStyle = "#164e66"; context.strokeStyle = "#8ff5ff"; context.lineWidth = 3;
      context.beginPath(); context.moveTo(0, -15); context.lineTo(13, -9); context.lineTo(10, 7); context.quadraticCurveTo(0, 18, -10, 7); context.lineTo(-13, -9); context.closePath(); context.fill(); context.stroke();
      context.fillStyle = "#c7fbff"; context.font = "bold 15px Arial"; context.textAlign = "center"; context.fillText("✦", 0, 5);
    }
    context.restore();
  });

  hatches.forEach((hatch) => {
    context.save(); context.translate(hatch.x, hatch.y);
    context.fillStyle = "#140c08aa"; context.beginPath(); context.ellipse(0, 4, hatch.width / 2 + 7, hatch.height / 2 + 6, 0, 0, Math.PI * 2); context.fill();
    if (hatch.open) {
      const hole = context.createRadialGradient(0, 0, 2, 0, 0, hatch.width / 2);
      hole.addColorStop(0, "#000"); hole.addColorStop(0.7, "#080504"); hole.addColorStop(1, "#392113");
      context.fillStyle = hole; context.strokeStyle = "#9b6738"; context.lineWidth = 5;
      context.beginPath(); context.ellipse(0, 0, hatch.width / 2, hatch.height / 2, 0, 0, Math.PI * 2); context.fill(); context.stroke();
      context.strokeStyle = "#d29a59"; context.lineWidth = 2; context.beginPath(); context.ellipse(0, 0, hatch.width / 2 - 7, hatch.height / 2 - 5, 0, 0, Math.PI * 2); context.stroke();
      context.strokeStyle = "#c8914b"; context.lineWidth = 3; context.lineCap = "round";
      context.beginPath(); context.moveTo(-7, -4); context.lineTo(-7, 12); context.moveTo(7, -4); context.lineTo(7, 12); context.stroke();
      context.strokeStyle = "#e0ad67"; context.lineWidth = 2.5;
      context.beginPath(); context.moveTo(-7, 2); context.lineTo(7, 2); context.moveTo(-7, 9); context.lineTo(7, 9); context.stroke();
    } else {
      context.fillStyle = "#75401f"; context.strokeStyle = "#d39752"; context.lineWidth = 3;
      context.beginPath(); context.roundRect(-hatch.width / 2, -hatch.height / 2, hatch.width, hatch.height, 7); context.fill(); context.stroke();
      context.strokeStyle = "#3d2112"; context.lineWidth = 2;
      for (let x = -hatch.width / 2 + 15; x < hatch.width / 2; x += 15) { context.beginPath(); context.moveTo(x, -hatch.height / 2 + 2); context.lineTo(x, hatch.height / 2 - 2); context.stroke(); }
      for (let y = -hatch.height / 2 + 10; y < hatch.height / 2; y += 13) { context.beginPath(); context.moveTo(-hatch.width / 2 + 3, y); context.lineTo(hatch.width / 2 - 3, y); context.stroke(); }
      context.fillStyle = "#d6a457"; context.beginPath(); context.arc(0, 0, 4, 0, Math.PI * 2); context.fill();
      if (hatch.hits === 1) { context.strokeStyle = "#f3c979"; context.lineWidth = 2; context.beginPath(); context.moveTo(-24, -12); context.lineTo(-8, 1); context.lineTo(-17, 13); context.stroke(); }
    }
    context.restore();
  });

  obstacles.forEach((obstacle) => {
    context.save(); context.translate(obstacle.x, obstacle.y); context.rotate(obstacle.angle);
    if (obstacle.kind === "rock") {
      const radius = obstacle.width / 2;
      context.fillStyle = "#070d10aa"; context.beginPath(); context.ellipse(3, 6, radius + 6, radius * 0.78, 0, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#526168"; context.strokeStyle = "#222d32"; context.lineWidth = 3;
      context.beginPath(); context.moveTo(-radius * 0.86, -radius * 0.2); context.lineTo(-radius * 0.48, -radius * 0.84); context.lineTo(radius * 0.18, -radius); context.lineTo(radius * 0.82, -radius * 0.48); context.lineTo(radius, radius * 0.18); context.lineTo(radius * 0.48, radius * 0.88); context.lineTo(-radius * 0.34, radius); context.lineTo(-radius, radius * 0.42); context.closePath(); context.fill(); context.stroke();
      context.fillStyle = "#78868b"; context.beginPath(); context.moveTo(-radius * 0.48, -radius * 0.84); context.lineTo(radius * 0.18, -radius); context.lineTo(radius * 0.4, -radius * 0.25); context.lineTo(-radius * 0.2, -radius * 0.05); context.closePath(); context.fill();
      context.fillStyle = "#344147"; context.beginPath(); context.moveTo(radius * 0.4, -radius * 0.25); context.lineTo(radius * 0.82, -radius * 0.48); context.lineTo(radius, radius * 0.18); context.lineTo(radius * 0.35, radius * 0.32); context.closePath(); context.fill();
      if (obstacle.hits <= 2) {
        context.strokeStyle = "#111a1e"; context.lineWidth = 2.4; context.lineCap = "round"; context.lineJoin = "round";
        context.beginPath(); context.moveTo(-radius * 0.18, -radius * 0.72); context.lineTo(radius * 0.02, -radius * 0.27); context.lineTo(-radius * 0.22, radius * 0.08); context.lineTo(-radius * 0.08, radius * 0.58); context.stroke();
        context.strokeStyle = "#8f9b9f88"; context.lineWidth = 1;
        context.beginPath(); context.moveTo(-radius * 0.14, -radius * 0.7); context.lineTo(radius * 0.07, -radius * 0.27); context.lineTo(-radius * 0.17, radius * 0.1); context.stroke();
      }
      if (obstacle.hits <= 1) {
        context.strokeStyle = "#111a1e"; context.lineWidth = 2.2;
        context.beginPath();
        context.moveTo(radius * 0.02, -radius * 0.27); context.lineTo(radius * 0.46, -radius * 0.48); context.lineTo(radius * 0.72, -radius * 0.24);
        context.moveTo(-radius * 0.22, radius * 0.08); context.lineTo(-radius * 0.62, radius * 0.24); context.lineTo(-radius * 0.48, radius * 0.58);
        context.moveTo(-radius * 0.1, radius * 0.34); context.lineTo(radius * 0.34, radius * 0.48); context.lineTo(radius * 0.5, radius * 0.76);
        context.stroke();
      }
    } else if (obstacle.kind === "candyChest") {
      context.shadowColor = "#ff79cf"; context.shadowBlur = 16; context.fillStyle = "#71336f"; context.beginPath(); context.roundRect(-obstacle.width / 2, -10, obstacle.width, 35, 7); context.fill();
      context.fillStyle = "#b7529c"; context.strokeStyle = "#ffe07b"; context.lineWidth = 4; context.beginPath(); context.roundRect(-obstacle.width / 2 + 2, -27, obstacle.width - 4, 24, [14, 14, 3, 3]); context.fill(); context.stroke();
      context.strokeRect(-obstacle.width / 2, -10, obstacle.width, 35); context.fillStyle = "#fff08a"; context.fillRect(-6, -8, 12, 14);
    } else if (obstacle.kind === "chest") {
      context.shadowColor = "#ffd85e"; context.shadowBlur = obstacle.hits === 1 ? 13 : 4; context.fillStyle = "#4a2613"; context.fillRect(-24, -10, 48, 27);
      context.fillStyle = "#8e4c22"; context.beginPath(); context.roundRect(-23, -20, 46, 19, [10, 10, 2, 2]); context.fill();
      context.strokeStyle = "#e8b94e"; context.lineWidth = 4; context.strokeRect(-24, -10, 48, 27); context.beginPath(); context.moveTo(0, -20); context.lineTo(0, 17); context.stroke();
      context.fillStyle = "#ffe17b"; context.fillRect(-5, -7, 10, 11);
      if (obstacle.hits === 1) { context.strokeStyle = "#fff0a3"; context.lineWidth = 2; context.beginPath(); context.moveTo(-12, -16); context.lineTo(-4, -7); context.lineTo(-10, 2); context.stroke(); }
    } else {
      const drawLog = (offsetY: number, logHeight: number) => {
        context.fillStyle = "#29160d"; context.beginPath(); context.roundRect(-obstacle.width / 2 - 3, offsetY - logHeight / 2 + 3, obstacle.width + 6, logHeight, 8); context.fill();
        const bark = context.createLinearGradient(0, offsetY - logHeight / 2, 0, offsetY + logHeight / 2);
        bark.addColorStop(0, "#c37a37"); bark.addColorStop(0.5, "#87471f"); bark.addColorStop(1, "#543019");
        context.fillStyle = bark; context.beginPath(); context.roundRect(-obstacle.width / 2, offsetY - logHeight / 2, obstacle.width, logHeight, 7); context.fill();
        context.strokeStyle = "#e0a45e"; context.lineWidth = 1.6;
        for (let x = -obstacle.width / 2 + 14; x < obstacle.width / 2 - 8; x += 24) { context.beginPath(); context.moveTo(x, offsetY - logHeight / 2 + 3); context.quadraticCurveTo(x - 5, offsetY, x + 1, offsetY + logHeight / 2 - 3); context.stroke(); }
        context.fillStyle = "#d49a5b"; context.beginPath(); context.ellipse(-obstacle.width / 2 + 2, offsetY, 5, logHeight / 2 - 2, 0, 0, Math.PI * 2); context.fill();
        context.strokeStyle = "#805025"; context.lineWidth = 1; context.beginPath(); context.ellipse(-obstacle.width / 2 + 2, offsetY, 2.5, logHeight / 2 - 5, 0, 0, Math.PI * 2); context.stroke();
        context.fillStyle = "#4d2815"; context.beginPath(); context.ellipse(obstacle.width * 0.1, offsetY - 1, 4, 3, 0, 0, Math.PI * 2); context.fill();
      };

      if (obstacle.hits > 1) {
        drawLog(-9, 17); drawLog(9, 17);
        context.fillStyle = "#fff3d5"; context.font = "900 14px Arial"; context.textAlign = "center"; context.shadowColor = "#30160c"; context.shadowBlur = 4; context.fillText("2", 0, 5); context.shadowBlur = 0;
      } else if (obstacle.width < 74) {
        const half = obstacle.width / 2;
        context.fillStyle = "#311a0e"; context.beginPath(); context.ellipse(0, 7, half + 3, 10, 0, 0, Math.PI * 2); context.fill();
        context.fillStyle = "#70401f"; context.beginPath(); context.moveTo(-half + 5, -3); context.lineTo(-half, 9); context.lineTo(-half - 5, 13); context.lineTo(-half + 8, 12); context.lineTo(half - 8, 12); context.lineTo(half + 5, 13); context.lineTo(half, 9); context.lineTo(half - 5, -3); context.closePath(); context.fill();
        context.fillStyle = "#d09a5d"; context.strokeStyle = "#60381d"; context.lineWidth = 2; context.beginPath(); context.ellipse(0, -4, half - 3, 9, 0, 0, Math.PI * 2); context.fill(); context.stroke();
        context.strokeStyle = "#96602f"; context.lineWidth = 1.5; context.beginPath(); context.ellipse(0, -4, half * 0.55, 5, 0, 0, Math.PI * 2); context.ellipse(0, -4, half * 0.22, 2.2, 0, 0, Math.PI * 2); context.stroke();
        context.strokeStyle = "#5a321a"; context.beginPath(); context.moveTo(2, -4); context.lineTo(half * 0.65, -8); context.stroke();
      } else drawLog(0, 22);
    }
    context.restore();
  });

  projectiles.forEach((projectile) => {
    const hue = (projectile.level * 67 + 18) % 360;
    const metal = projectile.level === 1 ? "#e6edef" : `hsl(${hue} 88% 68%)`;
    const glow = projectile.level === 1 ? "#fff0b3" : `hsl(${hue} 100% 72%)`;
    context.save(); context.translate(projectile.x, projectile.y); context.rotate(projectile.rotation); context.shadowColor = glow; context.shadowBlur = 7 + Math.min(10, projectile.level * 1.5);
    context.strokeStyle = "#c89555"; context.lineWidth = 5; context.beginPath(); context.moveTo(0, 13); context.lineTo(0, -10); context.stroke();
    context.strokeStyle = metal; context.lineWidth = 6; context.beginPath(); context.moveTo(-12, -9); context.quadraticCurveTo(0, -17, 12, -9); context.stroke();
    if (projectile.level > 1) { context.fillStyle = metal; context.beginPath(); context.arc(0, -12, 2.5, 0, Math.PI * 2); context.fill(); }
    context.restore();
  });
  if (showFairness) {
    const route = inspectFairRoute(segments, obstacles);
    context.fillStyle = route.fair ? "#54ff9a88" : "#ff5d4f99";
    route.points.forEach((point) => {
      context.beginPath(); context.arc(point.x, point.y, 2.1, 0, Math.PI * 2); context.fill();
    });
  }
  if (showHitboxes) {
    context.save(); context.strokeStyle = "#ff4ee6"; context.lineWidth = 1.5; context.setLineDash([5, 4]);
    context.beginPath();
    for (let y = 0; y <= HEIGHT; y += 6) {
      openingsAt(segments, y).forEach((opening) => {
        const { left, right } = openingEdges(opening);
        context.moveTo(left + DWARF_HIT_RADIUS + 3, y); context.lineTo(left + DWARF_HIT_RADIUS + 3, y + 1);
        context.moveTo(right - DWARF_HIT_RADIUS - 3, y); context.lineTo(right - DWARF_HIT_RADIUS - 3, y + 1);
      });
    }
    context.stroke();
    context.beginPath(); context.arc(dwarfX, DWARF_Y, DWARF_HIT_RADIUS, 0, Math.PI * 2); context.stroke();
    collectibles.forEach((item) => { context.beginPath(); context.arc(item.x, item.y, item.radius, 0, Math.PI * 2); context.stroke(); });
    projectiles.forEach((projectile) => { context.beginPath(); context.arc(projectile.x, projectile.y, 10, 0, Math.PI * 2); context.stroke(); });
    obstacles.forEach((obstacle) => {
      context.save(); context.translate(obstacle.x, obstacle.y); context.rotate(obstacle.angle);
      if (obstacle.kind === "rock") { context.beginPath(); context.arc(0, 0, obstacle.width / 2, 0, Math.PI * 2); context.stroke(); }
      else context.strokeRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height);
      context.restore();
    });
    hatches.forEach((hatch) => { context.strokeRect(hatch.x - hatch.width / 2, hatch.y - hatch.height / 2, hatch.width, hatch.height); });
    context.restore();
  }
  particles.forEach((particle) => { context.globalAlpha = Math.max(0, particle.life); context.fillStyle = particle.color; context.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size); });
  context.globalAlpha = 1;
  feedback.forEach((item) => { context.globalAlpha = Math.min(1, item.life * 2); context.fillStyle = item.color; context.font = "900 20px Arial"; context.textAlign = "center"; context.shadowColor = "#000"; context.shadowBlur = 5; context.fillText(item.text, item.x, item.y); });
  context.globalAlpha = 1; context.shadowBlur = 0;
  if (shield > 0) {
    context.strokeStyle = "#78efff"; context.lineWidth = 4; context.shadowColor = "#69efff"; context.shadowBlur = 16;
    context.beginPath(); context.arc(dwarfX, DWARF_Y - 5, 28 + Math.sin(now / 150) * 2, 0, Math.PI * 2); context.stroke(); context.shadowBlur = 0;
  }
  if (bonusPhase === "active" || bonusPhase === "exit" || bonusPhase === "climbing") {
    const wallY = bonusExitWallY;
    const exitEdgeY = (x: number) => {
      const sideBlend = Math.max(0, (Math.abs(x - WIDTH / 2) - 54) / 118) * 24;
      const rockNoise = Math.sin(x * 0.087 + 1.4) * 5 + Math.sin(x * 0.031) * 3;
      return wallY + 48 + sideBlend + rockNoise;
    };
    context.save();
    if (wallY > -24) {
      context.save();
      context.beginPath(); context.rect(-8, 0, WIDTH + 16, Math.min(HEIGHT, wallY + 24)); context.clip();
      context.fillStyle = levelTheme.cavern[2]; context.fillRect(-8, 0, WIDTH + 16, Math.min(HEIGHT, wallY + 24));
      for (let rockY = wallY - 30, row = 0; rockY > -38; rockY -= 34, row += 1) {
        for (let x = -24 + (row % 2) * 20, column = 0; x < WIDTH + 24; x += 40, column += 1) {
          context.fillStyle = levelTheme.wall[(row + column) % 3 + 2];
          context.strokeStyle = "#1d1026"; context.lineWidth = 2.5;
          context.beginPath(); context.moveTo(x - 3, rockY + 8); context.lineTo(x + 7, rockY - 13); context.lineTo(x + 30, rockY - 16); context.lineTo(x + 43, rockY + 3); context.lineTo(x + 34, rockY + 25); context.lineTo(x + 8, rockY + 28); context.closePath(); context.fill(); context.stroke();
          context.fillStyle = "#a36aa02b"; context.beginPath(); context.moveTo(x + 7, rockY - 13); context.lineTo(x + 30, rockY - 16); context.lineTo(x + 20, rockY + 2); context.lineTo(x + 3, rockY + 7); context.closePath(); context.fill();
        }
      }
      context.restore();
    }
    context.fillStyle = levelTheme.cavern[2];
    context.beginPath();
    context.moveTo(-8, wallY - 22);
    context.lineTo(WIDTH + 8, wallY - 22);
    context.lineTo(WIDTH + 8, exitEdgeY(WIDTH + 8));
    for (let x = WIDTH; x >= 0; x -= 20) context.lineTo(x, exitEdgeY(x));
    context.lineTo(-8, exitEdgeY(-8));
    context.closePath();
    context.fill();
    for (let row = 0; row < 2; row += 1) {
      for (let x = -24 + (row % 2) * 20, column = 0; x < WIDTH + 24; x += 40, column += 1) {
        const shoulderDrop = Math.max(0, (Math.abs(x + 20 - WIDTH / 2) - 54) / 118) * 20;
        const unevenOffset = ((column * 17 + row * 11) % 13) - 6;
        const rockY = wallY + row * 29 + shoulderDrop * row + unevenOffset;
        context.fillStyle = levelTheme.wall[(row + column) % 3 + 2];
        context.strokeStyle = "#1d1026"; context.lineWidth = 3;
        context.beginPath(); context.moveTo(x - 3, rockY + 9); context.lineTo(x + 6, rockY - 13); context.lineTo(x + 30, rockY - 17); context.lineTo(x + 43, rockY + 2); context.lineTo(x + 35, rockY + 26); context.lineTo(x + 8, rockY + 29); context.closePath(); context.fill(); context.stroke();
        context.fillStyle = "#a36aa033"; context.beginPath(); context.moveTo(x + 6, rockY - 13); context.lineTo(x + 30, rockY - 17); context.lineTo(x + 20, rockY + 2); context.lineTo(x + 2, rockY + 7); context.closePath(); context.fill();
      }
    }
    // The doorway sits at the upper end of the ladder, so the climb visibly
    // leads into the exit instead of ending beside or behind it.
    context.fillStyle = "#050609"; context.strokeStyle = levelTheme.edgeRock[2]; context.lineWidth = 6;
    context.beginPath(); context.roundRect(BONUS_LADDER_X - 31, wallY - 82, 62, 76, [31, 31, 8, 8]); context.fill(); context.stroke();
    context.fillStyle = `${levelTheme.accent}33`; context.beginPath(); context.ellipse(BONUS_LADDER_X, wallY - 8, 21, 8, 0, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#d29a59"; context.lineWidth = 3; context.beginPath(); context.moveTo(BONUS_LADDER_X - 29, wallY - 77); context.lineTo(BONUS_LADDER_X - 39, wallY - 63); context.moveTo(BONUS_LADDER_X + 29, wallY - 77); context.lineTo(BONUS_LADDER_X + 39, wallY - 63); context.stroke();
    const ladderBottom = Math.min(HEIGHT + 20, wallY + 185);
    context.strokeStyle = "#c8914b"; context.lineWidth = 7; context.lineCap = "round";
    context.beginPath(); context.moveTo(BONUS_LADDER_X - 18, wallY - 48); context.lineTo(BONUS_LADDER_X - 18, ladderBottom); context.moveTo(BONUS_LADDER_X + 18, wallY - 48); context.lineTo(BONUS_LADDER_X + 18, ladderBottom); context.stroke();
    context.strokeStyle = "#e0ad67"; context.lineWidth = 5;
    for (let y = wallY - 36; y < ladderBottom; y += 27) { context.beginPath(); context.moveTo(BONUS_LADDER_X - 18, y); context.lineTo(BONUS_LADDER_X + 18, y); context.stroke(); }
    context.restore();
  }
  const dwarfY = bonusPhase === "climbing" ? DWARF_Y - ladderProgress * 130 : DWARF_Y;
  drawDwarf(context, dwarfX, dwarfY, now, now < protectedUntil, hatColor, now >= handEmptyUntil);
  context.restore();
  if (now < impactUntil) { context.fillStyle = "#ff493522"; context.fillRect(0, 0, WIDTH, HEIGHT); }
}

export default function DwarfsGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const tunnelRef = useRef<TunnelSegment[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const hatchesRef = useRef<Hatch[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const feedbackRef = useRef<Feedback[]>([]);
  const nextObstacleAtRef = useRef(0);
  const nextGoldAtRef = useRef(0);
  const nextShieldAtRef = useRef(0);
  const nextHatchAtRef = useRef(0);
  const bonusPhaseRef = useRef<BonusPhase>("none");
  const bonusStartedAtRef = useRef(0);
  const bonusEndsAtRef = useRef(0);
  const bonusLadderEndsAtRef = useRef(0);
  const bonusNextCandyAtRef = useRef(0);
  const bonusChestAtRef = useRef(0);
  const bossPhaseRef = useRef<BossPhase>("none");
  const bossPhaseStartedAtRef = useRef(0);
  const bossGateYRef = useRef(-90);
  const bossXRef = useRef(WIDTH / 2);
  const bossDirectionRef = useRef(1);
  const bossHealthRef = useRef(BOSS_MAX_HEALTH);
  const bossNextAttackAtRef = useRef(0);
  const bossNextSpecialAtRef = useRef(0);
  const bossWarningUntilRef = useRef(0);
  const bossWarningXsRef = useRef<number[]>([]);
  const bossAttacksRef = useRef<BossAttack[]>([]);
  const bossVictoryEndsAtRef = useRef(0);
  const bossDefeatedRef = useRef(false);
  const worldRef = useRef(1);
  const generatedSegmentsRef = useRef(0);
  const nextCornerAtRef = useRef(18);
  const dwarfXRef = useRef(WIDTH / 2);
  const goldRef = useRef(0);
  const gemsRef = useRef(0);
  const livesRef = useRef(3);
  const shieldRef = useRef(0);
  const playingRef = useRef(false);
  const startedAtRef = useRef(0);
  const lastFrameRef = useRef(0);
  const protectedUntilRef = useRef(0);
  const impactUntilRef = useRef(0);
  const pausedAtRef = useRef(0);
  const handEmptyUntilRef = useRef(0);
  const shotCooldownRef = useRef<number | null>(null);
  const axeLevelRef = useRef(1);
  const nextSpreadSideRef = useRef<-1 | 1>(-1);
  const selectedHatRef = useRef<HatColor>("blue");
  const difficultyRef = useRef<Difficulty>("normal");
  const highscoreEligibleRef = useRef(true);
  const developerSettingsRef = useRef<DeveloperSettings>({ ...DEFAULT_DEVELOPER_SETTINGS });
  const secretTapRef = useRef({ count: 0, lastTap: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const musicStepRef = useRef(0);
  const soundEnabledRef = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [lives, setLives] = useState(3);
  const [shield, setShield] = useState(0);
  const [level, setLevel] = useState(1);
  const [destroyed, setDestroyed] = useState(0);
  const [axeLevel, setAxeLevel] = useState(1);
  const [gold, setGold] = useState(0);
  const [gems, setGems] = useState(0);
  const [highscores, setHighscores] = useState<Highscores>({ easy: 0, normal: 0 });
  const [selectedHat, setSelectedHat] = useState<HatColor>("blue");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [shotReady, setShotReady] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [bonusPhase, setBonusPhase] = useState<BonusPhase>("none");
  const [bonusSeconds, setBonusSeconds] = useState(0);
  const [bossPhase, setBossPhase] = useState<BossPhase>("none");
  const [finaleFinished, setFinaleFinished] = useState(false);
  const [bossHealth, setBossHealth] = useState(BOSS_MAX_HEALTH);
  const [developerDialogOpen, setDeveloperDialogOpen] = useState(false);
  const [developerSettings, setDeveloperSettings] = useState<DeveloperSettings>({ ...DEFAULT_DEVELOPER_SETTINGS });

  const updateDeveloperSetting = <Key extends keyof DeveloperSettings,>(key: Key, value: DeveloperSettings[Key]) => {
    setDeveloperSettings((current) => {
      const next = { ...current, [key]: value };
      developerSettingsRef.current = next;
      return next;
    });
  };

  const playMysticNote = useCallback((frequency: number, duration: number, volume: number) => {
    const audio = audioContextRef.current;
    if (!soundEnabledRef.current || !audio || audio.state !== "running") return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    oscillator.type = "sine"; oscillator.frequency.value = frequency; filter.type = "lowpass"; filter.frequency.value = 720;
    gain.gain.setValueAtTime(0.0001, audio.currentTime); gain.gain.exponentialRampToValueAtTime(volume, audio.currentTime + 0.35); gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(filter).connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration + 0.05);
  }, []);

  const playEffect = useCallback((kind: "throw" | "hit" | "break" | "gold" | "shield" | "damage") => {
    const audio = audioContextRef.current;
    if (!soundEnabledRef.current || !audio || audio.state !== "running") return;
    const sounds: Record<typeof kind, Array<[number, number, number, OscillatorType, number]>> = {
      throw: [[520, 0, 0.11, "triangle", 0.026], [720, 0.06, 0.09, "triangle", 0.02]],
      hit: [[170, 0, 0.13, "square", 0.035], [110, 0.05, 0.1, "triangle", 0.024]],
      break: [[190, 0, 0.12, "square", 0.038], [125, 0.08, 0.18, "sawtooth", 0.026]],
      gold: [[660, 0, 0.13, "sine", 0.034], [880, 0.1, 0.2, "sine", 0.03]],
      shield: [[440, 0, 0.2, "sine", 0.03], [660, 0.12, 0.25, "sine", 0.03], [990, 0.25, 0.3, "sine", 0.024]],
      damage: [[145, 0, 0.22, "sawtooth", 0.038], [92, 0.08, 0.3, "square", 0.024]],
    };
    sounds[kind].forEach(([frequency, delay, duration, type, volume]) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const startAt = audio.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      if (kind === "damage" || kind === "break") oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.62, startAt + duration);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.02);
    });
  }, []);

  const stopMusic = useCallback(() => {
    if (musicTimerRef.current !== null) window.clearInterval(musicTimerRef.current);
    musicTimerRef.current = null;
    return audioContextRef.current?.suspend();
  }, []);

  const startMusic = useCallback(async () => {
    if (!soundEnabledRef.current) return;
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    try {
      await audioContextRef.current.resume();
    } catch {
      return;
    }
    if (audioContextRef.current.state !== "running" || !soundEnabledRef.current) return;
    if (musicTimerRef.current !== null) return;
    const music = bossPhaseRef.current === "completed" ? TRIUMPH_MUSIC : bossPhaseRef.current !== "none" ? BOSS_LEVEL.music : bonusPhaseRef.current !== "none" ? BONUS_LEVEL.music : NORMAL_LEVEL.music;
    const notes = music.notes;
    musicStepRef.current = 0;
    playMysticNote(110, 4.8, 0.1);
    playMysticNote(220, 2.6, 0.13);
    musicTimerRef.current = window.setInterval(() => {
      const frequency = notes[musicStepRef.current % notes.length];
      playMysticNote(frequency, music.leadDuration, music.leadVolume);
      if (musicStepRef.current % 4 === 0) playMysticNote(frequency / 2, music.bassDuration, music.bassVolume);
      musicStepRef.current += 1;
    }, music.intervalMs);
  }, [playMysticNote]);

  const restartMusic = useCallback(async () => {
    await stopMusic();
    await startMusic();
  }, [startMusic, stopMusic]);

  const renderCurrentScene = useCallback((now = performance.now()) => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    if (bossPhaseRef.current === "fight" || bossPhaseRef.current === "victory" || bossPhaseRef.current === "completed") {
      drawBossArena(context, dwarfXRef.current, bossXRef.current, now, protectedUntilRef.current, selectedHatRef.current,
        handEmptyUntilRef.current, projectilesRef.current, bossAttacksRef.current, bossWarningXsRef.current,
        bossWarningUntilRef.current, bossHealthRef.current, bossPhaseRef.current, particlesRef.current,
        feedbackRef.current, shieldRef.current, impactUntilRef.current, bossPhaseStartedAtRef.current);
      return;
    }
    const ladderProgress = bonusPhaseRef.current === "climbing"
      ? Math.max(0, Math.min(1, 1 - (bonusLadderEndsAtRef.current - now) / BONUS_CLIMB_TIME))
      : 0;
    const bonusExitWallY = bonusPhaseRef.current === "active"
      ? BONUS_EXIT_WALL_Y - Math.max(0, bonusEndsAtRef.current - now) * BONUS_SPEED / 1000
      : BONUS_EXIT_WALL_Y;
    drawTunnel(context, tunnelRef.current, dwarfXRef.current, now, protectedUntilRef.current, obstaclesRef.current, hatchesRef.current,
      projectilesRef.current, collectiblesRef.current, particlesRef.current, feedbackRef.current, shieldRef.current, impactUntilRef.current,
      selectedHatRef.current, handEmptyUntilRef.current, bonusPhaseRef.current, ladderProgress, bonusExitWallY,
      developerSettingsRef.current.enabled && developerSettingsRef.current.showHitboxes,
      developerSettingsRef.current.enabled && developerSettingsRef.current.showFairness);
    if (bossPhaseRef.current === "approach" || bossPhaseRef.current === "entering") {
      const enteringProgress = bossPhaseRef.current === "entering"
        ? Math.max(0, Math.min(1, (now - bossPhaseStartedAtRef.current) / BOSS_ENTER_TIME))
        : 0;
      drawBossEntrance(context, bossGateYRef.current, enteringProgress);
    }
  }, []);

  const addGold = useCallback((amount: number) => {
    const next = goldRef.current + amount;
    goldRef.current = next;
    setGold(next);
    if (highscoreEligibleRef.current) {
      const currentDifficulty = difficultyRef.current;
      setHighscores((current) => {
        if (next <= current[currentDifficulty]) return current;
        window.localStorage.setItem(HIGHSCORE_KEYS[currentDifficulty], String(next));
        return { ...current, [currentDifficulty]: next };
      });
    }
  }, []);
  const addGem = useCallback(() => { gemsRef.current += 1; setGems(gemsRef.current); playEffect("gold"); }, [playEffect]);

  const animate = useCallback(function animateFrame(now: number) {
    if (!playingRef.current) return;
    const delta = Math.min(0.05, (now - lastFrameRef.current) / 1000);
    lastFrameRef.current = now;
    const developer = developerSettingsRef.current;
    const beginBossFight = () => {
      bossPhaseRef.current = "fight"; setBossPhase("fight");
      void restartMusic();
      bossPhaseStartedAtRef.current = now; bossXRef.current = WIDTH / 2; bossDirectionRef.current = gameRandom() < .5 ? -1 : 1;
      bossHealthRef.current = BOSS_MAX_HEALTH; setBossHealth(BOSS_MAX_HEALTH);
      bossNextAttackAtRef.current = now + (difficultyRef.current === "easy" ? 1600 : 900); bossNextSpecialAtRef.current = now + BOSS_LEVEL.enemy.specialFirstDelayMs;
      bossWarningUntilRef.current = 0; bossWarningXsRef.current = []; bossAttacksRef.current = [];
      projectilesRef.current = []; particlesRef.current = [];
      feedbackRef.current = [{ x: WIDTH / 2, y: 235, text: `${BOSS_LEVEL.enemy.name.toUpperCase()}!`, color: BOSS_LEVEL.theme.accent, life: 1.6 }];
      dwarfXRef.current = WIDTH / 2;
    };
    const returnFromBoss = () => {
      startedAtRef.current += now - bossPhaseStartedAtRef.current;
      const defeatedWorld = worldRef.current;
      if (defeatedWorld === 1) {
        worldRef.current = 2;
        activateLevelSet(2);
        bossDefeatedRef.current = false;
        // Welt 2 erhält ihre eigene zweiminütige Normalphase.
        startedAtRef.current = now;
      }
      bossPhaseRef.current = "none"; setBossPhase("none");
      void restartMusic();
      tunnelRef.current = createTunnel(developer.enabled ? developer.tunnelWidth : undefined);
      dwarfXRef.current = tunnelAt(tunnelRef.current, DWARF_Y).center;
      obstaclesRef.current = []; hatchesRef.current = []; projectilesRef.current = []; collectiblesRef.current = []; bossAttacksRef.current = [];
      feedbackRef.current = [{ x: dwarfXRef.current, y: DWARF_Y - 55, text: defeatedWorld === 1 ? "WELT 2 BEGINNT!" : "MIT DER KRONE ZURÜCK!", color: "#ffe268", life: 1.6 }];
      nextObstacleAtRef.current = now + 650; nextGoldAtRef.current = now + 220; nextShieldAtRef.current = now + 4200;
      nextHatchAtRef.current = now + NEXT_HATCH_DELAY_MIN + gameRandom() * NEXT_HATCH_DELAY_RANGE;
    };
    const hurtPlayerInBoss = (x: number, y: number) => {
      if (now < protectedUntilRef.current || (developer.enabled && developer.invulnerable)) return;
      impactUntilRef.current = now + 260; protectedUntilRef.current = now + 1050;
      if (shieldRef.current > 0) {
        shieldRef.current = 0; setShield(0); playEffect("shield");
        feedbackRef.current.push({ x, y, text: "ABGEBLOCKT!", color: "#8ff5ff", life: 1.1 });
      } else if (developer.enabled && developer.unlimitedLives) {
        playEffect("damage"); feedbackRef.current.push({ x, y, text: "UNENDLICHE LEBEN", color: "#ffe78c", life: 1 });
      } else {
        const nextLives = livesRef.current - 1; livesRef.current = nextLives; setLives(nextLives); playEffect("damage");
        feedbackRef.current.push({ x, y, text: "AUTSCH!", color: "#ff8b74", life: 1 });
        if (nextLives <= 0) { playingRef.current = false; setPaused(false); setPlaying(false); window.setTimeout(stopMusic, 420); }
      }
      addBurst(particlesRef.current, dwarfXRef.current, DWARF_Y, ["#ff604c", "#ffc0a8"], 18); navigator.vibrate?.([50, 35, 70]);
    };

    if (bossPhaseRef.current === "fight" || bossPhaseRef.current === "victory" || bossPhaseRef.current === "completed") {
      particlesRef.current.forEach((particle) => { particle.x += particle.vx * delta; particle.y += particle.vy * delta; particle.vy += 115 * delta; particle.life -= delta * 1.15; });
      particlesRef.current = particlesRef.current.filter((particle) => particle.life > 0);
      feedbackRef.current.forEach((item) => { item.y -= 25 * delta; item.life -= delta; }); feedbackRef.current = feedbackRef.current.filter((item) => item.life > 0);
      if (bossPhaseRef.current === "completed") {
        if (gameRandom() < delta * 8) addBurst(particlesRef.current, 55 + gameRandom() * (WIDTH - 110), 80 + gameRandom() * 350, ["#8de8ff", "#fff2a1", "#ff9ee8"], 3);
        if (now >= bossVictoryEndsAtRef.current) { setFinaleFinished(true); bossVictoryEndsAtRef.current = Number.POSITIVE_INFINITY; }
        renderCurrentScene(now); if (playingRef.current) animationRef.current = window.requestAnimationFrame(animateFrame); return;
      }
      if (bossPhaseRef.current === "victory") {
        if (now >= bossVictoryEndsAtRef.current) {
          if (worldRef.current === 2) { bossPhaseRef.current = "completed"; setBossPhase("completed"); void restartMusic(); bossPhaseStartedAtRef.current = now; bossVictoryEndsAtRef.current = now + BOSS_COMPLETION_TIME; feedbackRef.current = []; }
          else returnFromBoss();
        }
        renderCurrentScene(now); if (playingRef.current) animationRef.current = window.requestAnimationFrame(animateFrame); return;
      }

      const bossSpeed = bossHealthRef.current <= BOSS_LEVEL.enemy.enrageAtHealth ? BOSS_LEVEL.enemy.enragedSpeed : BOSS_LEVEL.enemy.normalSpeed;
      bossXRef.current += bossDirectionRef.current * bossSpeed * delta;
      if (bossXRef.current < 72 || bossXRef.current > WIDTH - 72) { bossXRef.current = Math.max(72, Math.min(WIDTH - 72, bossXRef.current)); bossDirectionRef.current *= -1; }
      for (let index = projectilesRef.current.length - 1; index >= 0; index -= 1) {
        const projectile = projectilesRef.current[index]; projectile.x += projectile.vx * delta; projectile.y += projectile.vy * delta; projectile.rotation += delta * 12;
        if (Math.hypot(projectile.x - bossXRef.current, projectile.y - 115) < 47) {
          projectilesRef.current.splice(index, 1); bossHealthRef.current -= 1; setBossHealth(bossHealthRef.current);
          impactUntilRef.current = now + 140; addBurst(particlesRef.current, bossXRef.current, 118, ["#ff4938", "#ffd15b", "#6c1720"], 18); playEffect("hit");
          feedbackRef.current.push({ x: bossXRef.current, y: 195, text: bossHealthRef.current > 0 ? "TREFFER!" : "BESIEGT!", color: "#ffe173", life: 1 });
          if (bossHealthRef.current <= 0) {
            bossPhaseRef.current = "victory"; setBossPhase("victory"); bossVictoryEndsAtRef.current = now + BOSS_VICTORY_TIME; bossDefeatedRef.current = true;
            bossAttacksRef.current = []; bossWarningXsRef.current = []; bossWarningUntilRef.current = 0; addGold(BOSS_LEVEL.victory.gold); playEffect("gold");
            for (let burst = 0; burst < 5; burst += 1) addBurst(particlesRef.current, 90 + burst * 55, 250 + (burst % 2) * 55, ["#ffd83d", "#fff5a6", "#ff7bbb"], 18);
          }
        } else if (projectile.y < 45) projectilesRef.current.splice(index, 1);
      }
      if (bossPhaseRef.current === "fight" && now >= bossNextAttackAtRef.current) {
        const dx = dwarfXRef.current - bossXRef.current; const length = Math.max(1, Math.hypot(dx, 330));
        bossAttacksRef.current.push({ kind: "axe", x: bossXRef.current, y: 158, vx: dx / length * 125, vy: 330 / length * 195, rotation: Math.PI, radius: 13 });
        const easyBossDelay = difficultyRef.current === "easy" ? 1.8 : 1;
        const baseBossDelay = (bossHealthRef.current <= BOSS_LEVEL.enemy.enrageAtHealth
          ? BOSS_LEVEL.enemy.attackDelayEnragedMs : BOSS_LEVEL.enemy.attackDelayNormalMs) + gameRandom() * BOSS_LEVEL.enemy.attackDelayRangeMs;
        bossNextAttackAtRef.current = now + baseBossDelay * easyBossDelay;
      }
      if (bossPhaseRef.current === "fight" && now >= bossNextSpecialAtRef.current && bossWarningUntilRef.current === 0) {
        const center = Math.max(50, Math.min(WIDTH - 50, dwarfXRef.current));
        bossWarningXsRef.current = difficultyRef.current === "easy" ? [center] : [center, Math.max(45, center - 88), Math.min(WIDTH - 45, center + 88)];
        bossWarningUntilRef.current = now + 950; bossNextSpecialAtRef.current = Number.POSITIVE_INFINITY;
        feedbackRef.current.push({ x: WIDTH / 2, y: 235, text: "STEINSCHLAG!", color: "#ffad48", life: 1 });
      }
      if (bossWarningUntilRef.current > 0 && now >= bossWarningUntilRef.current) {
        bossWarningXsRef.current.forEach((x, index) => bossAttacksRef.current.push({ kind: "rock", x, y: -28 - index * 22, vx: 0, vy: 205 + index * 16, rotation: index, radius: 18 }));
        bossWarningXsRef.current = []; bossWarningUntilRef.current = 0; bossNextSpecialAtRef.current = now + (bossHealthRef.current <= BOSS_LEVEL.enemy.enrageAtHealth
          ? BOSS_LEVEL.enemy.specialDelayEnragedMs : BOSS_LEVEL.enemy.specialDelayNormalMs);
      }
      for (let index = bossAttacksRef.current.length - 1; index >= 0; index -= 1) {
        const attack = bossAttacksRef.current[index]; attack.x += attack.vx * delta; attack.y += attack.vy * delta; attack.rotation += delta * (attack.kind === "axe" ? 8 : 3.5);
        if (Math.hypot(attack.x - dwarfXRef.current, attack.y - DWARF_Y) < attack.radius + DWARF_HIT_RADIUS) {
          bossAttacksRef.current.splice(index, 1); hurtPlayerInBoss(attack.x, attack.y - 24);
        } else if (attack.y > HEIGHT + 35 || attack.x < -35 || attack.x > WIDTH + 35) bossAttacksRef.current.splice(index, 1);
      }
      renderCurrentScene(now); if (playingRef.current) animationRef.current = window.requestAnimationFrame(animateFrame); return;
    }

    if (bossPhaseRef.current === "entering" && now - bossPhaseStartedAtRef.current >= BOSS_ENTER_TIME) {
      beginBossFight(); renderCurrentScene(now); animationRef.current = window.requestAnimationFrame(animateFrame); return;
    }
    const returnToMine = (message: string, color: string) => {
      startedAtRef.current += now - bonusStartedAtRef.current;
      bonusPhaseRef.current = "none";
      setBonusPhase("none");
      void restartMusic();
      tunnelRef.current = createTunnel(developer.enabled ? developer.tunnelWidth : undefined);
      dwarfXRef.current = tunnelAt(tunnelRef.current, DWARF_Y).center;
      obstaclesRef.current = []; hatchesRef.current = []; projectilesRef.current = []; collectiblesRef.current = [];
      feedbackRef.current = [{ x: dwarfXRef.current, y: DWARF_Y - 55, text: message, color, life: 1.5 }];
      nextObstacleAtRef.current = now + 650;
      nextGoldAtRef.current = now + 220;
      nextShieldAtRef.current = now + 6500 + gameRandom() * 3000;
      nextHatchAtRef.current = now + NEXT_HATCH_DELAY_MIN + gameRandom() * NEXT_HATCH_DELAY_RANGE;
    };
    if (bonusPhaseRef.current === "active") {
      const secondsLeft = Math.max(0, Math.ceil((bonusEndsAtRef.current - now) / 1000));
      setBonusSeconds((current) => current === secondsLeft ? current : secondsLeft);
      if (now >= bonusEndsAtRef.current) {
        bonusPhaseRef.current = "exit";
        bonusLadderEndsAtRef.current = now + BONUS_EXIT_TIME;
        setBonusPhase("exit");
        setBonusSeconds(0);
        obstaclesRef.current = []; hatchesRef.current = []; projectilesRef.current = []; collectiblesRef.current = [];
        feedbackRef.current = [{ x: WIDTH / 2, y: 325, text: "ERREICHE DIE LEITER!", color: "#fff0a0", life: 1.7 }];
      }
    } else if (bonusPhaseRef.current === "exit") {
      if (Math.abs(dwarfXRef.current - BONUS_LADDER_X) <= BONUS_LADDER_REACH) {
        dwarfXRef.current = BONUS_LADDER_X;
        bonusPhaseRef.current = "climbing";
        bonusLadderEndsAtRef.current = now + BONUS_CLIMB_TIME;
        setBonusPhase("climbing");
        feedbackRef.current = [{ x: WIDTH / 2, y: 325, text: "GESCHAFFT!", color: "#8ff5ff", life: 1.2 }];
      } else if (now >= bonusLadderEndsAtRef.current) {
        const protectedByDeveloper = developer.enabled && (developer.invulnerable || developer.unlimitedLives);
        const nextLives = protectedByDeveloper ? livesRef.current : livesRef.current - 1;
        livesRef.current = nextLives;
        setLives(nextLives);
        playEffect("damage");
        navigator.vibrate?.([50, 35, 70]);
        if (nextLives <= 0) {
          bonusPhaseRef.current = "none";
          setBonusPhase("none");
          playingRef.current = false;
          setPaused(false);
          setPlaying(false);
          window.setTimeout(stopMusic, 420);
        } else {
          returnToMine(protectedByDeveloper ? "LEITER VERPASST!" : "LEITER VERPASST! −1 LEBEN", "#ff8b74");
        }
      }
    } else if (bonusPhaseRef.current === "climbing" && now >= bonusLadderEndsAtRef.current) {
      returnToMine("WIEDER IN DER MINE!", "#8ff5ff");
    }
    if (bonusPhaseRef.current === "none" && bossPhaseRef.current === "none" && !bossDefeatedRef.current
      && now - startedAtRef.current >= BOSS_TRIGGER_TIME) {
      bossPhaseRef.current = "approach"; setBossPhase("approach"); bossPhaseStartedAtRef.current = now; bossGateYRef.current = -90;
      obstaclesRef.current = []; hatchesRef.current = []; projectilesRef.current = []; collectiblesRef.current = [];
      feedbackRef.current = [{ x: WIDTH / 2, y: 205, text: "ETWAS GROSSES WARTET …", color: "#ff9a67", life: 2 }];
    }
    if (bossPhaseRef.current === "approach") {
      const approachProgress = Math.min(1, (now - bossPhaseStartedAtRef.current) / BOSS_APPROACH_TIME);
      bossGateYRef.current = -90 + approachProgress * 450;
      if (approachProgress >= 1 && Math.abs(dwarfXRef.current - WIDTH / 2) <= 43) {
        bossPhaseRef.current = "entering"; setBossPhase("entering"); bossPhaseStartedAtRef.current = now;
        dwarfXRef.current = WIDTH / 2; projectilesRef.current = [];
      }
    }
    const inBonus = bonusPhaseRef.current !== "none";
    const levelClock = inBonus ? bonusStartedAtRef.current : now;
    const currentLevel = Math.min(NORMAL_LEVEL.movement.maximumStage, 1 + Math.floor((levelClock - startedAtRef.current) / NORMAL_LEVEL.movement.stageDurationMs));
    const gameplayLevel = difficultyRef.current === "easy" ? 1 : currentLevel;
    const speed = bonusPhaseRef.current === "exit" || bonusPhaseRef.current === "climbing" || bossPhaseRef.current === "entering"
      ? 0
      : bossPhaseRef.current === "approach"
        ? bossGateYRef.current >= 360 ? 0 : 74
      : bonusPhaseRef.current === "active"
        ? BONUS_SPEED
        : developer.enabled ? developer.speed : difficultyRef.current === "easy"
          ? NORMAL_LEVEL.movement.baseSpeed
          : NORMAL_LEVEL.movement.baseSpeed + (currentLevel - 1) * NORMAL_LEVEL.movement.speedPerStage;
    setLevel((current) => current === currentLevel ? current : currentLevel);
    const segments = tunnelRef.current;
    segments.forEach((segment) => { segment.y += speed * delta; });
    while (segments.at(-1)!.y > HEIGHT + GAP) segments.pop();
    while (segments[0].y > -GAP) {
      generatedSegmentsRef.current += 1;
      const makeCorner = !inBonus && bossPhaseRef.current === "none" && generatedSegmentsRef.current >= nextCornerAtRef.current;
      if (makeCorner) {
        nextCornerAtRef.current += Math.max(12, 22 - currentLevel) + Math.floor(gameRandom() * 5);
      }
      const nextY = segments[0].y - GAP;
      if (bonusPhaseRef.current === "active") {
        segments.unshift(earlierBonusSegment(segments[0], nextY));
      } else {
        segments.unshift(earlierSegment(segments[0], nextY, gameplayLevel, makeCorner, developer.enabled ? developer.tunnelWidth : undefined));
      }
    }
    if (bonusPhaseRef.current !== "none") {
      const exitWallY = bonusPhaseRef.current === "active"
        ? BONUS_EXIT_WALL_Y - Math.max(0, bonusEndsAtRef.current - now) * BONUS_SPEED / 1000
        : BONUS_EXIT_WALL_Y;
      segments.forEach((segment) => {
        const distanceFromExit = Math.max(0, segment.y - exitWallY);
        const taperProgress = Math.min(1, distanceFromExit / BONUS_EXIT_TAPER_LENGTH);
        const width = BONUS_EXIT_MIN_WIDTH + (BONUS_TUNNEL_WIDTH - BONUS_EXIT_MIN_WIDTH) * taperProgress;
        segment.width = width;
        segment.openings = [{ center: segment.center, width }];
      });
    }
    if (bossPhaseRef.current === "approach" || bossPhaseRef.current === "entering") {
      const approachProgress = bossPhaseRef.current === "entering" ? 1 : Math.min(1, (now - bossPhaseStartedAtRef.current) / BOSS_APPROACH_TIME);
      segments.forEach((segment) => {
        segment.center += (WIDTH / 2 - segment.center) * Math.min(1, delta * (1.2 + approachProgress));
        segment.width = Math.min(segment.width, NORMAL_LEVEL.tunnel.width - approachProgress * (NORMAL_LEVEL.tunnel.width - BOSS_LEVEL.transition.tunnelWidth));
        segment.openings = [{ center: segment.center, width: segment.width }];
      });
    }
    obstaclesRef.current.forEach((obstacle) => { obstacle.y += speed * delta; });
    obstaclesRef.current = obstaclesRef.current.filter((obstacle) => obstacle.y < HEIGHT + 70);
    hatchesRef.current.forEach((hatch) => { hatch.y += speed * delta; });
    hatchesRef.current = hatchesRef.current.filter((hatch) => hatch.y < HEIGHT + 70);
    collectiblesRef.current.forEach((item) => {
      item.y += speed * delta;
      if (now < item.scatterUntil) {
        item.x += item.vx * delta;
        item.y += item.vy * delta;
        item.vy += 235 * delta;
        const opening = openingForX(segments, item.y, item.x);
        const { left, right } = openingEdges(opening);
        const minimumX = left + item.radius + 11;
        const maximumX = right - item.radius - 11;
        if (item.x < minimumX || item.x > maximumX) {
          item.x = Math.max(minimumX, Math.min(maximumX, item.x));
          item.vx *= -0.35;
        }
      } else if (item.vx !== 0 || item.vy !== 0) {
        item.vx = 0;
        item.vy = 0;
      }
    });
    collectiblesRef.current = collectiblesRef.current.filter((item) => item.y < HEIGHT + 35);
    particlesRef.current.forEach((particle) => { particle.x += particle.vx * delta; particle.y += particle.vy * delta; particle.vy += 115 * delta; particle.life -= delta * 1.35; });
    particlesRef.current = particlesRef.current.filter((particle) => particle.life > 0);
    feedbackRef.current.forEach((item) => { item.y -= 34 * delta; item.life -= delta; });
    feedbackRef.current = feedbackRef.current.filter((item) => item.life > 0);

    for (let projectileIndex = projectilesRef.current.length - 1; projectileIndex >= 0; projectileIndex -= 1) {
      const projectile = projectilesRef.current[projectileIndex];
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
      projectile.rotation += delta * 12;
      const hitsWall = !pointFitsOpening(segments, projectile.x, projectile.y, 10, 12);
      const hatchIndex = hatchesRef.current.findIndex((hatch) => !hatch.open
        && Math.abs(projectile.x - hatch.x) < hatch.width / 2 + 11
        && Math.abs(projectile.y - hatch.y) < hatch.height / 2 + 14);
      const rockIndex = obstaclesRef.current.findIndex((obstacle) => obstacle.kind === "rock"
        && Math.hypot(projectile.x - obstacle.x, projectile.y - obstacle.y) < obstacle.width / 2 + 10);
      const hitIndex = obstaclesRef.current.findIndex((obstacle) => obstacle.kind !== "rock"
        && Math.abs(projectile.x - obstacle.x) < obstacle.width / 2 + 13
        && Math.abs(projectile.y - obstacle.y) < obstacle.height / 2 + 18);
      if (hatchIndex >= 0) {
        const hatch = hatchesRef.current[hatchIndex];
        hatch.hits -= 1;
        hatch.open = hatch.hits <= 0;
        impactUntilRef.current = now + 140;
        addBurst(particlesRef.current, projectile.x, projectile.y, ["#e4ad65", "#965327", "#4b2915"], hatch.open ? 18 : 10);
        feedbackRef.current.push({ x: hatch.x, y: hatch.y - 25, text: hatch.open ? "KLAPPE OFFEN!" : "NOCH EIN TREFFER!", color: "#ffe0a0", life: 1 });
        playEffect(hatch.open ? "break" : "hit");
        navigator.vibrate?.(hatch.open ? [24, 18, 34] : 20);
        projectilesRef.current.splice(projectileIndex, 1);
      } else if (rockIndex >= 0) {
        const rock = obstaclesRef.current[rockIndex];
        impactUntilRef.current = now + 140;
        if (projectile.level >= 2) {
          rock.hits -= 1;
          const destroyedRock = rock.hits <= 0;
          addBurst(particlesRef.current, projectile.x, projectile.y, destroyedRock
            ? ["#d9e1e2", "#77868b", "#39464b"]
            : ["#b9c4c7", "#65747a", "#303c41"], destroyedRock ? 18 : 10);
          feedbackRef.current.push({
            x: rock.x,
            y: rock.y - 24,
            text: destroyedRock ? "ZERTRÜMMERT!" : rock.hits === 1 ? "MEHR RISSE!" : "RISS!",
            color: destroyedRock ? "#eef5f4" : "#cbd6d8",
            life: destroyedRock ? 1 : 0.72,
          });
          playEffect(destroyedRock ? "break" : "hit");
          navigator.vibrate?.(destroyedRock ? [28, 18, 42] : 24);
          if (destroyedRock) {
            obstaclesRef.current.splice(rockIndex, 1);
            const heartChance = Math.max(0, Math.min(100, developer.enabled ? developer.rockHeartChance : 15)) / 100;
            const goldChance = Math.max(0, Math.min(100, developer.enabled ? developer.rockGoldChance : 25)) / 100;
            const canDropHeart = livesRef.current < 3;
            const rewardRoll = gameRandom();
            const rewardKind = canDropHeart && rewardRoll < heartChance
              ? "heart"
              : rewardRoll < (canDropHeart ? heartChance : 0) + goldChance ? "gold5" : null;
            if (rewardKind) {
              collectiblesRef.current.push({
                kind: rewardKind,
                x: rock.x,
                y: rock.y - 3,
                radius: rewardKind === "heart" ? 13 : 14,
                vx: (gameRandom() - 0.5) * 74,
                vy: -125 - gameRandom() * 38,
                scatterUntil: now + 820 + gameRandom() * 160,
              });
              feedbackRef.current.push({ x: rock.x, y: rock.y + 5, text: rewardKind === "heart" ? "HERZ!" : "5 GOLD!", color: rewardKind === "heart" ? "#ff8fa2" : "#ffd84d", life: 1 });
            }
          }
        } else {
          addBurst(particlesRef.current, projectile.x, projectile.y, ["#eef5f4", "#87969a", "#3e4a4e"], 9);
          feedbackRef.current.push({ x: projectile.x, y: projectile.y - 15, text: "HACKE LEVEL 2 NÖTIG", color: "#d9e6e5", life: 0.8 });
          playEffect("hit");
          navigator.vibrate?.(16);
        }
        projectilesRef.current.splice(projectileIndex, 1);
      } else if (hitsWall) {
        impactUntilRef.current = now + 110;
        addBurst(particlesRef.current, projectile.x, projectile.y, ["#eef5f4", "#87969a", "#3e4a4e"], 9);
        feedbackRef.current.push({ x: projectile.x, y: projectile.y - 15, text: "KLIRR!", color: "#d9e6e5", life: 0.55 });
        playEffect("hit");
        navigator.vibrate?.(16);
        projectilesRef.current.splice(projectileIndex, 1);
      } else if (hitIndex >= 0) {
        const hit = obstaclesRef.current[hitIndex];
        hit.hits -= 1;
        if (hit.kind === "wood") {
          setDestroyed((current) => {
            const next = current + 1;
            const woodPerAxeLevel = difficultyRef.current === "easy" ? 4 : 15;
            const nextAxeLevel = Math.max(developer.enabled ? developer.axeLevel : 1, 1 + Math.floor(next / woodPerAxeLevel));
            if (nextAxeLevel !== axeLevelRef.current) feedbackRef.current.push({ x: WIDTH / 2, y: 210, text: `HACKE LEVEL ${nextAxeLevel}!`, color: "#7cecff", life: 1.4 });
            axeLevelRef.current = nextAxeLevel; setAxeLevel(nextAxeLevel); return next;
          });
        }
        if (hit.kind === "wood" && hit.hits === 1) hit.height = 24;
        impactUntilRef.current = now + 150;
        addBurst(particlesRef.current, projectile.x, projectile.y, hit.kind === "candyChest"
          ? ["#ff6fca", "#72eaff", "#ffe47b"]
          : hit.kind === "chest" ? ["#ffe17b", "#bd6b2b", "#fff0ad"] : ["#d49351", "#8f4d25", "#f0b46c"]);
        feedbackRef.current.push({ x: hit.x, y: hit.y - 24, text: hit.hits > 0 ? "TREFFER!" : "KRACH!", color: "#fff0aa", life: 0.75 });
        playEffect(hit.hits > 0 ? "hit" : "break");
        navigator.vibrate?.(hit.hits > 0 ? 22 : [25, 20, 35]);
        if (hit.hits <= 0) {
          obstaclesRef.current.splice(hitIndex, 1);
          if (hit.kind === "candyChest") {
            const originalCandyCount = 5 + Math.floor(gameRandom() * 4);
            const candyCount = Math.round(originalCandyCount * BONUS_LEVEL.candy.chestMultiplier);
            for (let candyIndex = 0; candyIndex < candyCount; candyIndex += 1) {
              collectiblesRef.current.push(candyCollectible(BONUS_LEVEL.world === 2 ? randomToyKind() : randomCandyKind(), hit.x + (gameRandom() - 0.5) * 8, hit.y - 6, now, true));
            }
            playEffect("gold");
            feedbackRef.current.push({ x: hit.x, y: hit.y - 8, text: `${candyCount} LECKERBISSEN!`, color: "#ff9ddd", life: 1.3 });
            addBurst(particlesRef.current, hit.x, hit.y, ["#ff68c4", "#72eaff", "#ffe278"], 26);
          } else if (hit.kind === "chest") {
            const chestItems = worldRef.current === 2 ? 5 : 3;
            Array.from({ length: chestItems }, (_, itemIndex) => itemIndex).forEach((itemIndex) => {
              const direction = itemIndex - (chestItems - 1) / 2;
              const isGem = worldRef.current === 2 && gameRandom() < 0.68;
              collectiblesRef.current.push({
                kind: isGem ? randomGemKind() : "gold",
                x: hit.x + direction * 3,
                y: hit.y - 4,
                radius: isGem ? 12 : 11,
                vx: direction * (62 + gameRandom() * 18) + (gameRandom() - 0.5) * 7,
                vy: -118 - gameRandom() * 42,
                scatterUntil: now + 780 + gameRandom() * 180,
              });
            });
            playEffect("gold");
            feedbackRef.current.push({ x: hit.x, y: hit.y - 2, text: `${chestItems} GEGENSTÄNDE!`, color: worldRef.current === 2 ? "#9ff3ff" : "#ffd84d", life: 1.15 });
            addBurst(particlesRef.current, hit.x, hit.y, ["#ffd12e", "#fff2a0"], 20);
          }
        }
        projectilesRef.current.splice(projectileIndex, 1);
      } else if (projectile.y < -25) projectilesRef.current.splice(projectileIndex, 1);
    }

    if (bonusPhaseRef.current === "active" && now < bonusEndsAtRef.current - BONUS_EXIT_APPROACH_TIME) {
      if (now >= bonusNextCandyAtRef.current) {
        const opening = tunnelAt(segments, -24);
        const margin = 30;
        const x = opening.center + (gameRandom() - 0.5) * Math.max(0, opening.width - margin * 2);
        collectiblesRef.current.push(candyCollectible(BONUS_LEVEL.world === 2 ? randomToyKind() : randomCandyKind(), x, -24));
        bonusNextCandyAtRef.current = now + BONUS_CANDY_INTERVAL_MIN + gameRandom() * BONUS_CANDY_INTERVAL_RANGE;
      }
      if (now >= bonusChestAtRef.current) {
        const opening = tunnelAt(segments, -32);
        const available = Math.max(0, opening.width / 2 - 70);
        obstaclesRef.current.push({ kind: "candyChest", x: opening.center + (gameRandom() - 0.5) * available * 2, y: -35, width: 78, height: 48, angle: 0, hits: 1 });
        bonusChestAtRef.current = Number.POSITIVE_INFINITY;
      }
    } else if (bonusPhaseRef.current === "none" && bossPhaseRef.current === "none") {
      if (now >= nextObstacleAtRef.current) {
        obstaclesRef.current.push(...createFairObstacles(segments, obstaclesRef.current, collectiblesRef.current, hatchesRef.current, gameplayLevel,
          developer.enabled ? developer.forcedObstacle : "random"));
        nextObstacleAtRef.current = developer.enabled
          ? now + developer.obstacleInterval * 1000
          : difficultyRef.current === "easy"
            ? now + NORMAL_LEVEL.spawns.easyObstacleBaseMs + gameRandom() * NORMAL_LEVEL.spawns.easyObstacleRangeMs
            : now + Math.max(NORMAL_LEVEL.spawns.normalObstacleMinimumMs,
              NORMAL_LEVEL.spawns.normalObstacleBaseMs - (currentLevel - 1) * NORMAL_LEVEL.spawns.normalObstacleStageStepMs)
              + gameRandom() * NORMAL_LEVEL.spawns.normalObstacleRangeMs;
      }
      if (now >= nextGoldAtRef.current) {
        const worldTwoGem = worldRef.current === 2 && gameRandom() < 0.65;
        const item = createCollectible(segments, worldTwoGem ? randomGemKind() : "gold", obstaclesRef.current);
        if (item) collectiblesRef.current.push(item);
        nextGoldAtRef.current = now + NORMAL_LEVEL.spawns.goldBaseMs + gameRandom() * NORMAL_LEVEL.spawns.goldRangeMs;
      }
      if (now >= nextShieldAtRef.current) {
        const shieldItem = createCollectible(segments, "shield", obstaclesRef.current);
        if (shieldRef.current === 0 && shieldItem) collectiblesRef.current.push(shieldItem);
        nextShieldAtRef.current = now + NORMAL_LEVEL.spawns.shieldBaseMs + gameRandom() * NORMAL_LEVEL.spawns.shieldRangeMs;
      }
      if (now >= nextHatchAtRef.current) {
        if (hatchesRef.current.length === 0) {
          const hatch = createHatch(segments, obstaclesRef.current);
          if (hatch) {
            hatchesRef.current.push(hatch);
            nextObstacleAtRef.current = Math.max(nextObstacleAtRef.current, now + 1800);
            nextHatchAtRef.current = now + NEXT_HATCH_DELAY_MIN + gameRandom() * NEXT_HATCH_DELAY_RANGE;
          } else {
            nextHatchAtRef.current = now + HATCH_RETRY_DELAY;
          }
        } else {
          nextHatchAtRef.current = now + HATCH_RETRY_DELAY;
        }
      }
    }

    const dwarfTunnel = openingForX(segments, DWARF_Y, dwarfXRef.current);
    const wallCollision = !pointFitsOpening(segments, dwarfXRef.current, DWARF_Y, DWARF_HIT_RADIUS, 3);
    const obstacleIndex = obstaclesRef.current.findIndex((obstacle) => dwarfTouchesObstacle(dwarfXRef.current, obstacle));
    const collectedItems = collectiblesRef.current.filter((item) => Math.hypot(dwarfXRef.current - item.x, DWARF_Y - item.y) < DWARF_RADIUS + item.radius);
    if (collectedItems.length > 0) {
      const collectedSet = new Set(collectedItems);
      collectiblesRef.current = collectiblesRef.current.filter((item) => !collectedSet.has(item));
      collectedItems.forEach((item) => {
        if (isGemKind(item.kind)) {
          addGem(); feedbackRef.current.push({ x: item.x, y: item.y, text: "+1", color: "#8ff5ff", life: 1.1 });
          addBurst(particlesRef.current, item.x, item.y, ["#ffffff", "#72eaff", "#d9a1ff"], 16); navigator.vibrate?.([12, 18, 12]); return;
        }
        const goldValue = collectibleGoldValue(item.kind);
        if (goldValue > 0) {
          addGold(goldValue);
          playEffect("gold");
          feedbackRef.current.push({ x: item.x, y: item.y, text: `+${goldValue}`, color: item.kind === "gold" || item.kind === "gold5" ? "#ffe45e" : "#ff9ddd", life: item.kind === "gold5" ? 1.15 : 1.05 });
          addBurst(particlesRef.current, item.x, item.y, item.kind === "candy" || item.kind === "lollipop" || item.kind === "chocolate" ? ["#ff62bd", "#72eaff", "#ffe477"] : ["#ffd12e", "#fff2a0"], item.kind === "gold5" ? 20 : item.kind === "gold" ? 14 : 16);
          navigator.vibrate?.(goldValue === 1 ? 15 : [16, 24, 16]);
        } else if (item.kind === "heart") {
          const gainedLife = livesRef.current < 3;
          const nextLives = Math.min(3, livesRef.current + 1);
          livesRef.current = nextLives; setLives(nextLives); playEffect("shield"); feedbackRef.current.push({ x: item.x, y: item.y, text: gainedLife ? "+1 LEBEN" : "LEBEN VOLL!", color: "#ff91a3", life: 1.15 }); addBurst(particlesRef.current, item.x, item.y, ["#ff405c", "#ffc1cb"], 18); navigator.vibrate?.([18, 22, 18]);
        } else {
          shieldRef.current = 1; setShield(1); playEffect("shield"); feedbackRef.current.push({ x: item.x, y: item.y, text: "SCHILD!", color: "#8ff5ff", life: 1.15 }); addBurst(particlesRef.current, item.x, item.y, ["#64e9ff", "#d0fbff"], 18); navigator.vibrate?.([18, 25, 18]);
        }
      });
    }

    if (bonusPhaseRef.current === "none") {
      const enteredHatch = hatchesRef.current.find((hatch) => hatch.open
        && Math.abs(hatch.x - dwarfXRef.current) < hatch.width / 2 - 5
        && Math.abs(hatch.y - DWARF_Y) < hatch.height / 2 + 8);
      if (enteredHatch) {
        bonusPhaseRef.current = "active";
        bonusStartedAtRef.current = now;
        bonusEndsAtRef.current = now + BONUS_DURATION;
        bonusNextCandyAtRef.current = now + 300;
        bonusChestAtRef.current = now + BONUS_LEVEL.candy.chestFirstMinMs + gameRandom() * BONUS_LEVEL.candy.chestFirstRangeMs;
        setBonusPhase("active"); void restartMusic();
        setBonusSeconds(BONUS_DURATION / 1000);
        tunnelRef.current = createBonusTunnel();
        dwarfXRef.current = tunnelAt(tunnelRef.current, DWARF_Y).center;
        generatedSegmentsRef.current = 0;
        obstaclesRef.current = []; hatchesRef.current = []; projectilesRef.current = []; collectiblesRef.current = BONUS_LEVEL.world === 2 ? createInitialBonusToys(tunnelRef.current) : createInitialBonusCandies(tunnelRef.current); particlesRef.current = [];
        feedbackRef.current = [{ x: dwarfXRef.current, y: DWARF_Y - 55, text: BONUS_LEVEL.world === 2 ? "SPIELZEUG-BONUS!" : "SÜSSIGKEITEN-BONUS!", color: "#ff9ddd", life: 1.6 }];
        playEffect("gold");
        navigator.vibrate?.([20, 25, 20, 25, 35]);
        renderCurrentScene(now);
        animationRef.current = window.requestAnimationFrame(animateFrame);
        return;
      }
    }

    const collisionCausesDamage = bossPhaseRef.current !== "none"
      ? false
      : bonusPhaseRef.current === "active" ? wallCollision : bonusPhaseRef.current === "none" && (wallCollision || obstacleIndex >= 0);
    if (collisionCausesDamage && now >= protectedUntilRef.current && !(developer.enabled && developer.invulnerable)) {
      if (bonusPhaseRef.current === "none" && obstacleIndex >= 0) obstaclesRef.current.splice(obstacleIndex, 1);
      dwarfXRef.current = dwarfTunnel.center; impactUntilRef.current = now + 260; protectedUntilRef.current = now + 950;
      if (shieldRef.current > 0) {
        shieldRef.current = 0; setShield(0); playEffect("shield"); feedbackRef.current.push({ x: dwarfXRef.current, y: DWARF_Y - 45, text: "ABGEBLOCKT!", color: "#8ff5ff", life: 1.1 }); addBurst(particlesRef.current, dwarfXRef.current, DWARF_Y, ["#65eaff", "#d4fcff"], 22); navigator.vibrate?.([20, 25, 20]);
      } else if (developer.enabled && developer.unlimitedLives) {
        playEffect("damage"); feedbackRef.current.push({ x: dwarfXRef.current, y: DWARF_Y - 45, text: "UNENDLICHE LEBEN", color: "#ffe78c", life: 1 }); addBurst(particlesRef.current, dwarfXRef.current, DWARF_Y, ["#ffd75c", "#fff2a0"], 15); navigator.vibrate?.(28);
      } else {
        const nextLives = livesRef.current - 1; livesRef.current = nextLives; setLives(nextLives);
        playEffect("damage"); feedbackRef.current.push({ x: dwarfXRef.current, y: DWARF_Y - 45, text: "AUTSCH!", color: "#ff8b74", life: 1 }); addBurst(particlesRef.current, dwarfXRef.current, DWARF_Y, ["#ff604c", "#ffc0a8"], 18); navigator.vibrate?.([50, 35, 70]);
        if (nextLives === 0) { playingRef.current = false; setPaused(false); setPlaying(false); window.setTimeout(stopMusic, 420); }
      }
    }
    renderCurrentScene(now);
    if (playingRef.current) animationRef.current = window.requestAnimationFrame(animateFrame);
  }, [addGold, playEffect, renderCurrentScene, restartMusic, stopMusic]);

  useEffect(() => {
    gameRandom = Math.random; tunnelRef.current = createTunnel(); dwarfXRef.current = tunnelAt(tunnelRef.current, DWARF_Y).center; renderCurrentScene();
    return () => {
      playingRef.current = false;
      if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current);
      if (shotCooldownRef.current !== null) window.clearTimeout(shotCooldownRef.current);
      if (musicTimerRef.current !== null) window.clearInterval(musicTimerRef.current);
      void audioContextRef.current?.close();
    };
  }, [renderCurrentScene]);

  useEffect(() => {
    const readHighscore = (key: string) => {
      const stored = Number(window.localStorage.getItem(key));
      return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0;
    };
    const savedHighscores = {
      easy: readHighscore(HIGHSCORE_KEYS.easy),
      normal: Math.max(readHighscore(HIGHSCORE_KEYS.normal), readHighscore(LEGACY_HIGHSCORE_KEY)),
    };
    if (savedHighscores.normal > 0) window.localStorage.setItem(HIGHSCORE_KEYS.normal, String(savedHighscores.normal));
    setHighscores(savedHighscores);
  }, []);

  useEffect(() => { if (!musicOn) stopMusic(); else if (playingRef.current) void startMusic(); }, [musicOn, startMusic, stopMusic]);

  const start = () => {
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current);
    if (shotCooldownRef.current !== null) window.clearTimeout(shotCooldownRef.current);
    const developer = developerSettingsRef.current;
    const requestedStart = developer.enabled ? developer.startLevel : "normal1";
    const startWorld = requestedStart.endsWith("2") ? 2 : 1;
    worldRef.current = startWorld;
    activateLevelSet(startWorld);
    highscoreEligibleRef.current = !developer.enabled;
    gameRandom = developer.enabled && developer.randomSeed.trim()
      ? createSeededRandom(developer.randomSeed.trim())
      : Math.random;
    bonusPhaseRef.current = "none";
    setBonusPhase("none");
    setBonusSeconds(0);
    setFinaleFinished(false);
    bossPhaseRef.current = "none"; setBossPhase("none"); bossHealthRef.current = BOSS_MAX_HEALTH; setBossHealth(BOSS_MAX_HEALTH);
    bossAttacksRef.current = []; bossWarningXsRef.current = []; bossWarningUntilRef.current = 0; bossDefeatedRef.current = false;
    tunnelRef.current = createTunnel(developer.enabled ? developer.tunnelWidth : undefined);
    dwarfXRef.current = tunnelAt(tunnelRef.current, DWARF_Y).center;
    obstaclesRef.current = []; hatchesRef.current = []; projectilesRef.current = []; collectiblesRef.current = []; particlesRef.current = []; feedbackRef.current = [];
    const initialGold = developer.enabled ? Math.max(0, Math.floor(developer.startGold)) : 0;
    const initialDestroyed = developer.enabled ? Math.max(0, Math.floor(developer.destroyedWood)) : 0;
    const initialAxeLevel = developer.enabled ? Math.max(1, Math.floor(developer.axeLevel)) : 1;
    livesRef.current = 3; shieldRef.current = 0; goldRef.current = initialGold; gemsRef.current = 0; setGems(0); generatedSegmentsRef.current = 0;
    nextCornerAtRef.current = developer.enabled && developer.instantCorner ? 2 : 15 + Math.floor(gameRandom() * 5);
    axeLevelRef.current = initialAxeLevel;
    let testY = 82;
    const nextTestY = () => { const y = testY; testY += 66; return y; };
    const addTestCollectible = (kind: "gold" | "shield") => {
      const y = nextTestY();
      collectiblesRef.current.push({ kind, x: tunnelAt(tunnelRef.current, y).center, y, radius: kind === "shield" ? 14 : 11, vx: 0, vy: 0, scatterUntil: 0 });
    };
    if (developer.enabled && developer.spawnGold) addTestCollectible("gold");
    if (developer.enabled && developer.spawnShield) addTestCollectible("shield");
    if (developer.enabled && developer.spawnChest) {
      const y = nextTestY(); const opening = tunnelAt(tunnelRef.current, y);
      obstaclesRef.current.push({ kind: "chest", x: opening.center, y, width: 46, height: 34, angle: 0, hits: 2 });
    }
    if (developer.enabled && developer.rockTestState !== "none") {
      const y = nextTestY(); const opening = tunnelAt(tunnelRef.current, y);
      const hits = developer.rockTestState === "whole" ? 3 : developer.rockTestState === "cracked" ? 2 : 1;
      obstaclesRef.current.push({ kind: "rock", x: opening.center, y, width: 36, height: 36, angle: 0, hits });
    }
    protectedUntilRef.current = 0; impactUntilRef.current = 0; handEmptyUntilRef.current = 0; startedAtRef.current = performance.now(); lastFrameRef.current = startedAtRef.current;
    if (developer.enabled && requestedStart.startsWith("bonus")) {
      bonusPhaseRef.current = "active";
        setBonusPhase("active"); void restartMusic();
      setBonusSeconds(BONUS_DURATION / 1000);
      bonusStartedAtRef.current = startedAtRef.current;
      bonusEndsAtRef.current = startedAtRef.current + BONUS_DURATION;
      bonusNextCandyAtRef.current = startedAtRef.current + 300;
      bonusChestAtRef.current = startedAtRef.current + BONUS_LEVEL.candy.chestFirstMinMs + gameRandom() * BONUS_LEVEL.candy.chestFirstRangeMs;
      tunnelRef.current = createBonusTunnel();
      dwarfXRef.current = tunnelAt(tunnelRef.current, DWARF_Y).center;
      obstaclesRef.current = []; hatchesRef.current = []; projectilesRef.current = []; collectiblesRef.current = BONUS_LEVEL.world === 2 ? createInitialBonusToys(tunnelRef.current) : createInitialBonusCandies(tunnelRef.current); particlesRef.current = []; feedbackRef.current = [{ x: dwarfXRef.current, y: DWARF_Y - 55, text: BONUS_LEVEL.world === 2 ? "SPIELZEUG-BONUS!" : "SÜSSIGKEITEN-BONUS!", color: "#ff9ddd", life: 1.6 }];
    } else if (developer.enabled && requestedStart.startsWith("boss")) {
      bossPhaseRef.current = "fight"; setBossPhase("fight"); void restartMusic(); bossPhaseStartedAtRef.current = startedAtRef.current;
      bossXRef.current = WIDTH / 2; bossDirectionRef.current = 1; bossHealthRef.current = BOSS_MAX_HEALTH; setBossHealth(BOSS_MAX_HEALTH);
      bossNextAttackAtRef.current = startedAtRef.current + (difficultyRef.current === "easy" ? 1600 : 900); bossNextSpecialAtRef.current = startedAtRef.current + BOSS_LEVEL.enemy.specialFirstDelayMs;
      bossAttacksRef.current = []; bossWarningXsRef.current = []; bossWarningUntilRef.current = 0;
      dwarfXRef.current = WIDTH / 2; obstaclesRef.current = []; hatchesRef.current = []; projectilesRef.current = []; collectiblesRef.current = []; particlesRef.current = [];
      feedbackRef.current = [{ x: WIDTH / 2, y: 235, text: `${BOSS_LEVEL.enemy.name.toUpperCase()}!`, color: BOSS_LEVEL.theme.accent, life: 1.6 }];
    }
    nextObstacleAtRef.current = startedAtRef.current + (developer.enabled ? Math.min(900, developer.obstacleInterval * 1000) : difficultyRef.current === "easy" ? 900 : 650);
    nextGoldAtRef.current = startedAtRef.current + 220;
    nextShieldAtRef.current = startedAtRef.current + 5500 + gameRandom() * 3500;
    nextHatchAtRef.current = startedAtRef.current + FIRST_HATCH_DELAY_MIN + gameRandom() * FIRST_HATCH_DELAY_RANGE;
    playingRef.current = true; setPaused(false); setLives(3); setShield(0); setLevel(1); setDestroyed(initialDestroyed); setAxeLevel(initialAxeLevel); setGold(initialGold); setShotReady(true); setHasPlayed(true); setPlaying(true); setDeveloperDialogOpen(false);
    void startMusic(); renderCurrentScene(startedAtRef.current); animationRef.current = window.requestAnimationFrame(animate);
  };

  const move = useCallback((direction: -1 | 1) => {
    if (!playingRef.current || bonusPhaseRef.current === "climbing" || bossPhaseRef.current === "entering" || bossPhaseRef.current === "victory" || bossPhaseRef.current === "completed") return;
    dwarfXRef.current = Math.max(DWARF_RADIUS, Math.min(WIDTH - DWARF_RADIUS, dwarfXRef.current + direction * MOVE_STEP)); renderCurrentScene();
  }, [renderCurrentScene]);

  const throwPickaxe = useCallback(() => {
    if (!playingRef.current || bonusPhaseRef.current === "exit" || bonusPhaseRef.current === "climbing"
      || bossPhaseRef.current === "entering" || bossPhaseRef.current === "victory" || bossPhaseRef.current === "completed" || !shotReady) return;
    const now = performance.now();
    const motion = dwarfMotion(now);
    const levelAtThrow = axeLevelRef.current;
    const spreadSide = nextSpreadSideRef.current;
    if (levelAtThrow === 4) nextSpreadSideRef.current = spreadSide === -1 ? 1 : -1;
    const createThrownPickaxe = (angleDegrees = 0, offset = 0): Projectile => {
      const angle = angleDegrees * Math.PI / 180;
      return {
        x: dwarfXRef.current,
        y: DWARF_Y - motion.bob - 5 - offset,
        vx: Math.sin(angle) * PICKAXE_SPEED,
        vy: -Math.cos(angle) * PICKAXE_SPEED,
        rotation: 0.18 - motion.stride * 0.1 + angle,
        level: levelAtThrow,
      };
    };
    projectilesRef.current.push(createThrownPickaxe());
    if (levelAtThrow >= 3) {
      // Die zweite Hacke gehört zur selben Aktion und wartet nicht auf den
      // normalen Reload-Timer. Ein kurzer Versatz macht beide sichtbar.
      window.setTimeout(() => {
        if (!playingRef.current || bonusPhaseRef.current === "exit" || bossPhaseRef.current === "victory" || bossPhaseRef.current === "completed") return;
        const secondAngle = levelAtThrow >= 5 ? -20 : levelAtThrow >= 4 ? spreadSide * 20 : 0;
        projectilesRef.current.push(createThrownPickaxe(secondAngle, 10));
        renderCurrentScene();
      }, 120);
    }
    if (levelAtThrow >= 5) {
      window.setTimeout(() => {
        if (!playingRef.current || bonusPhaseRef.current === "exit" || bossPhaseRef.current === "victory" || bossPhaseRef.current === "completed") return;
        projectilesRef.current.push(createThrownPickaxe(20, 20));
        renderCurrentScene();
      }, 240);
    }
    handEmptyUntilRef.current = now + 280;
    setShotReady(false); playEffect("throw");
    shotCooldownRef.current = window.setTimeout(() => setShotReady(true), Math.max(0, SHOT_COOLDOWN - (levelAtThrow - 1) * 100)); renderCurrentScene();
  }, [playEffect, renderCurrentScene, shotReady]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!playing || !["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(event.key)) return;
      event.preventDefault();
      if (paused || event.repeat) return;
      if (event.key === "ArrowLeft") move(-1);
      else if (event.key === "ArrowRight") move(1);
      else if (event.key === "ArrowDown") throwPickaxe();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move, paused, playing, throwPickaxe]);

  const pauseGame = () => {
    if (!playingRef.current) return;
    playingRef.current = false;
    pausedAtRef.current = performance.now();
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current);
    setPaused(true);
    stopMusic();
  };

  const resumeGame = () => {
    if (!paused || !playing) return;
    const now = performance.now();
    const pauseDuration = now - pausedAtRef.current;
    startedAtRef.current += pauseDuration;
    nextObstacleAtRef.current += pauseDuration;
    nextGoldAtRef.current += pauseDuration;
    nextShieldAtRef.current += pauseDuration;
    nextHatchAtRef.current += pauseDuration;
    if (bonusPhaseRef.current !== "none") {
      bonusStartedAtRef.current += pauseDuration;
      bonusEndsAtRef.current += pauseDuration;
      bonusLadderEndsAtRef.current += pauseDuration;
      bonusNextCandyAtRef.current += pauseDuration;
      if (Number.isFinite(bonusChestAtRef.current)) bonusChestAtRef.current += pauseDuration;
    }
    if (bossPhaseRef.current !== "none") {
      bossPhaseStartedAtRef.current += pauseDuration;
      bossNextAttackAtRef.current += pauseDuration;
      if (Number.isFinite(bossNextSpecialAtRef.current)) bossNextSpecialAtRef.current += pauseDuration;
      if (bossWarningUntilRef.current > 0) bossWarningUntilRef.current += pauseDuration;
      if (bossVictoryEndsAtRef.current > 0) bossVictoryEndsAtRef.current += pauseDuration;
    }
    if (protectedUntilRef.current > pausedAtRef.current) protectedUntilRef.current += pauseDuration;
    if (impactUntilRef.current > pausedAtRef.current) impactUntilRef.current += pauseDuration;
    if (handEmptyUntilRef.current > pausedAtRef.current) handEmptyUntilRef.current += pauseDuration;
    lastFrameRef.current = now;
    playingRef.current = true;
    setPaused(false);
    void startMusic();
    animationRef.current = window.requestAnimationFrame(animate);
  };

  const returnToDwarfMenu = () => {
    playingRef.current = false;
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    if (shotCooldownRef.current !== null) window.clearTimeout(shotCooldownRef.current);
    shotCooldownRef.current = null;
    setShotReady(true);
    setPaused(false);
    setPlaying(false);
    bonusPhaseRef.current = "none";
    setBonusPhase("none");
    setBonusSeconds(0);
    bossPhaseRef.current = "none"; setBossPhase("none"); bossAttacksRef.current = []; bossWarningXsRef.current = [];
    setFinaleFinished(false);
    stopMusic();
  };

  const drawDwarfPreview = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawDwarfFront(context, canvas.width / 2, 116, selectedHat);
  }, [selectedHat]);

  const handleSecretDwarfTap = () => {
    const now = performance.now();
    if (now - secretTapRef.current.lastTap > 850) secretTapRef.current.count = 0;
    secretTapRef.current.lastTap = now;
    secretTapRef.current.count += 1;
    if (secretTapRef.current.count >= 3) {
      secretTapRef.current.count = 0;
      setDeveloperDialogOpen(true);
      navigator.vibrate?.([18, 35, 18]);
    }
  };

  const testAudio = async (kind: "music" | "throw" | "hit" | "break" | "gold" | "shield" | "damage") => {
    soundEnabledRef.current = true;
    setMusicOn(true);
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    try { await audioContextRef.current.resume(); } catch { return; }
    if (kind === "music") {
      playMysticNote(220, 1.8, 0.14); playMysticNote(293.66, 1.4, 0.1);
    } else playEffect(kind);
  };

  const resetDeveloperSettings = () => {
    const defaults = { ...DEFAULT_DEVELOPER_SETTINGS };
    developerSettingsRef.current = defaults;
    setDeveloperSettings(defaults);
  };

  const resetHighscore = () => {
    window.localStorage.removeItem(HIGHSCORE_KEYS[difficulty]);
    if (difficulty === "normal") window.localStorage.removeItem(LEGACY_HIGHSCORE_KEY);
    setHighscores((current) => ({ ...current, [difficulty]: 0 }));
  };

  return (
    <main className="game-shell dwarf-game-shell">
      <section className="game-card dwarf-game-card" aria-labelledby="dwarf-title">
        <div className="dwarf-topbar">
          <a className="back-link" href={sitePath("/")}>← Hanna&apos;s Spiele</a>
          <div className="dwarf-top-actions">
            <button className="music-button" type="button" onClick={paused ? resumeGame : pauseGame} disabled={!playing}>
              {paused ? "▶ Weiter" : "Ⅱ Pause"}
            </button>
            <button className="music-button" type="button" onClick={() => {
              const next = !soundEnabledRef.current;
              soundEnabledRef.current = next;
              setMusicOn(next);
            }} aria-pressed={musicOn}>{musicOn ? "♫ Ton an" : "♫ Ton aus"}</button>
          </div>
        </div>
        <header>
          <div><p className="eyebrow">TIEF IN DER MINE</p><h1 id="dwarf-title">Zwergengold</h1></div>
          <div className="stats dwarf-stats" aria-live="polite">
            <span><b aria-label="Goldnuggets">🪙 {gold}</b></span><span><b aria-label="Edelsteine" className="gem-stat-icon">◆</b> {gems}</span><span><b>{"❤️".repeat(lives)}{"♡".repeat(3 - lives)}</b></span>
            <span className={bonusPhase === "none" && bossPhase === "none" ? "dwarf-status-slot" : "dwarf-status-slot bonus-status"}>
              {bossPhase === "fight" ? <><b>👹 {bossHealth}</b> Boss</>
                : bossPhase === "approach" || bossPhase === "entering" ? <b>⚔ Boss</b>
                  : bossPhase === "victory" ? <b>👑 Sieg!</b>
              : bonusPhase === "active" ? <><b>🍬 {bonusSeconds}</b> Bonus</>
                : bonusPhase === "exit" ? <b>🪜 Ausgang</b>
                  : bonusPhase === "climbing" ? <b>🪜 Hoch!</b>
                    : <><b>🏆 {highscores[difficulty]}</b> Rekord</>}
            </span>
          </div>
        </header>
        <div className="dwarf-board">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="Zwerg in einer scrollenden Mine" />
          {paused && <div className="dwarf-pause-panel" role="dialog" aria-modal="true" aria-labelledby="pause-title">
            <div className="pause-mark" aria-hidden="true">Ⅱ</div>
            <h2 id="pause-title">Pause</h2>
            <button className="start-button mine-start-button" onClick={resumeGame}>Weiterspielen</button>
            {developerSettings.enabled && <button className="pause-menu-button developer-pause-button" type="button" onClick={() => setDeveloperDialogOpen(true)}>⚙ Entwickleroptionen</button>}
            <button className="pause-menu-button" type="button" onClick={returnToDwarfMenu}>← Zum Zwergenspielmenü</button>
          </div>}
          {finaleFinished && bossPhase === "completed" && <div className="dwarf-pause-panel" role="dialog" aria-modal="true" aria-labelledby="finale-title">
            <h2 id="finale-title">Krone erobert!</h2>
            <p>Du hast das Abenteuer geschafft!</p>
            <button className="start-button mine-start-button" onClick={start}>Nochmal spielen</button>
            <button className="pause-menu-button" type="button" onClick={returnToDwarfMenu}>← Zum Zwergenspielmenü</button>
          </div>}
        </div>
        <div className="dwarf-controls" aria-label="Bewegungssteuerung">
          <button onPointerDown={() => move(-1)} disabled={!playing || paused || bonusPhase === "climbing" || bossPhase === "entering" || bossPhase === "victory"} aria-label="Nach links bewegen"><b>←</b><span>Links</span></button>
          <button className="pickaxe-button" onPointerDown={throwPickaxe} disabled={!playing || paused || bonusPhase === "exit" || bonusPhase === "climbing" || bossPhase === "entering" || bossPhase === "victory" || bossPhase === "completed" || !shotReady} aria-label={`Hacke Level ${axeLevel} werfen`}><b>⛏️</b><span>{shotReady ? `Werfen · L${axeLevel}` : "Lädt …"}</span></button>
          <button onPointerDown={() => move(1)} disabled={!playing || paused || bonusPhase === "climbing" || bossPhase === "entering" || bossPhase === "victory"} aria-label="Nach rechts bewegen"><b>→</b><span>Rechts</span></button>
        </div>
        {!playing && <div className="dwarf-start-panel" role="dialog" aria-modal="true" aria-labelledby="dwarf-start-title">
          <div className="dwarf-start-content">
            <a className="dwarf-start-back" href={sitePath("/")}>← Hanna&apos;s Spiele</a>
            <button className="dwarf-mark dwarf-secret-trigger" type="button" onClick={handleSecretDwarfTap} aria-label="Zwerg">
              <canvas ref={drawDwarfPreview} width="120" height="135" />
            </button>
            <h2 id="dwarf-start-title">{hasPlayed ? `Du hast ${gold} Gold gesammelt!` : "Hinab in die Mine!"}</h2>
            <div className="dwarf-picker" aria-label="Zipfelmütze auswählen">
              <span>Wähle deinen Zwerg</span>
              <div className="hat-options">
                {(["blue", "yellow", "red"] as HatColor[]).map((color) => (
                  <button
                    className={`hat-choice ${selectedHat === color ? "hat-choice-selected" : ""}`}
                    type="button"
                    key={color}
                    aria-pressed={selectedHat === color}
                    onClick={() => {
                      selectedHatRef.current = color;
                      setSelectedHat(color);
                      renderCurrentScene();
                    }}
                  >
                    <i className={`hat-swatch hat-${color}`} aria-hidden="true" />
                    {color === "blue" ? "Blau" : color === "yellow" ? "Gelb" : "Rot"}
                  </button>
                ))}
              </div>
            </div>
            <div className="dwarf-picker difficulty-picker" aria-label="Schwierigkeit auswählen">
              <span>Schwierigkeit</span>
              <div className="difficulty-options">
                {(["easy", "normal"] as Difficulty[]).map((option) => (
                  <button
                    className={`difficulty-choice ${difficulty === option ? "difficulty-choice-selected" : ""}`}
                    type="button"
                    key={option}
                    aria-pressed={difficulty === option}
                    onClick={() => {
                      difficultyRef.current = option;
                      setDifficulty(option);
                    }}
                  >
                    {option === "easy" ? "Leicht" : "Normal"}
                  </button>
                ))}
              </div>
              <small>{difficulty === "easy" ? "Weniger Hindernisse · gleiches Tempo" : "Das Tempo steigt mit der Zeit"}</small>
            </div>
            <p>Weiche Steinen aus, sammle Gold und halte nach geheimen Bodenklappen Ausschau. Tastatur: ← und → bewegen, ↓ wirft die Hacke.</p>
            <div className="dwarf-record">🏆 Highscore {difficulty === "easy" ? "Leicht" : "Normal"}: <b>{highscores[difficulty]} Gold</b></div>
            <div className="start-actions">
              <button className="start-button mine-start-button" onClick={start}>{hasPlayed ? "Nochmal spielen" : "Spiel starten"}</button>
              <button className="reset-button" type="button" onClick={resetHighscore}>Highscore zurücksetzen</button>
            </div>
          </div>
        </div>}
        {developerDialogOpen && <div className="developer-dialog-backdrop" onPointerDown={() => setDeveloperDialogOpen(false)}>
            <div className="developer-dialog" role="dialog" aria-modal="true" aria-labelledby="developer-title" onPointerDown={(event) => event.stopPropagation()}>
              <div className="developer-dialog-header">
                <div><span>VERSTECKTE MINENKONSOLE</span><h2 id="developer-title">Entwickleroptionen</h2></div>
                <button type="button" onClick={() => setDeveloperDialogOpen(false)} aria-label="Entwickleroptionen schließen">×</button>
              </div>
              <label className="developer-master-option">
                <input type="checkbox" checked={developerSettings.enabled} onChange={(event) => updateDeveloperSetting("enabled", event.target.checked)} />
                <span><b>Entwickleroptionen aktivieren</b><small>{developerSettings.enabled ? "Das nächste Spiel verwendet die Testwerte." : "Das nächste Spiel verwendet alle normalen Standardwerte."}</small></span>
              </label>
              <fieldset disabled={!developerSettings.enabled}>
                <section className="developer-section">
                  <h3>Spielstart</h3>
                  <div className="developer-grid">
                    <label>Startlevel<select value={developerSettings.startLevel} onChange={(event) => updateDeveloperSetting("startLevel", event.target.value as DeveloperStartLevel)}><option value="normal1">Normal 1</option><option value="normal2">Normal 2</option><option value="bonus1">Bonus 1</option><option value="bonus2">Bonus 2</option><option value="boss1">Boss 1</option><option value="boss2">Boss 2</option></select></label>
                    <label>Hackenlevel <input type="number" min="1" max="10" value={developerSettings.axeLevel} onChange={(event) => updateDeveloperSetting("axeLevel", Number(event.target.value))} /></label>
                    <label>Zerstörtes Holz <input type="number" min="0" max="999" value={developerSettings.destroyedWood} onChange={(event) => updateDeveloperSetting("destroyedWood", Number(event.target.value))} /></label>
                    <label>Goldstand <input type="number" min="0" max="9999" value={developerSettings.startGold} onChange={(event) => updateDeveloperSetting("startGold", Number(event.target.value))} /></label>
                  </div>
                  <div className="developer-checks">
                    <label><input type="checkbox" checked={developerSettings.unlimitedLives} onChange={(event) => updateDeveloperSetting("unlimitedLives", event.target.checked)} /> Unbegrenzte Leben</label>
                    <label><input type="checkbox" checked={developerSettings.invulnerable} onChange={(event) => updateDeveloperSetting("invulnerable", event.target.checked)} /> Unverwundbar</label>
                  </div>
                </section>

                <section className="developer-section">
                  <h3>Mine und Zufall</h3>
                  <label className="developer-range"><span>Spielgeschwindigkeit <output>{developerSettings.speed}</output></span><input type="range" min="40" max="180" step="2" value={developerSettings.speed} onChange={(event) => updateDeveloperSetting("speed", Number(event.target.value))} /></label>
                  <label className="developer-range"><span>Hindernisabstand <output>{developerSettings.obstacleInterval.toFixed(1)} s</output></span><input type="range" min="0.5" max="6" step="0.1" value={developerSettings.obstacleInterval} onChange={(event) => updateDeveloperSetting("obstacleInterval", Number(event.target.value))} /></label>
                  <label className="developer-range"><span>Tunnelbreite <output>{developerSettings.tunnelWidth}</output></span><input type="range" min="110" max="280" step="5" value={developerSettings.tunnelWidth} onChange={(event) => updateDeveloperSetting("tunnelWidth", Number(event.target.value))} /></label>
                  <div className="developer-grid">
                    <label>Hindernisse<select value={developerSettings.forcedObstacle} onChange={(event) => updateDeveloperSetting("forcedObstacle", event.target.value as ForcedObstacle)}><option value="random">Zufällig</option><option value="wood">Nur Holz</option><option value="rock">Nur Steine</option><option value="chest">Nur Schatztruhen</option></select></label>
                    <label>Zufallsstartwert<input type="text" value={developerSettings.randomSeed} onChange={(event) => updateDeveloperSetting("randomSeed", event.target.value)} placeholder="leer = zufällig" /></label>
                  </div>
                  <label className="developer-single-check"><input type="checkbox" checked={developerSettings.instantCorner} onChange={(event) => updateDeveloperSetting("instantCorner", event.target.checked)} /> Enge Kurve direkt nach dem Start</label>
                </section>

                <section className="developer-section">
                  <h3>Testobjekte direkt beim Start</h3>
                  <div className="developer-checks">
                    <label><input type="checkbox" checked={developerSettings.spawnGold} onChange={(event) => updateDeveloperSetting("spawnGold", event.target.checked)} /> Gold</label>
                    <label><input type="checkbox" checked={developerSettings.spawnShield} onChange={(event) => updateDeveloperSetting("spawnShield", event.target.checked)} /> Schild</label>
                    <label><input type="checkbox" checked={developerSettings.spawnChest} onChange={(event) => updateDeveloperSetting("spawnChest", event.target.checked)} /> Schatztruhe</label>
                  </div>
                  <label className="developer-select-row">Stein-Schadensstufe<select value={developerSettings.rockTestState} onChange={(event) => updateDeveloperSetting("rockTestState", event.target.value as RockTestState)}><option value="none">Kein Teststein</option><option value="whole">Unbeschädigt</option><option value="cracked">Ein Riss</option><option value="fractured">Mehrere Risse</option></select></label>
                  <div className="developer-loot-settings">
                    <h4>Beute aus zerstörten Steinen</h4>
                    <label className="developer-range"><span>Herz bei weniger als 3 Leben <output>{developerSettings.rockHeartChance}%</output></span><input type="range" min="0" max="100" step="1" value={developerSettings.rockHeartChance} onChange={(event) => updateDeveloperSetting("rockHeartChance", Number(event.target.value))} /></label>
                    <label className="developer-range"><span>5er-Goldmünze <output>{developerSettings.rockGoldChance}%</output></span><input type="range" min="0" max="100" step="1" value={developerSettings.rockGoldChance} onChange={(event) => updateDeveloperSetting("rockGoldChance", Number(event.target.value))} /></label>
                    <small>Pro Stein erscheint höchstens eine Belohnung. Das Herz wird zuerst geprüft.</small>
                  </div>
                </section>

                <section className="developer-section">
                  <h3>Prüfanzeigen</h3>
                  <div className="developer-checks">
                    <label><input type="checkbox" checked={developerSettings.showHitboxes} onChange={(event) => updateDeveloperSetting("showHitboxes", event.target.checked)} /> Trefferflächen anzeigen</label>
                    <label><input type="checkbox" checked={developerSettings.showFairness} onChange={(event) => updateDeveloperSetting("showFairness", event.target.checked)} /> Fairness-Prüfung anzeigen</label>
                  </div>
                  <div className="developer-values" aria-label="Aktuelle Spielwerte">
                    <span>Gold <b>{gold}</b></span><span>Edelsteine <b>{gems}</b></span><span>Leben <b>{lives}</b></span><span>Schild <b>{shield}</b></span><span>Hackenlevel <b>{axeLevel}</b></span><span>Holz <b>{destroyed}</b></span><span>Spielstufe <b>{level}</b></span><span>Hindernisse <b>{obstaclesRef.current.length}</b></span><span>Hacken unterwegs <b>{projectilesRef.current.length}</b></span>
                  </div>
                </section>

                <section className="developer-section">
                  <h3>Ton testen</h3>
                  <div className="developer-sound-grid">
                    <button type="button" onClick={() => void testAudio("music")}>Musik</button>
                    {(["throw", "hit", "break", "gold", "shield", "damage"] as const).map((sound) => <button type="button" key={sound} onClick={() => void testAudio(sound)}>{sound === "throw" ? "Wurf" : sound === "hit" ? "Treffer" : sound === "break" ? "Bruch" : sound === "gold" ? "Gold" : sound === "shield" ? "Schild" : "Schaden"}</button>)}
                  </div>
                </section>
              </fieldset>
              <div className="developer-dialog-actions">
                <button className="developer-reset" type="button" onClick={resetDeveloperSettings}>Einstellungen zurücksetzen</button>
                <button className="developer-close" type="button" onClick={() => setDeveloperDialogOpen(false)}>Fertig</button>
              </div>
            </div>
          </div>}
      </section>
    </main>
  );
}
