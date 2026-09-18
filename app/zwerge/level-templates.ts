export type LevelType = "normal" | "bonus" | "boss";

export type LevelTheme = {
  cavern: [string, string, string];
  wall: [string, string, string, string, string];
  floor: [string, string, string, string, string];
  edgeRock: [string, string, string];
  accent: string;
};

export type MusicTemplate = {
  notes: readonly number[];
  intervalMs: number;
  leadDuration: number;
  leadVolume: number;
  bassDuration: number;
  bassVolume: number;
};

type LevelTemplateBase = {
  id: string;
  world: number;
  type: LevelType;
  name: string;
  theme: LevelTheme;
  music: MusicTemplate;
};

export type NormalLevelTemplate = LevelTemplateBase & {
  type: "normal";
  lighting: {
    cycleLength: number;
    brightDuration: number;
    minBrightness: number;
    maxBrightness: number;
    torchSpacing: number;
    torchColor: string;
  };
  tunnel: {
    width: number;
    minimumWidth: number;
    maximumWidth: number;
    minimumWidthStep: number;
    maximumWidthStep: number;
  };
  movement: { baseSpeed: number; speedPerStage: number; stageDurationMs: number; maximumStage: number };
  spawns: {
    easyObstacleBaseMs: number;
    easyObstacleRangeMs: number;
    normalObstacleBaseMs: number;
    normalObstacleMinimumMs: number;
    normalObstacleStageStepMs: number;
    normalObstacleRangeMs: number;
    goldBaseMs: number;
    goldRangeMs: number;
    shieldBaseMs: number;
    shieldRangeMs: number;
  };
  hatch: {
    firstDelayMinMs: number;
    firstDelayRangeMs: number;
    nextDelayMinMs: number;
    nextDelayRangeMs: number;
    retryDelayMs: number;
  };
  content: { obstacles: readonly string[]; collectibles: readonly string[] };
};

export type BonusLevelTemplate = LevelTemplateBase & {
  type: "bonus";
  durationMs: number;
  tunnel: { width: number; speed: number; exitWidth: number; taperLength: number };
  exit: { wallY: number; approachTimeMs: number; waitingTimeMs: number; climbTimeMs: number; ladderReach: number };
  candy: { intervalMinMs: number; intervalRangeMs: number; chestFirstMinMs: number; chestFirstRangeMs: number; chestMultiplier: number };
  content: { collectibles: readonly string[]; obstacles: readonly string[] };
};

export type BossLevelTemplate = LevelTemplateBase & {
  type: "boss";
  triggerTimeMs: number;
  transition: { approachTimeMs: number; enterTimeMs: number; tunnelWidth: number };
  enemy: {
    name: string;
    maximumHealth: number;
    normalSpeed: number;
    enragedSpeed: number;
    enrageAtHealth: number;
    attackDelayNormalMs: number;
    attackDelayEnragedMs: number;
    attackDelayRangeMs: number;
    specialFirstDelayMs: number;
    specialDelayNormalMs: number;
    specialDelayEnragedMs: number;
  };
  victory: { durationMs: number; gold: number; rewardName: string };
  content: { enemy: string; attacks: readonly string[]; reward: string };
};

const mineMusic: MusicTemplate = {
  notes: [220, 261.63, 293.66, 329.63, 293.66, 246.94, 196, 246.94],
  intervalMs: 1250,
  leadDuration: 2.3,
  leadVolume: 0.14,
  bassDuration: 4.2,
  bassVolume: 0.085,
};
const bonusMusic: MusicTemplate = { notes: [392, 494, 587, 659, 587, 523, 440, 523], intervalMs: 620, leadDuration: 1.1, leadVolume: 0.16, bassDuration: 1.8, bassVolume: 0.07 };
const bossMusic: MusicTemplate = { notes: [110, 130.81, 146.83, 103.83, 123.47, 98, 116.54, 92.5], intervalMs: 430, leadDuration: 1.5, leadVolume: 0.17, bassDuration: 2.4, bassVolume: 0.12 };

