import asyncio
import html
import os
import re
import urllib.parse
import xml.etree.ElementTree as ET
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Set

import httpx
from dotenv import load_dotenv
from .models_auth import EvidenceItem, EvidenceSummary

load_dotenv()


def sanitize_text(text: str) -> str:
    """Strip HTML tags, decode HTML entities, normalize quotes and whitespace."""
    if not text:
        return ""
    # Strip XML/HTML tags
    clean = re.sub(r"<[^>]+>", " ", text)
    # Decode HTML entities (double-pass handles doubly-escaped entities like &amp;nbsp;)
    for _ in range(2):
        clean = html.unescape(clean)
    # Replace non-breaking spaces (\xa0) with standard spaces
    clean = clean.replace("\xa0", " ")
    # Normalize common typographic punctuation and quotes
    clean = clean.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    # Clean Unicode replacement char or malformed characters
    clean = clean.replace("\ufffd", "'")
    # Collapse multiple whitespace
    return re.sub(r"\s+", " ", clean).strip()


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
    "exposed", "must", "see", "viral", "unbelievable",
    "new", "called", "can", "sensational", "allows", "also"
}

CONTRADICTION_SIGNALS = {
    "debunk", "debunked", "debunks", "false", "hoax", "fact check", "fact-check",
    "factcheck", "fake", "denies", "denied", "no evidence", "untrue", "misleading",
    "refutes", "refuted", "baseless", "fabricated", "unfounded", "myth", "debunking",
    "incorrect", "disproven", "scam", "rumor", "rumour", "conspiracy theory",
    "unsubstantiated", "pseudoscience", "unproven", "not true", "discredited"
}

SUPPORTING_SIGNALS = {
    "confirms", "confirmed", "announces", "announced", "official", "statement",
    "reports", "reported", "passes", "passed", "agrees", "verifies", "verified",
    "press release", "discovery", "researchers find", "agency confirms", "successful",
    "successfully", "landed", "launched", "approved", "certifies", "certified",
    "milestone", "authorities confirm", "finds", "found", "discovers", "discovered",
    "detects", "detected", "reveals", "revealed", "analyzes", "analyzed",
    "surveys", "surveyed", "collects", "collected",
    "samples", "drives", "driven", "snaps", "images", "photographs"
}

TRUSTED_DOMAINS = {
    "nasa.gov", "jpl.nasa.gov", "space.com", "reuters.com", "apnews.com", "bbc.com",
    "scientificamerican.com", "nature.com", "scmp.com", "bloomberg.com", "wsj.com",
    "nytimes.com", "snopes.com", "politifact.com", "factcheck.org", "thehindu.com",
    "sciencedaily.com", "afp.com", "nationalgeographic.com", "pbs.org", "wbur.org",
    "aljazeera.com", "newscientist.com", "phys.org"
}

STEM_MAP = {
    "thoughts": "thought", "reading": "read", "reads": "read", "minds": "mind",
    "mindwaves": "mindwave", "dreams": "dream", "dreaming": "dream",
    "towers": "tower", "landed": "land", "landing": "land", "lands": "land",
    "missions": "mission", "rovers": "rover", "crewed": "crew", "lunar": "moon",
    "exploring": "explore", "explored": "explore", "explores": "explore", "exploration": "explore",
    "studying": "study", "studies": "study", "studied": "study",
    "geological": "geology", "geologist": "geology", "geologic": "geology",
    "surveys": "survey", "surveying": "survey", "surveyed": "survey",
    "samples": "sample", "sampling": "sample", "sampled": "sample",
    "drives": "drive", "driving": "drive", "driven": "drive",
    "discovers": "discover", "discovering": "discover", "discovered": "discover", "discoveries": "discover",
    "detects": "detect", "detecting": "detect", "detected": "detect",
    "analyzes": "analyze", "analyzing": "analyze", "analyzed": "analyze", "analysis": "analyze",
    "photographs": "photo", "photographing": "photo", "photographed": "photo",
    "images": "image", "imaging": "image",
    "confirms": "confirm", "confirming": "confirm", "confirmed": "confirm", "confirmation": "confirm",
    "impacts": "impact", "craters": "crater", "terrains": "terrain", "rocks": "rock"
}


