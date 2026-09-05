import { useEffect, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileText,
  Gauge,
  Layers3,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Activity,
  History,
  Trash2,
  Filter,
  Menu,
  X,
  Database,
  Cpu,
  BarChart3,
  Check,
} from "lucide-react";

import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Predefined test samples for quick evaluation
const SAMPLE_STORIES = {
  genuine: {
    title: "International Renewable Energy Consortium Announces 2026 Solar Infrastructure Framework",
    text: "Delegates from over forty nations concluded their annual climate summit today, formally adopting a multilateral agreement to expand regional solar and wind power grids. The initiative establishes standardized grid interoperability protocols and joint funding facilities for emerging markets. According to the joint communique released by the energy council, independent environmental agencies will monitor emission reduction benchmarks across participating sectors starting next quarter.",
  },
  fake: {
    title: "BANNED DISCOVERY: Secret Underground Cabal Confirmed Using Satellites To Control Mindwaves",
    text: "Shocking leaked military documents confirmed today that an elite secret global society has been broadcasting hypnotic frequencies directly through domestic weather antennas! Mainstream media conglomerates have been threatened with immediate shutdown if they report the truth. Whistleblowers urge everyone to disconnect all electronic equipment immediately before the global blackout begins next Tuesday!",
  },
};

function App() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sampleNotice, setSampleNotice] = useState("");

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all"); // 'all' | 'genuine' | 'fake'
  const [deletingId, setDeletingId] = useState(null);

  // Platform stats state
  const [stats, setStats] = useState(null);
  const [systemHealth, setSystemHealth] = useState({ online: true, dbConnected: true });

  // ============================================================
  // FETCH HEALTH STATUS
  // ============================================================
  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setSystemHealth({
          online: data.status === "healthy" || data.status === "degraded",
          dbConnected: data.database_connected ?? true,
        });
      }
    } catch {
      setSystemHealth({ online: false, dbConnected: false });
    }
  };

  // ============================================================
  // FETCH STATS
  // ============================================================
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data);
        }
      }
    } catch (err) {
      console.warn("Stats fetch error:", err);
    }
  };

  // ============================================================
  // FETCH ANALYSIS HISTORY
  // ============================================================
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await fetch(`${API_BASE}/api/history`);
      const data = await response.json();

      if (data.success) {
        setHistory(data.history || []);
      } else {
        console.warn("History fetch notice:", data.error);
      }
    } catch (err) {
      console.error("History fetch error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ============================================================
  // DELETE HISTORY ITEM
  // ============================================================
  const deleteHistoryItem = async (itemId, e) => {
    e.stopPropagation();
    if (!itemId) return;

    try {
      setDeletingId(itemId);
      const res = await fetch(`${API_BASE}/api/history/${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== itemId && item._id !== itemId));
        fetchStats();
      }
    } catch (err) {
      console.error("Delete history error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Initial load
  useEffect(() => {
    let isSubscribed = true;

    const loadInitialData = async () => {
      try {
        const [healthRes, statsRes, histRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/health`),
          fetch(`${API_BASE}/api/stats`),
          fetch(`${API_BASE}/api/history`),
        ]);

        if (isSubscribed && healthRes.status === "fulfilled" && healthRes.value.ok) {
          const data = await healthRes.value.json();
          setSystemHealth({
            online: data.status === "healthy" || data.status === "degraded",
            dbConnected: data.database_connected ?? true,
          });
        }

        if (isSubscribed && statsRes.status === "fulfilled" && statsRes.value.ok) {
          const data = await statsRes.value.json();
          if (data.success) {
            setStats(data);
          }
        }

        if (isSubscribed && histRes.status === "fulfilled" && histRes.value.ok) {
          const data = await histRes.value.json();
          if (data.success) {
            setHistory(data.history || []);
          }
        }
      } catch (err) {
        console.warn("Initial data load error:", err);
      }
    };

    loadInitialData();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // ============================================================
  // ANALYZE NEWS
  // ============================================================
  const analyzeNews = async () => {
    const combined = `${title} ${text}`.trim();
    if (!combined || combined.length < 10) {
      setError("Please enter a meaningful headline or article content (at least 10 characters).");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Analysis request failed.");
      }

      if (!data.success) {
        setError(data.error || "Unable to analyze this article.");
        return;
      }

      setResult(data);
      // Refresh history & stats in the background
      fetchHistory();
      fetchStats();
    } catch (err) {
      console.error("Analyze error:", err);
      setError("Unable to connect to TruthLens AI backend. Please verify FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOAD SAMPLE STORIES
  // ============================================================
  const loadSample = (type) => {
    const sample = SAMPLE_STORIES[type];
    if (sample) {
      setTitle(sample.title);
      setText(sample.text);
      setError("");
      setResult(null);
      setSampleNotice(`Loaded sample: ${type === "genuine" ? "Likely Genuine news" : "Sensational claim"}`);
      setTimeout(() => setSampleNotice(""), 3500);
    }
  };

  // ============================================================
  // CLEAR ANALYZER
  // ============================================================
  const clearAll = () => {
    setTitle("");
    setText("");
    setResult(null);
    setError("");
    setSampleNotice("");
  };

  // ============================================================
  // FORMAT HISTORY DATE
  // ============================================================
  const formatDate = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recorded";
    }
  };

  const isGenuine = result?.prediction === 1;

  // Filter history items
  const filteredHistory = history.filter((item) => {
    if (historyFilter === "genuine") return item.prediction === 1;
    if (historyFilter === "fake") return item.prediction === 0;
    return true;
  });

  return (
    <div className="app">
      {/* Background Ambience */}
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />
      <div className="grid-overlay" />

      {/* ======================================================
          NAVBAR
      ====================================================== */}
      <header className="navbar-container">
        <nav className="navbar">
          <a className="brand" href="#">
            <div className="brand-mark">
              <span>TL</span>
            </div>
            <div className="brand-copy">
              <strong>TruthLens</strong>
              <span>AI</span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <div className="nav-links">
            <a href="#">Home</a>
            <a href="#analyzer">Analyze</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pipeline">Pipeline</a>
            <a href="#models">Models</a>
            <a href="#history">History</a>
          </div>

          <div className="nav-actions">
            <div className="system-status" title={systemHealth.online ? "Backend Online" : "Backend Offline"}>
              <span className={`status-pulse ${systemHealth.online ? "online" : "offline"}`} />
              <span className="status-label">AI Engine</span>
              <strong>{systemHealth.online ? "ONLINE" : "OFFLINE"}</strong>
            </div>

            <a href="#analyzer" className="nav-cta">
              Analyze News
            </a>

            {/* Mobile Menu Toggle */}
            <button
              className="mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer">
            <a href="#" onClick={() => setMobileMenuOpen(false)}>Home</a>
            <a href="#analyzer" onClick={() => setMobileMenuOpen(false)}>Analyze News</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#pipeline" onClick={() => setMobileMenuOpen(false)}>Technical Pipeline</a>
            <a href="#models" onClick={() => setMobileMenuOpen(false)}>Model Benchmarks</a>
            <a href="#history" onClick={() => setMobileMenuOpen(false)}>Analysis History</a>
          </div>
        )}
      </header>

      <main>
        {/* ====================================================
            HERO
        ==================================================== */}
        <section className="hero">
          <div className="hero-badge">
            <Sparkles size={13} />
            <span>AI-POWERED NEWS CREDIBILITY ASSESSMENT</span>
          </div>

          <h1>
            See Beyond the <br />
            <span>Headline.</span>
          </h1>

          <p className="hero-description">
            TruthLens AI assesses news credibility using machine learning and natural language processing.
            By analyzing linguistic cues, syntax, and stylistic patterns against verified benchmark data,
            the system delivers an objective credibility risk assessment.
          </p>

          <div className="hero-actions">
            <a href="#analyzer" className="primary-action">
              <span>Analyze a Story</span>
              <ArrowRight size={17} />
            </a>

            <a href="#how-it-works" className="secondary-action">
              <span>How It Works</span>
              <ChevronRight size={16} />
            </a>
          </div>

          {/* Hero Highlight Metrics */}
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-icon">
                <Gauge size={18} />
              </div>
              <div>
                <strong>99.69%</strong>
                <span>Best F1 Score (Linear SVM)</span>
              </div>
            </div>

            <div className="stat-divider" />

            <div className="stat">
              <div className="stat-icon">
                <FileText size={18} />
              </div>
              <div>
                <strong>35K+</strong>
                <span>Training Articles</span>
              </div>
            </div>

            <div className="stat-divider" />

            <div className="stat">
              <div className="stat-icon">
                <Layers3 size={18} />
              </div>
              <div>
                <strong>3 Models</strong>
                <span>Evaluated Classifiers</span>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            LIVE STATS BANNER (FROM MONGODB)
        ==================================================== */}
        {stats && stats.total_analyses > 0 && (
          <section className="stats-banner">
            <div className="stats-banner-card">
              <div className="stats-banner-header">
                <div className="stats-title">
                  <BarChart3 size={16} />
                  <span>PLATFORM AUDIT METRICS</span>
                </div>
                <div className="stats-source">
                  <Database size={13} />
                  <span>Live MongoDB Sync</span>
                </div>
              </div>

              <div className="stats-banner-grid">
                <div className="stat-chip">
                  <span className="chip-label">TOTAL ASSESSED</span>
                  <strong className="chip-value">{stats.total_analyses}</strong>
                </div>
                <div className="stat-chip">
                  <span className="chip-label">LIKELY GENUINE</span>
                  <strong className="chip-value genuine">{stats.likely_genuine_count}</strong>
                </div>
                <div className="stat-chip">
                  <span className="chip-label">POTENTIALLY FAKE</span>
                  <strong className="chip-value fake">{stats.potentially_fake_count}</strong>
                </div>
                <div className="stat-chip">
                  <span className="chip-label">AVG CONFIDENCE</span>
                  <strong className="chip-value">{stats.avg_confidence}%</strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ====================================================
            ANALYZER
        ==================================================== */}
        <section className="analyzer-section" id="analyzer">
          <div className="section-intro">
            <div>
              <span className="section-number">01</span>
              <span className="section-kicker">ANALYSIS WORKSPACE</span>
            </div>

            <div className="analyzer-controls">
              <button className="clear-button" onClick={clearAll} title="Clear inputs and result">
                <RotateCcw size={13} />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="analyzer-heading">
            <h2>What are you reading?</h2>
            <p>
              Submit a news headline, article content, or both. The trained Linear SVM classifier
              will evaluate linguistic structure and report a credibility risk assessment.
            </p>
          </div>

          {/* Quick Sample Selector */}
          <div className="sample-bar">
            <span className="sample-prompt">Try a sample story:</span>
            <div className="sample-buttons">
              <button
                type="button"
                className="sample-btn genuine"
                onClick={() => loadSample("genuine")}
              >
                <CheckCircle2 size={13} />
                <span>Sample Genuine Story</span>
              </button>
              <button
                type="button"
                className="sample-btn fake"
                onClick={() => loadSample("fake")}
              >
                <CircleAlert size={13} />
                <span>Sample Sensational Claim</span>
              </button>
            </div>
          </div>

          {sampleNotice && (
            <div className="sample-toast">
              <Check size={13} />
              <span>{sampleNotice}</span>
            </div>
          )}

          <div className="analyzer-grid">
            {/* Input Panel */}
            <div className="glass-card input-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-eyebrow">INPUT DATA</span>
                  <h3>News Content</h3>
                </div>

                <div className="secure-badge">
                  <ShieldCheck size={13} />
                  <span>Local Fast Engine</span>
                </div>
              </div>

              {/* Headline Field */}
              <div className="field">
                <div className="field-label">
                  <label htmlFor="headline-input">HEADLINE / TITLE</label>
                  <span>Optional</span>
                </div>
                <input
                  id="headline-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Paste or enter the news headline..."
                />
              </div>

              {/* Article Content Field */}
              <div className="field">
                <div className="field-label">
                  <label htmlFor="article-input">ARTICLE BODY</label>
                  <span>{text.length.toLocaleString()} characters</span>
                </div>
                <textarea
                  id="article-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the full article body or excerpt here for comprehensive credibility analysis..."
                />
              </div>

              {/* Error Message Banner */}
              {error && (
                <div className="error-message">
                  <CircleAlert size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Analyze Button */}
              <button
                className="analyze-button"
                onClick={analyzeNews}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="spin" size={18} />
                    <span>Analyzing patterns...</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit size={18} />
                    <span>Analyze with TruthLens</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              <div className="input-footer">
                <Activity size={13} />
                <span>TF-IDF Vectorization (100,000 features) + Linear Support Vector Machine</span>
              </div>
            </div>

            {/* Result Panel */}
            <div className="glass-card result-panel">
              {/* Ready / Empty State */}
              {!result && !loading && (
                <div className="result-empty">
                  <div className="empty-orbit">
                    <div className="empty-icon">
                      <BrainCircuit size={30} />
                    </div>
                  </div>

                  <span className="panel-eyebrow">READY FOR ANALYSIS</span>
                  <h3>Awaiting your story</h3>
                  <p>
                    Provide news text on the left and click <strong>Analyze with TruthLens</strong> to
                    generate a machine-learning credibility assessment.
                  </p>

                  <div className="model-pill">
                    <span />
                    <span>NLP Feature Extraction</span>
                    <i />
                    <span>Credibility Risk Assessment</span>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="result-empty">
                  <div className="loading-orbit">
                    <Loader2 size={32} />
                  </div>

                  <span className="panel-eyebrow">PROCESSING CONTENT</span>
                  <h3>Evaluating Linguistic Signals</h3>
                  <p>
                    Cleaning text, extracting TF-IDF n-grams, and calculating decision boundary margin...
                  </p>

                  <div className="processing-bar">
                    <span />
                  </div>
                </div>
              )}

              {/* Analysis Result State */}
              {result && !loading && (
                <div className="result-content">
                  <div className="result-header">
                    <div>
                      <span className="panel-eyebrow">ASSESSMENT REPORT</span>
                      <span className="result-time">Automated Credibility Evaluation</span>
                    </div>

                    <div className={`result-status ${isGenuine ? "genuine" : "fake"}`}>
                      {isGenuine ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
                    </div>
                  </div>

                  {/* Main Assessment Verdict */}
                  <div className={`verdict ${isGenuine ? "genuine" : "fake"}`}>
                    {result.label}
                  </div>

                  {/* Tags */}
                  <div className="tags-row">
                    <div className={`risk-tag ${isGenuine ? "genuine" : "fake"}`}>
                      {result.risk_level.toUpperCase()}
                    </div>
                    {result.database_saved && (
                      <div className="db-saved-tag">
                        <Database size={11} />
                        <span>Saved to History</span>
                      </div>
                    )}
                  </div>

                  {/* WHAT THIS MEANS */}
                  <div className="result-explanation">
                    <div className="explanation-icon">
                      {isGenuine ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
                    </div>
                    <div>
                      <span className="explanation-title">WHAT THIS MEANS</span>
                      <p>
                        {result.explanation ||
                          (isGenuine
                            ? "The content demonstrates vocabulary, syntax, and stylistic patterns consistent with genuine journalistic reporting in our benchmark data."
                            : "The content exhibits sensational phrasing, structural anomalies, or patterns frequently associated with unverified or misleading news.")}
                      </p>
                    </div>
                  </div>

                  {/* OUR RECOMMENDATION */}
                  <div className="recommendation">
                    <div className="recommendation-icon">
                      <ShieldCheck size={17} />
                    </div>
                    <div>
                      <span className="explanation-title">OUR RECOMMENDATION</span>
                      <p>
                        {result.recommendation ||
                          (isGenuine
                            ? "This text shows low risk indicators, but verifying claims with primary sources or official documentation is always recommended."
                            : "Exercise caution before sharing. Cross-reference claims with established, independent news organizations and primary sources.")}
                      </p>
                    </div>
                  </div>

                  {/* CONFIDENCE METER */}
                  <div className="confidence-section">
                    <div className="confidence-top">
                      <span>ASSESSMENT CONFIDENCE</span>
                      <strong>{result.confidence}%</strong>
                    </div>

                    <div className="confidence-track">
                      <div
                        className={`confidence-progress ${isGenuine ? "genuine" : "fake"}`}
                        style={{
                          width: `${Math.min(Math.max(Number(result.confidence) || 0, 5), 100)}%`,
                        }}
                      />
                    </div>

                    <div className="confidence-scale">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* RESULT METRICS SUMMARY GRID */}
                  <div className="result-metrics">
                    <div className="metric">
                      <span>ASSESSMENT</span>
                      <strong>{result.label}</strong>
                    </div>

                    <div className="metric">
                      <span>RISK LEVEL</span>
                      <strong>{result.risk_level}</strong>
                    </div>

                    <div className="metric">
                      <span>CONFIDENCE</span>
                      <strong>{result.confidence}%</strong>
                    </div>

                    <div className="metric">
                      <span>CONTENT SIGNAL</span>
                      <strong>
                        {Number(result.confidence) >= 80
                          ? "Strong"
                          : Number(result.confidence) >= 60
                          ? "Moderate"
                          : "Uncertain"}
                      </strong>
                    </div>
                  </div>

                  {/* SCIENTIFIC DISCLAIMER */}
                  <div className="disclaimer">
                    <CircleAlert size={15} />
                    <p>
                      <strong>Important Notice:</strong> TruthLens AI provides an automated assessment
                      derived from patterns learned from training data. It does not independently verify
                      real-world facts or guarantee absolute truthfulness.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ====================================================
            HOW IT WORKS (5 USER STEPS)
        ==================================================== */}
        <section className="how-it-works-section" id="how-it-works">
          <div className="section-intro">
            <div>
              <span className="section-number">02</span>
              <span className="section-kicker">METHODOLOGY</span>
            </div>
          </div>

          <div className="section-title-row">
            <div>
              <h2>How TruthLens Works.</h2>
              <p>
                Five structured steps transform raw news text into an interpretable credibility assessment.
              </p>
            </div>
            <div className="pipeline-tech">
              <Cpu size={15} />
              <span>5-STAGE PROCESS</span>
            </div>
          </div>

          <div className="how-steps-grid">
            <div className="how-step-card">
              <div className="step-badge">STEP 1</div>
              <h3>Submit News Story</h3>
              <p>
                The user provides a news headline, article body, or combined story text into the analyzer workspace.
              </p>
            </div>

            <div className="how-step-card">
              <div className="step-badge">STEP 2</div>
              <h3>Text Normalization</h3>
              <p>
                HTML tags, web links, email addresses, and punctuation are filtered out, converting content to clean lowercase tokens.
              </p>
            </div>

            <div className="how-step-card">
              <div className="step-badge">STEP 3</div>
              <h3>TF-IDF Feature Mapping</h3>
              <p>
                Clean text is converted into a 100,000-dimensional TF-IDF vector capturing unigram and bigram word importance.
              </p>
            </div>

            <div className="how-step-card">
              <div className="step-badge">STEP 4</div>
              <h3>Linear SVM Classification</h3>
              <p>
                The trained support vector machine measures the decision margin to determine credibility status and risk level.
              </p>
            </div>

            <div className="how-step-card">
              <div className="step-badge">STEP 5</div>
              <h3>History & Audit Trail</h3>
              <p>
                The assessment, confidence score, and timestamp are securely recorded to MongoDB for future review and audit.
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================
            TECHNICAL PIPELINE
        ==================================================== */}
        <section className="pipeline-section" id="pipeline">
          <div className="section-intro">
            <div>
              <span className="section-number">03</span>
              <span className="section-kicker">SYSTEM ARCHITECTURE</span>
            </div>
          </div>

          <div className="section-title-row">
            <div>
              <h2>End-to-end technical pipeline.</h2>
              <p>
                Designed for high throughput and reproducibility across academic demonstration and production APIs.
              </p>
            </div>
            <div className="pipeline-tech">
              <BrainCircuit size={15} />
              <span>NLP & ML PIPELINE</span>
            </div>
          </div>

          <div className="pipeline-grid">
            <PipelineStep
              number="01"
              title="News Input"
              icon={<FileText size={20} />}
              text="Raw headline and article text ingested via REST API."
            />
            <PipelineStep
              number="02"
              title="Preprocessing"
              icon={<Sparkles size={20} />}
              text="Regex cleaning, lowercase normalization, and whitespace cleanup."
            />
            <PipelineStep
              number="03"
              title="TF-IDF Features"
              icon={<Layers3 size={20} />}
              text="100,000 max features, (1, 2) n-grams, sublinear term weighting."
            />
            <PipelineStep
              number="04"
              title="Linear SVM"
              icon={<Cpu size={20} />}
              text="Optimal hyperplane separator with margin-based confidence scoring."
            />
            <PipelineStep
              number="05"
              title="Risk Assessment"
              icon={<ShieldCheck size={20} />}
              text="Generates clear verdict, risk rating, explanation, and recommendations."
            />
            <PipelineStep
              number="06"
              title="MongoDB Storage"
              icon={<Database size={20} />}
              text="Asynchronous persistence of analysis metadata with graceful fallback."
            />
          </div>
        </section>

        {/* ====================================================
            MODEL BENCHMARK
        ==================================================== */}
        <section className="models-section" id="models">
          <div className="section-intro">
            <div>
              <span className="section-number">04</span>
              <span className="section-kicker">MODEL BENCHMARK</span>
            </div>
          </div>

          <div className="section-title-row">
            <div>
              <h2>Empirical model comparison.</h2>
              <p>
                Evaluated against the project dataset (35,918 records) using stratified validation.
                Linear SVM emerged as the best-performing production classifier.
              </p>
            </div>
          </div>

          {/* Benchmark Table */}
          <div className="model-table">
            <div className="model-row model-head">
              <span>CLASSIFIER MODEL</span>
              <span>ACCURACY</span>
              <span>PRECISION</span>
              <span>RECALL</span>
              <span>F1 SCORE</span>
            </div>

            {/* Linear SVM - Winner */}
            <div className="model-row featured-model">
              <div>
                <div className="winner-badge">SELECTED PRODUCTION MODEL</div>
                <strong>Linear SVM (Support Vector Machine)</strong>
              </div>
              <strong>99.67%</strong>
              <strong>99.56%</strong>
              <strong>99.82%</strong>
              <strong>99.69%</strong>
            </div>

            {/* Logistic Regression */}
            <div className="model-row">
              <div>
                <strong>Logistic Regression</strong>
              </div>
              <span>99.25%</span>
              <span>99.03%</span>
              <span>99.56%</span>
              <span>99.30%</span>
            </div>

            {/* Multinomial Naive Bayes */}
            <div className="model-row">
              <div>
                <strong>Multinomial Naive Bayes</strong>
              </div>
              <span>96.30%</span>
              <span>96.75%</span>
              <span>96.23%</span>
              <span>96.49%</span>
            </div>
          </div>

          {/* Benchmark Scientific Note */}
          <p className="benchmark-disclaimer">
            * Performance shown is based on validation data from the project dataset and should not be
            interpreted as guaranteed real-world accuracy across arbitrary unseen domains.
          </p>

          {/* Dataset Specifications Card */}
          <div className="dataset-specs-card">
            <div className="specs-col">
              <span className="specs-label">DATASET SIZE</span>
              <strong>35,918 Articles</strong>
              <small>32,175 Cleaned (25,740 Train / 6,435 Val)</small>
            </div>
            <div className="specs-col">
              <span className="specs-label">FEATURE EXTRACTION</span>
              <strong>TF-IDF Vectorizer</strong>
              <small>100,000 features · Unigrams + Bigrams</small>
            </div>
            <div className="specs-col">
              <span className="specs-label">DECISION FUNCTION</span>
              <strong>Hyperplane Margin</strong>
              <small>Sigmoid confidence mapping</small>
            </div>
            <div className="specs-col">
              <span className="specs-label">TARGET CLASSES</span>
              <strong>Binary Classification</strong>
              <small>0: Fake · 1: Real</small>
            </div>
          </div>
        </section>

        {/* ====================================================
            HISTORY
        ==================================================== */}
        <section className="history-section" id="history">
          <div className="section-intro">
            <div>
              <span className="section-number">05</span>
              <span className="section-kicker">ANALYSIS HISTORY</span>
            </div>

            <button
              className="clear-button"
              onClick={() => {
                fetchHealth();
                fetchHistory();
                fetchStats();
              }}
              disabled={historyLoading}
              title="Reload history from database"
            >
              {historyLoading ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <RotateCcw size={13} />
              )}
              <span>Refresh</span>
            </button>
          </div>

          <div className="section-title-row">
            <div>
              <h2>Audit history & recent analyses.</h2>
              <p>
                Previous TruthLens assessments retrieved directly from MongoDB.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="history-filter-bar">
              <Filter size={13} />
              <button
                className={`filter-pill ${historyFilter === "all" ? "active" : ""}`}
                onClick={() => setHistoryFilter("all")}
              >
                All ({history.length})
              </button>
              <button
                className={`filter-pill ${historyFilter === "genuine" ? "active" : ""}`}
                onClick={() => setHistoryFilter("genuine")}
              >
                Likely Genuine ({history.filter((i) => i.prediction === 1).length})
              </button>
              <button
                className={`filter-pill ${historyFilter === "fake" ? "active" : ""}`}
                onClick={() => setHistoryFilter("fake")}
              >
                Potentially Fake ({history.filter((i) => i.prediction === 0).length})
              </button>
            </div>
          </div>

          {/* History Empty State */}
          {!historyLoading && filteredHistory.length === 0 && (
            <div className="history-empty">
              <History size={30} />
              <h3>No analysis records found</h3>
              <p>
                {history.length === 0
                  ? "Submit a news story above to generate your first credibility assessment."
                  : "No analysis records match the selected filter."}
              </p>
            </div>
          )}

          {/* History Cards Grid */}
          {filteredHistory.length > 0 && (
            <div className="history-grid">
              {filteredHistory.map((item, index) => {
                const genuine = item.prediction === 1;
                const itemId = item.id || item._id;

                return (
                  <div className="history-card" key={itemId || `${item.created_at}-${index}`}>
                    <div className="history-card-top">
                      <div>
                        <span className="panel-eyebrow">
                          ANALYSIS #{history.length - index}
                        </span>
                        <span className="history-date">
                          {formatDate(item.created_at)}
                        </span>
                      </div>

                      <div className="history-top-actions">
                        <div className={`history-verdict ${genuine ? "genuine" : "fake"}`}>
                          {genuine ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
                          <span>{item.label || (genuine ? "Likely Genuine" : "Potentially Fake")}</span>
                        </div>

                        {itemId && (
                          <button
                            className="delete-history-btn"
                            onClick={(e) => deleteHistoryItem(itemId, e)}
                            disabled={deletingId === itemId}
                            title="Delete this record"
                          >
                            {deletingId === itemId ? (
                              <Loader2 size={13} className="spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <h3>{item.title || "Untitled story content"}</h3>

                    {item.text && (
                      <p className="history-snippet">
                        {item.text.length > 140
                          ? `${item.text.slice(0, 140)}...`
                          : item.text}
                      </p>
                    )}

                    <div className="history-meta">
                      <div>
                        <span>RISK LEVEL</span>
                        <strong>{item.risk_level || (genuine ? "Low Risk" : "High Risk")}</strong>
                      </div>

                      <div>
                        <span>CONFIDENCE</span>
                        <strong>{item.confidence}%</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ======================================================
          FOOTER
      ====================================================== */}
      <footer id="about">
        <div className="footer-brand">
          <div className="brand-mark small">
            <span>TL</span>
          </div>
          <div>
            <strong>TruthLens AI</strong>
            <span>AI-Powered News Credibility & Risk Analysis Platform</span>
          </div>
        </div>

        <div className="footer-disclaimer-box">
          <p>
            <strong>Project Disclaimer:</strong> TruthLens AI is developed as a 7th-Semester Major Project
            in Computer Science & Engineering. The system provides an automated credibility assessment
            based on patterns identified in trained news datasets. It does not independently verify facts,
            authenticate source credentials, or guarantee factual truth.
          </p>
        </div>

        <div className="footer-right">
          <span>7th Semester Major Project · B.Tech CSE</span>
          <span>FastAPI · React · Scikit-Learn · MongoDB Atlas</span>
        </div>
      </footer>
    </div>
  );
}

// Helper component for architecture pipeline
function PipelineStep({ number, title, icon, text }) {
  return (
    <div className="pipeline-step">
      <div className="step-top">
        <span>{number}</span>
        <div className="step-icon">{icon}</div>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="step-arrow">
        <ArrowRight size={14} />
      </div>
    </div>
  );
}

export default App;