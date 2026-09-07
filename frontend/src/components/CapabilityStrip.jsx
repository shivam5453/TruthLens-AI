import {
  Globe,
  BrainCircuit,
  ShieldCheck,
  Bookmark
} from "lucide-react";

export default function CapabilityStrip() {
  const capabilities = [
    {
      icon: Globe,
      title: "Real-Time Evidence",
      desc: "Cross-checks claims against live Google News RSS reporting and verified press releases."
    },
    {
      icon: BrainCircuit,
      title: "Linguistic Assessment",
      desc: "Analyzes sensationalism, emotional bias, semantic manipulation, and syntax patterns."
    },
    {
      icon: ShieldCheck,
      title: "Explainable Results",
      desc: "Transparent confidence scores, clear risk levels, and plain-English credibility rationales."
    },
    {
      icon: Bookmark,
      title: "Personal Workspace",
      desc: "Secure historical logs, bookmarked dossiers with custom research notes, and export tools."
    }
  ];

  return (
    <section className="capabilities-strip-section" aria-label="Product Capabilities">
      <div className="capabilities-grid">
        {capabilities.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div className="capability-card" key={idx}>
              <div className="capability-icon-box">
                <Icon size={18} />
              </div>
              <div className="capability-content">
                <h3 className="capability-title">{c.title}</h3>
                <p className="capability-desc">{c.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