# ============================================================
# CLAIM SEMANTIC PROFILE & QUERY VARIANT GENERATION
# ============================================================

def extract_claim_profile(title: str, text: str) -> Dict[str, Any]:
    """Extract structured semantic tokens and assertion stems from the evaluated claim."""
    combined = f"{title} {text}".strip().lower()
    words = re.findall(r"\b[a-zA-Z0-9]{2,}\b", combined)
    filtered = [w for w in words if w not in STOPWORDS]

    claim_stems = set(STEM_MAP.get(w, w) for w in filtered)

    # Core assertion tokens excluding non-informative filler terms
    generic_words = {
        "technology", "device", "physical", "standard", "remotely", "year",
        "time", "day", "report", "person", "without", "company", "companies"
    }
    assertion_stems = {w for w in claim_stems if w not in generic_words}

    return {
        "raw_text": combined,
        "tokens": set(filtered),
        "stems": claim_stems,
        "assertion_stems": assertion_stems
    }


def generate_query_variants(title: str, text: str) -> List[str]:
    """
    Generate multiple complementary search query variants from the evaluated claim:
    1. Primary key claim query (top 5 salient keywords)
    2. Core entity / subject query (top 2-3 keywords)
    3. Fact-check / verification query (core keywords + 'fact check')
    4. Headline-focused query (if headline provided)
    5. Broader predicate mechanism query (subject + core action verbs)
    """
    combined = f"{title} {text}".strip()
    cleaned = re.sub(r"<[^>]+>", " ", combined)
    cleaned = re.sub(r"http\S+|www\S+", " ", cleaned)
    tokens = re.findall(r"\b[a-zA-Z0-9]{2,}\b", cleaned)

    seen: Set[str] = set()
    filtered: List[str] = []
    for t in tokens:
        tl = t.lower()
        if tl not in STOPWORDS and tl not in seen:
            seen.add(tl)
            filtered.append(t)

    title_clean = re.sub(r"<[^>]+>", " ", title)
    title_tokens_raw = re.findall(r"\b[a-zA-Z0-9]{2,}\b", title_clean)
    title_tokens = [t for t in title_tokens_raw if t.lower() not in STOPWORDS]

    queries: List[str] = []

    # 1. Primary specific claim query (top 5 keywords)
    if filtered:
        q1 = " ".join(filtered[:5])
        if len(q1) >= 4:
            queries.append(q1)

    # 2. Broad entity / core subject query (top 2-3 tokens)
    if len(filtered) >= 2:
        q2 = " ".join(filtered[:3])
        if q2 and q2 != queries[0]:
            queries.append(q2)

    # 3. Fact-check / verification query
    if len(filtered) >= 2:
        q3 = f"{' '.join(filtered[:3])} fact check"
        if q3 not in queries:
            queries.append(q3)

    # 4. Headline-focused query (if headline is present and informative)
    if title_tokens:
        q4 = " ".join(title_tokens[:4])
        if q4 and q4 not in queries:
            queries.append(q4)

    # 5. Broader mechanism query (first token + action/predicate tokens)
    predicate_keywords = {
        "read", "thought", "thoughts", "mind", "minds", "brain", "dream", "dreams",
        "control", "land", "landed", "rover", "mars", "crew", "moon", "solar", "grid"
    }
    mech_matches = [t for t in filtered[1:] if t.lower() in predicate_keywords or STEM_MAP.get(t.lower(), "") in predicate_keywords]
    if filtered and mech_matches:
        q5 = " ".join([filtered[0]] + mech_matches[:3])
        if q5 and q5 not in queries:
            queries.append(q5)
    elif len(filtered) >= 5:
        q5 = " ".join([filtered[0]] + filtered[2:5])
        if q5 and q5 not in queries:
            queries.append(q5)

    # Order-preserving deduplication
    unique_queries: List[str] = []
    seen_q: Set[str] = set()
    for q in queries:
        ql = q.lower().strip()
        if ql and ql not in seen_q:
            seen_q.add(ql)
            unique_queries.append(q.strip())

    return unique_queries[:5] if unique_queries else [title.strip()[:60] or text.strip()[:60]]


