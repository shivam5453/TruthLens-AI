import {
  FileText,
  BrainCircuit,
  Globe,
  ShieldCheck
} from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Submit Claim",
      desc: "Paste any news headline, full article, or breaking statement into the analyzer.",
      icon: FileText
    },
    {
      num: "02",
      title: "Linguistic Analysis",
      desc: "TruthLens scans syntax, sensationalism, clickbait phrasing, and rhetorical tone.",
      icon: BrainCircuit
    },
    {
      num: "03",
      title: "Web Corroboration",
      desc: "Current reporting is retrieved from Google News RSS to cross-examine factual assertions.",
      icon: Globe
    },
    {
      num: "04",
      title: "Credibility Dossier",
      desc: "Receive an explainable verdict, confidence gauge, and clickable external source citations.",
      icon: ShieldCheck
    }
  ];

  return (
    <section className="how-it-works-section" id="how-it-works">
      <div className="section-header-center">
        <div className="section-badge">
          <BrainCircuit size={13} />
          <span>METHODOLOGY</span>
        </div>
        <h2 className="section-title">How TruthLens Evaluates Credibility</h2>
        <p className="section-subtitle">
          A transparent, four-step pipeline that combines natural language intelligence
          with live web verification.
        </p>
      </div>

      <div className="steps-grid">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div className="step-card" key={idx}>
              <div className="step-card-top">
                <span className="step-card-number">{s.num}</span>
                <div className="step-card-icon">
                  <Icon size={20} />
                </div>
              </div>
              <h3 className="step-card-title">{s.title}</h3>
              <p className="step-card-desc">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
