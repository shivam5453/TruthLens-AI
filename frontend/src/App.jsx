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
  User,
  LogIn,
  LogOut,
  UserPlus,
  Bookmark,
  Download,
  ExternalLink,
  Globe,
  ShieldAlert,
  Clock,
} from "lucide-react";

import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Predefined test samples for quick evaluation
const SAMPLE_STORIES = {
  genuine: {
    title: "GENEVA (Reuters) - International Renewable Energy Consortium Announces 2026 Solar Infrastructure Framework",
    text: "Delegates from over forty nations concluded their annual climate summit on Wednesday, formally adopting a multilateral agreement to expand regional solar and wind power grids. The initiative establishes standardized grid interoperability protocols and joint funding facilities for emerging markets. According to the joint communique released by the energy council, independent environmental agencies will monitor emission reduction benchmarks across participating sectors starting next quarter.",
  },
  fake: {
    title: "BANNED DISCOVERY: Secret Underground Cabal Confirmed Using Satellites To Control Mindwaves",
    text: "Shocking leaked military documents confirmed today that an elite secret global society has been broadcasting hypnotic frequencies directly through domestic weather antennas! Mainstream media conglomerates have been threatened with immediate shutdown if they report the truth. Whistleblowers urge everyone to disconnect all electronic equipment immediately before the global blackout begins next Tuesday!",
  },
};

