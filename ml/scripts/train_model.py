"""
TruthLens AI
Fake News Detection - Model Training Pipeline

Dataset:
data/train (1).csv

Labels:
0 = Fake
1 = Real
"""

import os
import re
import json
import joblib
import warnings

import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)

warnings.filterwarnings("ignore")


# ============================================================
# 1. PATHS
# ============================================================

BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)

DATA_PATH = os.path.join(
    BASE_DIR, "data", "train (1).csv"
)

MODEL_DIR = os.path.join(
    BASE_DIR, "ml", "models"
)

REPORT_DIR = os.path.join(
    BASE_DIR, "ml", "reports"
)

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)


# ============================================================
# 2. TEXT CLEANING
# ============================================================

def clean_text(text):
    """
    Basic NLP preprocessing.
    """

    if pd.isna(text):
        return ""

    text = str(text)

    # Remove HTML
    text = re.sub(r"<[^>]+>", " ", text)

    # Remove URLs
    text = re.sub(
        r"http\S+|www\S+|https\S+",
        " ",
        text
    )

    # Convert to lowercase
    text = text.lower()

    # Remove email addresses
    text = re.sub(
        r"\S+@\S+",
        " ",
        text
    )

    # Keep alphabetic characters
    text = re.sub(
        r"[^a-z\s]",
        " ",
        text
    )

    # Remove extra spaces
    text = re.sub(
        r"\s+",
        " ",
        text
    ).strip()

    return text


# ============================================================
# 3. LOAD DATASET
# ============================================================

print("\n" + "=" * 70)
print("TRUTHLENS AI - FAKE NEWS DETECTION")
print("=" * 70)

print("\n[1/7] Loading dataset...")

df = pd.read_csv(DATA_PATH)

print(f"Dataset shape: {df.shape}")
print(f"Columns: {df.columns.tolist()}")


# ============================================================
# 4. DATA VALIDATION
# ============================================================

required_columns = ["title", "text", "label"]

for column in required_columns:
    if column not in df.columns:
        raise ValueError(
            f"Required column '{column}' not found in dataset."
        )

print("\nLabel distribution:")
print(df["label"].value_counts().sort_index())


# ============================================================
# 5. DATA CLEANING
# ============================================================

print("\n[2/7] Cleaning and preparing text...")

# Remove missing rows
df = df.dropna(
    subset=["title", "text", "label"]
).copy()

# Remove duplicate articles
before = len(df)

df = df.drop_duplicates(
    subset=["title", "text"]
)

after = len(df)

print(f"Removed duplicates: {before - after}")
print(f"Records after cleaning: {len(df)}")


# Combine title + article body
df["content"] = (
    df["title"].astype(str)
    + " "
    + df["text"].astype(str)
)

print("\n[3/7] Applying NLP preprocessing...")

df["content"] = df["content"].apply(clean_text)

# Remove empty records
df = df[df["content"].str.len() > 20].copy()

print(f"Usable records: {len(df)}")


# ============================================================
# 6. FEATURES + TARGET
# ============================================================

X = df["content"]
y = df["label"].astype(int)


# ============================================================
# 7. TRAIN / VALIDATION SPLIT
# ============================================================

print("\n[4/7] Creating train/validation split...")

X_train, X_valid, y_train, y_valid = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print(f"Training samples:   {len(X_train)}")
print(f"Validation samples: {len(X_valid)}")


# ============================================================
# 8. TF-IDF FEATURE EXTRACTION
# ============================================================

print("\n[5/7] Creating TF-IDF features...")

vectorizer = TfidfVectorizer(
    max_features=100000,
    ngram_range=(1, 2),
    min_df=2,
    max_df=0.95,
    sublinear_tf=True,
    strip_accents="unicode"
)

X_train_tfidf = vectorizer.fit_transform(X_train)

X_valid_tfidf = vectorizer.transform(X_valid)

print(
    f"TF-IDF training matrix: "
    f"{X_train_tfidf.shape}"
)

print(
    f"TF-IDF validation matrix: "
    f"{X_valid_tfidf.shape}"
)


# ============================================================
# 9. DEFINE MODELS
# ============================================================

models = {

    "Logistic Regression": LogisticRegression(
        max_iter=1000,
        C=2.0,
        class_weight="balanced",
        random_state=42
    ),

    "Multinomial Naive Bayes": MultinomialNB(
        alpha=0.1
    ),

    "Linear SVM": LinearSVC(
        C=1.5,
        class_weight="balanced",
        random_state=42,
        max_iter=5000
    )
}


