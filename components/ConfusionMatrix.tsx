"use client";
import { useState } from "react";

export default function ConfusionMatrix({ labels, counts, rowPct, total }: { labels: string[]; counts: number[][]; rowPct: number[][]; total: number }) {
  const [mode, setMode] = useState<"pct" | "counts">("pct");
  const max = Math.max(...counts.flat());
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setMode("pct")} className={`chip ${mode === "pct" ? "bg-teal-300 text-slate-900 font-semibold" : ""}`}>Row % (recall)</button>
        <button onClick={() => setMode("counts")} className={`chip ${mode === "counts" ? "bg-teal-300 text-slate-900 font-semibold" : ""}`}>Counts</button>
        <span className="text-xs" style={{ color: "var(--muted)" }}>Pooled across 3 seeds, {total.toLocaleString()} predictions. Rows are the true emotion, columns are the predicted emotion.</span>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs" style={{ borderCollapse: "separate", borderSpacing: 3 }}>
          <thead>
            <tr>
              <th className="p-1 text-left" style={{ color: "var(--muted)" }}>True \ Pred</th>
              {labels.map((l) => (<th key={l} className="p-1" style={{ color: "var(--muted)" }}>{l}</th>))}
            </tr>
          </thead>
          <tbody>
            {labels.map((lab, i) => (
              <tr key={lab}>
                <td className="p-1 font-medium">{lab}</td>
                {labels.map((_, j) => {
                  const v = counts[i][j];
                  const intensity = v / max;
                  const diag = i === j;
                  return (
                    <td key={j} className="p-1 text-center rounded" style={{ background: diag ? `rgba(94,234,212,${0.15 + intensity * 0.75})` : `rgba(147,197,253,${intensity * 0.55})`, minWidth: 52, color: intensity > 0.55 ? "#0b1220" : "var(--ink)", fontWeight: diag ? 700 : 400 }}>
                      {mode === "pct" ? `${rowPct[i][j].toFixed(1)}%` : v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
