import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CapabilityStrip from "./components/CapabilityStrip";
import Analyzer from "./components/Analyzer";
import AnalysisResult from "./components/AnalysisResult";
import LiveEvidenceSection from "./components/LiveEvidenceSection";
import HowItWorks from "./components/HowItWorks";
import FeaturesGrid from "./components/FeaturesGrid";
import ResponsibleAI from "./components/ResponsibleAI";
import Footer from "./components/Footer";
import UserWorkspace from "./components/UserWorkspace";
import AdminPortal from "./components/AdminPortal";
import AuthModal from "./components/AuthModal";
import SaveModal from "./components/SaveModal";
import Toast from "./components/Toast";

import "./App.css";

// Robust API base detection: environment variable, or production Render fallback, or local dev
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://truthlens-ai-api-7bu4.onrender.com"
    : "http://127.0.0.1:8000");

// Verified Predefined Sample Claims
const SAMPLE_STORIES = {
  genuine: {
    title: "GENEVA (Reuters) - International Renewable Energy Consortium Announces 2026 Solar Infrastructure Framework",
    text: "Delegates from over forty nations concluded their annual climate summit on Wednesday, formally adopting a multilateral agreement to expand regional solar and wind power grids. The initiative establishes standardized grid interoperability protocols and joint funding facilities for emerging markets. According to the joint communique released by the energy council, independent environmental agencies will monitor emission reduction benchmarks across participating sectors starting next quarter."
  },
  artemis: {
    title: "NASA Confirms Artemis Crew Architecture & Deep Space Trajectory Testing Window",
    text: "Engineers and mission controllers have finalized flight path parameters for the upcoming crewed lunar flyby test. The mission will evaluate life-support systems, thermal protection re-entry shields, and deep space navigational telemetry in high lunar orbit before clearing the vehicle for subsequent surface landing operations."
  },
  fake: {
    title: "BANNED DISCOVERY: Secret Underground Cabal Confirmed Using Domestic Weather Antennas To Broadcast Hypnotic Mindwaves",
    text: "Shocking leaked military documents confirmed today that an elite secret global society has been broadcasting hypnotic frequencies directly through domestic weather antennas! Mainstream media conglomerates have been threatened with immediate shutdown if they report the truth. Whistleblowers urge everyone to disconnect all electronic equipment immediately before the global blackout begins next Tuesday!"
  }
};

