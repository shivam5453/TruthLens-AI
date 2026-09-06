import os
import re
import urllib.parse
import xml.etree.ElementTree as ET
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

import httpx
from dotenv import load_dotenv
from .models_auth import EvidenceItem, EvidenceSummary

load_dotenv()


def get_evidence_timeout() -> float:
    """Read EVIDENCE_TIMEOUT from environment with a resilient 7.0-second fallback."""
    raw = os.getenv("EVIDENCE_TIMEOUT", "7.0")
    try:
        val = float(raw)
        return val if val > 0 else 7.0
    except (ValueError, TypeError):
        return 7.0


# ============================================================
# STOPWORDS & KEYWORD EXTRACTION
# ============================================================

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
    "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves", "shocking", "breaking", "banned", "revealed",
    "exposed", "must", "see", "viral", "unbelievable"
}

CONTRADICTION_SIGNALS = {
    "debunk", "debunked", "debunks", "false", "hoax", "fact check", "fact-check",
    "fake", "denies", "denied", "no evidence", "untrue", "misleading", "refutes",
    "refuted", "baseless", "fabricated", "unfounded", "myth", "debunking",
    "incorrect", "disproven", "scam", "rumor", "rumour"
}

SUPPORTING_SIGNALS = {
    "confirms", "confirmed", "announces", "announced", "official", "statement",
    "reports", "reported", "passes", "passed", "agrees", "verifies", "verified",
    "press release", "discovery", "researchers find", "agency confirms"
}


def extract_search_query(title: str, text: str) -> str:
    combined = f"{title} {text}".strip()
    # Normalize
    cleaned = re.sub(r"<[^>]+>", " ", combined)
    cleaned = re.sub(r"http\S+|www\S+", " ", cleaned)
    tokens = re.findall(r"\b[a-zA-Z0-9]{3,}\b", cleaned)

    filtered = [t for t in tokens if t.lower() not in STOPWORDS]
    # Take first 6-8 prominent keywords
    query_tokens = filtered[:7]
    if query_tokens:
        return " ".join(query_tokens)

    # Fallback to truncated cleaned headline
    return title.strip()[:60] if title.strip() else text.strip()[:60]


def classify_evidence_type(claim_text: str, item_title: str, snippet: str, ml_prediction: int) -> str:
    combined_evidence = f"{item_title} {snippet}".lower()

    # Check for strong contradiction / debunking keywords
    for signal in CONTRADICTION_SIGNALS:
        if signal in combined_evidence:
            return "contradicting"

    # Check for strong official confirmation keywords
    for signal in SUPPORTING_SIGNALS:
        if signal in combined_evidence:
            return "supporting"

    return "related"


# ============================================================
# PROVIDER ABSTRACTION
# ============================================================

class EvidenceProvider(ABC):
    @abstractmethod
    async def search(self, query: str) -> List[Dict[str, Any]]:
        pass


class GoogleNewsRSSProvider(EvidenceProvider):
    def __init__(self, timeout: Optional[float] = None):
        self.timeout = timeout if timeout is not None else get_evidence_timeout()

    async def search(self, query: str) -> List[Dict[str, Any]]:
        if not query or len(query.strip()) < 3:
            return []

        encoded_query = urllib.parse.quote_plus(query.strip())
        rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            resp = await client.get(rss_url, headers=headers)
            if resp.status_code != 200:
                return []

            root = ET.fromstring(resp.content)
            items = root.findall(".//item")

            results = []
            for item in items[:6]:
                title = item.findtext("title", "")
                link = item.findtext("link", "")
                pub_date = item.findtext("pubDate", "")
                source_elem = item.find("source")
                source_name = source_elem.text if source_elem is not None else "News Source"

                # Extract cleaned title without trailing source name suffix
                clean_title = re.sub(r" - [^-]+$", "", title).strip()

                # Clean snippet
                description = item.findtext("description", "")
                clean_snippet = re.sub(r"<[^>]+>", " ", description)
                clean_snippet = re.sub(r"\s+", " ", clean_snippet).strip()
                if not clean_snippet or clean_snippet == clean_title:
                    clean_snippet = f"Reporting by {source_name} on {clean_title}."

                if clean_title:
                    results.append({
                        "title": clean_title,
                        "source_name": source_name,
                        "url": link,
                        "published_at": pub_date[:22] if pub_date else "Recently",
                        "snippet": clean_snippet[:220],
                    })

            return results


# ============================================================
# MAIN RETRIEVAL SERVICE
# ============================================================

async def retrieve_live_evidence(
    title: str,
    text: str,
    ml_prediction: int = 1,
    prediction: Optional[int] = None,
    timeout: Optional[float] = None
) -> EvidenceSummary:
    if prediction is not None:
        ml_prediction = prediction

    query = extract_search_query(title, text)
    if not query or len(query.strip()) < 3:
        msg = "Content was too brief to generate a semantic evidence search query."
        return EvidenceSummary(
            status="insufficient",
            query=query,
            message=msg,
            corroboration_notes=msg,
            total_found=0,
            items=[],
            sources=[]
        )

    effective_timeout = timeout if timeout is not None else get_evidence_timeout()
    provider = GoogleNewsRSSProvider(timeout=effective_timeout)

    try:
        raw_items = await provider.search(query)

        if not raw_items:
            msg = "We could not find enough reliable current news sources to independently corroborate this specific claim."
            return EvidenceSummary(
                status="insufficient",
                query=query,
                message=msg,
                corroboration_notes=msg,
                total_found=0,
                items=[],
                sources=[]
            )

        evidence_items: List[EvidenceItem] = []
        contradicting_count = 0
        supporting_count = 0

        for it in raw_items:
            etype = classify_evidence_type(
                claim_text=f"{title} {text}",
                item_title=it["title"],
                snippet=it["snippet"],
                ml_prediction=ml_prediction
            )

            if etype == "contradicting":
                contradicting_count += 1
            elif etype == "supporting":
                supporting_count += 1

            evidence_items.append(EvidenceItem(
                title=it["title"],
                source_name=it["source_name"],
                url=it["url"],
                published_at=it.get("published_at"),
                snippet=it["snippet"],
                evidence_type=etype
            ))

        # Determine overall evidence status
        if contradicting_count > 0:
            status_val = "contradicting"
            msg = f"Found {contradicting_count} independent reporting source(s) indicating potential dispute, debunking, or refutation of related claims."
        elif supporting_count > 0:
            status_val = "supporting"
            msg = f"Found {supporting_count} corroborating reporting source(s) with related coverage."
        else:
            status_val = "supporting" if ml_prediction == 1 else "insufficient"
            msg = f"Retrieved {len(evidence_items)} related news article(s) covering the broader topic."

        return EvidenceSummary(
            status=status_val,
            query=query,
            message=msg,
            corroboration_notes=msg,
            total_found=len(evidence_items),
            items=evidence_items,
            sources=evidence_items
        )

    except Exception as e:
        print(f"Evidence retrieval warning: {e}")
        msg = "Live external evidence retrieval service is currently unavailable or timed out."
        return EvidenceSummary(
            status="unavailable",
            query=query,
            message=msg,
            corroboration_notes=msg,
            total_found=0,
            items=[],
            sources=[]
        )
