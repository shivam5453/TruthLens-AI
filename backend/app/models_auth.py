from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# ============================================================
# AUTH & USER MODELS
# ============================================================

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=60, description="Full Name")
    email: str = Field(..., pattern=EMAIL_REGEX, description="User Email Address")
    password: str = Field(..., min_length=6, max_length=128, description="Password (min 6 characters)")


class UserLoginRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX, description="User Email Address")
    password: str = Field(..., description="Password")


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str = "user"  # "user" | "admin"
    created_at: Optional[str] = None
    is_active: bool = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class BootstrapAdminRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)
    secret: str
    password: Optional[str] = None


# ============================================================
# SAVED ANALYSES MODELS
# ============================================================

class SaveAnalysisRequest(BaseModel):
    analysis_id: str
    notes: Optional[str] = ""


class SavedAnalysisResponse(BaseModel):
    id: str
    user_id: str
    analysis_id: str
    title: str
    label: str
    risk_level: str
    confidence: float
    notes: Optional[str] = ""
    created_at: Optional[str] = None
    saved_at: Optional[str] = None


# ============================================================
# EVIDENCE RETRIEVAL MODELS
# ============================================================

class EvidenceItem(BaseModel):
    title: str
    source_name: str
    source: Optional[str] = None
    url: str
    published_at: Optional[str] = None
    published: Optional[str] = None
    snippet: str
    evidence_type: str = "related"  # "supporting" | "contradicting" | "related" | "unknown"
    status: Optional[str] = None
    relevance_score: Optional[float] = None


class EvidenceSummary(BaseModel):
    status: str = "unavailable"  # "supporting" | "contradicting" | "related" | "insufficient" | "unavailable"
    query: str = ""
    queries_used: List[str] = []
    message: str = ""
    corroboration_notes: str = ""
    total_found: int = 0
    items: List[EvidenceItem] = []
    sources: List[EvidenceItem] = []


# ============================================================
# ADMIN MODELS
# ============================================================

class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AdminStatsResponse(BaseModel):
    total_users: int = 0
    total_analyses: int = 0
    likely_genuine_count: int = 0
    potentially_fake_count: int = 0
    high_risk_count: int = 0
    avg_confidence: float = 0.0
    total_saved: int = 0