function App() {
  // Navigation & Active View State
  const [activeTab, setActiveTab] = useState("analyzer"); // 'analyzer' | 'workspace' | 'admin'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    confirmPassword: "",
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

  // Workspace State
  const [workspaceSubTab, setWorkspaceSubTab] = useState("history"); // 'history' | 'saved'
  const [userHistory, setUserHistory] = useState([]);
  const [userHistoryLoading, setUserHistoryLoading] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const [savedItemsLoading, setSavedItemsLoading] = useState(false);

  // Admin Dashboard State
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminHistory, setAdminHistory] = useState([]);
  const [adminModelDetails, setAdminModelDetails] = useState(null);
  const [adminUserSearch, setAdminUserSearch] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(null);

  // Public History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  // Platform Stats State
  const [stats, setStats] = useState(null);
  const [systemHealth, setSystemHealth] = useState({ online: true, dbConnected: true });

  // Toast Notification State
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
      headers: { Authorization: `Bearer ${token}` },
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
        console.warn("Session verification warning:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // ============================================================
  // INITIAL PUBLIC DATA LOAD
  // ============================================================
  useEffect(() => {
    let isMounted = true;

    // Health
    fetch(`${API_BASE}/api/health`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setSystemHealth({
            online: data.status === "healthy" || data.status === "degraded",
            dbConnected: data.database_connected ?? true,
          });
        }
      })
      .catch(() => {
        if (isMounted) setSystemHealth({ online: false, dbConnected: false });
      });

    // Stats
    fetch(`${API_BASE}/api/stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && data.success) {
          setStats(data);
        }
      })
      .catch((err) => console.warn("Stats fetch notice:", err));

    // Public History
    fetch(`${API_BASE}/api/history`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && data.success) {
          setHistory(data.history || []);
        }
      })
      .catch((err) => console.warn("History fetch notice:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  // ============================================================
  // FETCH USER WORKSPACE ON TAB / TOKEN CHANGE
  // ============================================================
  useEffect(() => {
    let isMounted = true;
    if (activeTab === "workspace" && token) {
      fetch(`${API_BASE}/api/user/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (isMounted && data && data.success) setUserHistory(data.history || []);
        })
        .catch(() => {});

      fetch(`${API_BASE}/api/user/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (isMounted && data && data.success) setSavedItems(data.saved || []);
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab, token]);

  // ============================================================
  // FETCH ADMIN DASHBOARD DATA ON TAB / USER CHANGE
  // ============================================================
  useEffect(() => {
    let isMounted = true;
    const role = user?.role;
    if (activeTab === "admin" && role === "admin" && token) {
      const headers = { Authorization: `Bearer ${token}` };

      Promise.allSettled([
        fetch(`${API_BASE}/api/admin/stats`, { headers }),
        fetch(`${API_BASE}/api/admin/users`, { headers }),
        fetch(`${API_BASE}/api/admin/history`, { headers }),
        fetch(`${API_BASE}/api/admin/model-details`, { headers }),
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
      });
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab, user?.role, token]);

  // Manual refresh helpers
  const refreshPublicData = async () => {
    setHistoryLoading(true);
    try {
      const [healthRes, statsRes, histRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/health`),
        fetch(`${API_BASE}/api/stats`),
        fetch(`${API_BASE}/api/history`),
      ]);

      if (healthRes.status === "fulfilled" && healthRes.value.ok) {
        const data = await healthRes.value.json();
        setSystemHealth({
          online: data.status === "healthy" || data.status === "degraded",
          dbConnected: data.database_connected ?? true,
        });
      }

      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const data = await statsRes.value.json();
        if (data.success) setStats(data);
      }

      if (histRes.status === "fulfilled" && histRes.value.ok) {
        const data = await histRes.value.json();
        if (data.success) setHistory(data.history || []);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshWorkspaceData = async () => {
    if (!token) return;
    setUserHistoryLoading(true);
    setSavedItemsLoading(true);
    try {
      const [histRes, savedRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/user/history`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/user/saved`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (histRes.status === "fulfilled" && histRes.value.ok) {
        const data = await histRes.value.json();
        if (data.success) setUserHistory(data.history || []);
      }

      if (savedRes.status === "fulfilled" && savedRes.value.ok) {
        const data = await savedRes.value.json();
        if (data.success) setSavedItems(data.saved || []);
      }
    } finally {
      setUserHistoryLoading(false);
      setSavedItemsLoading(false);
    }
  };

  const refreshAdminData = async () => {
    if (!token || user?.role !== "admin") return;
    setAdminLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, usersRes, histRes, modelRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/admin/stats`, { headers }),
        fetch(`${API_BASE}/api/admin/users`, { headers }),
        fetch(`${API_BASE}/api/admin/history`, { headers }),
        fetch(`${API_BASE}/api/admin/model-details`, { headers }),
      ]);

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
    } finally {
      setAdminLoading(false);
    }
  };

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
        body: JSON.stringify(payload),
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
          fetch_evidence: fetchEvidence,
        }),
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
      refreshPublicData();

      if (token) {
        refreshWorkspaceData();
      }
    } catch (err) {
      console.error("Analyze error:", err);
      setError("Unable to connect to TruthLens AI backend. Please verify FastAPI is running on port 8000.");
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          analysis_id: saveAnalysisId,
          notes: saveNotes.trim(),
        }),
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

  // Remove saved bookmark
  const removeSavedBookmark = async (savedId) => {
    if (!savedId || !token) return;
    try {
      const res = await fetch(`${API_BASE}/api/user/saved/${savedId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSavedItems((prev) => prev.filter((i) => i.id !== savedId));
        showToast("Bookmark removed.");
      }
    } catch (err) {
      console.error("Remove bookmark error:", err);
    }
  };

  // Delete user analysis record
  const deleteUserHistoryItem = async (itemId) => {
    if (!itemId || !token) return;
    try {
      const res = await fetch(`${API_BASE}/api/user/history/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
      showToast("Preparing your branded PDF report...");
      const res = await fetch(`${API_BASE}/api/user/export/pdf/${analysisId}`, {
        headers: { Authorization: `Bearer ${token}` },
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
      } else if (result && result.id === analysisId) {
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
  // ADMIN MANAGEMENT ACTIONS
  // ============================================================
  const handleAdminToggleRole = async (targetUserId, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      setAdminActionLoading(targetUserId);
      const res = await fetch(`${API_BASE}/api/admin/users/${targetUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !currentActive }),
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
        headers: { Authorization: `Bearer ${token}` },
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

  // Load sample stories
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

  // Clear analyzer
  const clearAll = () => {
    setTitle("");
    setText("");
    setResult(null);
    setError("");
    setSampleNotice("");
  };

  // Format date helper
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

  // Filter public history
  const filteredHistory = history.filter((item) => {
    if (historyFilter === "genuine") return item.prediction === 1;
    if (historyFilter === "fake") return item.prediction === 0;
    return true;
  });

  // Filter admin users
  const filteredAdminUsers = adminUsers.filter((u) => {
    if (!adminUserSearch) return true;
    const q = adminUserSearch.toLowerCase();
    return (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q));
  });

  return (
    <div className="app">
      {/* Background Ambience */}
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />
      <div className="grid-overlay" />

      {/* Global Toast Message */}
      {toastMessage && (
        <div className="sample-toast" style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 1000 }}>
          <Sparkles size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================
          NAVBAR
      ====================================================== */}
      <header className="navbar-container">
        <nav className="navbar">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("analyzer");
            }}
          >
            <div className="brand-mark">
              <span>TL</span>
            </div>
            <div className="brand-copy">
              <strong>TruthLens</strong>
              <span>AI</span>
            </div>
          </a>

          {/* Primary View Switcher Tabs */}
          <div className="nav-tabs-bar">
            <button
              className={`nav-tab-item ${activeTab === "analyzer" ? "active" : ""}`}
              onClick={() => setActiveTab("analyzer")}
            >
              <BrainCircuit size={15} />
              <span>Analyzer</span>
            </button>

            <button
              className={`nav-tab-item ${activeTab === "workspace" ? "active" : ""}`}
              onClick={() => {
                if (!token) {
                  setAuthModal("login");
                  showToast("Please sign in to access your personal workspace.");
                } else {
                  setActiveTab("workspace");
                }
              }}
            >
              <Bookmark size={14} />
              <span>My Workspace</span>
            </button>

            {user?.role === "admin" && (
              <button
                className={`nav-tab-item ${activeTab === "admin" ? "active" : ""}`}
                onClick={() => setActiveTab("admin")}
              >
                <ShieldAlert size={14} />
                <span>Admin Portal</span>
              </button>
            )}
          </div>

          {/* Right Navigation & Auth Actions */}
          <div className="nav-actions">
            <div className="system-status" title={systemHealth.online ? "Backend Online" : "Backend Offline"}>
              <span className={`status-pulse ${systemHealth.online ? "online" : "offline"}`} />
              <span className="status-label">Engine</span>
              <strong>{systemHealth.online ? "ONLINE" : "OFFLINE"}</strong>
            </div>

            {/* User Profile / Login Actions */}
            {user ? (
              <div className="user-profile-badge">
                <div className="user-avatar-circle">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="user-info-text">
                  <span className="user-name">{user.name}</span>
                  <span className={`role-badge ${user.role}`}>{user.role}</span>
                </div>
                <button className="btn-logout" onClick={handleLogout} title="Sign Out">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="nav-auth-group">
                <button
                  className="btn-login"
                  onClick={() => {
                    setAuthError("");
                    setAuthModal("login");
                  }}
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>
                <button
                  className="btn-register"
                  onClick={() => {
                    setAuthError("");
                    setAuthModal("register");
                  }}
                >
                  <UserPlus size={14} />
                  <span>Register</span>
                </button>
              </div>
            )}

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
            <button
              onClick={() => {
                setActiveTab("analyzer");
                setMobileMenuOpen(false);
              }}
            >
              Credibility Analyzer
            </button>
            <button
              onClick={() => {
                if (!token) {
                  setAuthModal("login");
                } else {
                  setActiveTab("workspace");
                }
                setMobileMenuOpen(false);
              }}
            >
              My Workspace
            </button>
            {user?.role === "admin" && (
              <button
                onClick={() => {
                  setActiveTab("admin");
                  setMobileMenuOpen(false);
                }}
              >
                Admin Intelligence Portal
              </button>
            )}
            {!user ? (
              <>
                <button
                  onClick={() => {
                    setAuthModal("login");
                    setMobileMenuOpen(false);
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthModal("register");
                    setMobileMenuOpen(false);
                  }}
                >
                  Create Account
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
              >
                Sign Out ({user.name})
              </button>
            )}
          </div>
        )}
      </header>

      {/* ======================================================
          MAIN CONTENT AREA (SWITCHABLE BY TAB)
      ====================================================== */}
      <main>
        {/* ====================================================
            VIEW 1: CREDIBILITY ANALYZER (DEFAULT / PUBLIC)
        ==================================================== */}
        {activeTab === "analyzer" && (
          <>
            {/* HERO */}
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
                TruthLens AI assesses news credibility using machine learning, natural language processing,
                and live web corroboration. Evaluate claims against trained models and real-time reporting.
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
                    <Globe size={18} />
                  </div>
                  <div>
                    <strong>Live RSS</strong>
                    <span>Web Corroboration Engine</span>
                  </div>
                </div>
              </div>
            </section>

            {/* LIVE STATS BANNER (FROM MONGODB) */}
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

            {/* ANALYZER */}
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
                  evaluates linguistic structure while the evidence engine retrieves corroborating live news.
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
                      <span>Linear SVM + TF-IDF</span>
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

                  {/* Live Evidence Retrieval Toggle */}
                  <div className="field" style={{ marginBottom: "14px" }}>
                    <div
                      className="toggle-wrapper"
                      onClick={() => setFetchEvidence(!fetchEvidence)}
                      title="Toggle live news corroboration search"
                    >
                      <div className={`toggle-checkbox ${fetchEvidence ? "checked" : ""}`}>
                        <div className="toggle-knob" />
                      </div>
                      <span className="toggle-label">
                        Fetch Live Web Evidence & Corroborating Coverage
                      </span>
                    </div>
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
                        <span>Evaluating credibility & querying evidence...</span>
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
                    <span>TF-IDF Vectorization (100,000 features) + Decision Boundary Analysis</span>
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
                        <span>Decision Boundary Margin</span>
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
                      <h3>Evaluating Linguistic Signals & Evidence</h3>
                      <p>
                        Extracting TF-IDF n-grams, calculating decision hyperplane, and searching live news feeds...
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
                            <span>Saved to Audit History</span>
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

                      {/* ====================================================
                          LIVE EVIDENCE CORROBORATION CARD
                      ==================================================== */}
                      {result.evidence && (
                        <div className="evidence-card">
                          <div className="evidence-card-header">
                            <div className="evidence-title-group">
                              <Globe size={16} />
                              <h4>Live Evidence Corroboration</h4>
                            </div>

                            <span className={`evidence-badge ${result.evidence.status || "unavailable"}`}>
                              {result.evidence.status === "supporting" && "Corroborated by Live Reporting"}
                              {result.evidence.status === "contradicting" && "Contradicted by Live Reporting"}
                              {result.evidence.status === "insufficient" && "Insufficient Live Matches"}
                              {result.evidence.status === "unavailable" && "Web Retrieval Offline"}
                            </span>
                          </div>

                          {result.evidence.query && (
                            <div>
                              <span className="evidence-query-pill">
                                Search Query: &quot;{result.evidence.query}&quot;
                              </span>
                            </div>
                          )}

                          {result.evidence.corroboration_notes && (
                            <p className="evidence-notes">
                              {result.evidence.corroboration_notes}
                            </p>
                          )}

                          {/* Sources List */}
                          {result.evidence.sources && result.evidence.sources.length > 0 && (
                            <div className="sources-list">
                              {result.evidence.sources.map((src, idx) => (
                                <div className="source-item" key={idx}>
                                  <div className="source-info">
                                    <div className="source-pub-row">
                                      <span className="source-publisher">{src.source_name || "News Source"}</span>
                                      {src.published_at && (
                                        <span className="source-pub-date">{formatDate(src.published_at)}</span>
                                      )}
                                    </div>
                                    <span className="source-title">{src.title}</span>
                                  </div>

                                  {src.url && (
                                    <a
                                      href={src.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="source-link-btn"
                                      title="Read full article at source"
                                    >
                                      <span>Read</span>
                                      <ExternalLink size={12} />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* REPORT ACTIONS BAR (SAVE / PDF / JSON) */}
                      <div className="analysis-actions-bar">
                        {result.id && (
                          <>
                            <button
                              className="action-btn-primary"
                              onClick={() => triggerBookmark(result.id)}
                            >
                              <Bookmark size={14} />
                              <span>Save to Workspace</span>
                            </button>

                            <button
                              className="action-btn-secondary"
                              onClick={() => downloadPdfReport(result.id)}
                            >
                              <Download size={14} />
                              <span>Download PDF Report</span>
                            </button>

                            <button
                              className="action-btn-secondary"
                              onClick={() => downloadJsonReport(result.id)}
                            >
                              <FileText size={14} />
                              <span>Export JSON</span>
                            </button>
                          </>
                        )}
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

            {/* HOW IT WORKS */}
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
                  <h3>Live Corroboration & Audit</h3>
                  <p>
                    Real-time RSS queries check external coverage while MongoDB persists the full assessment audit trail.
                  </p>
                </div>
              </div>
            </section>

            {/* TECHNICAL PIPELINE */}
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
                  title="Live Evidence"
                  icon={<Globe size={20} />}
                  text="Real-time RSS query extraction and semantic headline corroboration."
                />
                <PipelineStep
                  number="06"
                  title="MongoDB Storage"
                  icon={<Database size={20} />}
                  text="Asynchronous persistence of analysis metadata with graceful fallback."
                />
              </div>
            </section>

            {/* MODEL BENCHMARK */}
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

            {/* PUBLIC HISTORY */}
            <section className="history-section" id="history">
              <div className="section-intro">
                <div>
                  <span className="section-number">05</span>
                  <span className="section-kicker">ANALYSIS HISTORY</span>
                </div>

                <button
                  className="clear-button"
                  onClick={refreshPublicData}
                  disabled={historyLoading}
                  title="Reload history from database"
                >
                  {historyLoading ? <Loader2 size={13} className="spin" /> : <RotateCcw size={13} />}
                  <span>Refresh</span>
                </button>
              </div>

              <div className="section-title-row">
                <div>
                  <h2>Audit history & recent analyses.</h2>
                  <p>Previous TruthLens assessments retrieved directly from MongoDB.</p>
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
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setDeletingId(itemId);
                                  try {
                                    const res = await fetch(`${API_BASE}/api/history/${itemId}`, { method: "DELETE" });
                                    if (res.ok) {
                                      setHistory((prev) => prev.filter((i) => i.id !== itemId && i._id !== itemId));
                                      fetch(`${API_BASE}/api/stats`)
                                        .then((r) => r.json())
                                        .then((d) => {
                                          if (d.success) setStats(d);
                                        })
                                        .catch(() => {});
                                    }
                                  } finally {
                                    setDeletingId(null);
                                  }
                                }}
                                disabled={deletingId === itemId}
                                title="Delete this record"
                              >
                                {deletingId === itemId ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                              </button>
                            )}
                          </div>
                        </div>

                        <h3>{item.title || "Untitled story content"}</h3>

                        {item.text && (
                          <p className="history-snippet">
                            {item.text.length > 140 ? `${item.text.slice(0, 140)}...` : item.text}
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
          </>
        )}

        {/* ====================================================
            VIEW 2: USER WORKSPACE
        ==================================================== */}
        {activeTab === "workspace" && (
          <section className="workspace-container">
            {/* User Profile Card */}
            <div className="workspace-profile-card">
              <div className="workspace-profile-info">
                <div className="workspace-avatar-large">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="workspace-user-details">
                  <h2>
                    <span>{user?.name}</span>
                    <span className={`role-badge ${user?.role}`}>{user?.role}</span>
                  </h2>
                  <p>{user?.email} · Member since {formatDate(user?.created_at)}</p>
                </div>
              </div>

              <div className="workspace-stats-pill">
                <span className="chip-label">YOUR ASSESSMENTS: </span>
                <strong style={{ color: "#3b82f6", marginRight: "16px" }}>{userHistory.length}</strong>
                <span className="chip-label">BOOKMARKED: </span>
                <strong style={{ color: "#10b981" }}>{savedItems.length}</strong>
              </div>
            </div>

            {/* Sub-tab Switcher */}
            <div className="workspace-subtabs">
              <button
                className={`workspace-subtab-btn ${workspaceSubTab === "history" ? "active" : ""}`}
                onClick={() => setWorkspaceSubTab("history")}
              >
                <Clock size={16} />
                <span>My Analyses ({userHistory.length})</span>
              </button>
              <button
                className={`workspace-subtab-btn ${workspaceSubTab === "saved" ? "active" : ""}`}
                onClick={() => setWorkspaceSubTab("saved")}
              >
                <Bookmark size={16} />
                <span>Bookmarked Stories ({savedItems.length})</span>
              </button>
            </div>

            {/* Sub-tab 1: My History */}
            {workspaceSubTab === "history" && (
              <div>
                {userHistoryLoading && (
                  <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    <Loader2 size={32} className="spin" style={{ margin: "0 auto 12px" }} />
                    <p>Loading your personal analyses...</p>
                  </div>
                )}

                {!userHistoryLoading && userHistory.length === 0 && (
                  <div className="history-empty">
                    <BrainCircuit size={32} />
                    <h3>No analyses found in your workspace</h3>
                    <p>Articles you evaluate while signed in will appear here with export options.</p>
                    <button
                      className="primary-action"
                      style={{ marginTop: "16px" }}
                      onClick={() => setActiveTab("analyzer")}
                    >
                      <span>Analyze a News Article</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {!userHistoryLoading && userHistory.length > 0 && (
                  <div className="history-grid">
                    {userHistory.map((item) => {
                      const genuine = item.prediction === 1;
                      const itemId = item.id || item._id;

                      return (
                        <div className="history-card" key={itemId}>
                          <div className="history-card-top">
                            <div>
                              <span className="panel-eyebrow">SAVED ANALYSIS</span>
                              <span className="history-date">{formatDate(item.created_at)}</span>
                            </div>

                            <div className="history-top-actions">
                              <div className={`history-verdict ${genuine ? "genuine" : "fake"}`}>
                                {genuine ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
                                <span>{item.label}</span>
                              </div>

                              <button
                                className="delete-history-btn"
                                onClick={() => deleteUserHistoryItem(itemId)}
                                title="Delete from your history"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <h3>{item.title || "Untitled content"}</h3>

                          {item.text && (
                            <p className="history-snippet">
                              {item.text.length > 130 ? `${item.text.slice(0, 130)}...` : item.text}
                            </p>
                          )}

                          <div className="history-meta">
                            <div>
                              <span>RISK LEVEL</span>
                              <strong>{item.risk_level}</strong>
                            </div>
                            <div>
                              <span>CONFIDENCE</span>
                              <strong>{item.confidence}%</strong>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
                            <button
                              className="action-btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                              onClick={() => downloadPdfReport(itemId)}
                            >
                              <Download size={12} />
                              <span>PDF Report</span>
                            </button>
                            <button
                              className="action-btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                              onClick={() => downloadJsonReport(itemId)}
                            >
                              <FileText size={12} />
                              <span>JSON Data</span>
                            </button>
                            <button
                              className="action-btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                              onClick={() => triggerBookmark(itemId)}
                            >
                              <Bookmark size={12} />
                              <span>Bookmark</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Saved / Bookmarked Stories */}
            {workspaceSubTab === "saved" && (
              <div>
                {savedItemsLoading && (
                  <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    <Loader2 size={32} className="spin" style={{ margin: "0 auto 12px" }} />
                    <p>Loading your bookmarked analyses...</p>
                  </div>
                )}

                {!savedItemsLoading && savedItems.length === 0 && (
                  <div className="history-empty">
                    <Bookmark size={32} />
                    <h3>No bookmarked stories yet</h3>
                    <p>Bookmark any analysis from the analyzer to save it here with research notes.</p>
                  </div>
                )}

                {!savedItemsLoading && savedItems.length > 0 && (
                  <div className="history-grid">
                    {savedItems.map((item) => {
                      const genuine = item.label === "Likely Genuine";

                      return (
                        <div className="history-card" key={item.id}>
                          <div className="history-card-top">
                            <div>
                              <span className="panel-eyebrow">BOOKMARKED</span>
                              <span className="history-date">Saved {formatDate(item.saved_at)}</span>
                            </div>

                            <div className="history-top-actions">
                              <div className={`history-verdict ${genuine ? "genuine" : "fake"}`}>
                                {genuine ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
                                <span>{item.label}</span>
                              </div>

                              <button
                                className="delete-history-btn"
                                onClick={() => removeSavedBookmark(item.id)}
                                title="Remove Bookmark"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <h3>{item.title || "Untitled story content"}</h3>

                          {item.notes && (
                            <div className="evidence-notes" style={{ marginTop: "10px", fontSize: "0.8rem" }}>
                              <strong>Notes:</strong> {item.notes}
                            </div>
                          )}

                          <div className="history-meta" style={{ marginTop: "12px" }}>
                            <div>
                              <span>RISK LEVEL</span>
                              <strong>{item.risk_level}</strong>
                            </div>
                            <div>
                              <span>CONFIDENCE</span>
                              <strong>{item.confidence}%</strong>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                            <button
                              className="action-btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                              onClick={() => downloadPdfReport(item.analysis_id)}
                            >
                              <Download size={12} />
                              <span>PDF Report</span>
                            </button>
                            <button
                              className="action-btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                              onClick={() => downloadJsonReport(item.analysis_id)}
                            >
                              <FileText size={12} />
                              <span>JSON Data</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ====================================================
            VIEW 3: ADMIN INTELLIGENCE PORTAL
        ==================================================== */}
        {activeTab === "admin" && user?.role === "admin" && (
          <section className="admin-container">
            <div className="admin-header-banner">
              <h2>TruthLens Administrator Portal</h2>
              <p>Global platform analytics, user role administration, audit trails, and ML health monitoring.</p>
            </div>

            {adminLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#60a5fa", marginBottom: "16px" }}>
                <Loader2 size={16} className="spin" />
                <span>Refreshing administration data...</span>
              </div>
            )}

            {/* KPI Cards Grid */}
            <div className="admin-kpi-grid">
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span>REGISTERED USERS</span>
                  <User size={16} />
                </div>
                <div className="kpi-value">{adminStats?.total_users ?? "—"}</div>
                <div className="kpi-subtext">Active account holders</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span>TOTAL ANALYSES</span>
                  <BarChart3 size={16} />
                </div>
                <div className="kpi-value">{adminStats?.total_analyses ?? "—"}</div>
                <div className="kpi-subtext">Evaluated news stories</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span>CREDIBILITY RATIO</span>
                  <ShieldCheck size={16} />
                </div>
                <div className="kpi-value" style={{ fontSize: "1.5rem" }}>
                  <span style={{ color: "#34d399" }}>{adminStats?.likely_genuine_count ?? 0}</span> /{" "}
                  <span style={{ color: "#f87171" }}>{adminStats?.potentially_fake_count ?? 0}</span>
                </div>
                <div className="kpi-subtext">Real vs Fake breakdown</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span>AVG CONFIDENCE</span>
                  <Gauge size={16} />
                </div>
                <div className="kpi-value">{adminStats?.avg_confidence ?? 0}%</div>
                <div className="kpi-subtext">Across all platform evaluations</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span>BOOKMARKED ANALYSES</span>
                  <Bookmark size={16} />
                </div>
                <div className="kpi-value">{adminStats?.total_saved ?? "—"}</div>
                <div className="kpi-subtext">Saved to user workspaces</div>
              </div>
            </div>

            {/* User Management Section */}
            <div className="admin-table-card">
              <div className="admin-table-header">
                <div className="admin-table-title">
                  <User size={18} />
                  <h3>User Account Management</h3>
                </div>

                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search user by name or email..."
                  value={adminUserSearch}
                  onChange={(e) => setAdminUserSearch(e.target.value)}
                />
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>EMAIL</th>
                      <th>ROLE</th>
                      <th>STATUS</th>
                      <th>JOINED</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdminUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>
                          No users found matching search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredAdminUsers.map((u) => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600 }}>{u.name}</td>
                          <td style={{ color: "#94a3b8" }}>{u.email}</td>
                          <td>
                            <span className={`role-badge ${u.role}`}>{u.role}</span>
                          </td>
                          <td>
                            <span
                              style={{
                                color: u.is_active ? "#34d399" : "#f87171",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                              }}
                            >
                              {u.is_active ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td style={{ color: "#64748b", fontSize: "0.78rem" }}>
                            {formatDate(u.created_at)}
                          </td>
                          <td>
                            <div className="action-buttons-cell">
                              <button
                                className="table-action-btn"
                                onClick={() => handleAdminToggleRole(u.id, u.role)}
                                disabled={adminActionLoading === u.id || u.id === user.id}
                                title="Toggle Role (User / Admin)"
                              >
                                {u.role === "admin" ? "Demote" : "Promote"}
                              </button>

                              <button
                                className="table-action-btn"
                                onClick={() => handleAdminToggleActive(u.id, u.is_active)}
                                disabled={adminActionLoading === u.id || u.id === user.id}
                                title="Toggle Active Status"
                              >
                                {u.is_active ? "Deactivate" : "Activate"}
                              </button>

                              <button
                                className="table-action-btn danger"
                                onClick={() => handleAdminDeleteUser(u.id)}
                                disabled={adminActionLoading === u.id || u.id === user.id}
                                title="Delete user"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Global Audit Trail */}
            <div className="admin-table-card">
              <div className="admin-table-header">
                <div className="admin-table-title">
                  <History size={18} />
                  <h3>Platform Global Analysis Audit Log</h3>
                </div>
                <button
                  className="table-action-btn"
                  onClick={refreshAdminData}
                  title="Refresh audit log"
                >
                  <RotateCcw size={13} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>HEADLINE / CONTENT</th>
                      <th>VERDICT</th>
                      <th>RISK</th>
                      <th>CONFIDENCE</th>
                      <th>EVALUATED AT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>
                          No audit history records found in database.
                        </td>
                      </tr>
                    ) : (
                      adminHistory.slice(0, 20).map((h, idx) => (
                        <tr key={h.id || idx}>
                          <td style={{ maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {h.title || h.text || "Untitled analysis"}
                          </td>
                          <td>
                            <span className={`risk-tag ${h.prediction === 1 ? "genuine" : "fake"}`} style={{ fontSize: "0.72rem" }}>
                              {h.label}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{h.risk_level}</td>
                          <td style={{ fontWeight: 600 }}>{h.confidence}%</td>
                          <td style={{ color: "#64748b", fontSize: "0.75rem" }}>{formatDate(h.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* System Model & Diagnostics */}
            {adminModelDetails && (
              <div className="admin-table-card">
                <div className="admin-table-header">
                  <div className="admin-table-title">
                    <Cpu size={18} />
                    <h3>Production Machine Learning Model Health</h3>
                  </div>
                </div>

                <div className="dataset-specs-card" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <div className="specs-col">
                    <span className="specs-label">ACTIVE CLASSIFIER</span>
                    <strong>{adminModelDetails.model_architecture}</strong>
                    <small>Support Vector Classification</small>
                  </div>
                  <div className="specs-col">
                    <span className="specs-label">VALIDATION F1</span>
                    <strong style={{ color: "#34d399" }}>
                      {(adminModelDetails.validation_metrics?.f1_score * 100).toFixed(2)}%
                    </strong>
                    <small>Stratified test split</small>
                  </div>
                  <div className="specs-col">
                    <span className="specs-label">TF-IDF FEATURES</span>
                    <strong>{adminModelDetails.features?.toLocaleString()}</strong>
                    <small>Unigrams + Bigrams</small>
                  </div>
                  <div className="specs-col">
                    <span className="specs-label">MONGODB STATUS</span>
                    <strong style={{ color: systemHealth.dbConnected ? "#34d399" : "#fbbf24" }}>
                      {systemHealth.dbConnected ? "Connected" : "Handshake Fallback"}
                    </strong>
                    <small>Resilient persistence</small>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* ======================================================
          MODALS: LOGIN / REGISTER
      ====================================================== */}
      {authModal && (
        <div className="modal-overlay" onClick={() => setAuthModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setAuthModal(null)}>
              <X size={16} />
            </button>

            <div className="modal-title-box">
              <h3>{authModal === "login" ? "Sign In to TruthLens" : "Create an Account"}</h3>
              <p>
                {authModal === "login"
                  ? "Access your personal workspace, analysis history, and export PDF reports."
                  : "Join TruthLens AI to save credibility assessments and access workspace analytics."}
              </p>
            </div>

            {authError && (
              <div className="error-message" style={{ marginBottom: "16px" }}>
                <CircleAlert size={15} />
                <span>{authError}</span>
              </div>
            )}

            <form className="modal-form" onSubmit={handleAuthSubmit}>
              {authModal === "register" && (
                <div className="form-field-group">
                  <label htmlFor="auth-name">Full Name</label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    className="form-input-field"
                    placeholder="Jane Doe"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  />
                </div>
              )}

              <div className="form-field-group">
                <label htmlFor="auth-email">Email Address</label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  className="form-input-field"
                  placeholder="analyst@example.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                />
              </div>

              <div className="form-field-group">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  className="form-input-field"
                  placeholder="Minimum 6 characters"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                />
              </div>

              {authModal === "register" && (
                <div className="form-field-group">
                  <label htmlFor="auth-confirm">Confirm Password</label>
                  <input
                    id="auth-confirm"
                    type="password"
                    required
                    className="form-input-field"
                    placeholder="Repeat password"
                    value={authForm.confirmPassword}
                    onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                  />
                </div>
              )}

              <button type="submit" className="modal-submit-btn" disabled={authLoading}>
                {authLoading ? (
                  <Loader2 size={16} className="spin" />
                ) : authModal === "login" ? (
                  <>
                    <LogIn size={16} />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Create Free Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="auth-switch-prompt">
              {authModal === "login" ? (
                <>
                  Don&apos;t have an account?
                  <button
                    type="button"
                    className="auth-switch-link"
                    onClick={() => {
                      setAuthError("");
                      setAuthModal("register");
                    }}
                  >
                    Register now
                  </button>
                </>
              ) : (
                <>
                  Already registered?
                  <button
                    type="button"
                    className="auth-switch-link"
                    onClick={() => {
                      setAuthError("");
                      setAuthModal("login");
                    }}
                  >
                    Sign in here
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL: SAVE / BOOKMARK WITH NOTES
      ====================================================== */}
      {saveModalOpen && (
        <div className="modal-overlay" onClick={() => setSaveModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSaveModalOpen(false)}>
              <X size={16} />
            </button>

            <div className="modal-title-box">
              <h3>Bookmark Analysis</h3>
              <p>Add optional research notes or tags for this credibility assessment.</p>
            </div>

            <form className="modal-form" onSubmit={confirmSaveAnalysis}>
              <div className="form-field-group">
                <label htmlFor="save-notes">Research Notes / Context</label>
                <textarea
                  id="save-notes"
                  className="form-input-field"
                  rows={4}
                  placeholder="e.g. Cross-checked with Reuters; flagged for further verification."
                  value={saveNotes}
                  onChange={(e) => setSaveNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="modal-submit-btn" disabled={saveLoading}>
                {saveLoading ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <>
                    <Bookmark size={16} />
                    <span>Confirm Bookmark</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

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
            based on patterns identified in trained news datasets and live RSS corroboration. It does not independently verify facts,
            authenticate source credentials, or guarantee factual truth.
          </p>
        </div>

        <div className="footer-right">
          <span>7th Semester Major Project · B.Tech CSE</span>
          <span>FastAPI · React · Scikit-Learn · MongoDB Atlas · ReportLab</span>
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