import {
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Globe,
  Radio
} from "lucide-react";

export default function Hero({ onAnalyzeClick, onLoadSample }) {
  return (
    <section className="hero-section">
      <div className="hero-container">
        {/* Left Column: Vision, Headline, CTAs */}
        <div className="hero-copy-col">
          <div className="hero-eyebrow">
            <span className="eyebrow-dot" />
            <Sparkles size={13} className="eyebrow-icon" />
            <span>AI-POWERED NEWS CREDIBILITY PLATFORM</span>
          </div>

          <h1 className="hero-headline">
            Don't just read the news.{" "}
            <span className="headline-gradient">Know what to trust.</span>
          </h1>

          <p className="hero-subtitle">
            Analyze headlines, articles, or controversial claims with dual-signal
            linguistic assessment cross-referenced against real-time web reporting.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={onAnalyzeClick}
            >
              <span>Analyze a Story</span>
              <ArrowRight size={16} />
            </button>
            <a href="#how-it-works" className="btn-hero-secondary">
              <span>How It Works</span>
              <ChevronRight size={16} />
            </a>
          </div>

          <div className="hero-trust-strip">
            <div className="trust-item">
              <ShieldCheck size={14} className="trust-icon" />
              <span>Dual-Signal NLP</span>
            </div>
            <span className="trust-divider">•</span>
            <div className="trust-item">
              <Globe size={14} className="trust-icon" />
              <span>Google News RSS</span>
            </div>
            <span className="trust-divider">•</span>
            <div className="trust-item">
              <Radio size={14} className="trust-icon" />
              <span>Exportable Reports</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Product Preview Card */}
        <div className="hero-preview-col">
          <div className="product-preview-card">
            {/* Window header */}
            <div className="preview-card-header">
              <div className="preview-window-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <span className="preview-card-title">TruthLens AI • Credibility Dossier</span>
              <span className="preview-live-pill">DEMO PREVIEW</span>
            </div>

            {/* Preview claim snippet */}
            <div className="preview-claim-box">
              <span className="preview-label">SUBMITTED CLAIM</span>
              <p className="preview-claim-text">
                "International Renewable Energy Consortium Formally Adopts 2026 Multilateral Solar Grid Framework"
              </p>
            </div>

            {/* Preview verdict badge & score */}
            <div className="preview-verdict-box">
              <div className="preview-verdict-left">
                <span className="preview-label">ASSESSMENT VERDICT</span>
                <div className="preview-verdict-pill genuine">
                  <CheckCircle2 size={16} />
                  <span>LIKELY GENUINE</span>
                </div>
              </div>

              <div className="preview-verdict-right">
                <div className="preview-score-meta">
                  <span className="preview-score-num">87%</span>
                  <span className="preview-score-lbl">Confidence</span>
                </div>
                <div className="preview-score-bar-track">
                  <div className="preview-score-bar-fill genuine" style={{ width: "87%" }} />
                </div>
              </div>
            </div>

            {/* Preview evidence summary counts */}
            <div className="preview-evidence-summary">
              <div className="preview-count-item supporting">
                <span className="count-num">4</span>
                <span className="count-label">Supporting</span>
              </div>
              <div className="preview-count-item contradicting">
                <span className="count-num">0</span>
                <span className="count-label">Debunk</span>
              </div>
              <div className="preview-count-item related">
                <span className="count-num">3</span>
                <span className="count-label">Related Mentions</span>
              </div>
            </div>

            {/* Preview source citations list */}
            <div className="preview-sources-list">
              <div className="preview-source-item">
                <div className="preview-source-top">
                  <span className="source-domain">Reuters</span>
                  <span className="source-badge-subtle">Corroborated</span>
                </div>
                <div className="preview-source-headline">
                  Geneva climate summit concludes with standardized solar grid interoperability accord.
                </div>
              </div>

              <div className="preview-source-item">
                <div className="preview-source-top">
                  <span className="source-domain">Associated Press</span>
                  <span className="source-badge-subtle">Corroborated</span>
                </div>
                <div className="preview-source-headline">
                  Over forty nations ratify clean energy infrastructure treaty ahead of next quarter.
                </div>
              </div>
            </div>

            {/* Card footer note */}
            <div className="preview-card-footer">
              <span className="preview-note">
                Interactive demonstration • Enter any article below to generate a live dossier
              </span>
              <button
                type="button"
                className="btn-try-sample"
                onClick={() => onLoadSample("genuine")}
              >
                <span>Try this claim</span>
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
