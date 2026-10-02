export type FrameMetrics = {
  physics: number; background: number; treasures: number; particles: number;
  preview: number; steps: number;
};
export class FrameProfiler {
  private samples: Array<FrameMetrics & { interval: number; work: number }> = [];
  uiCommits = 0;
  uiMs = 0;
  resizes = 0;
  backingResizes = 0;
  record(interval: number, work: number, metrics: FrameMetrics): void {
    this.samples.push({ interval, work, ...metrics });
    if (this.samples.length > 600) this.samples.shift();
  }
  snapshot() {
    const n = this.samples.length || 1;
    const mean = (key: keyof (typeof this.samples)[number]) => this.samples.reduce((sum, row) => sum + row[key], 0) / n;
    const p95 = (key: "interval" | "work") => this.samples.map(row => row[key]).sort((a,b) => a-b)[Math.floor((this.samples.length - 1) * .95)] ?? 0;
    return { samples: this.samples.length, fps: this.samples.length ? 1000 / (mean("interval") || 1) : 0, frameMean: mean("interval"), frameP95: p95("interval"), workMean: mean("work"), workP95: p95("work"), physics: mean("physics"), background: mean("background"), treasures: mean("treasures"), particles: mean("particles"), preview: mean("preview"), steps: mean("steps"), uiCommits: this.uiCommits, uiMs: this.uiMs, resizes: this.resizes, backingResizes: this.backingResizes };
  }
}
