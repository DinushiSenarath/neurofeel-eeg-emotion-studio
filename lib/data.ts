import raw from "@/data/evaluation.json";

export type Headline = { metric: string; mean: number; sd: number; perSeed: number[]; explanation: string };
export type PerClass = { class: string; accuracyMean: number; accuracySd: number; precision: number; recall: number; f1: number; supportPerSeed: number; note: string };
export type PerSubject = { subject: number; accMean: number; accSd: number; accPerSeed: number[]; f1Mean: number };
export type Trial = { video: number; true: string; predSeed42: string; predEnsemble: string; ensembleVotes: number; correct: boolean };
export type DemoSubject = { subject: number; accMean: number; trials: Trial[] };

export const data = raw as unknown as {
  meta: Record<string, string>;
  headline: Headline[];
  perSeed: { seed: number; accuracy: number; macroF1: number; balancedAccuracy: number; valMacroF1: number; subjects: number }[];
  perClass: PerClass[];
  pooledReport: { macroPrecision: number; macroRecall: number; macroF1: number; weightedF1: number; pooledAccuracy: number; note: string };
  confusion: { labels: string[]; pooledCounts: number[][]; rowNormalisedPct: number[][]; totalPredictions: number };
  perSubject: PerSubject[];
  perSubjectSummary: { hardInAllSeeds: number[]; meanSeedNoiseSd: number; medianSeedNoiseSd: number; maxSeedNoiseSd: number; cohort0to60: number; cohort61to122: number };
  ablation: { run: string; change: string; accuracy: number; macroF1: number; balancedAccuracy: number; valMacroF1: number | null; verdict: string }[];
  pairedTests: { comparison: string; result: string; detail: string }[];
  analyses: { ensembleAccuracy: number; ensembleNote: string; valenceAccuracySeed42: number; valenceWithinErrorPct: number };
  demoSubjects: { strong: DemoSubject; median: DemoSubject; hard: DemoSubject };
  limitations: string[];
};
