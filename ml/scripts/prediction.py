import os
import re
import joblib


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)

MODEL_PATH = os.path.join(
    BASE_DIR, "ml", "models", "truthlens_model.pkl"
)

VECTORIZER_PATH = os.path.join(
    BASE_DIR, "ml", "models", "tfidf_vectorizer.pkl"
)


# ============================================================
# LOAD TRAINED MODEL
# ============================================================

model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)


# ============================================================
# TEXT PREPROCESSING
# ============================================================

def clean_text(text):
    if text is None:
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

    # Lowercase
    text = text.lower()

    # Remove emails
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
# PREDICTION FUNCTION
# ============================================================

def predict_news(title="", text=""):

    # Combine title and article
    content = f"{title} {text}"

    cleaned_content = clean_text(content)

    if len(cleaned_content) < 10:
        raise ValueError(
            "Please provide a meaningful news headline or article."
        )

    # Convert text to TF-IDF
    features = vectorizer.transform(
        [cleaned_content]
    )

    # Prediction
    prediction = int(
        model.predict(features)[0]
    )

    # LinearSVC provides decision score
    decision_score = float(
        model.decision_function(features)[0]
    )

    # Convert margin into an easy-to-display
    # confidence-like score.
    # This is NOT a calibrated probability.
    confidence = (
        1 / (1 + __import__("math").exp(-abs(decision_score)))
    ) * 100

    if prediction == 1:
        label = "Likely Genuine"
        risk = "Low Risk"
    else:
        label = "Potentially Fake"
        risk = "High Risk"

    return {
        "prediction": prediction,
        "label": label,
        "risk_level": risk,
        "confidence": round(confidence, 2),
        "decision_score": round(decision_score, 4)
    }


# ============================================================
# TERMINAL TEST MODE
# ============================================================

if __name__ == "__main__":

    print("\n" + "=" * 60)
    print("TRUTHLENS AI - NEWS ANALYZER")
    print("=" * 60)

    title = input("\nEnter news headline: ").strip()

    text = input(
        "\nEnter article text "
        "(press Enter if headline only): "
    ).strip()

    try:

        result = predict_news(
            title=title,
            text=text
        )

        print("\n" + "-" * 60)
        print("ANALYSIS RESULT")
        print("-" * 60)

        print(
            f"Prediction  : {result['label']}"
        )

        print(
            f"Risk Level  : {result['risk_level']}"
        )

        print(
            f"Confidence  : {result['confidence']}%"
        )

        print(
            f"Model Score : {result['decision_score']}"
        )

        print("-" * 60)

    except Exception as error:

        print(
            f"\nError: {error}"
        )