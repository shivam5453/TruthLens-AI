import os
from pathlib import Path
import re
import math
import joblib
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from bson import ObjectId

from .database import analysis_collection, test_database_connection


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BASE_DIR / "ml" / "models" / "truthlens_model.pkl"
VECTORIZER_PATH = BASE_DIR / "ml" / "models" / "tfidf_vectorizer.pkl"


# ============================================================
# LOAD ML COMPONENTS
# ============================================================

try:
    model = joblib.load(MODEL_PATH)
except Exception as e:
    model = None
    print(f"Error loading model from {MODEL_PATH}: {e}")

try:
    vectorizer = joblib.load(VECTORIZER_PATH)
except Exception as e:
    vectorizer = None
    print(f"Error loading vectorizer from {VECTORIZER_PATH}: {e}")


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="TruthLens AI API",
    description="AI-powered fake news detection and credibility risk analysis API",
    version="1.0.0"
)


# ============================================================
# CORS CONFIGURATION (PRODUCTION-READY)
# ============================================================

# Default development origins
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# Support configured production frontend URLs via FRONTEND_URL env variable
frontend_url_env = os.getenv("FRONTEND_URL")
if frontend_url_env:
    for origin in frontend_url_env.split(","):
        cleaned_origin = origin.strip().rstrip("/")
        if cleaned_origin and cleaned_origin not in allowed_origins:
            allowed_origins.append(cleaned_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if frontend_url_env != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST MODEL
# ============================================================

class NewsRequest(BaseModel):
    title: str = ""
    text: str = ""


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text: str) -> str:
    if text is None:
        return ""

    text = str(text)

    # Remove HTML tags
    text = re.sub(r"<[^>]+>", " ", text)

    # Remove URLs
    text = re.sub(
        r"http\S+|www\S+|https\S+",
        " ",
        text
    )

    # Lowercase
    text = text.lower()

    # Remove email addresses
    text = re.sub(
        r"\S+@\S+",
        " ",
        text
    )

    # Keep only alphabetic characters and spaces
    text = re.sub(
        r"[^a-z\s]",
        " ",
        text
    )

    # Normalize whitespace
    text = re.sub(
        r"\s+",
        " ",
        text
    ).strip()

    return text


