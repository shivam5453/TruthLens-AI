import {
  ShieldAlert,
  Scale,
  Users,
  AlertCircle
} from "lucide-react";

export default function ResponsibleAI() {
  return (
    <section className="responsible-ai-section" id="responsible-ai">
      <div className="responsible-ai-container">
        <div className="responsible-header">
          <div className="section-badge">
            <Scale size={13} />
            <span>ETHICAL OVERSIGHT</span>
          </div>
          <h2 className="section-title">Responsible AI & Human-in-the-Loop</h2>
          <p className="section-subtitle">
            TruthLens AI is an investigative research assistant designed to assist critical thinking,
            not an infallible arbiter of truth.
          </p>
        </div>

        <div className="responsible-grid">
          <div className="responsible-card">
            <div className="resp-icon-box">
              <Scale size={18} />
            </div>
            <h4>Probabilistic Intelligence</h4>
            <p>
              Machine learning models output statistical likelihoods based on trained patterns.
              TruthLens assessments indicate linguistic and contextual credibility risk rather than
              absolute legal or factual finality.
            </p>
          </div>

          <div className="responsible-card">
            <div className="resp-icon-box">
              <ShieldAlert size={18} />
            </div>
            <h4>Dynamic Web Reporting</h4>
            <p>
              The presence or absence of real-time search results depends on publication indexing.
              An absence of immediate online coverage must never be interpreted as definitive proof
              of falsehood.
            </p>
          </div>

          <div className="responsible-card">
            <div className="resp-icon-box">
              <Users size={18} />
            </div>
            <h4>Human Judgment Essential</h4>
            <p>
              Journalists, researchers, and citizens should always review primary documents,
              consult multiple independent outlets, and use TruthLens dossiers as an initial
              analytical lens.
            </p>
          </div>
        </div>

        <div className="responsible-footer-alert">
          <AlertCircle size={16} />
          <span>
            B.E. Computer Science & Engineering Major Project • Designed with strict ethical guardrails and academic integrity.
          </span>
        </div>
      </div>
    </section>
  );
}
