"use client";
import { useMemo, useState } from "react";
import type { DemoSubject, Trial } from "@/lib/data";

export default function SubjectExplorer({ subjects }: { subjects: { strong: DemoSubject; median: DemoSubject; hard: DemoSubject } }) {
  const keys = ["strong", "median", "hard"] as const;
  const [which, setWhich] = useState<(typeof keys)[number]>("strong");
  const [selected, setSelected] = useState<number>(0);
  const demo = subjects[which];
  const trial: Trial = useMemo(() => demo.trials[selected] ?? demo.trials[0], [demo, selected]);

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
        Predicted probabilities were not saved for these runs, so v1 shows labels only, no invented probability bars.
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
        <div className="font-semibold mb-1">DE feature heatmap for this trial: not in v1 yet</div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          The DE feature values (faced_de_trials.npz, 30 segments by 32 channels by 5 bands per trial) live on Kaggle and Drive, not in this repo.
          One export step, running the exporter on that file for the 3 demo subjects only, adds the 32 by 5 heatmap here without changing anything else on this page.
        </p>
      </div>
    </div>
  );
}
