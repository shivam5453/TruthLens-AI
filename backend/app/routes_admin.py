import json
import csv
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId

from .auth import get_current_admin
from .models_auth import AdminStatsResponse, AdminUserUpdate, UserResponse
from .database import (
    users_collection,
    analysis_collection,
    saved_collection,
    admin_logs_collection,
    test_database_connection
)

router = APIRouter(prefix="/api/admin", tags=["Admin Intelligence"])

BASE_DIR = Path(__file__).resolve().parents[2]


# ============================================================
# ADMIN PLATFORM STATS
# ============================================================

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(admin_user: Dict[str, Any] = Depends(get_current_admin)):
    total_users = 0
    total_analyses = 0
    genuine_count = 0
    fake_count = 0
    high_risk_count = 0
    avg_conf = 0.0
    total_saved = 0

    if users_collection is not None:
        try:
            total_users = users_collection.count_documents({})
        except Exception:
            pass

    if saved_collection is not None:
        try:
            total_saved = saved_collection.count_documents({})
        except Exception:
            pass

    if analysis_collection is not None:
        try:
            total_analyses = analysis_collection.count_documents({})
            genuine_count = analysis_collection.count_documents({"prediction": 1})
            fake_count = analysis_collection.count_documents({"prediction": 0})
            high_risk_count = analysis_collection.count_documents({"risk_level": "High Risk"})

            pipeline = [{"$group": {"_id": None, "avg_conf": {"$avg": "$confidence"}}}]
            agg = list(analysis_collection.aggregate(pipeline))
            if agg and "avg_conf" in agg[0]:
                avg_conf = round(float(agg[0]["avg_conf"]), 1)
        except Exception as e:
            print(f"Admin stats error: {e}")

    return AdminStatsResponse(
        total_users=total_users,
        total_analyses=total_analyses,
        likely_genuine_count=genuine_count,
        potentially_fake_count=fake_count,
        high_risk_count=high_risk_count,
        avg_confidence=avg_conf,
        total_saved=total_saved
    )


# ============================================================
# USER MANAGEMENT
# ============================================================

@router.get("/users")
def list_users(admin_user: Dict[str, Any] = Depends(get_current_admin)):
    if users_collection is None:
        return {"success": False, "count": 0, "users": []}

    try:
        users = list(users_collection.find({}, {"password_hash": 0}).sort("created_at", -1).limit(200))
        formatted = []
        for u in users:
            created = u.get("created_at")
            formatted.append({
                "id": str(u["_id"]),
                "name": u.get("name", ""),
                "email": u.get("email", ""),
                "role": u.get("role", "user"),
                "is_active": u.get("is_active", True),
                "created_at": created.isoformat() if isinstance(created, datetime) else str(created or "")
            })

        return {"success": True, "count": len(formatted), "users": formatted}
    except Exception as e:
        print(f"Error listing users: {e}")
        return {"success": False, "count": 0, "users": []}


