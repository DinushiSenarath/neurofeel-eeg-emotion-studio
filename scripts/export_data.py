#!/usr/bin/env python3
"""
NeuroFeel v1 data exporter.

Reads Dinushi's own saved nb22 / nb25 result files (the three seeds of the
final model recipe) and writes data/evaluation.json for the web app.

Every figure is computed here from those CSVs. Figures that come from her
final results table (ablation, paired tests) are entered once, labelled with
their source, and the computed figures are checked against the thesis
headline values before anything is written. If a check fails, this script
stops instead of writing wrong data.
"""
import csv, json, math, sys
from pathlib import Path
from collections import Counter

BASE = Path.home() / "workspace" / "user" / "files"
STEM = "cnn_transformer_dann_center_loss_subjectnorm_123_loso"
SEEDS = [42, 142, 242]
SUFFIX = {42: "", 142: "-2", 242: "-3"}

def read_csv(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))

def mean(xs): return sum(xs) / len(xs)
def sd(xs):
    m = mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1)) if len(xs) > 1 else 0.0
def pct(x): return round(x * 100, 2)

# ---------- summaries: headline metrics per seed ----------
summaries = {}
for s in SEEDS:
    rows = read_csv(BASE / f"{STEM}_summary{SUFFIX[s]}.csv")
    assert len(rows) == 1, f"summary seed {s}: expected 1 row"
    summaries[s] = rows[0]

headline_defs = [
    ("Accuracy", "mean_accuracy", "Overall share of the 3444 trials predicted correctly."),
    ("Macro F1", "mean_macro_f1", "F1 averaged per subject in her thesis method, so each emotion counts equally and a weak class cannot hide behind a strong one."),
    ("Balanced accuracy", "mean_balanced_accuracy", "Average recall across the 9 emotion classes, so it checks each emotion rather than each trial."),
    ("Validation macro F1", "mean_validation_macro_f1", "Macro F1 on the validation subjects used during training and model selection. Only the mean compares across seeds, because the validation split changes with the seed."),
]
headline = []
for name, key, expl in headline_defs:
    vals = [float(summaries[s][key]) for s in SEEDS]
    headline.append({
        "metric": name,
        "mean": pct(mean(vals)),
        "sd": pct(sd(vals)),
        "perSeed": [pct(v) for v in vals],
        "explanation": expl,
    })

# Thesis headline check (Final_Results_Table_2026-10-10_v2_final.md)
expected = {"Accuracy": 58.03, "Macro F1": 57.46, "Balanced accuracy": 58.64, "Validation macro F1": 58.52}
for h in headline:
    assert abs(h["mean"] - expected[h["metric"]]) <= 0.011, f"HEADLINE MISMATCH {h['metric']}: {h['mean']} vs {expected[h['metric']]}"
print("headline check passed:", {h["metric"]: h["mean"] for h in headline})

per_seed = []
for s in SEEDS:
    per_seed.append({
        "seed": s,
        "accuracy": pct(float(summaries[s]["mean_accuracy"])),
        "macroF1": pct(float(summaries[s]["mean_macro_f1"])),
        "balancedAccuracy": pct(float(summaries[s]["mean_balanced_accuracy"])),
        "valMacroF1": pct(float(summaries[s]["mean_validation_macro_f1"])),
        "subjects": int(summaries[s]["number_of_test_subjects"]),
    })

# ---------- confusion matrices: pooled P/R/F1 + per class accuracy ----------
labels = None
cms = {}
for s in SEEDS:
    path = BASE / f"{STEM}_confusion_matrix{SUFFIX[s]}.csv"
    with open(path, newline="") as f:
        rdr = csv.reader(f)
        header = next(rdr)
        labs = header[1:]
        if labels is None: labels = labs
        assert labs == labels, "label order differs across seeds"
        mat = []
        for row in rdr:
            assert row[0] in labels
            mat.append([int(x) for x in row[1:]])
        cms[s] = mat
n = len(labels)
pooled = [[sum(cms[s][i][j] for s in SEEDS) for j in range(n)] for i in range(n)]

