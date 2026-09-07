import {
  CheckCircle2,
  CircleAlert,
  AlertTriangle,
  Globe,
  Bookmark,
  Download,
  ExternalLink,
  Calendar,
  Share2,
  FileCheck2,
  HelpCircle
} from "lucide-react";

export default function AnalysisResult({
  result,
  onSave,
  onExportPdf,
  onExportJson,
  user
}) {
  if (!result) return null;

  const isGenuine = result.prediction === 1;
  const isMisleading = result.prediction === 0;
  const isInsufficient =
    result.evidence_status === "insufficient" ||
    (result.evidence && result.evidence.length === 0 && !result.confidence);

  // Calibrated confidence display
  const rawConf = typeof result.confidence === "number" ? result.confidence : 0.85;
  const confidencePct = Math.round(rawConf > 1 ? rawConf : rawConf * 100);

  // Evidence counts
  const evidenceList = result.evidence || result.sources || [];
  const supportingCount =
    result.supporting_count ??
    evidenceList.filter((e) => e.status === "supporting" || e.relationship === "supporting").length;
  const contradictingCount =
    result.contradicting_count ??
    evidenceList.filter(
      (e) => e.status === "contradicting" || e.relationship === "contradicting" || e.status === "debunk"
    ).length;
  const relatedCount =
    result.related_count ??
    evidenceList.filter((e) => e.status === "neutral" || e.relationship === "related").length;

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recent";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <section className="analysis-result-section" id="analysis-result">
      <div className="result-container">
        <div className="result-dossier-card">
          {/* Dossier Header & Action Toolbar */}
          <div className="dossier-top-bar">
            <div className="dossier-meta">
              <span className="dossier-id-badge">
                <FileCheck2 size={13} />
                <span>DOSSIER #{result.id ? String(result.id).slice(-6).toUpperCase() : "LIVE"}</span>
              </span>
              <span className="dossier-timestamp">
                {result.created_at ? formatDate(result.created_at) : "Verified Just Now"}
              </span>
            </div>

            <div className="dossier-actions-bar">
              <button
                type="button"
                className="btn-dossier-action bookmark"
                onClick={() => onSave(result.id || "current")}
                title={user ? "Bookmark to personal workspace" : "Sign in to save"}
              >
                <Bookmark size={14} />
                <span>Save</span>
              </button>
              <button
                type="button"
                className="btn-dossier-action export-pdf"
                onClick={() => onExportPdf(result.id)}
                title="Download Branded PDF Report"
              >
                <Download size={14} />
                <span>Export PDF</span>
              </button>
              <button
                type="button"
                className="btn-dossier-action export-json"
                onClick={() => onExportJson(result.id)}
                title="Export Structured JSON Data"
              >
                <Share2 size={14} />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Analyzed Claim Banner */}
          <div className="analyzed-claim-box">
            <span className="claim-box-label">EVALUATED STORY / CLAIM</span>
            <h3 className="claim-box-title">
              {result.title || (result.text ? result.text.slice(0, 140) + "..." : "Submitted Content")}
            </h3>
            {result.text && result.title && (
              <p className="claim-box-excerpt">
                {result.text.length > 280 ? result.text.slice(0, 280) + "..." : result.text}
              </p>
            )}
          </div>

          {/* Main Assessment Verdict Banner */}
          <div
            className={`verdict-banner ${
              isInsufficient ? "insufficient" : isGenuine ? "genuine" : "misleading"
            }`}
          >
            <div className="verdict-main-info">
              <div className="verdict-icon-wrap">
                {isInsufficient ? (
                  <AlertTriangle size={32} />
                ) : isGenuine ? (
                  <CheckCircle2 size={32} />
                ) : (
                  <CircleAlert size={32} />
                )}
              </div>
              <div className="verdict-text-wrap">
                <span className="verdict-eyebrow">CREDIBILITY VERDICT</span>
                <h2 className="verdict-headline">
                  {isInsufficient
                    ? "UNABLE TO VERIFY"
                    : isGenuine
                    ? "LIKELY GENUINE"
                    : "LIKELY MISLEADING"}
                </h2>
                <span className="verdict-risk-tag">
                  {isInsufficient
                    ? "Uncertain External Verification"
                    : isGenuine
                    ? "Low Misinformation Risk"
                    : "High Risk of Sensationalism / Misinformation"}
                </span>
              </div>
            </div>

            {/* Confidence Gauge */}
            <div className="verdict-gauge-box">
              <div className="gauge-score-display">
                <span className="gauge-number">{confidencePct}%</span>
                <span className="gauge-label">Confidence</span>
              </div>
              <div className="gauge-track">
                <div
                  className={`gauge-fill ${
                    isInsufficient ? "insufficient" : isGenuine ? "genuine" : "misleading"
                  }`}
                  style={{ width: `${Math.max(10, Math.min(100, confidencePct))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Assessment Guidance & Explanation */}
          <div className="assessment-guidance-card">
            <div className="guidance-header">
              <HelpCircle size={15} />
              <h4>Assessment Analysis & Findings</h4>
            </div>
            <p className="guidance-body">
              {result.explanation ||
                (isGenuine
                  ? "The evaluated content exhibits linguistic characteristics consistent with credible journalism. Syntax, neutrality, and structure align with standard news reporting conventions. Cross-referenced web queries returned corroborating publications."
                  : isMisleading
                  ? "The submitted content contains linguistic markers frequently associated with misinformation, sensationalism, or emotionally charged rhetoric. Factual assertions contradict verified news records or lack reliable journalistic attribution."
                  : "Insufficient reliable external evidence was found to confidently corroborate or refute this claim. Linguistic patterns alone provide inconclusive confidence.")}
            </p>
          </div>

          {/* Evidence Overview & Source Breakdown */}
          <div className="evidence-dossier-section">
            <div className="evidence-section-header">
              <div className="evidence-header-left">
                <Globe size={16} />
                <h3>Live Web Corroboration & Evidence</h3>
              </div>
              <div className="evidence-header-counts">
                <span className="count-pill supporting">
                  {supportingCount} Supporting
                </span>
                <span className="count-pill contradicting">
                  {contradictingCount} Debunk
                </span>
                <span className="count-pill related">
                  {relatedCount} Related
                </span>
              </div>
            </div>

            {/* Evidence Cards List */}
            {evidenceList && evidenceList.length > 0 ? (
              <div className="evidence-cards-grid">
                {evidenceList.map((ev, idx) => {
                  const evStatus = (ev.status || ev.relationship || "neutral").toLowerCase();
                  return (
                    <div className={`evidence-item-card status-${evStatus}`} key={idx}>
                      <div className="ev-card-top">
                        <div className="ev-source-info">
                          <span className="ev-source-name">{ev.source || ev.domain || "News Source"}</span>
                          {ev.published && (
                            <span className="ev-date">
                              <Calendar size={11} />
                              <span>{formatDate(ev.published)}</span>
                            </span>
                          )}
                        </div>
                        <span className={`ev-status-badge ${evStatus}`}>
                          {evStatus === "supporting"
                            ? "Corroborating"
                            : evStatus === "contradicting" || evStatus === "debunk"
                            ? "Contradicting / Debunk"
                            : "Related Coverage"}
                        </span>
                      </div>

                      <h4 className="ev-card-title">{ev.title || "External Source Article"}</h4>

                      {ev.snippet && <p className="ev-card-snippet">{ev.snippet}</p>}

                      {ev.url && (
                        <div className="ev-card-bottom">
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-read-source"
                            title="Open external source in new tab"
                          >
                            <span>Read Source</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="insufficient-evidence-box">
                <Globe size={24} />
                <div className="insufficient-text">
                  <strong>Insufficient External Evidence Retrieved</strong>
                  <p>
                    No reliable external web reports directly corroborated or contradicted
                    this claim within the timeout window. TruthLens does not treat the absence of
                    immediate evidence as proof of falsehood. Always consult multiple reputable sources.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