def get_assessment_guidance(prediction: int, risk_level: str, confidence: float):
    if prediction == 1:
        explanation = (
            "The linguistic and stylistic patterns in this content align closely with "
            "established genuine journalistic writing patterns found in the project's training dataset."
        )
        recommendation = (
            "The content presents lower risk indicators, but verifying key facts with primary sources "
            "or recognized authorities is always good practice."
        )
    else:
        explanation = (
            "The content exhibits linguistic cues, hyperbole, or structural patterns frequently "
            "associated with unverified or misleading news in the project's training data."
        )
        recommendation = (
            "Verify the central claims with credible, independent news organizations before sharing "
            "or relying upon this story."
        )
    return explanation, recommendation


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():
    return {
        "status": "online",
        "project": "TruthLens AI",
        "message": "TruthLens AI API is running",
        "version": "1.0.0"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():
    db_ok = test_database_connection()
    model_ok = model is not None and vectorizer is not None

    return {
        "status": "healthy" if (db_ok and model_ok) else "degraded",
        "model_loaded": model is not None,
        "vectorizer_loaded": vectorizer is not None,
        "database_connected": db_ok,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ============================================================
# MODEL INFO
# ============================================================

@app.get("/api/model-info")
def model_info():
    return {
        "model": "Linear SVM",
        "vectorizer": "TF-IDF",
        "labels": {
            "0": "Fake",
            "1": "Real"
        },
        "task": "Fake News Detection",
        "validation_metrics": {
            "accuracy": 0.9967,
            "precision": 0.9956,
            "recall": 0.9982,
            "f1_score": 0.9969
        },
        "note": "Performance metrics are based on validation data from the project dataset and do not guarantee real-world truth verification."
    }


# ============================================================
# AGGREGATED STATS (FROM REAL MONGODB DATA)
# ============================================================

@app.get("/api/stats")
def get_stats():
    try:
        total = analysis_collection.count_documents({})
        if total == 0:
            return {
                "success": True,
                "total_analyses": 0,
                "likely_genuine_count": 0,
                "potentially_fake_count": 0,
                "high_risk_count": 0,
                "avg_confidence": 0.0
            }

        genuine = analysis_collection.count_documents({"prediction": 1})
        fake = analysis_collection.count_documents({"prediction": 0})
        high_risk = analysis_collection.count_documents({"risk_level": "High Risk"})

        # Compute average confidence via aggregation pipeline
        pipeline = [
            {"$group": {"_id": None, "avg_conf": {"$avg": "$confidence"}}}
        ]
        agg_result = list(analysis_collection.aggregate(pipeline))
        avg_conf = round(agg_result[0]["avg_conf"], 1) if agg_result and "avg_conf" in agg_result[0] else 0.0

        return {
            "success": True,
            "total_analyses": total,
            "likely_genuine_count": genuine,
            "potentially_fake_count": fake,
            "high_risk_count": high_risk,
            "avg_confidence": avg_conf
        }
    except Exception as e:
        print(f"Stats retrieval error: {e}")
        return {
            "success": False,
            "total_analyses": 0,
            "likely_genuine_count": 0,
            "potentially_fake_count": 0,
            "high_risk_count": 0,
            "avg_confidence": 0.0,
            "error": "Real-time statistics temporarily unavailable."
        }


# ============================================================
# NEWS ANALYSIS
# ============================================================

@app.post("/api/analyze")
def analyze_news(request: NewsRequest):
    if model is None or vectorizer is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Machine learning models are not loaded. Check server configuration."
        )

    combined_text = f"{request.title} {request.text}"
    cleaned = clean_text(combined_text)

    if len(cleaned) < 10:
        return {
            "success": False,
            "error": "Please provide a meaningful headline or article content (minimum 10 characters)."
        }

    # ========================================================
    # TF-IDF TRANSFORMATION
    # ========================================================
    features = vectorizer.transform([cleaned])

    # ========================================================
    # MODEL PREDICTION & MARGIN SCORE
    # ========================================================
    prediction = int(model.predict(features)[0])
    decision_score = float(model.decision_function(features)[0])

    # ========================================================
    # DISPLAY-ORIENTED CONFIDENCE
    # (Sigmoidal mapping of SVM margin; not a calibrated probability)
    # ========================================================
    confidence = (
        1 / (1 + math.exp(-abs(decision_score)))
    ) * 100

    # ========================================================
    # RESULT LABELS
    # ========================================================
    if prediction == 1:
        label = "Likely Genuine"
        risk_level = "Low Risk"
    else:
        label = "Potentially Fake"
        risk_level = "High Risk"

    explanation, recommendation = get_assessment_guidance(
        prediction=prediction,
        risk_level=risk_level,
        confidence=confidence
    )

    # ========================================================
    # SAVE ANALYSIS TO MONGODB (GRACEFUL FALLBACK)
    # ========================================================
    analysis_record = {
        "title": request.title.strip(),
        "text": request.text.strip(),
        "prediction": prediction,
        "label": label,
        "risk_level": risk_level,
        "confidence": round(confidence, 2),
        "decision_score": round(decision_score, 4),
        "created_at": datetime.now(timezone.utc)
    }

    database_saved = False
    record_id = None
    try:
        insert_res = analysis_collection.insert_one(analysis_record)
        database_saved = True
        record_id = str(insert_res.inserted_id)
    except Exception as e:
        print(f"MongoDB save warning: {e}")
        database_saved = False

    # ========================================================
    # API RESPONSE
    # ========================================================
    return {
        "success": True,
        "id": record_id,
        "prediction": prediction,
        "label": label,
        "risk_level": risk_level,
        "confidence": round(confidence, 2),
        "decision_score": round(decision_score, 4),
        "explanation": explanation,
        "recommendation": recommendation,
        "database_saved": database_saved,
        "disclaimer": (
            "TruthLens AI provides an automated assessment based on learned patterns from training data. "
            "It does not independently verify facts or guarantee the truthfulness of a claim."
        )
    }


# ============================================================
# ANALYSIS HISTORY
# ============================================================

@app.get("/api/history")
def get_history():
    try:
        records = list(
            analysis_collection
            .find({})
            .sort("created_at", -1)
            .limit(50)
        )

        formatted_records = []
        for record in records:
            item_id = str(record.get("_id", ""))
            created_at_val = record.get("created_at")
            if isinstance(created_at_val, datetime):
                iso_date = created_at_val.isoformat()
            elif created_at_val:
                iso_date = str(created_at_val)
            else:
                iso_date = None

            formatted_records.append({
                "id": item_id,
                "_id": item_id,
                "title": record.get("title", ""),
                "text": record.get("text", ""),
                "prediction": record.get("prediction", 0),
                "label": record.get("label", "Potentially Fake"),
                "risk_level": record.get("risk_level", "High Risk"),
                "confidence": record.get("confidence", 0.0),
                "created_at": iso_date
            })

        return {
            "success": True,
            "count": len(formatted_records),
            "history": formatted_records
        }

    except Exception as e:
        print(f"History fetch error: {e}")
        return {
            "success": False,
            "count": 0,
            "history": [],
            "error": "Unable to fetch analysis history from database."
        }


# ============================================================
# DELETE HISTORY ITEM
# ============================================================

@app.delete("/api/history/{item_id}")
def delete_history_item(item_id: str):
    try:
        filter_query = None
        if ObjectId.is_valid(item_id):
            filter_query = {"_id": ObjectId(item_id)}
        else:
            filter_query = {"_id": item_id}

        result = analysis_collection.delete_one(filter_query)

        if result.deleted_count > 0:
            return {
                "success": True,
                "message": "Analysis record deleted successfully.",
                "deleted_id": item_id
            }
        else:
            return {
                "success": False,
                "message": "Record not found.",
                "deleted_id": item_id
            }
    except Exception as e:
        print(f"Delete history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting record: {e}"
        )