export type EffectKind = "throw" | "hit" | "break" | "gold" | "shield" | "damage";

type Tone = readonly [hz: number, delay: number, duration: number, wave: OscillatorType, level: number];
type Effect = { gain: number; glide?: number; tones: readonly Tone[] };

// Calibrated at 48 kHz to a maximum 200 ms K-weighted RMS of −29 dBFS per cue.
const effects: Record<EffectKind, Effect> = {
  throw:  { gain: .191, tones: [[520, 0, .11, "triangle", 1], [720, .06, .09, "triangle", .83]] },
  hit:    { gain: .147, tones: [[170, 0, .13, "square", 1], [110, .05, .10, "triangle", .72]] },
  break:  { gain: .145, glide: .62, tones: [[190, 0, .12, "square", 1], [125, .08, .18, "sawtooth", .74]] },
  gold:   { gain: .125, tones: [[660, 0, .13, "sine", 1], [880, .10, .20, "sine", .88]] },
  shield: { gain: .109, tones: [[440, 0, .20, "sine", 1], [660, .12, .25, "sine", .94], [990, .25, .30, "sine", .80]] },
  damage: { gain: .135, glide: .62, tones: [[145, 0, .22, "sawtooth", 1], [92, .08, .30, "square", .72]] },
};

export function createGameMix(audio: BaseAudioContext) {
  // A soft ceiling only acts on loud overlaps. Ordinary cues pass at unity gain.
  const master = audio.createWaveShaper();
  master.curve = Float32Array.from({ length: 2049 }, (_, i) => {
    const input = i / 1024 - 1;
    const amplitude = Math.abs(input);
    if (amplitude <= .32) return input;
    return Math.sign(input) * (.32 + .32 * Math.tanh((amplitude - .32) / .32));
  });
  master.connect(audio.destination);

  const lastEffectAt = new Map<EffectKind, number>();
  function effect(kind: EffectKind) {
    const now = audio.currentTime;
    // Several gems from one chest can be picked up in the same animation frame.
    if (now - (lastEffectAt.get(kind) ?? -Infinity) < .045) return;
    lastEffectAt.set(kind, now);
    const cue = effects[kind];
    for (const [frequency, delay, duration, wave, level] of cue.tones) {
      const start = now + delay;
      const end = start + duration;
      const oscillator = audio.createOscillator();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (cue.glide) oscillator.frequency.exponentialRampToValueAtTime(frequency * cue.glide, end);
      const gain = audio.createGain();
      const peak = level * cue.gain;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + .012);
      gain.gain.exponentialRampToValueAtTime(peak * .003, end);
      gain.gain.linearRampToValueAtTime(0, end + .005);
      oscillator.connect(gain).connect(master);
      oscillator.start(start);
      oscillator.stop(end + .006);
    }
  }

  function note(frequency: number, duration: number, volume: number) {
    const start = audio.currentTime;
    const end = start + duration;
    const oscillator = audio.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    const gain = audio.createGain();
    // Retain the relative lead/bass balance while reining in louder arrangements.
    const peak = .042 * Math.sqrt(volume / .14);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + Math.min(.35, duration * .25));
    gain.gain.exponentialRampToValueAtTime(Math.max(.00001, peak * .003), end);
    gain.gain.linearRampToValueAtTime(0, end + .02);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(end + .021);
  }

  return { effect, note };
}
