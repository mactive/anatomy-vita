// Heart model: time-varying elastance ventricles and atria, valves with dynamic opening (Mynard-style),
// two-element Windkessel arteries. Pure function of time; run once at build to steady state, tabulated for the page.
// Units: mmHg, mL, s. Human adult at rest, 75 bpm (T = 0.8 s). t = 0 at the onset of ventricular contraction.
export const T = 0.8;
const vAct = (t) => { const Tp = 0.26, Tr = 0.14; return t < Tp ? Math.sin(Math.PI * t / (2 * Tp)) ** 1.5 : t < Tp + Tr ? 0.5 * (1 + Math.cos(Math.PI * (t - Tp) / Tr)) : 0; };
const aAct = (t) => { const t0 = 0.66, d = 0.12; const s = t - t0; return s > 0 && s < d ? Math.sin(Math.PI * s / d) ** 2 : 0; };
function side({ Emax, Emin, V0, Ea, Ea0, Va0, Rin, Pin, Rv, C, R, Pout, Kv }) {
  return { Emax, Emin, V0, Ea, Ea0, Va0, Rin, Pin, Rv, C, R, Pout, Kv, V: 110, Va: 60, Pa: 80, Ain: 0, Aout: 0 };
}
const LEFT = side({ Emax: 3.1, Emin: 0.07, V0: 10, Ea: 0.32, Ea0: 0.16, Va0: 10, Rin: 0.025, Pin: 9.5, Rv: 0.004, C: 1.25, R: 1.2, Pout: 4, Kv: 0.9 });
const RIGHT = side({ Emax: 0.52, Emin: 0.034, V0: 12, Ea: 0.2, Ea0: 0.11, Va0: 12, Rin: 0.025, Pin: 6, Rv: 0.003, C: 4.8, R: 0.105, Pout: 8, Kv: 3.5 });
function step(s, t, dt) {
  const Pv = (s.Emin + (s.Emax - s.Emin) * vAct(t)) * (s.V - s.V0);
  const Pat = (s.Ea0 + (s.Ea - s.Ea0) * aAct(t)) * (s.Va - s.Va0);
  const dIn = Pat - Pv, dOut = Pv - s.Pa;
  // valve opening A in [0,1]: opens with forward gradient, closes with reverse gradient
  s.Ain += dt * s.Kv * 30 * dIn * (dIn > 0 ? 1 - s.Ain : s.Ain);
  s.Aout += dt * s.Kv * 30 * dOut * (dOut > 0 ? 1 - s.Aout : s.Aout);
  s.Ain = Math.min(1, Math.max(0, s.Ain)); s.Aout = Math.min(1, Math.max(0, s.Aout));
  const Qin = s.Ain * s.Ain * dIn / s.Rv, Qout = s.Aout * s.Aout * dOut / s.Rv;
  const Qret = (s.Pin - Pat) / s.Rin, Qper = (s.Pa - s.Pout) / s.R;
  s.V += dt * (Qin - Qout); s.Va += dt * (Qret - Qin); s.Pa += dt * (Qout - Qper) / s.C;
  return { Pv, Pat, Qin, Qout };
}
export function simulate(N = 200) {
  const dt = 1e-5; const out = [];
  for (const s of [LEFT, RIGHT]) { s.V = 110; s.Va = 60; s.Pa = s === LEFT ? 80 : 12; }
  for (let beat = 0; beat < 14; beat++) {
    for (let i = 0; i < T / dt; i++) {
      const t = i * dt; const l = step(LEFT, t, dt), r = step(RIGHT, t, dt);
      if (beat === 13 && i % Math.round(T / dt / N) === 0) out.push({ t, lv: l.Pv, ao: LEFT.Pa, la: l.Pat, vlv: LEFT.V, vla: LEFT.Va, mi: LEFT.Ain, av: LEFT.Aout, rv: r.Pv, pa: RIGHT.Pa, ra: r.Pat, vrv: RIGHT.V, vra: RIGHT.Va, tr: RIGHT.Ain, pv: RIGHT.Aout, aa: aAct(t), va: vAct(t) });
    }
  }
  return out.slice(0, N);
}
