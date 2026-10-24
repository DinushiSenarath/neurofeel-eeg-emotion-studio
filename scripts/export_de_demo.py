#!/usr/bin/env python3
"""
NeuroFeel v1.1 step: export DE features for the 3 demo subjects only.

Run this in a Kaggle notebook with the faced-de-trials dataset attached
(the same dataset Dinushi's model notebooks use), or anywhere the file
faced_de_trials.npz is available.

It writes de_demo_subjects.json next to the notebook working folder.
Send that one small file back, do NOT push it to a public repo yet: FACED
Synapse terms must be checked before subject level feature values are
published on a website.

Data layout, from Dinushi's own dataset creation notebook (02):
  X shape (3444, 30, 32, 5) = trials, segments, channels, bands
  keys: X, y, subject_ids, video_indices, emotion_text, class_names
  bands in order: Delta, Theta, Alpha, Beta, Gamma
  class order: Anger, Disgust, Fear, Sadness, Neutral, Amusement,
               Inspiration, Joy, Tenderness

For the heatmap the app needs, per trial, the DE values averaged over the
30 segments, giving one 32 channels by 5 bands matrix per trial. Values are
the raw saved DE values, unnormalised, exactly as in the npz. The site
labels them that way.
"""
import json
from pathlib import Path
import numpy as np

DEMO_SUBJECTS = [45, 107, 86]  # strong, median, hard in the v1 explorer
BANDS = ["Delta", "Theta", "Alpha", "Beta", "Gamma"]

candidates = list(Path("/kaggle/input").rglob("faced_de_trials.npz")) if Path("/kaggle/input").exists() else []
candidates += list(Path(".").rglob("faced_de_trials.npz"))
assert candidates, "faced_de_trials.npz not found. Attach the faced-de-trials dataset to this notebook first."
path = candidates[0]
print("using:", path)

data = np.load(path, allow_pickle=True)
X, y = data["X"], data["y"]
subject_ids, video_indices = data["subject_ids"], data["video_indices"]
class_names = [str(c) for c in data["class_names"]]
print("X shape:", X.shape, "| classes:", class_names)
assert X.shape[1:] == (30, 32, 5), f"unexpected trial shape {X.shape}"

out = {"bands": BANDS, "channels": list(range(1, 33)), "subjects": {}}
for subj in DEMO_SUBJECTS:
    rows = []
    idxs = np.where(subject_ids == subj)[0]
    assert len(idxs) == 28, f"subject {subj}: expected 28 trials, found {len(idxs)}"
    for idx in sorted(idxs, key=lambda i: int(video_indices[i])):
        trial = X[idx]  # (30, 32, 5)
        heat = trial.mean(axis=0)  # (32, 5), mean DE over the 30 segments
        rows.append({
            "video": int(video_indices[idx]),
            "true": class_names[int(y[idx])],
            "deMeanOverSegments": [[round(float(v), 4) for v in row] for row in heat],
        })
    out["subjects"][str(subj)] = rows
    print(f"subject {subj}: {len(rows)} trials exported")

out_path = Path("de_demo_subjects.json")
out_path.write_text(json.dumps(out))
print("wrote", out_path, f"({out_path.stat().st_size / 1024:.0f} KB). Download this file and send it back in chat.")