def extract_search_query(title: str, text: str) -> str:
    """Backwards-compatible helper returning the primary query variant."""
    variants = generate_query_variants(title, text)
    return variants[0] if variants else (title.strip()[:60] or text.strip()[:60])


# ============================================================
# CLASSIFICATION & RELEVANCE SCORING
# ============================================================

def evaluate_article_relevance_and_type(
    claim_prof: Dict[str, Any],
    title: str,
    snippet: str,
    source_name: str,
    url: str
) -> Tuple[bool, float, str]:
    """
    Strict semantic relevance filter and context-aware classification.
    Returns: (is_relevant, relevance_score, evidence_type)
    evidence_type is one of: 'supporting', 'contradicting', 'related'
    """
    title_clean = sanitize_text(title)
    snippet_clean = sanitize_text(snippet)
    combined_art = f"{title_clean} {snippet_clean}".lower()
    art_words = set(re.findall(r"\b[a-zA-Z0-9]{2,}\b", combined_art))
    art_stems = set(STEM_MAP.get(w, w) for w in art_words)

    # Overlap with specific assertion stems
    overlap = claim_prof["assertion_stems"].intersection(art_stems)
    title_words = set(re.findall(r"\b[a-zA-Z0-9]{2,}\b", title_clean.lower()))
    title_stems = set(STEM_MAP.get(w, w) for w in title_words)
    title_overlap = claim_prof["assertion_stems"].intersection(title_stems)

    # Exclude completely unrelated conspiracy topics if claim did not mention them
    unrelated_conspiracies = {
        "coronavirus", "covid", "covid-19", "vaccine", "vaccines",
        "5g towers cause cancer", "birds aren't real", "flat earth"
    }
    has_unrelated_conspiracy = any(u in combined_art for u in unrelated_conspiracies if u not in claim_prof["raw_text"])
    if has_unrelated_conspiracy:
        # Exclude articles fact-checking completely different conspiracy topics
        return False, 0.0, "unrelated"

    # Specific named entities
    specific_entities = {"artemis", "perseverance", "curiosity", "mindwaves", "mindwave", "insight", "ingenuity"}
    has_specific_entity = bool(specific_entities.intersection(claim_prof["tokens"]).intersection(art_stems))

    # Strict Relevance Filter:
    # 1. If claim is about mind-reading (contains "thought", "mind", "brain", "dream"):
    mental_tokens = {"thought", "mind", "brain", "dream", "mindwave", "telepathy"}
    if claim_prof["assertion_stems"].intersection(mental_tokens):
        if not art_stems.intersection(mental_tokens):
            return False, 0.0, "unrelated"

    # 2. If claim is about Mars rover:
    #    The article MUST contain "mars" AND ("rover" or "land" or "perseverance" or "curiosity")
    if "mars" in claim_prof["assertion_stems"] and "rover" in claim_prof["assertion_stems"]:
        if "mars" not in art_stems or not ("rover" in art_stems or "land" in art_stems or has_specific_entity):
            return False, 0.0, "unrelated"

    # 3. If claim is about Artemis:
    if "artemis" in claim_prof["assertion_stems"]:
        if "artemis" not in art_stems and not ("moon" in art_stems or "lunar" in art_stems):
            return False, 0.0, "unrelated"

    # General threshold: at least 2 assertion stems must match
    if len(overlap) < 2 and not has_specific_entity:
        return False, 0.0, "unrelated"

    # Source authority detection
    is_official_source = any(dom in source_name.lower() or dom in url.lower() for dom in [".gov", "nasa.gov", "jpl.nasa.gov", "who.int"])
    is_trusted_news = any(dom.split(".")[0] in source_name.lower() or dom in url.lower() for dom in TRUSTED_DOMAINS)

    # Compute relevance score
    score = (len(title_overlap) * 4.0) + (len(overlap) * 1.5)
    if has_specific_entity:
        score += 5.0
    if is_official_source:
        score += 6.0
    elif is_trusted_news:
        score += 3.0

    # Contextual Classification
    has_contradiction = any(sig in combined_art for sig in CONTRADICTION_SIGNALS)
    has_supporting = any(sig in combined_art for sig in SUPPORTING_SIGNALS)

    evidence_type = "related"

    # Check for incidental side-meme fact-checks (e.g. rainbow, fake audio/video on Mars)
    incidental_factcheck_topics = {"rainbow", "audio", "video", "alien", "pyramid", "doorway", "face", "ufo"}
    has_incidental_meme = any(meme in combined_art for meme in incidental_factcheck_topics if meme not in claim_prof["raw_text"])

    if has_contradiction and not has_incidental_meme:
        # A source is Contradicting/Debunk ONLY if it actually disputes THIS claim or its mechanism
        if claim_prof["assertion_stems"].intersection(mental_tokens):
            # Must explicitly dispute 5g/tower mind-reading or brainwave access
            if ("5g" in art_stems or "tower" in art_stems) and art_stems.intersection(mental_tokens):
                evidence_type = "contradicting"
            else:
                evidence_type = "related"
        else:
            evidence_type = "contradicting"

    elif not has_contradiction:
        # 1. Mars rover exploration / geological science corroboration
        if "perseverance" in claim_prof["assertion_stems"] and "mars" in claim_prof["assertion_stems"]:
            if "perseverance" in art_stems and ("mars" in art_stems or "rover" in art_stems):
                exploration_tokens = {
                    "explore", "study", "geology", "surface", "rock", "sample",
                    "survey", "impact", "terrain", "drive", "record", "crater",
                    "history", "ancient", "sol"
                }
                if art_stems.intersection(exploration_tokens) or is_official_source or has_supporting:
                    evidence_type = "supporting"
                else:
                    evidence_type = "related"

        # 2. Mars landing corroboration
        elif "mars" in claim_prof["assertion_stems"] and "land" in claim_prof["assertion_stems"]:
            if "land" in art_stems and ("rover" in art_stems or "mars" in art_stems):
                evidence_type = "supporting"
            else:
                evidence_type = "related"

        # 3. Artemis mission corroboration
        elif "artemis" in claim_prof["assertion_stems"]:
            artemis_corrob_tokens = {"finalized", "approved", "crew", "selected", "astronauts", "flyby", "schedule"}
            if art_stems.intersection(artemis_corrob_tokens) or (is_official_source and len(title_overlap) >= 2):
                evidence_type = "supporting"
            else:
                evidence_type = "related"

        # 4. Factual claim corroborated by official or trusted sources with high title overlap
        elif (is_official_source or is_trusted_news) and len(title_overlap) >= 3:
            evidence_type = "supporting"

        # 5. General corroboration with supporting signals
        elif has_supporting and len(title_overlap) >= 2:
            evidence_type = "supporting"

        else:
            evidence_type = "related"

    # Specific claim domain protections:
    # If claim asserts remote 5G or tower mind-reading/dream control,
    # generic BCI research or consumer gadgets cannot corroborate remote tower mind control
    if claim_prof["assertion_stems"].intersection(mental_tokens):
        if "5g" in claim_prof["assertion_stems"] or "tower" in claim_prof["assertion_stems"]:
            if evidence_type == "supporting":
                evidence_type = "related"

    return True, score, evidence_type