per_class = []
for i, lab in enumerate(labels):
    accs = []
    for s in SEEDS:
        row_total = sum(cms[s][i])
        accs.append(cms[s][i][i] / row_total)
    tp = pooled[i][i]
    row_total = sum(pooled[i]); col_total = sum(pooled[r][i] for r in range(n))
    precision = tp / col_total if col_total else 0.0
    recall = tp / row_total if row_total else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    per_class.append({
        "class": lab,
        "accuracyMean": pct(mean(accs)),
        "accuracySd": pct(sd(accs)),
        "precision": pct(precision),
        "recall": pct(recall),
        "f1": pct(f1),
        "supportPerSeed": sum(cms[42][i]),
        "note": "Recall here equals per class accuracy, both are the diagonal share of that class row in the confusion matrix.",
    })
    print(f"per class {lab}: acc {pct(mean(accs))} +/- {pct(sd(accs))}, P {pct(precision)}, R {pct(recall)}, F1 {pct(f1)}, support/seed {sum(cms[42][i])}")

# pooled classification report rows
macro_p = mean([c["precision"] for c in per_class]); macro_r = mean([c["recall"] for c in per_class]); macro_f = mean([c["f1"] for c in per_class])
total = sum(sum(r) for r in pooled)
weighted_f = sum(c["f1"] * c["supportPerSeed"] * 3 for c in per_class) / total
pooled_accuracy = sum(pooled[i][i] for i in range(n)) / total
print(f"pooled accuracy across 3 seeds: {pct(pooled_accuracy)} (must equal headline mean 58.03)")
assert abs(pct(pooled_accuracy) - 58.03) <= 0.011

confusion = {"labels": labels, "pooledCounts": pooled,
             "rowNormalisedPct": [[pct(pooled[i][j] / sum(pooled[i])) for j in range(n)] for i in range(n)],
             "totalPredictions": total}

# ---------- per subject ----------
per_subject = []
results_by_seed = {}
for s in SEEDS:
    rows = read_csv(BASE / f"{STEM}_results{SUFFIX[s]}.csv")
    results_by_seed[s] = {int(r["test_subject"]): r for r in rows}
for subj in range(123):
    accs = [float(results_by_seed[s][subj]["test_accuracy"]) for s in SEEDS]
    f1s = [float(results_by_seed[s][subj]["test_macro_f1"]) for s in SEEDS]
    per_subject.append({
        "subject": subj,
        "accMean": pct(mean(accs)), "accSd": pct(sd(accs)),
        "accPerSeed": [pct(a) for a in accs],
        "f1Mean": pct(mean(f1s)),
    })
hard_all = [p["subject"] for p in per_subject if all(a < 25 for a in p["accPerSeed"])]
noise = [p["accSd"] for p in per_subject]
print(f"hard subjects under 25 in all seeds: {hard_all} (expected [23, 30, 86, 101] in some order)")
assert sorted(hard_all) == [23, 30, 86, 101]
cohort_a = mean([p["accMean"] for p in per_subject if p["subject"] <= 60])
cohort_b = mean([p["accMean"] for p in per_subject if p["subject"] >= 61])
print(f"cohort split computed: 0-60 {cohort_a:.2f}, 61-122 {cohort_b:.2f} (expected 64.83 / 51.34)")
assert abs(cohort_a - 64.83) <= 0.02 and abs(cohort_b - 51.34) <= 0.02

# ---------- trial level: ensemble vote + demo subjects ----------
preds = {}
for s in SEEDS:
    preds[s] = read_csv(BASE / f"{STEM}_all_predictions{SUFFIX[s]}.csv")
assert len(preds[42]) == len(preds[142]) == len(preds[242]) == 3444
ensemble_correct = 0
trials_by_subject = {}
# Ensemble rule, exactly as in her recorded analysis: per trial, count votes
# per class index and pick the class with the highest count (bincount argmax).
# When all three seeds differ (435 trials) this breaks the tie by the smallest
# class index, which reproduces her recorded 61.00% exactly (2101 of 3444).
# A first-seen tie break gives 61.41% and a strict majority-or-wrong rule
# gives 58.97%, so the rule matters and is stated on the site and in README.
for idx in range(3444):
    rows = [preds[s][idx] for s in SEEDS]
    keys = {(r["test_subject"], r["video_index"], r["true_emotion"]) for r in rows}
    assert len(keys) == 1, f"row alignment mismatch at {idx}"
    vote_counts = Counter(int(r["predicted_label"]) for r in rows)
    vote_count = max(vote_counts.values())
    winner_label = min(k for k, v in vote_counts.items() if v == vote_count)
    pred_ens = labels[winner_label]
    true = rows[0]["true_emotion"]
    correct = pred_ens == true
    ensemble_correct += correct
    subj = int(rows[0]["test_subject"])
    trials_by_subject.setdefault(subj, []).append({
        "video": int(rows[0]["video_index"]),
        "true": true,
        "predSeed42": rows[0]["predicted_emotion"],
        "predEnsemble": pred_ens,
        "ensembleVotes": vote_count,
        "correct": correct,
    })
