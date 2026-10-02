import { SPRITE_PROFILES } from "./sprite-profiles";

export type SpriteUse = "game" | "preview" | "guide";
export type TreasureSprites = ReadonlyArray<HTMLImageElement>;
const cache = new Map<string, Promise<TreasureSprites>>();

export function treasureAssetPath(tier: number, use: SpriteUse): string {
  return `/schatz-merge/treasures/${use}/${SPRITE_PROFILES[tier - 1].file}`;
}

/** A single decoded game image per tier/base path; no decode or fetch in draw(). */
export function loadTreasureSprites(basePath: string): Promise<TreasureSprites> {
  const previous = cache.get(basePath);
  if (previous) return previous;
  const loading = Promise.all(SPRITE_PROFILES.map((_, index) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => { image.decode().then(() => resolve(image), reject); };
    image.onerror = () => reject(new Error(`Schatzgrafik ${index + 1} konnte nicht geladen werden.`));
    image.src = `${basePath}${treasureAssetPath(index + 1, "game")}`;
  })));
  cache.set(basePath, loading);
  loading.catch(() => cache.delete(basePath));
  return loading;
}
