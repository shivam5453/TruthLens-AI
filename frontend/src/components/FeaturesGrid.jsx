import {
  Globe,
  BrainCircuit,
  ShieldCheck,
  History,
  Bookmark,
  FileText,
  Database,
  Lock
} from "lucide-react";

export default function FeaturesGrid() {
  const features = [
    {
      icon: Globe,
      title: "Real-Time Web Evidence",
      desc: "Live cross-referencing via Google News RSS to corroborating journalistic coverage."
    },
    {
      icon: BrainCircuit,
      title: "Dual-Signal Credibility",
      desc: "Linguistic syntax and sensationalism analysis combined with factual web verification."
    },
    {
      icon: ShieldCheck,
      title: "Explainable Transparency",
      desc: "Clear confidence scores, risk categories, and plain-English credibility rationales."
    },
    {
      icon: History,
      title: "Analysis Audit History",
      desc: "Full historical log of evaluated claims with quick search, filtering, and review."
    },
    {
      icon: Bookmark,
      title: "Dossier Bookmarking",
      desc: "Save key analyses to your personal workspace with custom notes and research tags."
    },
    {
      icon: FileText,
      title: "Publication-Ready PDFs",
      desc: "Generate professional branded PDF dossiers suitable for academic citations or sharing."
    },
    {
      icon: Database,
      title: "Structured JSON Access",
      desc: "Export machine-readable data schemas for research workflows and validation pipelines."
    },
    {
      icon: Lock,
      title: "Enterprise RBAC Security",
      desc: "Cryptographically signed JWT tokens, role-based controls, and isolated user workspaces."
    }
  ];

  return (
    <section className="features-grid-section" id="features">
      <div className="section-header-center">
        <div className="section-badge">
          <ShieldCheck size={13} />
          <span>PLATFORM CAPABILITIES</span>
        </div>
        <h2 className="section-title">Built for serious credibility research.</h2>
        <p className="section-subtitle">
          Everything you need to analyze claims, cross-examine sources, and maintain
          an auditable research trail.
        </p>
      </div>

      <div className="features-cards-grid">
        {features.map((f, idx) => {
          const Icon = f.icon;
          return (
            <div className="feature-product-card" key={idx}>
              <div className="feature-card-icon-wrap">
                <Icon size={20} />
              </div>
              <h3 className="feature-card-title">{f.title}</h3>
              <p className="feature-card-desc">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