# ============================================================
# 10. TRAIN + EVALUATE
# ============================================================

print("\n[6/7] Training and evaluating models...")
print("=" * 70)

results = {}

best_model_name = None
best_model = None
best_f1 = -1


for name, model in models.items():

    print(f"\nTraining: {name}")

    model.fit(
        X_train_tfidf,
        y_train
    )

    predictions = model.predict(
        X_valid_tfidf
    )

    accuracy = accuracy_score(
        y_valid,
        predictions
    )

    precision = precision_score(
        y_valid,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        y_valid,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        y_valid,
        predictions,
        zero_division=0
    )

    cm = confusion_matrix(
        y_valid,
        predictions
    )

    results[name] = {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "confusion_matrix": cm.tolist()
    }

    print(
        f"Accuracy : {accuracy:.4f}"
    )

    print(
        f"Precision: {precision:.4f}"
    )

    print(
        f"Recall   : {recall:.4f}"
    )

    print(
        f"F1 Score : {f1:.4f}"
    )

    print("Confusion Matrix:")
    print(cm)

    if f1 > best_f1:
        best_f1 = f1
        best_model_name = name
        best_model = model


# ============================================================
# 11. SAVE BEST MODEL
# ============================================================

print("\n" + "=" * 70)
print(f"BEST MODEL: {best_model_name}")
print(f"BEST F1 SCORE: {best_f1:.4f}")
print("=" * 70)

print("\n[7/7] Saving production model...")


model_path = os.path.join(
    MODEL_DIR,
    "truthlens_model.pkl"
)

vectorizer_path = os.path.join(
    MODEL_DIR,
    "tfidf_vectorizer.pkl"
)

metadata_path = os.path.join(
    MODEL_DIR,
    "model_metadata.json"
)


joblib.dump(
    best_model,
    model_path
)

joblib.dump(
    vectorizer,
    vectorizer_path
)


# ============================================================
# 12. SAVE METRICS
# ============================================================

metrics_path = os.path.join(
    REPORT_DIR,
    "model_metrics.json"
)

with open(
    metrics_path,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        {
            "dataset": {
                "total_records": int(len(df)),
                "training_records": int(len(X_train)),
                "validation_records": int(len(X_valid))
            },

            "label_mapping": {
                "0": "Fake",
                "1": "Real"
            },

            "best_model": best_model_name,

            "models": results
        },
        file,
        indent=4
    )


# ============================================================
# 13. SAVE MODEL METADATA
# ============================================================

metadata = {
    "project": "TruthLens AI",
    "task": "Fake News Detection",
    "best_model": best_model_name,
    "label_mapping": {
        "0": "Fake",
        "1": "Real"
    },
    "vectorizer": {
        "type": "TF-IDF",
        "ngram_range": [1, 2],
        "max_features": 100000,
        "min_df": 2
    }
}

with open(
    metadata_path,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        metadata,
        file,
        indent=4
    )


# ============================================================
# 14. SAVE COMPARISON CSV
# ============================================================

comparison_rows = []

for model_name, metrics in results.items():

    comparison_rows.append({
        "Model": model_name,
        "Accuracy": metrics["accuracy"],
        "Precision": metrics["precision"],
        "Recall": metrics["recall"],
        "F1 Score": metrics["f1_score"]
    })


comparison_df = pd.DataFrame(
    comparison_rows
)

comparison_df = comparison_df.sort_values(
    by="F1 Score",
    ascending=False
)

comparison_path = os.path.join(
    REPORT_DIR,
    "model_comparison.csv"
)

comparison_df.to_csv(
    comparison_path,
    index=False
)


# ============================================================
# 15. FINAL OUTPUT
# ============================================================

print("\n" + "=" * 70)
print("TRAINING COMPLETED SUCCESSFULLY")
print("=" * 70)

print("\nModel comparison:")
print(comparison_df.to_string(index=False))

print("\nSaved files:")

print(f"Model       : {model_path}")
print(f"Vectorizer  : {vectorizer_path}")
print(f"Metadata    : {metadata_path}")
print(f"Metrics     : {metrics_path}")
print(f"Comparison  : {comparison_path}")

print("\nTruthLens AI ML engine is ready! 🚀")