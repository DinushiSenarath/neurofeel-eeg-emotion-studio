# NeuroFeel: EEG Emotion Studio

A web platform that makes a DE feature based EEG emotion recognition model usable without notebooks.

**Problem.** EEG emotion recognition research lives inside Kaggle notebooks. Only the person who wrote the code can run it, change a subject, or check a result. A student starting a biomedical signal processing project, or a supervisor at a review, cannot explore the model in a browser.

**What this site does.** Pick a demo subject and walk through its 28 trials with true and predicted labels, or read the full evaluation of the final model: accuracy, macro F1, balanced accuracy and validation macro F1 across 3 seeds, per class precision, recall and F1, a pooled confusion matrix, all 123 per subject results, the ablation sequence and the paired statistical tests that decided the final model.

## Results (final model, nb22 recipe, strict LOSO on FACED)

- Accuracy 58.03% ± 0.60, macro F1 57.46% ± 0.59, balanced accuracy 58.64% ± 0.60, validation macro F1 58.52% ± 0.25, across seeds 42, 142, 242
- 3 seed majority vote ensemble 61.00%
- Weakest classes: Neutral 41.60%, Inspiration 46.79%. Strongest: Amusement 78.32%
- The CSCL SOTA figure of 65.98% on FACED was not beaten. It used a different protocol and raw EEG input, and that is stated wherever it is mentioned.

## Scope, stated honestly

The model input is Differential Entropy features released by FACED. The FACED authors recorded the EEG, filtered and downsampled it, and extracted the DE features. Dinushi's work was building the trial dataset from those features, per subject standardisation, model training and the full evaluation. No raw EEG processing is claimed anywhere in this project.

Predicted probabilities were not saved for the three seed runs, so predictions show true and predicted labels only. The demo explorer also shows a 32 by 5 DE heatmap per trial: each cell is the mean DE value over the trial's 30 segments, from `data/de_demo_subjects.json`, exported from faced_de_trials.npz for the 3 demo subjects only (subjects 45, 107, 86) with `scripts/export_de_demo.py`.

## Tech stack

Next.js, TypeScript, React, Tailwind CSS. Data is produced by a Python exporter from the original experiment CSV files. The v2 plan adds a FastAPI + PyTorch inference service for DE feature upload.

## Run it

```bash
npm install
npm run dev
```

Regenerate the data from the original experiment files (paths are set at the top of the script):

```bash
npm run export-data
```

The exporter checks every headline figure against the thesis final results table before writing `data/evaluation.json`, and stops if a figure does not match. The ensemble rule is stated in the script: per trial the class with the most votes wins, and when all three seeds differ the smallest class index wins, which reproduces the recorded 61.00% (2101 of 3444) exactly.

## Research use only

NeuroFeel is a research and education tool. It is not a medical device and it does not diagnose any person. FACED data is distributed through Synapse under its own terms. Besides aggregated results and saved prediction labels, this repo contains mean DE values for the 3 demo subjects only, in `data/de_demo_subjects.json`.