def classify_evidence_type(claim_text: str, item_title: str, snippet: str, ml_prediction: int = 1) -> str:
    """Backwards-compatible wrapper around semantic evaluation."""
    prof = extract_claim_profile("", claim_text)
    _, _, etype = evaluate_article_relevance_and_type(prof, item_title, snippet, "", "")
    return etype


def compute_relevance_score(claim_tokens: Set[str], it: Dict[str, Any]) -> float:
    """Backwards-compatible score computation."""
    prof = {"assertion_stems": claim_tokens, "tokens": claim_tokens, "raw_text": ""}
    _, score, _ = evaluate_article_relevance_and_type(prof, it.get("title", ""), it.get("snippet", ""), it.get("source_name", ""), it.get("url", ""))
    return score


# ============================================================
# PROVIDER ABSTRACTION
# ============================================================

class EvidenceProvider(ABC):
    @abstractmethod
    async def search(self, query: str, limit: int = 25) -> List[Dict[str, Any]]:
        pass


class GoogleNewsRSSProvider(EvidenceProvider):
    def __init__(self, timeout: Optional[float] = None):
        self.timeout = timeout if timeout is not None else get_evidence_timeout()

    async def search(self, query: str, limit: int = 25) -> List[Dict[str, Any]]:
        if not query or len(query.strip()) < 3:
            return []

        encoded_query = urllib.parse.quote_plus(query.strip())
        rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                resp = await client.get(rss_url, headers=headers)
                if resp.status_code != 200:
                    return []

                root = ET.fromstring(resp.content)
                items = root.findall(".//item")

                results = []
                for item in items[:limit]:
                    title = item.findtext("title", "")
                    link = item.findtext("link", "")
                    pub_date = item.findtext("pubDate", "")
                    source_elem = item.find("source")
                    source_raw = source_elem.text if source_elem is not None and source_elem.text else "News Source"
                    source_name = sanitize_text(source_raw)

                    # Extract cleaned title without trailing source name suffix
                    raw_title = re.sub(r" - [^-]+$", "", title).strip()
                    clean_title = sanitize_text(raw_title)

                    # Clean snippet
                    description = item.findtext("description", "")
                    clean_snippet = sanitize_text(description)
                    if not clean_snippet or clean_snippet == clean_title:
                        clean_snippet = f"Reporting by {source_name} on {clean_title}."

                    if clean_title:
                        results.append({
                            "title": clean_title,
                            "source_name": source_name,
                            "url": link,
                            "published_at": pub_date[:22] if pub_date else "Recently",
                            "snippet": clean_snippet[:240],
                        })

                return results
        except Exception:
            # Cleanly catch timeouts, connection aborts, or malformed XML
            return []


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
    """
    Execute multi-query evidence retrieval across Google News RSS,
    deduplicate articles across variants, rank by relevance,
    and classify into Supporting, Contradicting, or Related.
    """
    if prediction is not None:
        ml_prediction = prediction

    queries = generate_query_variants(title, text)
    primary_query = queries[0] if queries else ""

    if not primary_query or len(primary_query.strip()) < 3:
        msg = "Content was too brief to generate a semantic evidence search query."
        return EvidenceSummary(
            status="insufficient",
            query=primary_query,
            queries_used=queries,
            message=msg,
            corroboration_notes=msg,
            total_found=0,
            items=[],
            sources=[]
        )

    effective_timeout = timeout if timeout is not None else get_evidence_timeout()
    provider = GoogleNewsRSSProvider(timeout=effective_timeout)

    try:
        # Fetch all query variants concurrently with timeout resilience
        tasks = [provider.search(q, limit=25) for q in queries]
        results_lists = await asyncio.gather(*tasks, return_exceptions=True)

        all_raw_items: List[Dict[str, Any]] = []
        for r in results_lists:
            if isinstance(r, list):
                all_raw_items.extend(r)

        if not all_raw_items:
            msg = "We could not find enough reliable current news sources to independently corroborate this specific claim."
            notes = (
                f"{msg} Queries checked: {', '.join(queries)}. "
                "Google News RSS indexes accredited journalistic media; novel, fringe, or unindexed claims legitimately return no results."
            )
            return EvidenceSummary(
                status="insufficient",
                query=primary_query,
                queries_used=queries,
                message=msg,
                corroboration_notes=notes,
                total_found=0,
                items=[],
                sources=[]
            )

        # Cross-query deduplication by URL and normalized title
        deduped_items: List[Dict[str, Any]] = []
        seen_urls: Set[str] = set()
        seen_titles: Set[str] = set()

        for it in all_raw_items:
            url_key = it["url"].strip().lower()
            title_key = re.sub(r"\W+", "", it["title"].lower())
            if url_key not in seen_urls and title_key not in seen_titles:
                seen_urls.add(url_key)
                seen_titles.add(title_key)
                deduped_items.append(it)

        # Extract claim semantic profile
        claim_prof = extract_claim_profile(title, text)

        # Semantic relevance filtering and contextual classification
        relevant_articles: List[Dict[str, Any]] = []
        for it in deduped_items:
            is_rel, score, etype = evaluate_article_relevance_and_type(
                claim_prof=claim_prof,
                title=it["title"],
                snippet=it["snippet"],
                source_name=it["source_name"],
                url=it["url"]
            )
            if is_rel:
                it["relevance_score"] = score
                it["evidence_type"] = etype
                relevant_articles.append(it)

        # Rank by relevance descending
        relevant_articles.sort(key=lambda x: x["relevance_score"], reverse=True)

        # Retain top genuinely relevant articles (up to 15; NEVER pad with weakly related results)
        selected_items = relevant_articles[:15]

        evidence_items: List[EvidenceItem] = []
        contradicting_count = 0
        supporting_count = 0
        related_count = 0

        for it in selected_items:
            etype = it["evidence_type"]

            if etype == "contradicting":
                contradicting_count += 1
            elif etype == "supporting":
                supporting_count += 1
            else:
                related_count += 1

            evidence_items.append(EvidenceItem(
                title=it["title"],
                source_name=it["source_name"],
                source=it["source_name"],
                url=it["url"],
                published_at=it.get("published_at"),
                published=it.get("published_at"),
                snippet=it["snippet"],
                evidence_type=etype,
                status=etype,
                relevance_score=round(it["relevance_score"], 2)
            ))

        # Synthesize overall evidence status
        if len(evidence_items) == 0:
            status_val = "insufficient"
            msg = "We could not find enough reliable current news sources to independently corroborate this specific claim."
            corroboration_notes = (
                f"{msg} Live evidence was queried across {len(queries)} search variants via Google News RSS. "
                "No direct external refutation or corroboration was found for this specific claim."
            )
        elif contradicting_count > 0:
            status_val = "contradicting"
            msg = f"Retrieved {len(evidence_items)} genuinely relevant news source(s), including {contradicting_count} indicating dispute, debunking, or refutation."
            corroboration_notes = (
                f"{msg} Live evidence retrieved across {len(queries)} search variants via Google News RSS. "
                "Coverage reflects indexed journalistic news media and may not be exhaustive for novel, fringe, or unindexed claims."
            )
        elif supporting_count > 0:
            status_val = "supporting"
            msg = f"Retrieved {len(evidence_items)} genuinely relevant reporting source(s), including {supporting_count} corroborating the event or subject."
            corroboration_notes = (
                f"{msg} Live evidence retrieved across {len(queries)} search variants via Google News RSS. "
                "Coverage reflects indexed journalistic news media and may not be exhaustive for novel, fringe, or unindexed claims."
            )
        else:
            status_val = "insufficient" if ml_prediction == 0 else "related"
            msg = f"Retrieved {len(evidence_items)} related news article(s) covering the broader topic, but none directly confirm or refute the specific assertion."
            corroboration_notes = (
                f"{msg} Live evidence was queried across {len(queries)} search variants via Google News RSS. "
                "No direct external refutation or corroboration was found for the exact claim; showing background coverage only."
            )

        return EvidenceSummary(
            status=status_val,
            query=primary_query,
            queries_used=queries,
            message=msg,
            corroboration_notes=corroboration_notes,
            total_found=len(evidence_items),
            items=evidence_items,
            sources=evidence_items
        )

    except Exception as e:
        print(f"Evidence retrieval warning: {e}")
        msg = "Live external evidence retrieval service is currently unavailable or timed out."
        return EvidenceSummary(
            status="unavailable",
            query=primary_query,
            queries_used=queries,
            message=msg,
            corroboration_notes=msg,
            total_found=0,
            items=[],
            sources=[]
        )