export default function App() {
  // Navigation & Active View State
  const [activeTab, setActiveTab] = useState("analyzer"); // 'analyzer' | 'workspace' | 'admin'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Persistent Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("truthlens_theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("truthlens_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem("truthlens_token") || "");
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("truthlens_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // Analyzer State
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [fetchEvidence, setFetchEvidence] = useState(true);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sampleNotice, setSampleNotice] = useState("");

  // Save / Bookmark Modal State
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveAnalysisId, setSaveAnalysisId] = useState("");
  const [saveNotes, setSaveNotes] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Workspace Sub-Tab State
  const [workspaceSubTab, setWorkspaceSubTab] = useState("dashboard"); // 'dashboard' | 'history' | 'saved' | 'reports' | 'settings'
  const [userHistory, setUserHistory] = useState([]);
  const [userHistoryLoading, setUserHistoryLoading] = useState(false);
  const [userHistorySearch, setUserHistorySearch] = useState("");
  const [userHistoryFilter, setUserHistoryFilter] = useState("all");
  const [savedItems, setSavedItems] = useState([]);
  const [savedItemsLoading, setSavedItemsLoading] = useState(false);

  // Admin Dashboard Sub-Tab State
  const [adminSubTab, setAdminSubTab] = useState("dashboard"); // 'dashboard' | 'users' | 'analyses' | 'evidence' | 'ml' | 'health'
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminHistory, setAdminHistory] = useState([]);
  const [adminModelDetails, setAdminModelDetails] = useState(null);
  const [adminUserSearch, setAdminUserSearch] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(null);

  // Public Platform History & Health
  const [systemHealth, setSystemHealth] = useState({
    status: "checking",
    online: false,
    dbConnected: false
  });

  // Floating Toast State
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg, duration = 3500) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), duration);
  };

  // ============================================================
  // AUTHENTICATION SESSION RESTORATION
  // ============================================================
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!isMounted) return null;
        if (res.ok) {
          return res.json();
        } else if (res.status === 401 || res.status === 403) {
          setToken("");
          setUser(null);
          localStorage.removeItem("truthlens_token");
          localStorage.removeItem("truthlens_user");
        }
        return null;
      })
      .then((userData) => {
        if (isMounted && userData) {
          setUser(userData);
          localStorage.setItem("truthlens_user", JSON.stringify(userData));
        }
      })
      .catch((err) => {
        console.warn("Session verification note:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // ============================================================
  // ENGINE HEALTH CHECK (WITH AUTO-RETRY)
  // ============================================================
  useEffect(() => {
    let isMounted = true;
    let retryTimer = null;

    const checkHealth = (attempt = 1) => {
      if (attempt === 1 && isMounted) {
        setSystemHealth((prev) => ({ ...prev, status: "checking" }));
      }

      fetch(`${API_BASE}/api/health`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data) {
            setSystemHealth({
              status: "online",
              online: data.status === "healthy" || data.status === "degraded",
              dbConnected: data.database_connected ?? true
            });
          } else if (isMounted) {
            if (attempt < 3) {
              retryTimer = setTimeout(() => checkHealth(attempt + 1), 3500);
            } else {
              setSystemHealth({ status: "offline", online: false, dbConnected: false });
            }
          }
        })
        .catch(() => {
          if (isMounted) {
            if (attempt < 3) {
              retryTimer = setTimeout(() => checkHealth(attempt + 1), 3500);
            } else {
              setSystemHealth({ status: "offline", online: false, dbConnected: false });
            }
          }
        });
    };

    checkHealth(1);
    const interval = setInterval(() => checkHealth(1), 30000);

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(interval);
    };
  }, []);

  // ============================================================
  // FETCH USER WORKSPACE ON TAB / TOKEN CHANGE
  // ============================================================
  const refreshWorkspaceData = () => {
    if (!token) return;
    Promise.allSettled([
      fetch(`${API_BASE}/api/user/history`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch(`${API_BASE}/api/user/saved`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]).then(async ([histRes, savedRes]) => {
      if (histRes.status === "fulfilled" && histRes.value.ok) {
        const d = await histRes.value.json();
        if (d.success) setUserHistory(d.history || []);
      }
      if (savedRes.status === "fulfilled" && savedRes.value.ok) {
        const d = await savedRes.value.json();
        if (d.success) setSavedItems(d.saved || []);
      }
    });
  };

  useEffect(() => {
    if (activeTab !== "workspace" || !token) return;
    let isMounted = true;

    Promise.allSettled([
      fetch(`${API_BASE}/api/user/history`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch(`${API_BASE}/api/user/saved`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]).then(async ([histRes, savedRes]) => {
      if (!isMounted) return;
      if (histRes.status === "fulfilled" && histRes.value.ok) {
        const d = await histRes.value.json();
        if (d.success) setUserHistory(d.history || []);
      }
      if (savedRes.status === "fulfilled" && savedRes.value.ok) {
        const d = await savedRes.value.json();
        if (d.success) setSavedItems(d.saved || []);
      }
      setUserHistoryLoading(false);
      setSavedItemsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [activeTab, token]);

  // ============================================================
  // FETCH ADMIN DASHBOARD DATA
  // ============================================================
  const refreshAdminData = () => {
    if (!token || user?.role !== "admin") return;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.allSettled([
      fetch(`${API_BASE}/api/admin/stats`, { headers }),
      fetch(`${API_BASE}/api/admin/users`, { headers }),
      fetch(`${API_BASE}/api/admin/history`, { headers }),
      fetch(`${API_BASE}/api/admin/model-details`, { headers })
    ]).then(async ([statsRes, usersRes, histRes, modelRes]) => {
      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const d = await statsRes.value.json();
        setAdminStats(d);
      }
      if (usersRes.status === "fulfilled" && usersRes.value.ok) {
        const d = await usersRes.value.json();
        if (d.success) setAdminUsers(d.users || []);
      }
      if (histRes.status === "fulfilled" && histRes.value.ok) {
        const d = await histRes.value.json();
        if (d.success) setAdminHistory(d.history || []);
      }
      if (modelRes.status === "fulfilled" && modelRes.value.ok) {
        const d = await modelRes.value.json();
        if (d.success) setAdminModelDetails(d);
      }
    });
  };

  useEffect(() => {
    if (activeTab !== "admin" || user?.role !== "admin" || !token) return;
    let isMounted = true;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.allSettled([
      fetch(`${API_BASE}/api/admin/stats`, { headers }),
      fetch(`${API_BASE}/api/admin/users`, { headers }),
      fetch(`${API_BASE}/api/admin/history`, { headers }),
      fetch(`${API_BASE}/api/admin/model-details`, { headers })
    ]).then(async ([statsRes, usersRes, histRes, modelRes]) => {
      if (!isMounted) return;
      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const d = await statsRes.value.json();
        setAdminStats(d);
      }
      if (usersRes.status === "fulfilled" && usersRes.value.ok) {
        const d = await usersRes.value.json();
        if (d.success) setAdminUsers(d.users || []);
      }
      if (histRes.status === "fulfilled" && histRes.value.ok) {
        const d = await histRes.value.json();
        if (d.success) setAdminHistory(d.history || []);
      }
      if (modelRes.status === "fulfilled" && modelRes.value.ok) {
        const d = await modelRes.value.json();
        if (d.success) setAdminModelDetails(d);
      }
      setAdminLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [activeTab, user?.role, token]);

  // ============================================================
  // AUTHENTICATION HANDLERS
  // ============================================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (authModal === "register") {
      if (!authForm.name || authForm.name.trim().length < 2) {
        setAuthError("Name must be at least 2 characters.");
        return;
      }
      if (authForm.password.length < 6) {
        setAuthError("Password must be at least 6 characters.");
        return;
      }
      if (authForm.password !== authForm.confirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }
    }

    setAuthLoading(true);
    try {
      const endpoint = authModal === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        authModal === "register"
          ? { name: authForm.name.trim(), email: authForm.email.trim(), password: authForm.password }
          : { email: authForm.email.trim(), password: authForm.password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Authentication request failed.");
      }

      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("truthlens_token", data.access_token);
      localStorage.setItem("truthlens_user", JSON.stringify(data.user));

      setAuthModal(null);
      setAuthForm({ name: "", email: "", password: "", confirmPassword: "" });
      showToast(`Welcome, ${data.user.name}!`);
    } catch (err) {
      setAuthError(err.message || "An unexpected error occurred.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("truthlens_token");
    localStorage.removeItem("truthlens_user");
    if (activeTab === "workspace" || activeTab === "admin") {
      setActiveTab("analyzer");
    }
    showToast("You have been signed out.");
  };

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
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          text,
          fetch_evidence: fetchEvidence
        })
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

      // Smooth scroll to result
      setTimeout(() => {
        const el = document.getElementById("analysis-result");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);

      if (token) {
        refreshWorkspaceData();
      }
    } catch (err) {
      console.error("Analyze error:", err);
      setError("Unable to connect to TruthLens AI backend. Please verify FastAPI is running.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SAVE / BOOKMARK ANALYSIS
  // ============================================================
  const triggerBookmark = (analysisId) => {
    if (!token) {
      setAuthModal("login");
      showToast("Please sign in to bookmark analyses to your personal workspace.");
      return;
    }
    setSaveAnalysisId(analysisId);
    setSaveNotes("");
    setSaveModalOpen(true);
  };

  const confirmSaveAnalysis = async (e) => {
    e.preventDefault();
    if (!saveAnalysisId) return;

    setSaveLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/saved`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          analysis_id: saveAnalysisId,
          notes: saveNotes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Unable to bookmark analysis.");
      }

      setSaveModalOpen(false);
      showToast("Analysis bookmarked to your workspace!");
      refreshWorkspaceData();
    } catch (err) {
      console.error("Bookmark error:", err);
      showToast(err.message || "Failed to save bookmark.");
    } finally {
      setSaveLoading(false);
    }
  };

  const removeSavedBookmark = async (savedId) => {
    if (!savedId || !token) return;
    try {
      const res = await fetch(`${API_BASE}/api/user/saved/${savedId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSavedItems((prev) => prev.filter((i) => i.id !== savedId && i._id !== savedId));
        showToast("Bookmark removed.");
      }
    } catch (err) {
      console.error("Remove bookmark error:", err);
    }
  };

  const deleteUserHistoryItem = async (itemId) => {
    if (!itemId || !token) return;
    try {
      const res = await fetch(`${API_BASE}/api/user/history/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setUserHistory((prev) => prev.filter((i) => i.id !== itemId && i._id !== itemId));
        showToast("Record removed from your history.");
      }
    } catch (err) {
      console.error("Delete user history error:", err);
    }
  };

  // ============================================================
  // EXPORT HANDLERS (PDF & JSON)
  // ============================================================
  const downloadPdfReport = async (analysisId) => {
    if (!analysisId) return;
    if (!token) {
      setAuthModal("login");
      showToast("Please sign in to generate and download branded PDF reports.");
      return;
    }

    try {
      showToast("Generating publication-ready PDF report...");
      const res = await fetch(`${API_BASE}/api/user/export/pdf/${analysisId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "PDF export failed.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `truthlens-credibility-report-${analysisId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("PDF report downloaded successfully!");
    } catch (err) {
      console.error("PDF download error:", err);
      showToast(err.message || "Could not generate PDF report.");
    }
  };

  const downloadJsonReport = async (analysisId) => {
    if (!analysisId) return;

    try {
      showToast("Exporting structured JSON analysis...");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/api/user/export/json/${analysisId}`, { headers });

      let jsonData;
      if (res.ok) {
        jsonData = await res.json();
      } else if (result && (result.id === analysisId || analysisId === "current")) {
        jsonData = result;
      } else {
        throw new Error("Unable to export analysis data.");
      }

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `truthlens-analysis-${analysisId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("JSON exported successfully!");
    } catch (err) {
      console.error("JSON export error:", err);
      showToast(err.message || "Failed to export JSON.");
    }
  };

  // ============================================================
  // ADMIN ACTIONS
  // ============================================================
  const handleAdminToggleRole = async (targetUserId, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      setAdminActionLoading(targetUserId);
      const res = await fetch(`${API_BASE}/api/admin/users/${targetUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        showToast(`User role updated to ${newRole}.`);
        refreshAdminData();
      }
    } catch (err) {
      console.error("Role update error:", err);
    } finally {
      setAdminActionLoading(null);
    }
  };

  const handleAdminToggleActive = async (targetUserId, currentActive) => {
    try {
      setAdminActionLoading(targetUserId);
      const res = await fetch(`${API_BASE}/api/admin/users/${targetUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentActive })
      });
      if (res.ok) {
        showToast(`Account ${currentActive ? "deactivated" : "activated"}.`);
        refreshAdminData();
      }
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setAdminActionLoading(null);
    }
  };

  const handleAdminDeleteUser = async (targetUserId) => {
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    try {
      setAdminActionLoading(targetUserId);
      const res = await fetch(`${API_BASE}/api/admin/users/${targetUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("User deleted from system.");
        refreshAdminData();
      }
    } catch (err) {
      console.error("Delete user error:", err);
    } finally {
      setAdminActionLoading(null);
    }
  };

  // Sample stories loader
  const loadSample = (type) => {
    const sample = SAMPLE_STORIES[type];
    if (sample) {
      setTitle(sample.title);
      setText(sample.text);
      setError("");
      setResult(null);
      setSampleNotice(`Loaded sample: ${type === "genuine" ? "Renewable Energy (Genuine)" : type === "artemis" ? "Artemis Lunar (Genuine)" : "Sensational Mindwaves Claim"}`);
      setTimeout(() => setSampleNotice(""), 3500);

      // Scroll to analyzer
      const el = document.getElementById("analyzer");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const clearAll = () => {
    setTitle("");
    setText("");
    setResult(null);
    setError("");
    setSampleNotice("");
  };

  const scrollToAnalyzer = () => {
    setActiveTab("analyzer");
    const el = document.getElementById("analyzer");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      {/* Toast Notification */}
      <Toast message={toastMessage} />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        systemHealth={systemHealth}
        theme={theme}
        toggleTheme={toggleTheme}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        openAuthModal={(mode) => {
          setAuthModal(mode);
          setAuthError("");
        }}
        handleLogout={handleLogout}
        setWorkspaceSubTab={setWorkspaceSubTab}
      />

      {/* Main View Router */}
      <main className="main-content" id="top">
        {activeTab === "workspace" && user ? (
          <UserWorkspace
            user={user}
            workspaceSubTab={workspaceSubTab}
            setWorkspaceSubTab={setWorkspaceSubTab}
            userHistory={userHistory}
            userHistoryLoading={userHistoryLoading}
            userHistorySearch={userHistorySearch}
            setUserHistorySearch={setUserHistorySearch}
            userHistoryFilter={userHistoryFilter}
            setUserHistoryFilter={setUserHistoryFilter}
            savedItems={savedItems}
            savedItemsLoading={savedItemsLoading}
            onDeleteHistoryItem={deleteUserHistoryItem}
            onRemoveSaved={removeSavedBookmark}
            onExportPdf={downloadPdfReport}
            onExportJson={downloadJsonReport}
            onNewAnalysis={() => {
              setActiveTab("analyzer");
              setTimeout(scrollToAnalyzer, 50);
            }}
            theme={theme}
            toggleTheme={toggleTheme}
            handleLogout={handleLogout}
          />
        ) : activeTab === "admin" && user?.role === "admin" ? (
          <AdminPortal
            adminSubTab={adminSubTab}
            setAdminSubTab={setAdminSubTab}
            adminStats={adminStats}
            adminUsers={adminUsers}
            adminHistory={adminHistory}
            adminModelDetails={adminModelDetails}
            adminUserSearch={adminUserSearch}
            setAdminUserSearch={setAdminUserSearch}
            adminLoading={adminLoading}
            adminActionLoading={adminActionLoading}
            onToggleRole={handleAdminToggleRole}
            onToggleActive={handleAdminToggleActive}
            onDeleteUser={handleAdminDeleteUser}
            onExportPdf={downloadPdfReport}
            onExportJson={downloadJsonReport}
            systemHealth={systemHealth}
          />
        ) : (
          <>
            {/* Public Homepage Experience */}
            <Hero
              onAnalyzeClick={scrollToAnalyzer}
              onLoadSample={loadSample}
            />

            <CapabilityStrip />

            <Analyzer
              title={title}
              setTitle={setTitle}
              text={text}
              setText={setText}
              fetchEvidence={fetchEvidence}
              setFetchEvidence={setFetchEvidence}
              loading={loading}
              error={error}
              sampleNotice={sampleNotice}
              onAnalyze={analyzeNews}
              onClear={clearAll}
              onLoadSample={loadSample}
            />

            <AnalysisResult
              result={result}
              onSave={triggerBookmark}
              onExportPdf={downloadPdfReport}
              onExportJson={downloadJsonReport}
              user={user}
            />

            <LiveEvidenceSection />

            <HowItWorks />

            <FeaturesGrid />

            <ResponsibleAI />
          </>
        )}
      </main>

      {/* Global Minimal Footer */}
      <Footer onAnalyzeClick={scrollToAnalyzer} />

      {/* Modals */}
      <AuthModal
        authModal={authModal}
        setAuthModal={setAuthModal}
        authForm={authForm}
        setAuthForm={setAuthForm}
        authError={authError}
        authLoading={authLoading}
        handleAuthSubmit={handleAuthSubmit}
      />

      <SaveModal
        saveModalOpen={saveModalOpen}
        setSaveModalOpen={setSaveModalOpen}
        saveNotes={saveNotes}
        setSaveNotes={setSaveNotes}
        saveLoading={saveLoading}
        confirmSaveAnalysis={confirmSaveAnalysis}
      />
    </div>
  );
}
