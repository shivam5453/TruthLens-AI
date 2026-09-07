import {
  ShieldCheck,
  Globe
} from "lucide-react";

export default function Footer({ onAnalyzeClick }) {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div className="footer-col-brand">
          <div className="footer-brand-header">
            <div className="brand-mark">
              <ShieldCheck size={18} />
            </div>
            <strong>TruthLens</strong>
            <span className="brand-ai-tag">AI</span>
          </div>
          <p className="footer-brand-desc">
            AI-powered news credibility assessment platform combining dual-signal natural
            language processing with real-time web verification.
          </p>
          <div className="footer-system-note">
            <Globe size={13} />
            <span>Dual-Signal Linguistic & Real-Time Evidence Verification</span>
          </div>
        </div>

        <div className="footer-col-links">
          <h4>Navigation</h4>
          <ul className="footer-links-list">
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={onAnalyzeClick}
              >
                Credibility Analyzer
              </button>
            </li>
            <li>
              <a href="#how-it-works" className="footer-link-btn">How It Works</a>
            </li>
            <li>
              <a href="#live-evidence" className="footer-link-btn">Live Evidence</a>
            </li>
            <li>
              <a href="#features" className="footer-link-btn">Features</a>
            </li>
          </ul>
        </div>

        <div className="footer-col-links">
          <h4>Integrity & Ethics</h4>
          <ul className="footer-links-list">
            <li>
              <a href="#responsible-ai" className="footer-link-btn">Responsible AI</a>
            </li>
            <li>
              <span className="footer-static-text">B.E. CSE Major Project</span>
            </li>
            <li>
              <span className="footer-static-text">Dual-Signal Architecture</span>
            </li>
            <li>
              <span className="footer-static-text">Transparent Citations</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <p className="footer-copy">
          © {new Date().getFullYear()} TruthLens AI. All rights reserved. Built for research & education.
        </p>
        <p className="footer-disclaimer">
          Independent academic research project. Content assessments do not constitute official legal or journalistic endorsement.
        </p>
      </div>
    </footer>
  );
}