export const LEVEL_TEMPLATES = {
  normal: [
    {
      id: "normal-level1",
      world: 1,
      type: "normal",
      name: "Die tiefe Mine",
      theme: {
        cavern: ["#182f35", "#0b171c", "#05090d"],
        wall: ["#172126", "#202c31", "#2a373c", "#354248", "#414f54"],
        floor: ["#33271b", "#59452b", "#72593a", "#59452b", "#33271b"],
        edgeRock: ["#263339", "#39474c", "#526066"],
        accent: "#7cecff",
      },
      music: mineMusic,
      lighting: { cycleLength: 920, brightDuration: 390, minBrightness: 0.18, maxBrightness: 0.92, torchSpacing: 170, torchColor: "#ffc45c" },
      tunnel: { width: 220, minimumWidth: 116, maximumWidth: 238, minimumWidthStep: 6, maximumWidthStep: 6 },
      movement: { baseSpeed: 76, speedPerStage: 10, stageDurationMs: 30_000, maximumStage: 8 },
      spawns: {
        easyObstacleBaseMs: 3900, easyObstacleRangeMs: 1100,
        normalObstacleBaseMs: 2450, normalObstacleMinimumMs: 980, normalObstacleStageStepMs: 215, normalObstacleRangeMs: 700,
        goldBaseMs: 1150, goldRangeMs: 1150, shieldBaseMs: 8500, shieldRangeMs: 5000,
      },
      hatch: { firstDelayMinMs: 7000, firstDelayRangeMs: 3000, nextDelayMinMs: 20_000, nextDelayRangeMs: 8000, retryDelayMs: 1500 },
      content: { obstacles: ["Holz", "Stein", "Schatztruhe"], collectibles: ["Gold", "Schild", "Herz", "5er-Gold"] },
    },
    {
      id: "normal-level2",
      world: 2,
      type: "normal",
      name: "Die glühende Kristallmine",
      theme: {
        cavern: ["#30203f", "#160f26", "#07070f"],
        wall: ["#241b31", "#3b2a4b", "#503665", "#67477d", "#7d5a8f"],
        floor: ["#35213a", "#5d3456", "#81436a", "#5d3456", "#35213a"],
        edgeRock: ["#49345a", "#6d4d7b", "#9670a2"],
        accent: "#e7a7ff",
      },
      music: { ...mineMusic, notes: [196, 233.08, 277.18, 311.13, 277.18, 233.08, 174.61, 220], intervalMs: 1120 },
      lighting: { cycleLength: 780, brightDuration: 330, minBrightness: 0.24, maxBrightness: 0.96, torchSpacing: 150, torchColor: "#ff9b4a" },
      tunnel: { width: 218, minimumWidth: 112, maximumWidth: 236, minimumWidthStep: 7, maximumWidthStep: 7 },
      movement: { baseSpeed: 82, speedPerStage: 11, stageDurationMs: 30_000, maximumStage: 8 },
      spawns: {
        easyObstacleBaseMs: 3600, easyObstacleRangeMs: 1000,
        normalObstacleBaseMs: 2250, normalObstacleMinimumMs: 860, normalObstacleStageStepMs: 225, normalObstacleRangeMs: 620,
        goldBaseMs: 1020, goldRangeMs: 980, shieldBaseMs: 7800, shieldRangeMs: 4600,
      },
      hatch: { firstDelayMinMs: 6500, firstDelayRangeMs: 2600, nextDelayMinMs: 18_000, nextDelayRangeMs: 7000, retryDelayMs: 1400 },
      content: { obstacles: ["Kristallholz", "Glühstein", "Kristalltruhe"], collectibles: ["Kristallgold", "Schild", "Herz", "5er-Gold"] },
    },
  ] satisfies NormalLevelTemplate[],
  bonus: [
    {
      id: "bonus-level1",
      world: 1,
      type: "bonus",
      name: "Süßigkeitenhöhle",
      theme: {
        cavern: ["#4b235d", "#21132e", "#090812"],
        wall: ["#25152f", "#36203f", "#47294f", "#58345f", "#68406e"],
        floor: ["#3b2048", "#69406e", "#8a5a86", "#69406e", "#3b2048"],
        edgeRock: ["#492d55", "#6d416f", "#8f568d"],
        accent: "#ff9ddd",
      },
      music: bonusMusic,
      durationMs: 20_000,
      tunnel: { width: 280, speed: 82, exitWidth: 100, taperLength: 450 },
      exit: { wallY: 390, approachTimeMs: 5500, waitingTimeMs: 3500, climbTimeMs: 1800, ladderReach: 30 },
      candy: { intervalMinMs: 276, intervalRangeMs: 280, chestFirstMinMs: 6500, chestFirstRangeMs: 3500, chestMultiplier: 1.75 },
      content: { collectibles: ["Bonbon", "Lolli", "Schokolade"], obstacles: ["Süßigkeitentruhe"] },
    },
    {
      id: "bonus-level2",
      world: 2,
      type: "bonus",
      name: "Die Kristallzuckerhöhle",
      theme: {
        cavern: ["#243b63", "#10192f", "#060812"],
        wall: ["#172644", "#24406b", "#31568a", "#4673aa", "#5c8ac0"],
        floor: ["#1d3154", "#31547d", "#4e79a8", "#31547d", "#1d3154"],
        edgeRock: ["#2e527e", "#4b78aa", "#76a9d4"],
        accent: "#8fe9ff",
      },
      music: bonusMusic,
      durationMs: 20_000,
      tunnel: { width: 286, speed: 88, exitWidth: 92, taperLength: 470 },
      exit: { wallY: 390, approachTimeMs: 5500, waitingTimeMs: 3500, climbTimeMs: 1800, ladderReach: 30 },
      candy: { intervalMinMs: 238, intervalRangeMs: 235, chestFirstMinMs: 5900, chestFirstRangeMs: 3000, chestMultiplier: 2.15 },
      content: { collectibles: ["Kristallbonbon", "Eiszucker-Lolli", "Schokoladentafel"], obstacles: ["Kristallzuckertruhe"] },
    },
  ] satisfies BonusLevelTemplate[],
  boss: [
    {
      id: "boss-level1",
      world: 1,
      type: "boss",
      name: "Grimmzahns Arena",
      theme: {
        cavern: ["#34212a", "#15151c", "#050609"],
        wall: ["#1c1519", "#262126", "#354248", "#263339", "#414f54"],
        floor: ["#2a1d18", "#49331f", "#6e4b2f", "#49331f", "#2a1d18"],
        edgeRock: ["#263339", "#39474c", "#526066"],
        accent: "#ff765e",
      },
      music: bossMusic,
      triggerTimeMs: 120_000,
      transition: { approachTimeMs: 6000, enterTimeMs: 1200, tunnelWidth: 110 },
      enemy: {
        name: "Grimmzahn", maximumHealth: 8, normalSpeed: 68, enragedSpeed: 92, enrageAtHealth: 4,
        attackDelayNormalMs: 1450, attackDelayEnragedMs: 1050, attackDelayRangeMs: 420,
        specialFirstDelayMs: 3600, specialDelayNormalMs: 6000, specialDelayEnragedMs: 4400,
      },
      victory: { durationMs: 4200, gold: 25, rewardName: "Goldene Krone" },
      content: { enemy: "Grimmzahn", attacks: ["Rote Hacke", "Dreifacher Steinschlag"], reward: "Goldene Krone" },
    },
    {
      id: "boss-level2",
      world: 2,
      type: "boss",
      name: "Kristallgrimmz' Arena",
      theme: {
        cavern: ["#3d1b29", "#190c19", "#07050b"],
        wall: ["#2a1421", "#45203a", "#653050", "#824060", "#a05b72"],
        floor: ["#3a1d22", "#653128", "#914234", "#653128", "#3a1d22"],
        edgeRock: ["#5d2b49", "#874063", "#b26582"],
        accent: "#ffb15c",
      },
      music: bossMusic,
      triggerTimeMs: 120_000,
      transition: { approachTimeMs: 6000, enterTimeMs: 1200, tunnelWidth: 102 },
      enemy: {
        name: "Kristallgrimmzahn", maximumHealth: 10, normalSpeed: 76, enragedSpeed: 104, enrageAtHealth: 5,
        attackDelayNormalMs: 1250, attackDelayEnragedMs: 880, attackDelayRangeMs: 360,
        specialFirstDelayMs: 3000, specialDelayNormalMs: 5200, specialDelayEnragedMs: 3600,
      },
      victory: { durationMs: 4800, gold: 40, rewardName: "Kristallkrone" },
      content: { enemy: "Kristallgrimmzahn", attacks: ["Glühende Hacke", "Kristallregen"], reward: "Kristallkrone" },
    },
  ] satisfies BossLevelTemplate[],
};

export type LevelSet = {
  normal: NormalLevelTemplate;
  bonus: BonusLevelTemplate;
  boss: BossLevelTemplate;
};

export function createLevelSet(world: number): LevelSet {
  const normal = LEVEL_TEMPLATES.normal.find((level) => level.world === world);
  const bonus = LEVEL_TEMPLATES.bonus.find((level) => level.world === world);
  const boss = LEVEL_TEMPLATES.boss.find((level) => level.world === world);
  if (!normal || !bonus || !boss) throw new Error(`Für Welt ${world} fehlt mindestens ein Level-Template.`);
  return { normal, bonus, boss };
}

// Dieser Aufruf bleibt der manuelle Startpunkt für eine Spielwelt. Während des
// Spiels kann der Levelmanager nach einem Boss-Sieg auf das nächste Set wechseln.
export const ACTIVE_LEVEL_SET = createLevelSet(1);
