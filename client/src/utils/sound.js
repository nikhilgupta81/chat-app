// ============================================================
// sound.js — Tiny notification "ping"
// ============================================================
//
// Instead of shipping an audio file, we synthesize a short
// pleasant chime with the Web Audio API. It's created lazily
// (after the first user gesture) so browsers don't block it.
// ============================================================

let ctx;

export function playPing() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);                 // E5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // → A5

    // Quick fade in/out so it doesn't click
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.26);
  } catch {
    /* audio not available — ignore */
  }
}
