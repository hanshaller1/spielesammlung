export type Task = { id: string; name: string; icon: string; cost: number; /** Lage im Bild in Prozent. */ spot: [left: number, top: number] };
export type District = { id: string; name: string; intro: string; tasks: Task[] };
export type Kingdom = { potions: number; built: string[] };

export const DISTRICTS: District[] = [
  {
    id: "schlosshof",
    name: "Schlosshof",
    intro: "König Richard wünscht sich einen fröhlichen Schlosshof.",
    tasks: [
      { id: "brunnen", name: "Brunnen", icon: "⛲", cost: 1, spot: [50, 58] },
      { id: "blumen", name: "Blumenbeet", icon: "🌷", cost: 1, spot: [22, 74] },
      { id: "baum", name: "Eiche", icon: "🌳", cost: 2, spot: [80, 52] },
      { id: "bank", name: "Gartenbank", icon: "🪑", cost: 2, spot: [72, 80] },
      { id: "fahnen", name: "Burgfahnen", icon: "🚩", cost: 3, spot: [20, 34] },
    ],
  },
  {
    id: "marktplatz",
    name: "Marktplatz",
    intro: "Händler aus dem ganzen Land wollen hier verkaufen.",
    tasks: [
      { id: "stand", name: "Obststand", icon: "🍎", cost: 2, spot: [24, 66] },
      { id: "baeckerei", name: "Bäckerei", icon: "🥨", cost: 2, spot: [52, 44] },
      { id: "laterne", name: "Laternen", icon: "🏮", cost: 3, spot: [80, 62] },
      { id: "kutsche", name: "Kutsche", icon: "🐴", cost: 3, spot: [46, 78] },
      { id: "uhrturm", name: "Uhrturm", icon: "🕰️", cost: 4, spot: [80, 30] },
    ],
  },
  {
    id: "prinzessinnenturm",
    name: "Prinzessinnenturm",
    intro: "Die Prinzessin möchte einen Turm mit Blick über das Reich.",
    tasks: [
      { id: "turm", name: "Turm", icon: "🗼", cost: 3, spot: [50, 40] },
      { id: "rosen", name: "Rosengarten", icon: "🌹", cost: 3, spot: [22, 72] },
      { id: "einhorn", name: "Einhornstall", icon: "🦄", cost: 4, spot: [78, 72] },
      { id: "regenbogen", name: "Regenbogen", icon: "🌈", cost: 4, spot: [24, 28] },
      { id: "krone", name: "Kronjuwelen", icon: "💎", cost: 5, spot: [52, 80] },
    ],
  },
  {
    id: "universitaet",
    name: "Universität",
    intro: "Kluge Köpfe aus dem Königreich sollen hier lernen.",
    tasks: [
      { id: "bibliothek", name: "Bibliothek", icon: "📚", cost: 4, spot: [26, 54] },
      { id: "sternwarte", name: "Sternwarte", icon: "🔭", cost: 4, spot: [78, 34] },
      { id: "labor", name: "Zaubertranklabor", icon: "⚗️", cost: 5, spot: [76, 72] },
      { id: "eule", name: "Eulenpost", icon: "🦉", cost: 5, spot: [24, 24] },
      { id: "festsaal", name: "Festsaal", icon: "🏛️", cost: 6, spot: [50, 64] },
    ],
  },
];

export const EMPTY_KINGDOM: Kingdom = { potions: 0, built: [] };

/** Der erste Bezirk mit unerledigten Aufgaben, null wenn alles gebaut ist. */
export function currentDistrict(kingdom: Kingdom): District | null {
  return DISTRICTS.find((district) => district.tasks.some((task) => !kingdom.built.includes(task.id))) ?? null;
}

export function canBuild(kingdom: Kingdom, taskId: string): boolean {
  const district = currentDistrict(kingdom);
  const task = district?.tasks.find((entry) => entry.id === taskId);
  return Boolean(task && !kingdom.built.includes(task.id) && kingdom.potions >= task.cost);
}

export function build(kingdom: Kingdom, taskId: string): Kingdom {
  if (!canBuild(kingdom, taskId)) return kingdom;
  const task = currentDistrict(kingdom)!.tasks.find((entry) => entry.id === taskId)!;
  return { potions: kingdom.potions - task.cost, built: [...kingdom.built, task.id] };
}

/** Liest einen gespeicherten Stand und verwirft unbekannte Aufgaben. */
export function sanitizeKingdom(stored: unknown): Kingdom {
  const value = stored as Partial<Kingdom> | null;
  const potions = Math.floor(Number(value?.potions));
  const known = new Set(DISTRICTS.flatMap((district) => district.tasks.map((task) => task.id)));
  const built = Array.isArray(value?.built) ? [...new Set(value.built.filter((id): id is string => typeof id === "string" && known.has(id)))] : [];
  return { potions: Number.isFinite(potions) && potions > 0 ? potions : 0, built };
}
