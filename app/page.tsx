import { data } from "@/lib/data";
import ConfusionMatrix from "@/components/ConfusionMatrix";
import SubjectExplorer from "@/components/SubjectExplorer";

function Bar({ value, max = 100 }: { value: number; max?: number }) {
  return (
    <div className="bar-track h-2 w-full">
      <div className="bar-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold">{children}</h2>
      {sub && <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{sub}</p>}
    </div>
  );
}

export default function Home() {
  const sortedSubjects = [...data.perSubject].sort((a, b) => b.accMean - a.accMean);
  const maxAcc = Math.max(...data.perSubject.map((p) => p.accMean));

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <header className="panel p-6">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="chip">Research and education tool</span>
          <span className="chip">DE features, not raw EEG</span>
          <span className="chip">FACED | 123 subjects | 9 emotions</span>
        </div>
        <h1 className="text-3xl font-bold">NeuroFeel: EEG Emotion Studio</h1>
        <p className="mt-3 text-base max-w-3xl" style={{ color: "var(--muted)" }}>
          My thesis model lived inside Kaggle notebooks. Only someone who could read the code could run it, change a subject,
          or check a result. This site makes that model explorable in a browser: pick a subject, walk through its trials,
          and read the full evaluation, not only the accuracy.
        </p>
        <p className="mt-3 text-sm max-w-3xl">
          Built by Dinushi Senarath, University of Jaffna. Model: CNN + Transformer with DANN and center loss, trained on
          Differential Entropy features released by FACED, evaluated subject independently (LOSO, 123 folds, 3444 trials).
        </p>
        <nav className="flex flex-wrap gap-2 mt-4 text-sm">
          <a className="chip" href="#evaluation">Evaluation</a>
          <a className="chip" href="#per-class">Per class</a>
          <a className="chip" href="#confusion">Confusion matrix</a>
          <a className="chip" href="#subjects">Per subject</a>
          <a className="chip" href="#demo">Try a subject</a>
          <a className="chip" href="#model-card">Model card</a>
          <a className="chip" href="#learn">Learn the pipeline</a>
        </nav>
      </header>

      {/* Evaluation headline */}
      <section id="evaluation" className="panel p-6">
        <SectionTitle sub="Final model, nb22 recipe, mean and standard deviation across seeds 42, 142 and 242. Accuracy alone hides weak classes and unstable subjects, so the other parameters are shown first, not buried.">
          Evaluation, not only accuracy
        </SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.headline.map((h) => (
            <div key={h.metric} className="panel p-4" style={{ background: "var(--panel2)" }}>
              <div className="text-sm" style={{ color: "var(--muted)" }}>{h.metric}</div>
              <div className="text-3xl font-bold mt-1">{h.mean.toFixed(2)}% <span className="text-base font-medium" style={{ color: "var(--muted)" }}>± {h.sd.toFixed(2)}</span></div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>Seeds: {h.perSeed.map((v) => v.toFixed(2)).join(" / ")}</div>
              <div className="mt-3"><Bar value={h.mean} /></div>
              <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>{h.explanation}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto mt-5">
          <table className="data-table">
            <thead><tr><th>Seed</th><th>Accuracy %</th><th>Macro F1 %</th><th>Balanced accuracy %</th><th>Validation macro F1 %</th></tr></thead>
            <tbody>
              {data.perSeed.map((r) => (
                <tr key={r.seed}><td>Seed {r.seed}</td><td>{r.accuracy.toFixed(2)}</td><td>{r.macroF1.toFixed(2)}</td><td>{r.balancedAccuracy.toFixed(2)}</td><td>{r.valMacroF1.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mt-5 text-sm">
          <div className="panel p-4" style={{ background: "var(--panel2)" }}>
            <div style={{ color: "var(--muted)" }}>3 seed ensemble (majority vote)</div>
            <div className="text-2xl font-bold mt-1">{data.analyses.ensembleAccuracy.toFixed(2)}%</div>
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>{data.analyses.ensembleNote}</p>
          </div>
          <div className="panel p-4" style={{ background: "var(--panel2)" }}>
            <div style={{ color: "var(--muted)" }}>Recording cohort split</div>
            <div className="text-2xl font-bold mt-1">{data.perSubjectSummary.cohort0to60.toFixed(2)}% vs {data.perSubjectSummary.cohort61to122.toFixed(2)}%</div>
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Subjects 0 to 60 against subjects 61 to 122. FACED recordings come in two cohorts with documented acquisition differences, which likely explains part of this gap.</p>
          </div>
          <div className="panel p-4" style={{ background: "var(--panel2)" }}>
            <div style={{ color: "var(--muted)" }}>Valence grouping (seed 42)</div>
            <div className="text-2xl font-bold mt-1">{data.analyses.valenceAccuracySeed42.toFixed(2)}%</div>
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Grouping the 9 emotions into positive, negative and neutral. Only {data.analyses.valenceWithinErrorPct.toFixed(1)}% of errors stay inside the true emotion&apos;s valence group, so most errors are not small confusions between similar emotions.</p>
          </div>
        </div>
      </section>

      {/* Per class */}
      <section id="per-class" className="panel p-6">
        <SectionTitle sub={`Precision, recall and F1 per emotion, computed from the three saved confusion matrices pooled together (10,332 predictions). Per class accuracy is the 3 seed mean, and here it equals recall, because both are the diagonal share of that class's row. Pooled report, kept separate from the per subject headline figures above: macro precision ${data.pooledReport.macroPrecision.toFixed(2)}%, macro recall ${data.pooledReport.macroRecall.toFixed(2)}%, macro F1 ${data.pooledReport.macroF1.toFixed(2)}%, weighted F1 ${data.pooledReport.weightedF1.toFixed(2)}%.`}>
          Per class results
        </SectionTitle>
        <div className="space-y-3">
          {data.perClass.map((c) => (
            <div key={c.class} className="grid grid-cols-[110px_1fr_190px] items-center gap-3 text-sm max-sm:grid-cols-[90px_1fr]">
              <div className="font-medium">{c.class}</div>
              <Bar value={c.f1} />
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                Acc {c.accuracyMean.toFixed(2)} ± {c.accuracySd.toFixed(2)} | P {c.precision.toFixed(2)} | R {c.recall.toFixed(2)} | F1 {c.f1.toFixed(2)} | n={c.supportPerSeed}/seed
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm mt-4" style={{ color: "var(--muted)" }}>
          Neutral and Inspiration are the weakest classes in every seed, with a small spread. That reads as a stable property of the model on those classes, not seed luck.
        </p>
      </section>

      {/* Confusion */}
      <section id="confusion" className="panel p-6">
        <SectionTitle sub="Where the errors go. A bright diagonal is correct. Off diagonal cells show which emotions get confused with each other.">
          Confusion matrix
        </SectionTitle>
        <ConfusionMatrix labels={data.confusion.labels} counts={data.confusion.pooledCounts} rowPct={data.confusion.rowNormalisedPct} total={data.confusion.totalPredictions} />
      </section>

      {/* Per subject */}
      <section id="subjects" className="panel p-6">
        <SectionTitle sub={`Every subject, sorted best to worst by mean accuracy across the 3 seeds. Hard subjects in all 3 seeds (under 25%): ${data.perSubjectSummary.hardInAllSeeds.join(", ")}. Per subject seed noise averages ${data.perSubjectSummary.meanSeedNoiseSd.toFixed(2)} points (worst ${data.perSubjectSummary.maxSeedNoiseSd.toFixed(2)}), so the overall result is stable while a single subject score is not, and a single fold score is never quoted alone.`}>
          Per subject results, all 123 subjects
        </SectionTitle>
        <div className="flex items-end gap-[2px] h-36 overflow-x-auto pb-2">
          {sortedSubjects.map((p) => (
            <div key={p.subject} title={`Subject ${p.subject}: ${p.accMean.toFixed(1)}%`} className="flex flex-col items-center justify-end h-full">
              <div className="w-2 rounded-t" style={{ height: `${(p.accMean / maxAcc) * 100}%`, background: data.perSubjectSummary.hardInAllSeeds.includes(p.subject) ? "var(--warn)" : "var(--accent2)", minHeight: 3 }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs" style={{ color: "var(--muted)" }}><span>Best: Subject {sortedSubjects[0].subject}, {sortedSubjects[0].accMean.toFixed(1)}%</span><span>Red bars are the hard subjects under 25% in all seeds</span><span>Worst: Subject {sortedSubjects[sortedSubjects.length - 1].subject}, {sortedSubjects[sortedSubjects.length - 1].accMean.toFixed(1)}%</span></div>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">Show the full per subject table</summary>
          <div className="overflow-x-auto mt-3 max-h-96 overflow-y-auto">
            <table className="data-table">
              <thead><tr><th>Subject</th><th>Mean accuracy %</th><th>SD across seeds</th><th>Seed 42</th><th>Seed 142</th><th>Seed 242</th><th>Mean macro F1 %</th></tr></thead>
              <tbody>
                {data.perSubject.map((p) => (
                  <tr key={p.subject}><td>{p.subject}</td><td>{p.accMean.toFixed(2)}</td><td>{p.accSd.toFixed(2)}</td><td>{p.accPerSeed[0].toFixed(2)}</td><td>{p.accPerSeed[1].toFixed(2)}</td><td>{p.accPerSeed[2].toFixed(2)}</td><td>{p.f1Mean.toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* Demo explorer */}
      <section id="demo" className="panel p-6">
        <SectionTitle sub="Real saved predictions, no login and no upload needed. One strong, one median and one hard subject, 28 trials each.">
          Try it: explore a subject
        </SectionTitle>
        <SubjectExplorer subjects={data.demoSubjects} />
      </section>

      {/* Ablation + stats */}
      <section className="panel p-6">
        <SectionTitle sub="Each run changed one thing from the previous run. A change was kept only when the paired test across the same 123 subjects supported it.">
          How the final model was chosen
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Run</th><th>Single change</th><th>Accuracy %</th><th>Macro F1 %</th><th>Balanced acc %</th><th>Val macro F1 %</th><th>Verdict</th></tr></thead>
            <tbody>
              {data.ablation.map((a) => (
                <tr key={a.run}><td>{a.run}</td><td style={{ textAlign: "left" }}>{a.change}</td><td>{a.accuracy.toFixed(2)}</td><td>{a.macroF1.toFixed(2)}</td><td>{a.balancedAccuracy.toFixed(2)}</td><td>{a.valMacroF1 === null ? "not recorded" : a.valMacroF1.toFixed(2)}</td><td style={{ textAlign: "left" }}>{a.verdict}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mt-5">
          {data.pairedTests.map((t) => (
            <div key={t.comparison} className="panel p-4" style={{ background: "var(--panel2)" }}>
              <div className="font-medium text-sm">{t.comparison}</div>
              <div className="font-bold mt-1" style={{ color: t.result.includes("Not") ? "var(--warn)" : "var(--good)" }}>{t.result}</div>
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>{t.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Model card + learn */}
      <section id="model-card" className="panel p-6">
        <SectionTitle>Model card and limits</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p><b>Dataset:</b> {data.meta.dataset}</p>
            <p><b>Input:</b> {data.meta.input}</p>
            <p><b>Protocol:</b> {data.meta.protocol}</p>
            <p><b>Model:</b> {data.meta.model}</p>
            <p><b>Final model:</b> {data.meta.finalModel}</p>
            <p><b>Data source for this site:</b> {data.meta.source}</p>
          </div>
          <ul className="list-disc pl-5 space-y-2" style={{ color: "var(--muted)" }}>
            {data.limitations.map((l) => (<li key={l.slice(0, 40)}>{l}</li>))}
          </ul>
        </div>
      </section>

      <section id="learn" className="panel p-6">
        <SectionTitle sub="For a student starting an EEG project. The two parts are kept separate on purpose, so nobody mistakes the FACED authors' work for mine.">
          Learn the pipeline
        </SectionTitle>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="panel p-4" style={{ background: "var(--panel2)" }}>
            <div className="font-semibold mb-2">Part A: done by the FACED authors</div>
            <ol className="list-decimal pl-5 space-y-1" style={{ color: "var(--muted)" }}>
              <li>Recorded EEG from 123 subjects while they watched 28 emotion video clips</li>
              <li>Filtered and downsampled the raw recordings</li>
              <li>Extracted Differential Entropy features, 32 channels by 5 frequency bands, and released them</li>
            </ol>
          </div>
          <div className="panel p-4" style={{ background: "var(--panel2)" }}>
            <div className="font-semibold mb-2">Part B: done by Dinushi</div>
            <ol className="list-decimal pl-5 space-y-1" style={{ color: "var(--muted)" }}>
              <li>Built the trial dataset from the released DE features, 3444 trials with subject and video indices kept</li>
              <li>Standardised each subject on its own trials, per channel and band</li>
              <li>Trained the CNN + Transformer model with DANN and center loss</li>
              <li>Evaluated it subject independently with LOSO, 3 seeds, per class and per subject metrics, confusion matrix and paired statistical tests</li>
            </ol>
          </div>
        </div>
      </section>

      <footer className="text-center text-xs pb-6" style={{ color: "var(--muted)" }}>
        NeuroFeel is a research and education tool. It is not a medical device and it does not diagnose any person.
        FACED data is distributed through Synapse under its own terms; besides aggregated results and saved prediction labels, the demo explorer shows mean DE values for the 3 demo subjects only, taken from the released FACED DE features.
      </footer>
    </main>
  );
}
