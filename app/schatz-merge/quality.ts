export type QualityLevel = "HIGH" | "MEDIUM" | "LOW";
export const QUALITY = {
  HIGH: { dpr: 2, particles: 96, burst: 24 },
  MEDIUM: { dpr: 1.25, particles: 48, burst: 12 },
  LOW: { dpr: 1, particles: 24, burst: 6 },
} as const;

/** Downgrades only during a run: sustained samples and a cooldown prevent flicker. */
export class RenderQuality {
  level: QualityLevel;
  private sampleMs = 0;
  private frames = 0;
  private elapsed = 0;
  private lastChange = -30000;
  private readonly override?: QualityLevel;
  constructor(override?: QualityLevel, constrained = false) {
    this.override = override;
    this.level = override ?? (constrained ? "MEDIUM" : "HIGH");
  }
  get dpr(): number { return QUALITY[this.level].dpr; }
  observe(interval: number): boolean {
    if (this.override || interval <= 0 || interval > 250) return false;
    this.elapsed += interval;
    this.sampleMs += interval;
    this.frames++;
    if (this.sampleMs < 3000) return false;
    const mean = this.sampleMs / this.frames;
    this.sampleMs = 0;
    this.frames = 0;
    if (mean < 25 || this.elapsed - this.lastChange < 15000 || this.level === "LOW") return false;
    this.level = this.level === "HIGH" ? "MEDIUM" : "LOW";
    this.lastChange = this.elapsed;
    return true;
  }
}
