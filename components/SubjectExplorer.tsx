"use client";
import { useMemo, useState } from "react";
import type { DemoSubject, Trial } from "@/lib/data";
import { deDemo } from "@/lib/data";

export default function SubjectExplorer({ subjects }: { subjects: { strong: DemoSubject; median: DemoSubject; hard: DemoSubject } }) {
  const keys = ["strong", "median", "hard"] as const;
  const [which, setWhich] = useState<(typeof keys)[number]>("strong");
  const [selected, setSelected] = useState<number>(0);
  const demo = subjects[which];
  const trial: Trial = useMemo(() => demo.trials[selected] ?? demo.trials[0], [demo, selected]);
  // Global colour scale across all 3 demo subjects, so colours compare across trials.
  const { min, max } = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const rows of Object.values(deDemo.subjects)) for (const r of rows) for (const row of r.deMeanOverSegments) for (const v of row) { if (v < lo) lo = v; if (v > hi) hi = v; }
    return { min: lo, max: hi };
  }, []);
  const heat = useMemo(() => (deDemo.subjects[String(demo.subject)] ?? []).find((r) => r.video === trial.video), [demo.subject, trial.video]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {keys.map((k) => (
          <button key={k} onClick={() => { setWhich(k); setSelected(0); }} className={`chip capitalize ${which === k ? "bg-teal-300 text-slate-900 font-semibold" : ""}`}>
            {k}: Subject {subjects[k].subject} ({subjects[k].accMean.toFixed(1)}%)
          </button>
        ))}
      </div>
      <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
        Subject {demo.subject}, mean accuracy across the 3 seeds is {demo.accMean.toFixed(2)}%. Below are that subject&apos;s 28 trials.
        The ensemble prediction is the 3 seed majority vote per trial, using the rule stated in the model card.
        Predicted probabilities were not saved for these runs, so predictions show labels only, no invented probability bars.
        The heatmap below shows that trial&apos;s DE features.
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
        {demo.trials.map((t, i) => (
          <button key={t.video} onClick={() => setSelected(i)} className="rounded-lg p-2 text-xs border"
            style={{ borderColor: selected === i ? "#5eead4" : "#22345c", background: t.correct ? "rgba(134,239,172,0.12)" : "rgba(252,165,165,0.12)" }}>
            <div className="font-semibold">Video {t.video}</div>
            <div>{t.true}</div>
            <div style={{ color: t.correct ? "var(--good)" : "var(--warn)" }}>{t.correct ? "Correct" : "Wrong"}</div>
          </button>
        ))}
      </div>
      {trial && (
        <div className="panel p-4" style={{ background: "var(--panel2)" }}>
          <div className="grid sm:grid-cols-4 gap-3 text-sm">
            <div><div style={{ color: "var(--muted)" }}>Video</div><div className="font-semibold">{trial.video}</div></div>
            <div><div style={{ color: "var(--muted)" }}>True emotion</div><div className="font-semibold">{trial.true}</div></div>
            <div><div style={{ color: "var(--muted)" }}>Seed 42 model</div><div className="font-semibold">{trial.predSeed42}</div></div>
            <div><div style={{ color: "var(--muted)" }}>3 seed ensemble ({trial.ensembleVotes} of 3 votes)</div><div className="font-semibold" style={{ color: trial.correct ? "var(--good)" : "var(--warn)" }}>{trial.predEnsemble}</div></div>
          </div>
        </div>
      )}
      <div className="panel p-4 mt-4" style={{ background: "var(--panel2)" }}>
        <div className="font-semibold mb-1">DE feature heatmap for this trial</div>
        {heat ? (
          <>
            <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
              Each cell is the mean DE value over the trial&apos;s 30 segments, unnormalised, exactly as released in the FACED DE features.
              Rows are channels 1 to 32 (channel names are not shown because the released feature file numbers them, it does not name them here).
              Columns are the bands in the file&apos;s order: {deDemo.bands.join(", ")}.
              Colour scale is fixed across all 3 demo subjects, from {min.toFixed(2)} (palest) to {max.toFixed(2)} (deepest), so a colour means the same value in every trial.
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th className="p-1 text-left" style={{ color: "var(--muted)" }}>Channel</th>
                    {deDemo.bands.map((b) => (<th key={b} className="p-1 text-center" style={{ color: "var(--muted)" }}>{b}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {heat.deMeanOverSegments.map((row, ci) => (
                    <tr key={deDemo.channels[ci]}>
                      <td className="p-1 font-medium" style={{ color: "var(--muted)" }}>{deDemo.channels[ci]}</td>
                      {row.map((v, bi) => {
                        const t = max > min ? (v - min) / (max - min) : 0;
                        return (
                          <td key={deDemo.bands[bi]} className="p-1 text-center" style={{ background: `rgba(94, 234, 212, ${0.05 + 0.9 * t})`, color: t > 0.55 ? "#0f172a" : "inherit" }}>
                            {v.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No DE data for this trial in the demo export.</p>
        )}
      </div>
    </div>
  );
}
