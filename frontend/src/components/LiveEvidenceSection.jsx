import {
  Globe,
  FileText,
  Search,
  Scale,
  CheckCircle2,
  ExternalLink
} from "lucide-react";

export default function LiveEvidenceSection() {
  return (
    <section className="live-evidence-showcase" id="live-evidence">
      <div className="showcase-header">
        <div className="section-badge">
          <Globe size={13} />
          <span>SIGNATURE CAPABILITY</span>
        </div>
        <h2 className="section-title">Don't rely on a headline alone.</h2>
        <p className="section-subtitle">
          TruthLens AI actively cross-references your claim against live web journalism
          and official reports to detect corroboration or uncover debunks.
        </p>
      </div>

      {/* Visual Workflow Pipeline */}
      <div className="evidence-pipeline-container">
        <div className="pipeline-step">
          <div className="step-num">01</div>
          <div className="step-icon-wrap">
            <FileText size={20} />
          </div>
          <h4 className="step-title">Submitted Claim</h4>
          <p className="step-desc">
            The system extracts key entities, dates, and core factual assertions.
          </p>
        </div>

        <div className="pipeline-arrow" aria-hidden="true">→</div>

        <div className="pipeline-step">
          <div className="step-num">02</div>
          <div className="step-icon-wrap">
            <Search size={20} />
          </div>
          <h4 className="step-title">Live Web Search</h4>
          <p className="step-desc">
            Queries Google News RSS in real time with configurable timeout resilience.
          </p>
        </div>

        <div className="pipeline-arrow" aria-hidden="true">→</div>

        <div className="pipeline-step">
          <div className="step-num">03</div>
          <div className="step-icon-wrap">
            <Scale size={20} />
          </div>
          <h4 className="step-title">Evidence Comparison</h4>
          <p className="step-desc">
            Classifies source reporting into Supporting, Contradicting, or Neutral mentions.
          </p>
        </div>

        <div className="pipeline-arrow" aria-hidden="true">→</div>

        <div className="pipeline-step">
          <div className="step-num">04</div>
          <div className="step-icon-wrap">
            <CheckCircle2 size={20} />
          </div>
          <h4 className="step-title">Synthesized Dossier</h4>
          <p className="step-desc">
            Signals are combined into an explainable assessment with direct citations.
          </p>
        </div>
      </div>

      {/* Real Evidence Feature Callout */}
      <div className="evidence-feature-card">
        <div className="feature-card-info">
          <h3>Why Live Web Corroboration Matters</h3>
          <p>
            Language models evaluate style, sensationalism, and formatting, but only
            live reporting confirms whether a real-world event actually took place.
            TruthLens bridges this gap by providing verified external links for every claim.
          </p>
          <div className="evidence-trust-pills">
            <span className="pill-item">✓ Zero Fake Citations</span>
            <span className="pill-item">✓ Clickable External Sources</span>
            <span className="pill-item">✓ Graceful Fallback for Novel Claims</span>
          </div>
        </div>
        <div className="feature-card-demo">
          <div className="mini-source-preview">
            <div className="mini-source-header">
              <span className="source-tag">Live RSS Feed</span>
              <span className="source-time">Real-Time Verification</span>
            </div>
            <div className="mini-source-body">
              <strong>Corroborated by Tier-1 International Outlets</strong>
              <p>Every analysis includes direct URLs to original news coverage with published timestamps.</p>
            </div>
            <div className="mini-source-link">
              <span>Opens directly in external tab</span>
              <ExternalLink size={12} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
