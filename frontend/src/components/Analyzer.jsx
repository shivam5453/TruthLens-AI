import {
  BrainCircuit,
  Globe,
  Loader2,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle,
  FileText
} from "lucide-react";

export default function Analyzer({
  title,
  setTitle,
  text,
  setText,
  fetchEvidence,
  setFetchEvidence,
  loading,
  error,
  sampleNotice,
  onAnalyze,
  onClear,
  onLoadSample
}) {
  const charCount = text.length;
  const isReady = charCount >= 10 || title.trim().length >= 10;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isReady && !loading) {
      onAnalyze();
    }
  };

  return (
    <section className="analyzer-section" id="analyzer">
      <div className="analyzer-container">
        {/* Header */}
        <div className="section-header-center">
          <div className="section-badge">
            <BrainCircuit size={13} />
            <span>ANALYSIS WORKBENCH</span>
          </div>
          <h2 className="section-title">Analyze any news story.</h2>
          <p className="section-subtitle">
            Paste a headline, article, or central claim and let TruthLens assess its
            credibility against linguistic markers and real-time web reporting.
          </p>
        </div>

        {/* Workbench Card */}
        <div className="analyzer-card">
          {/* Quick Samples Toolbar */}
          <div className="samples-toolbar">
            <div className="samples-label">
              <Sparkles size={13} />
              <span>Quick Test Samples:</span>
            </div>
            <div className="samples-buttons">
              <button
                type="button"
                className="btn-sample-tag genuine"
                onClick={() => onLoadSample("genuine")}
                title="Load verified renewable energy infrastructure news"
              >
                <span>Renewable Energy (Genuine)</span>
              </button>
              <button
                type="button"
                className="btn-sample-tag space"
                onClick={() => onLoadSample("artemis")}
                title="Load verified lunar mission space news"
              >
                <span>Artemis Lunar (Genuine)</span>
              </button>
              <button
                type="button"
                className="btn-sample-tag fake"
                onClick={() => onLoadSample("fake")}
                title="Load sensational conspiracy mindwaves claim"
              >
                <span>5G Mindwaves (Sensational)</span>
              </button>
            </div>
            {(title || text) && (
              <button
                type="button"
                className="btn-clear-analyzer"
                onClick={onClear}
                title="Clear input"
              >
                <RotateCcw size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Sample loaded notice toast inside card */}
          {sampleNotice && (
            <div className="sample-notice-banner" role="status">
              <CheckCircle size={14} />
              <span>{sampleNotice}</span>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="analyzer-form">
            {/* Optional Headline input */}
            <div className="input-group">
              <label htmlFor="analyzer-title" className="input-label">
                <FileText size={13} />
                <span>Headline or Story Title (optional)</span>
              </label>
              <input
                id="analyzer-title"
                type="text"
                className="analyzer-input"
                placeholder="e.g., International Renewable Energy Consortium Announces 2026 Framework"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
                disabled={loading}
              />
            </div>

            {/* Story Text / Claim textarea */}
            <div className="input-group">
              <label htmlFor="analyzer-text" className="input-label">
                <BrainCircuit size={13} />
                <span>Article Body, Statement, or Central Claim</span>
              </label>
              <textarea
                id="analyzer-text"
                className="analyzer-textarea"
                rows={5}
                placeholder="Paste the full article, excerpt, or central assertion to evaluate (minimum 10 characters)..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Controls Bar: Counter, Toggle, CTA */}
            <div className="analyzer-controls-bar">
              <div className="controls-left">
                <span className={`char-counter ${charCount < 10 ? "under-min" : ""}`}>
                  {charCount} characters {charCount < 10 ? "(min 10)" : ""}
                </span>
              </div>

              <div className="controls-middle">
                <label className="toggle-label" title="Query Google News RSS for live reporting">
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={fetchEvidence}
                    onChange={(e) => setFetchEvidence(e.target.checked)}
                    disabled={loading}
                  />
                  <span className="toggle-slider" />
                  <Globe size={14} className="toggle-icon" />
                  <span className="toggle-text">Live Web Evidence</span>
                </label>
              </div>

              <div className="controls-right">
                <button
                  type="submit"
                  className="btn-analyze-submit"
                  disabled={!isReady || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="btn-spinner" />
                      <span>Evaluating Claim...</span>
                    </>
                  ) : (
                    <>
                      <BrainCircuit size={16} />
                      <span>Analyze Story</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Error Banner */}
          {error && (
            <div className="analyzer-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
