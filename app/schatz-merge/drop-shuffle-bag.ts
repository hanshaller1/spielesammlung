const DROP_TIERS = [1, 2, 3, 4, 5, 6] as const;

export class DropShuffleBag {
  private remaining: number[] = [];

  constructor(private readonly random: () => number = Math.random) {}

  next(): number {
    if (this.remaining.length === 0) {
      this.remaining = [...DROP_TIERS];
      for (let index = this.remaining.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(this.random() * (index + 1));
        [this.remaining[index], this.remaining[swapIndex]] = [this.remaining[swapIndex], this.remaining[index]];
      }
    }
    return this.remaining.pop()!;
  }

  reset(): void {
    this.remaining = [];
  }
}