@router.patch("/users/{target_id}")
def update_user_status(target_id: str, update: AdminUserUpdate, admin_user: Dict[str, Any] = Depends(get_current_admin)):
    if users_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    filter_q = {"_id": ObjectId(target_id)} if ObjectId.is_valid(target_id) else {"_id": target_id}
    target = users_collection.find_one(filter_q)

    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    if str(target["_id"]) == admin_user["id"] and update.role == "user":
        raise HTTPException(status_code=400, detail="You cannot demote your own admin account.")

    update_fields: Dict[str, Any] = {}
    if update.role is not None:
        if update.role not in ["user", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role. Must be 'user' or 'admin'.")
        update_fields["role"] = update.role

    if update.is_active is not None:
        if str(target["_id"]) == admin_user["id"] and not update.is_active:
            raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")
        update_fields["is_active"] = update.is_active

    if update_fields:
        users_collection.update_one(filter_q, {"$set": update_fields})

    return {"success": True, "message": "User updated successfully."}


@router.delete("/users/{target_id}")
def delete_user(target_id: str, admin_user: Dict[str, Any] = Depends(get_current_admin)):
    if users_collection is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    if target_id == admin_user["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account.")

    filter_q = {"_id": ObjectId(target_id)} if ObjectId.is_valid(target_id) else {"_id": target_id}
    res = users_collection.delete_one(filter_q)

    if res.deleted_count > 0:
        return {"success": True, "message": "User account removed."}

    raise HTTPException(status_code=404, detail="User not found.")


# ============================================================
# GLOBAL AUDIT HISTORY
# ============================================================

@router.get("/history")
def get_global_history(admin_user: Dict[str, Any] = Depends(get_current_admin)):
    if analysis_collection is None:
        return {"success": False, "count": 0, "history": []}

    try:
        records = list(analysis_collection.find({}).sort("created_at", -1).limit(100))
        formatted = []
        for r in records:
            created = r.get("created_at")
            formatted.append({
                "id": str(r["_id"]),
                "title": r.get("title", ""),
                "text": r.get("text", "")[:120],
                "prediction": r.get("prediction", 0),
                "label": r.get("label", "Potentially Fake"),
                "risk_level": r.get("risk_level", "High Risk"),
                "confidence": r.get("confidence", 0.0),
                "user_id": r.get("user_id", "guest"),
                "created_at": created.isoformat() if isinstance(created, datetime) else str(created or ""),
                "database_saved": True
            })

        return {"success": True, "count": len(formatted), "history": formatted}
    except Exception as e:
        print(f"Global history error: {e}")
        return {"success": False, "count": 0, "history": []}


# ============================================================
# ADMIN ML MODEL DETAILS & BENCHMARK REPORTS
# ============================================================

@router.get("/model-details")
def get_admin_model_details(admin_user: Dict[str, Any] = Depends(get_current_admin)):
    meta_path = BASE_DIR / "ml" / "models" / "model_metadata.json"
    metrics_path = BASE_DIR / "ml" / "reports" / "model_metrics.json"
    comp_path = BASE_DIR / "ml" / "reports" / "model_comparison.csv"

    metadata = {}
    metrics = {}
    comparison = []

    if meta_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        except Exception:
            pass

    if metrics_path.exists():
        try:
            with open(metrics_path, "r", encoding="utf-8") as f:
                metrics = json.load(f)
        except Exception:
            pass

    if comp_path.exists():
        try:
            with open(comp_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                comparison = [row for row in reader]
        except Exception:
            pass

    return {
        "success": True,
        "active_model": "Linear SVM",
        "model_architecture": "Linear SVM",
        "vectorizer": "TF-IDF (100,000 features)",
        "features": 100000,
        "validation_metrics": {
            "accuracy": 0.9967,
            "precision": 0.9956,
            "recall": 0.9982,
            "f1_score": 0.9969
        },
        "metadata": metadata,
        "metrics": metrics,
        "comparison": comparison
    }


# ============================================================
# SYSTEM HEALTH (DETAILED)
# ============================================================

@router.get("/health")
def get_admin_system_health(admin_user: Dict[str, Any] = Depends(get_current_admin)):
    from .main import model, vectorizer

    db_ok = test_database_connection()
    model_ok = model is not None
    vec_ok = vectorizer is not None

    users_count = users_collection.count_documents({}) if users_collection is not None else 0
    analysis_count = analysis_collection.count_documents({}) if analysis_collection is not None else 0
    saved_count = saved_collection.count_documents({}) if saved_collection is not None else 0

    return {
        "status": "operational" if (db_ok and model_ok and vec_ok) else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "ml_model": {"status": "loaded" if model_ok else "missing", "name": "Linear SVM"},
            "vectorizer": {"status": "loaded" if vec_ok else "missing", "features": 100000},
            "database": {"status": "connected" if db_ok else "disconnected", "database_name": "truthlens"},
            "evidence_retrieval": {"status": "active", "provider": "GoogleNewsRSSProvider"}
        },
        "counts": {
            "users": users_count,
            "analyses": analysis_count,
            "saved_analyses": saved_count
        }
    }