ensemble_acc = ensemble_correct / 3444
print(f"ensemble majority vote accuracy computed: {pct(ensemble_acc)} (expected 61.00)")
assert abs(pct(ensemble_acc) - 61.00) <= 0.011

# valence, seed 42: positive = Amusement, Inspiration, Joy, Tenderness; negative = Anger, Disgust, Fear, Sadness; neutral = Neutral
valence = {"Amusement": "positive", "Inspiration": "positive", "Joy": "positive", "Tenderness": "positive",
           "Anger": "negative", "Disgust": "negative", "Fear": "negative", "Sadness": "negative", "Neutral": "neutral"}
v_correct = 0; within = 0; errors = 0
for r in preds[42]:
    t, p = r["true_emotion"], r["predicted_emotion"]
    if valence[t] == valence[p]: v_correct += 1
    if t != p:
        errors += 1
        if valence[t] == valence[p]: within += 1
print(f"valence 3-group acc seed42: {pct(v_correct/3444)} (expected 71.25), errors within valence: {round(100*within/errors,1)} (expected 31.0)")
assert abs(pct(v_correct / 3444) - 71.25) <= 0.011

sorted_subjects = sorted(per_subject, key=lambda p: p["accMean"])
hard_demo = sorted_subjects[0]
median_demo = sorted_subjects[len(sorted_subjects) // 2]
strong_demo = sorted_subjects[-1]
def demo_block(p):
    return {"subject": p["subject"], "accMean": p["accMean"], "trials": sorted(trials_by_subject[p["subject"]], key=lambda t: t["video"])}
demo_subjects = {"strong": demo_block(strong_demo), "median": demo_block(median_demo), "hard": demo_block(hard_demo)}
print("demo subjects:", {k: (v["subject"], v["accMean"], len(v["trials"])) for k, v in demo_subjects.items()})

# ---------- ablation + paired tests: from her final results table ----------
ablation = [
    {"run": "nb15", "change": "CNN-DANN, lambda 0.05 (base)", "accuracy": 47.91, "macroF1": 46.02, "balancedAccuracy": 48.93, "valMacroF1": None, "verdict": "Base"},
    {"run": "nb18", "change": "Transformer block added", "accuracy": 53.28, "macroF1": 52.14, "balancedAccuracy": 53.99, "valMacroF1": 50.58, "verdict": "Gain (+5.37 pp)"},
    {"run": "19_4", "change": "DANN lambda 0.05 to 0.10", "accuracy": 52.00, "macroF1": 51.29, "balancedAccuracy": 52.82, "valMacroF1": 50.16, "verdict": "No gain"},
    {"run": "19_5", "change": "Attention pooling only", "accuracy": 52.82, "macroF1": 51.63, "balancedAccuracy": 53.58, "valMacroF1": 50.87, "verdict": "No gain"},
    {"run": "19_6", "change": "Focal loss plus attention pooling", "accuracy": 51.92, "macroF1": 50.96, "balancedAccuracy": 52.74, "valMacroF1": 49.51, "verdict": "No gain"},
    {"run": "nb20", "change": "Center loss added", "accuracy": 54.99, "macroF1": 54.01, "balancedAccuracy": 55.65, "valMacroF1": 51.91, "verdict": "Gain, paired p = 0.037"},
    {"run": "nb21", "change": "Emotion SupCon added to nb20", "accuracy": 55.40, "macroF1": 54.68, "balancedAccuracy": 56.14, "valMacroF1": 51.55, "verdict": "No gain"},
    {"run": "nb22", "change": "Per subject standardisation", "accuracy": 58.36, "macroF1": 57.74, "balancedAccuracy": 58.94, "valMacroF1": 58.51, "verdict": "Gain, paired p = 0.0013. Best supported model"},
    {"run": "nb24", "change": "Stimulus contrastive added to nb22", "accuracy": 59.35, "macroF1": 58.52, "balancedAccuracy": 59.83, "valMacroF1": 58.93, "verdict": "Highest single seed, paired p = 0.19, not a supported gain"},
]

out = {
    "meta": {
        "dataset": "FACED, 123 subjects, 32 channels, 28 video clips, 9 emotion classes",
        "input": "Differential Entropy (DE) features released by FACED. Not raw EEG signals.",
        "protocol": "Subject independent LOSO, 123 folds, 3444 trials",
        "model": "CNN + Transformer with DANN (lambda 0.05) and center loss (weight 0.003), per subject standardisation",
        "finalModel": "nb22 recipe, consolidated over seeds 42, 142 and 242 (nb25 runs)",
        "source": "Computed by scripts/export_data.py from Dinushi's saved nb22/nb25 result, summary, confusion matrix and all_predictions CSV files. Ablation and paired test figures are from Final_Results_Table_2026-10-10_v2_final.md.",
    },
    "headline": headline,
    "perSeed": per_seed,
    "perClass": sorted(per_class, key=lambda c: -c["accuracyMean"]),
    "pooledReport": {"macroPrecision": round(macro_p, 2), "macroRecall": round(macro_r, 2), "macroF1": round(macro_f, 2), "weightedF1": round(weighted_f, 2), "pooledAccuracy": pct(pooled_accuracy), "note": "Pooled figures, computed from the three saved confusion matrices summed together (10332 predictions). These are not the same as the per subject macro F1 headline, and the app labels them separately."},
    "confusion": confusion,
    "perSubject": sorted(per_subject, key=lambda p: p["subject"]),
    "perSubjectSummary": {"hardInAllSeeds": sorted(hard_all), "meanSeedNoiseSd": round(mean(noise), 2), "medianSeedNoiseSd": round(sorted(noise)[len(noise)//2], 2), "maxSeedNoiseSd": round(max(noise), 2), "cohort0to60": round(cohort_a, 2), "cohort61to122": round(cohort_b, 2)},
    "ablation": ablation,
    "pairedTests": [
        {"comparison": "nb22 vs nb20 (per subject standardisation step)", "result": "Gain supported", "detail": "Paired p = 0.0013 across the same 123 subjects."},
        {"comparison": "nb24 vs nb22 (stimulus contrastive)", "result": "Not significant, not claimed", "detail": "Accuracy +0.99 pp, paired t p = 0.19, Wilcoxon p = 0.10, sign p = 0.23, 95% CI -0.51 to +2.48. Macro F1 +0.78 pp, p = 0.32."},
        {"comparison": "nb20 vs previous (center loss)", "result": "Gain supported", "detail": "Paired p = 0.037."},
    ],
    "analyses": {
        "ensembleAccuracy": pct(ensemble_acc),
        "ensembleNote": "Hard majority vote of the three seed models, computed from the three all_predictions files after row alignment was asserted. Rule: per trial, the class with the most votes wins; when all three seeds predict different classes (435 trials), the smallest class index wins, the bincount argmax rule from her original analysis, which reproduces 61.00% (2101 of 3444) exactly. The older wording 'three voters, so no ties' is not strictly correct for 9 classes and should be corrected in the thesis. An analysis of saved outputs, or the final system only if described exactly this way.",
        "valenceAccuracySeed42": pct(v_correct / 3444),
        "valenceWithinErrorPct": round(100 * within / errors, 1),
    },
    "demoSubjects": demo_subjects,
    "limitations": [
        "The SOTA reference, CSCL at 65.98% on FACED, was not beaten. That figure used a different protocol and raw EEG input, stated beside it wherever it is mentioned.",
        "Predicted probabilities were not saved for these runs, so v1 shows true and predicted labels only. Probability bars belong to the v2 live inference model and must be labelled with that model's seed.",
        "DE feature values (faced_de_trials.npz) are not in this repo, they live on Kaggle/Drive, so the 32 by 5 DE heatmap per trial is a v1.1 step that needs that file exported for the demo subjects.",
        "Per subject validation F1 does not correlate across seeds by construction, because the validation split is seed dependent. Only the mean validation F1 is compared.",
        "Research and education tool only. Not a medical device, not a diagnosis tool.",
    ],
}

out_path = Path.home() / "workspace" / "neurofeel" / "data" / "evaluation.json"
out_path.write_text(json.dumps(out, indent=1))
print(f"\nwrote {out_path} ({out_path.stat().st_size} bytes)")
