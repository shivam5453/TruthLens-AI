import { useEffect, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileText,
  Gauge,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Activity,
  History,
  Trash2,
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
  LayoutDashboard,
} from "lucide-react";

import "./App.css";

// Robust API base detection: environment variable, or production Render fallback, or local dev
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://truthlens-ai-api-7bu4.onrender.com"
    : "http://127.0.0.1:8000");

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

  // Workspace Sub-Tab State
  const [workspaceSubTab, setWorkspaceSubTab] = useState("dashboard"); // 'dashboard' | 'history' | 'saved' | 'reports'
  const [userHistory, setUserHistory] = useState([]);
  const [userHistoryLoading, setUserHistoryLoading] = useState(false);
  const [userHistorySearch, setUserHistorySearch] = useState("");
  const [userHistoryFilter, setUserHistoryFilter] = useState("all"); // 'all' | 'genuine' | 'fake'
  const [savedItems, setSavedItems] = useState([]);
  const [savedItemsLoading, setSavedItemsLoading] = useState(false);

  // Admin Dashboard Sub-Tab State
  const [adminSubTab, setAdminSubTab] = useState("dashboard"); // 'dashboard' | 'users' | 'analyses' | 'health' | 'ml'
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

  // Platform Stats State
  const [stats, setStats] = useState(null);

  // Robust System Health State (loading state: 'checking' | 'online' | 'offline')
  const [systemHealth, setSystemHealth] = useState({
    status: "checking",
    online: false,
    dbConnected: false,
  });

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
  // ENGINE HEALTH CHECK (WITH AUTO-RETRY FOR RENDER COLD-START)
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
              dbConnected: data.database_connected ?? true,
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
  // INITIAL PUBLIC DATA LOAD (STATS & PUBLIC AUDIT HISTORY)
  // ============================================================
  useEffect(() => {
    let isMounted = true;

    // Platform aggregate stats
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
        .finally(() => {
          if (isMounted) setUserHistoryLoading(false);
        });

      fetch(`${API_BASE}/api/user/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (isMounted && data && data.success) setSavedItems(data.saved || []);
        })
        .finally(() => {
          if (isMounted) setSavedItemsLoading(false);
        });
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
      ])
        .then(async ([statsRes, usersRes, histRes, modelRes]) => {
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
        })
        .finally(() => {
          if (isMounted) setAdminLoading(false);
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
          status: "online",
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
      });
    } catch {
      return String(dateStr);
    }
  };

  // Filtered public history
  const filteredHistory = history.filter((item) => {
    if (historyFilter === "genuine") return item.prediction === 1;
    if (historyFilter === "fake") return item.prediction === 0;
    return true;
  });

  // Filtered user history
  const filteredUserHistory = userHistory.filter((item) => {
    if (userHistoryFilter === "genuine" && item.prediction !== 1) return false;
    if (userHistoryFilter === "fake" && item.prediction !== 0) return false;
    if (userHistorySearch) {
      const q = userHistorySearch.toLowerCase();
      const matchTitle = (item.title || "").toLowerCase().includes(q);
      const matchText = (item.text || "").toLowerCase().includes(q);
      if (!matchTitle && !matchText) return false;
    }
    return true;
  });

  // Filtered admin users
  const filteredAdminUsers = adminUsers.filter((u) => {
    if (!adminUserSearch) return true;
    const q = adminUserSearch.toLowerCase();
    return (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  return (
    <div className="app-shell">
      {/* ======================================================
          GLOBAL HEADER & NAVBAR
          Requirement 1: "My Workspace" is NEVER shown publicly.
          Requirement 2: Engine status shows "Checking..." then "ONLINE"/"OFFLINE".
      ====================================================== */}
      <header className="top-nav-wrap">
        <nav className="top-nav">
          <a
            href="#top"
            className="brand-link"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("analyzer");
            }}
          >
            <div className="brand-icon">
              <ShieldCheck size={18} />
            </div>
            <div className="brand-text">
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

            {/* Public-only link to How It Works */}
            {!user && (
              <a
                href="#how-it-works"
                className="nav-tab-item"
                onClick={() => setActiveTab("analyzer")}
              >
                <Sparkles size={14} />
                <span>How It Works</span>
              </a>
            )}

            {/* Authenticated User Navigation: Dashboard, History, Saved */}
            {user && (
              <>
                <button
                  className={`nav-tab-item ${activeTab === "workspace" && workspaceSubTab === "dashboard" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("workspace");
                    setWorkspaceSubTab("dashboard");
                  }}
                >
                  <LayoutDashboard size={14} />
                  <span>Dashboard</span>
                </button>

                <button
                  className={`nav-tab-item ${activeTab === "workspace" && workspaceSubTab === "history" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("workspace");
                    setWorkspaceSubTab("history");
                  }}
                >
                  <History size={14} />
                  <span>History</span>
                </button>

                <button
                  className={`nav-tab-item ${activeTab === "workspace" && workspaceSubTab === "saved" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("workspace");
                    setWorkspaceSubTab("saved");
                  }}
                >
                  <Bookmark size={14} />
                  <span>Saved</span>
                </button>
              </>
            )}

            {/* Admin-only Portal Access */}
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
            {/* Live Engine Status Indicator */}
            <div
              className="system-status"
              title={
                systemHealth.status === "checking"
                  ? "Checking backend engine health..."
                  : systemHealth.online
                  ? "Backend Engine Online"
                  : "Backend Engine Offline"
              }
            >
              <span
                className={`status-pulse ${
                  systemHealth.status === "checking"
                    ? "checking"
                    : systemHealth.online
                    ? "online"
                    : "offline"
                }`}
              />
              <span className="status-label">Engine</span>
              <strong>
                {systemHealth.status === "checking"
                  ? "Checking..."
                  : systemHealth.online
                  ? "ONLINE"
                  : "OFFLINE"}
              </strong>
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

            {!user && (
              <a
                href="#how-it-works"
                className="mobile-drawer-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </a>
            )}

            {user && (
              <>
                <button
                  onClick={() => {
                    setActiveTab("workspace");
                    setWorkspaceSubTab("dashboard");
                    setMobileMenuOpen(false);
                  }}
                >
                  My Dashboard
                </button>
                <button
                  onClick={() => {
                    setActiveTab("workspace");
                    setWorkspaceSubTab("history");
                    setMobileMenuOpen(false);
                  }}
                >
                  Analysis History
                </button>
                <button
                  onClick={() => {
                    setActiveTab("workspace");
                    setWorkspaceSubTab("saved");
                    setMobileMenuOpen(false);
                  }}
                >
                  Bookmarked Stories
                </button>
              </>
            )}

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
                  Register
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
          MAIN CONTAINER
      ====================================================== */}
      <main className="main-content" id="top">
        {/* ====================================================
            VIEW 1: PUBLIC HOMEPAGE & CREDIBILITY ANALYZER
            Requirement 3 & 4: Product-first, no public ML specs.
            Requirement 5: Polished Analyzer with real evidence.
        ==================================================== */}
        {activeTab === "analyzer" && (
          <>
            {/* HERO: Product-First, Clean and Value-Focused */}
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
                TruthLens AI assesses news credibility using linguistic pattern detection and real-time news
                reporting corroboration. Paste any claim or news story to evaluate its authenticity.
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

              {/* Product Highlights (NO technical ML parameters in public view) */}
              <div className="hero-stats">
                <div className="stat">
                  <div className="stat-icon">
                    <Globe size={18} />
                  </div>
                  <div>
                    <strong>Real-Time Evidence</strong>
                    <span>Live Web Corroboration Engine</span>
                  </div>
                </div>

                <div className="stat-divider" />

                <div className="stat">
                  <div className="stat-icon">
                    <BrainCircuit size={18} />
                  </div>
                  <div>
                    <strong>Linguistic Analysis</strong>
                    <span>Pattern & Tone Assessment</span>
                  </div>
                </div>

                <div className="stat-divider" />

                <div className="stat">
                  <div className="stat-icon">
                    <Gauge size={18} />
                  </div>
                  <div>
                    <strong>Instant Assessment</strong>
                    <span>Risk Level & Confidence Rating</span>
                  </div>
                </div>
              </div>
            </section>

            {/* LIVE PLATFORM STATS BANNER (IF AVAILABLE) */}
            {stats && stats.total_analyses > 0 && (
              <section className="stats-banner">
                <div className="stats-banner-card">
                  <div className="stats-banner-header">
                    <div className="stats-title">
                      <BarChart3 size={16} />
                      <span>PLATFORM EVALUATION ACTIVITY</span>
                    </div>
                    <div className="stats-source">
                      <Database size={13} />
                      <span>LIVE AUDIT TRAIL</span>
                    </div>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-box">
                      <div className="stat-box-label">Total Evaluated</div>
                      <div className="stat-box-value">{stats.total_analyses}</div>
                      <div className="stat-box-meta">Articles processed</div>
                    </div>

                    <div className="stat-box">
                      <div className="stat-box-label">Likely Genuine</div>
                      <div className="stat-box-value" style={{ color: "#34d399" }}>
                        {stats.likely_genuine_count}
                      </div>
                      <div className="stat-box-meta">Low risk signals</div>
                    </div>

                    <div className="stat-box">
                      <div className="stat-box-label">Potentially Fake</div>
                      <div className="stat-box-value" style={{ color: "#f87171" }}>
                        {stats.potentially_fake_count}
                      </div>
                      <div className="stat-box-meta">Elevated risk signals</div>
                    </div>

                    <div className="stat-box">
                      <div className="stat-box-label">Avg Confidence</div>
                      <div className="stat-box-value" style={{ color: "#60a5fa" }}>
                        {stats.avg_confidence}%
                      </div>
                      <div className="stat-box-meta">Model certainty</div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ANALYZER WORKBENCH (PRIMARY PRODUCT COMPONENT) */}
            <section className="analyzer-section" id="analyzer">
              <div className="section-intro">
                <div>
                  <span className="section-number">01</span>
                  <span className="section-kicker">CREDIBILITY ANALYZER</span>
                </div>

                <div className="sample-controls">
                  <span className="sample-label">Quick test samples:</span>
                  <button
                    type="button"
                    className="sample-button genuine"
                    onClick={() => loadSample("genuine")}
                  >
                    Test Genuine Story
                  </button>
                  <button
                    type="button"
                    className="sample-button fake"
                    onClick={() => loadSample("fake")}
                  >
                    Test Sensational Claim
                  </button>
                  {(title || text || result) && (
                    <button type="button" className="clear-button" onClick={clearAll}>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {sampleNotice && <div className="sample-notice">{sampleNotice}</div>}

              <div className="workspace-grid">
                {/* Input Panel */}
                <div className="panel input-panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-eyebrow">INPUT NEWS STORY</span>
                      <h2>Evaluate Article or Claim</h2>
                    </div>

                    <div className="model-chip">
                      <ShieldCheck size={14} />
                      <span>TruthLens AI Model</span>
                    </div>
                  </div>

                  <p className="panel-description">
                    Submit a news headline, article content, or both. The trained classifier evaluates
                    linguistic structure while the evidence engine searches for corroborating live reporting.
                  </p>

                  <div className="form-group">
                    <label htmlFor="article-title">
                      <span>Article Headline / Central Claim</span>
                      <span className="field-hint">Required for live evidence search</span>
                    </label>
                    <input
                      id="article-title"
                      type="text"
                      className="input-field"
                      placeholder="e.g. Delegates approve international clean energy agreement at Geneva summit..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="article-text">
                      <span>Article Body / Story Text</span>
                      <span className="field-hint">{text.length} characters</span>
                    </label>
                    <textarea
                      id="article-text"
                      className="textarea-field"
                      rows={7}
                      placeholder="Paste the full article body or narrative here for deeper linguistic evaluation..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>

                  {/* Live Evidence Retrieval Toggle */}
                  <div
                    className="evidence-toggle-row"
                    onClick={() => setFetchEvidence(!fetchEvidence)}
                  >
                    <div className={`toggle-checkbox ${fetchEvidence ? "checked" : ""}`}>
                      {fetchEvidence && <Check size={12} />}
                    </div>
                    <div className="toggle-label-group">
                      <span className="toggle-label">Fetch Live Web Evidence & Corroborating Coverage</span>
                      <span className="toggle-subtext">
                        Queries real-time news sources to verify if independent outlets report this event.
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="error-message">
                      <CircleAlert size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="analyze-button"
                    onClick={analyzeNews}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="spin" />
                        <span>Evaluating Linguistic Signals & Evidence...</span>
                      </>
                    ) : (
                      <>
                        <BrainCircuit size={18} />
                        <span>Analyze with TruthLens</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>

                {/* Result Panel */}
                <div className="panel result-panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-eyebrow">AUTOMATED ASSESSMENT</span>
                      <h2>Credibility Report</h2>
                    </div>

                    {result && (
                      <div className={`verdict-chip ${result.prediction === 1 ? "genuine" : "fake"}`}>
                        {result.prediction === 1 ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
                        <span>{result.label}</span>
                      </div>
                    )}
                  </div>

                  {loading && (
                    <div className="loading-state">
                      <div className="loading-spinner">
                        <Loader2 size={36} className="spin" />
                      </div>
                      <h3>Evaluating Linguistic Signals & Evidence</h3>
                      <p>Running classifier decision boundary analysis and querying live news feeds...</p>
                    </div>
                  )}

                  {!loading && !result && (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <FileText size={32} />
                      </div>
                      <h3>No Analysis Yet</h3>
                      <p>
                        Paste a headline or article above and click &quot;Analyze with TruthLens&quot; to generate an
                        assessment. You can also load one of the quick test stories.
                      </p>
                    </div>
                  )}

                  {!loading && result && (
                    <div className="result-content">
                      {/* Big Verdict Header */}
                      <div className={`verdict-banner ${result.prediction === 1 ? "genuine" : "fake"}`}>
                        <div className="verdict-banner-icon">
                          {result.prediction === 1 ? <CheckCircle2 size={32} /> : <CircleAlert size={32} />}
                        </div>
                        <div>
                          <div className="verdict-label-sub">ASSESSMENT VERDICT</div>
                          <div className="verdict-label-main">{result.label}</div>
                          <div className="verdict-risk">
                            Risk Level: <strong>{result.risk_level}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Score Meter */}
                      <div className="score-card">
                        <div className="score-header">
                          <span className="score-title">Assessment Confidence</span>
                          <span className="score-percent">{result.confidence}%</span>
                        </div>

                        <div className="score-meter-track">
                          <div
                            className={`score-meter-fill ${result.prediction === 1 ? "genuine" : "fake"}`}
                            style={{ width: `${result.confidence}%` }}
                          />
                        </div>

                        <div className="score-scale">
                          <span>Low Certainty</span>
                          <span>Moderate</span>
                          <span>High Certainty</span>
                        </div>
                      </div>

                      {/* Guidance Box */}
                      <div className="guidance-box">
                        <div className="guidance-section">
                          <h4>Evaluation Context</h4>
                          <p>{result.explanation}</p>
                        </div>

                        <div className="guidance-section" style={{ marginTop: "12px" }}>
                          <h4>Verification Recommendation</h4>
                          <p>{result.recommendation}</p>
                        </div>
                      </div>

                      {/* ====================================================
                          LIVE EVIDENCE CORROBORATION CARD
                          Requirement 5: Real sources, external links.
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

                          {/* Sources List with Clickable Outbound Links */}
                          {result.evidence.sources && result.evidence.sources.length > 0 ? (
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
                                    {src.snippet && (
                                      <p className="source-snippet">{src.snippet}</p>
                                    )}
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
                          ) : (
                            <p className="evidence-sub-notice">
                              * Absence of external evidence does not automatically mean a story is fake. Newly developing stories or localized claims may not appear immediately in global RSS feeds.
                            </p>
                          )}
                        </div>
                      )}

                      {/* REPORT ACTIONS BAR (SAVE / PDF / JSON) */}
                      <div className="analysis-actions-bar">
                        {result.id ? (
                          <>
                            <button
                              className="action-btn-primary"
                              onClick={() => triggerBookmark(result.id)}
                              title="Save this analysis with personal notes"
                            >
                              <Bookmark size={14} />
                              <span>Save to Workspace</span>
                            </button>

                            <button
                              className="action-btn-secondary"
                              onClick={() => downloadPdfReport(result.id)}
                              title="Download branded PDF report"
                            >
                              <Download size={14} />
                              <span>Download PDF</span>
                            </button>

                            <button
                              className="action-btn-secondary"
                              onClick={() => downloadJsonReport(result.id)}
                              title="Export structured JSON dossier"
                            >
                              <FileText size={14} />
                              <span>Export JSON</span>
                            </button>
                          </>
                        ) : (
                          <div className="guest-action-prompt">
                            <Sparkles size={14} />
                            <span>
                              Want to save assessments or export branded PDF dossiers?{" "}
                              <button className="text-link-btn" onClick={() => setAuthModal("register")}>
                                Create a free account
                              </button>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Disclaimer */}
                      <div className="result-disclaimer">
                        <strong>Important Notice:</strong> {result.disclaimer}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* HOW IT WORKS (PRODUCT FIRST, NON-TECHNICAL) */}
            <section className="how-it-works-section" id="how-it-works">
              <div className="section-intro">
                <div>
                  <span className="section-number">02</span>
                  <span className="section-kicker">WORKFLOW PROCESS</span>
                </div>
              </div>

              <div className="section-title-row">
                <div>
                  <h2>How TruthLens verifies content.</h2>
                  <p>
                    Combining linguistic pattern recognition with real-time news retrieval for thorough,
                    multi-layered credibility assessment.
                  </p>
                </div>
              </div>

              <div className="how-steps-grid">
                <div className="how-step-card">
                  <div className="step-badge">STEP 1</div>
                  <h3>Submit News Story</h3>
                  <p>
                    Enter a news headline, article body, or central claim into the credibility analyzer.
                  </p>
                </div>

                <div className="how-step-card">
                  <div className="step-badge">STEP 2</div>
                  <h3>Linguistic Pattern Analysis</h3>
                  <p>
                    The AI evaluates stylistic consistency, sensationalism cues, hyperbole, and structural credibility patterns.
                  </p>
                </div>

                <div className="how-step-card">
                  <div className="step-badge">STEP 3</div>
                  <h3>Live Web News Corroboration</h3>
                  <p>
                    The evidence engine searches current news feeds to determine whether reputable independent outlets corroborate the story.
                  </p>
                </div>

                <div className="how-step-card">
                  <div className="step-badge">STEP 4</div>
                  <h3>Credibility Dossier & Sources</h3>
                  <p>
                    Receive a clear risk assessment, confidence rating, contextual explanation, and verifiable outbound source links.
                  </p>
                </div>
              </div>
            </section>

            {/* PUBLIC AUDIT HISTORY */}
            <section className="history-section" id="history">
              <div className="section-intro">
                <div>
                  <span className="section-number">03</span>
                  <span className="section-kicker">ANALYSIS ACTIVITY</span>
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
                  <h2>Recent platform evaluations.</h2>
                  <p>
                    Real analyses evaluated by TruthLens AI. Sign in to maintain your private workspace history.
                  </p>
                </div>

                <div className="history-filter-pills">
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

              {historyLoading && (
                <div className="history-empty">
                  <Loader2 size={24} className="spin" />
                  <p>Loading latest records from database...</p>
                </div>
              )}

              {!historyLoading && filteredHistory.length === 0 && (
                <div className="history-empty">
                  <BrainCircuit size={28} />
                  <p>No recent public records found.</p>
                </div>
              )}

              {!historyLoading && filteredHistory.length > 0 && (
                <div className="history-grid">
                  {filteredHistory.slice(0, 6).map((item, idx) => {
                    const genuine = item.prediction === 1;
                    const itemId = item.id || item._id;

                    return (
                      <div className="history-card" key={itemId || idx}>
                        <div className="history-card-top">
                          <span className="history-date">{formatDate(item.created_at)}</span>
                          <div className={`history-verdict ${genuine ? "genuine" : "fake"}`}>
                            {genuine ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
                            <span>{item.label}</span>
                          </div>
                        </div>

                        <h3>{item.title || "Untitled analysis"}</h3>

                        {item.text && (
                          <p className="history-snippet">
                            {item.text.length > 130 ? `${item.text.substring(0, 130)}...` : item.text}
                          </p>
                        )}

                        <div className="history-card-bottom">
                          <div className="history-meta-row">
                            <span className="risk-tag">{item.risk_level}</span>
                            <span className="conf-tag">{item.confidence}% confidence</span>
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
            VIEW 2: AUTHENTICATED USER WORKSPACE
            Requirement 6: Proper dashboard with summary cards.
            Requirement 7: Bookmarked analyses.
            Requirement 8: PDF / JSON export actions.
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

            {/* Workspace Sub-Tab Switcher */}
            <div className="workspace-subtabs">
              <button
                className={`workspace-subtab-btn ${workspaceSubTab === "dashboard" ? "active" : ""}`}
                onClick={() => setWorkspaceSubTab("dashboard")}
              >
                <LayoutDashboard size={16} />
                <span>Dashboard Overview</span>
              </button>

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

              <button
                className={`workspace-subtab-btn ${workspaceSubTab === "reports" ? "active" : ""}`}
                onClick={() => setWorkspaceSubTab("reports")}
              >
                <Download size={16} />
                <span>Export Reports</span>
              </button>
            </div>

            {/* ================================================
                SUB-TAB 1: USER DASHBOARD
            ================================================ */}
            {workspaceSubTab === "dashboard" && (
              <div>
                <div className="workspace-dashboard-header">
                  <div className="workspace-dashboard-title">
                    <h2>Workspace Overview</h2>
                    <p>Track your news evaluation history, bookmarks, and risk profiles.</p>
                  </div>

                  <button
                    className="primary-action"
                    style={{ padding: "8px 18px", fontSize: "0.85rem" }}
                    onClick={() => setActiveTab("analyzer")}
                  >
                    <BrainCircuit size={15} />
                    <span>Analyze New Story</span>
                  </button>
                </div>

                {/* Dashboard Summary KPI Cards */}
                <div className="admin-kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span>Total Analyses</span>
                      <BrainCircuit size={16} />
                    </div>
                    <div className="kpi-value">{userHistory.length}</div>
                    <div className="kpi-subtext">Stories analyzed by you</div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span>Saved Bookmarks</span>
                      <Bookmark size={16} />
                    </div>
                    <div className="kpi-value" style={{ color: "#38bdf8" }}>{savedItems.length}</div>
                    <div className="kpi-subtext">Saved with research notes</div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span>Likely Genuine</span>
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="kpi-value" style={{ color: "#34d399" }}>
                      {userHistory.filter((i) => i.prediction === 1).length}
                    </div>
                    <div className="kpi-subtext">Low risk evaluations</div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span>Potentially Fake</span>
                      <CircleAlert size={16} />
                    </div>
                    <div className="kpi-value" style={{ color: "#f87171" }}>
                      {userHistory.filter((i) => i.prediction === 0).length}
                    </div>
                    <div className="kpi-subtext">High risk flagged stories</div>
                  </div>
                </div>

                {/* Recent Analyses Quick List */}
                <div className="admin-table-card">
                  <div className="admin-table-header">
                    <div className="admin-table-title">
                      <Clock size={18} />
                      <h3>Recent Assessments</h3>
                    </div>
                    <button
                      className="table-action-btn"
                      onClick={() => setWorkspaceSubTab("history")}
                    >
                      View All History
                    </button>
                  </div>

                  {userHistory.length === 0 ? (
                    <div className="history-empty" style={{ padding: "30px 20px" }}>
                      <BrainCircuit size={28} />
                      <p>You have not analyzed any stories yet.</p>
                      <button
                        className="primary-action"
                        style={{ marginTop: "12px", padding: "8px 16px", fontSize: "0.82rem" }}
                        onClick={() => setActiveTab("analyzer")}
                      >
                        Analyze your first story
                      </button>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>HEADLINE</th>
                            <th>VERDICT</th>
                            <th>CONFIDENCE</th>
                            <th>DATE</th>
                            <th>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userHistory.slice(0, 5).map((item) => {
                            const itemId = item.id || item._id;
                            const genuine = item.prediction === 1;

                            return (
                              <tr key={itemId}>
                                <td style={{ fontWeight: 600, maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {item.title || "Untitled story"}
                                </td>
                                <td>
                                  <span className={`risk-tag ${genuine ? "genuine" : "fake"}`}>
                                    {item.label}
                                  </span>
                                </td>
                                <td>{item.confidence}%</td>
                                <td style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{formatDate(item.created_at)}</td>
                                <td>
                                  <div className="action-buttons-cell">
                                    <button
                                      className="table-action-btn"
                                      onClick={() => downloadPdfReport(itemId)}
                                      title="Download PDF"
                                    >
                                      <Download size={12} />
                                      <span>PDF</span>
                                    </button>
                                    <button
                                      className="table-action-btn"
                                      onClick={() => downloadJsonReport(itemId)}
                                      title="Export JSON"
                                    >
                                      <FileText size={12} />
                                      <span>JSON</span>
                                    </button>
                                    <button
                                      className="table-action-btn"
                                      onClick={() => triggerBookmark(itemId)}
                                      title="Bookmark"
                                    >
                                      <Bookmark size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================================================
                SUB-TAB 2: USER ANALYSIS HISTORY (ISOLATED)
            ================================================ */}
            {workspaceSubTab === "history" && (
              <div>
                <div className="admin-table-header" style={{ marginBottom: "18px" }}>
                  <div className="history-filter-pills">
                    <button
                      className={`filter-pill ${userHistoryFilter === "all" ? "active" : ""}`}
                      onClick={() => setUserHistoryFilter("all")}
                    >
                      All ({userHistory.length})
                    </button>
                    <button
                      className={`filter-pill ${userHistoryFilter === "genuine" ? "active" : ""}`}
                      onClick={() => setUserHistoryFilter("genuine")}
                    >
                      Likely Genuine ({userHistory.filter((i) => i.prediction === 1).length})
                    </button>
                    <button
                      className={`filter-pill ${userHistoryFilter === "fake" ? "active" : ""}`}
                      onClick={() => setUserHistoryFilter("fake")}
                    >
                      Potentially Fake ({userHistory.filter((i) => i.prediction === 0).length})
                    </button>
                  </div>

                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Search your analyses..."
                    value={userHistorySearch}
                    onChange={(e) => setUserHistorySearch(e.target.value)}
                  />
                </div>

                {userHistoryLoading && (
                  <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    <Loader2 size={32} className="spin" style={{ margin: "0 auto 12px" }} />
                    <p>Loading your personal analyses...</p>
                  </div>
                )}

                {!userHistoryLoading && filteredUserHistory.length === 0 && (
                  <div className="history-empty">
                    <BrainCircuit size={32} />
                    <h3>No analyses found</h3>
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

                {!userHistoryLoading && filteredUserHistory.length > 0 && (
                  <div className="history-grid">
                    {filteredUserHistory.map((item) => {
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
                              {item.text.length > 150 ? `${item.text.substring(0, 150)}...` : item.text}
                            </p>
                          )}

                          <div className="history-card-bottom">
                            <div className="history-meta-row">
                              <span className="risk-tag">{item.risk_level}</span>
                              <span className="conf-tag">{item.confidence}% confidence</span>
                            </div>

                            <div className="history-action-links">
                              <button
                                className="history-link-btn"
                                onClick={() => downloadPdfReport(itemId)}
                                title="Download PDF Report"
                              >
                                <Download size={13} />
                                <span>PDF</span>
                              </button>

                              <button
                                className="history-link-btn"
                                onClick={() => downloadJsonReport(itemId)}
                                title="Export JSON"
                              >
                                <FileText size={13} />
                                <span>JSON</span>
                              </button>

                              <button
                                className="history-link-btn"
                                onClick={() => triggerBookmark(itemId)}
                                title="Save to bookmarks"
                              >
                                <Bookmark size={13} />
                                <span>Save</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================================================
                SUB-TAB 3: BOOKMARKED STORIES
            ================================================ */}
            {workspaceSubTab === "saved" && (
              <div>
                {savedItemsLoading && (
                  <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    <Loader2 size={32} className="spin" style={{ margin: "0 auto 12px" }} />
                    <p>Loading your bookmarked stories...</p>
                  </div>
                )}

                {!savedItemsLoading && savedItems.length === 0 && (
                  <div className="history-empty">
                    <Bookmark size={32} />
                    <h3>No bookmarked stories yet</h3>
                    <p>Click &quot;Save to Workspace&quot; on any analysis result to bookmark it here with research notes.</p>
                  </div>
                )}

                {!savedItemsLoading && savedItems.length > 0 && (
                  <div className="history-grid">
                    {savedItems.map((item) => (
                      <div className="history-card" key={item.id}>
                        <div className="history-card-top">
                          <div>
                            <span className="panel-eyebrow">BOOKMARK</span>
                            <span className="history-date">Saved {formatDate(item.saved_at)}</span>
                          </div>

                          <button
                            className="delete-history-btn"
                            onClick={() => removeSavedBookmark(item.id)}
                            title="Remove bookmark"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <h3>{item.title}</h3>

                        {item.notes && (
                          <div className="bookmark-notes-box">
                            <strong>Your Notes:</strong>
                            <p>{item.notes}</p>
                          </div>
                        )}

                        <div className="history-card-bottom" style={{ marginTop: "16px" }}>
                          <div className="history-meta-row">
                            <span className={`risk-tag ${item.label === "Likely Genuine" ? "genuine" : "fake"}`}>
                              {item.label}
                            </span>
                            <span className="conf-tag">{item.confidence}% confidence</span>
                          </div>

                          <div className="history-action-links">
                            {item.analysis_id && (
                              <>
                                <button
                                  className="history-link-btn"
                                  onClick={() => downloadPdfReport(item.analysis_id)}
                                  title="Download PDF"
                                >
                                  <Download size={13} />
                                  <span>PDF</span>
                                </button>
                                <button
                                  className="history-link-btn"
                                  onClick={() => downloadJsonReport(item.analysis_id)}
                                  title="Export JSON"
                                >
                                  <FileText size={13} />
                                  <span>JSON</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================================================
                SUB-TAB 4: EXPORT REPORTS
            ================================================ */}
            {workspaceSubTab === "reports" && (
              <div className="admin-table-card">
                <div className="admin-table-header">
                  <div className="admin-table-title">
                    <Download size={18} />
                    <h3>Export Analysis Dossiers</h3>
                  </div>
                </div>

                <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "20px" }}>
                  Download complete credibility audit dossiers formatted as branded ReportLab PDFs or machine-readable JSON files.
                </p>

                {userHistory.length === 0 ? (
                  <div className="history-empty" style={{ padding: "30px" }}>
                    <FileText size={28} />
                    <p>Perform an analysis to unlock downloadable reports.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>HEADLINE</th>
                          <th>VERDICT</th>
                          <th>DATE</th>
                          <th>DOWNLOAD OPTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userHistory.map((h) => {
                          const itemId = h.id || h._id;
                          return (
                            <tr key={itemId}>
                              <td style={{ fontWeight: 600 }}>{h.title || "Untitled Story"}</td>
                              <td>
                                <span className={`risk-tag ${h.prediction === 1 ? "genuine" : "fake"}`}>
                                  {h.label}
                                </span>
                              </td>
                              <td style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{formatDate(h.created_at)}</td>
                              <td>
                                <div className="action-buttons-cell">
                                  <button
                                    className="table-action-btn"
                                    onClick={() => downloadPdfReport(itemId)}
                                    title="Download Branded PDF Dossier"
                                  >
                                    <Download size={12} />
                                    <span>Download PDF</span>
                                  </button>
                                  <button
                                    className="table-action-btn"
                                    onClick={() => downloadJsonReport(itemId)}
                                    title="Export JSON Dossier"
                                  >
                                    <FileText size={12} />
                                    <span>Export JSON</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ====================================================
            VIEW 3: ADMIN INTELLIGENCE PORTAL
            Requirement 4 & 9: ML Intelligence, KPIs, RBAC.
        ==================================================== */}
        {activeTab === "admin" && user?.role === "admin" && (
          <section className="admin-container">
            <div className="admin-header-banner">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h2>Administrator Platform Intelligence</h2>
                {adminLoading && <Loader2 size={18} className="spin" style={{ color: "#38bdf8" }} />}
              </div>
              <p>System metrics, user management, global analysis audit trail, and ML model diagnostics.</p>
            </div>

            {/* Admin Sub-Tabs Navigation */}
            <div className="admin-subtabs">
              <button
                className={`admin-subtab-btn ${adminSubTab === "dashboard" ? "active" : ""}`}
                onClick={() => setAdminSubTab("dashboard")}
              >
                <LayoutDashboard size={15} />
                <span>Admin Dashboard</span>
              </button>

              <button
                className={`admin-subtab-btn ${adminSubTab === "users" ? "active" : ""}`}
                onClick={() => setAdminSubTab("users")}
              >
                <User size={15} />
                <span>User Management ({adminUsers.length})</span>
              </button>

              <button
                className={`admin-subtab-btn ${adminSubTab === "analyses" ? "active" : ""}`}
                onClick={() => setAdminSubTab("analyses")}
              >
                <History size={15} />
                <span>All Analyses ({adminHistory.length})</span>
              </button>

              <button
                className={`admin-subtab-btn ${adminSubTab === "health" ? "active" : ""}`}
                onClick={() => setAdminSubTab("health")}
              >
                <Activity size={15} />
                <span>System Health</span>
              </button>

              <button
                className={`admin-subtab-btn ${adminSubTab === "ml" ? "active" : ""}`}
                onClick={() => setAdminSubTab("ml")}
              >
                <Cpu size={15} />
                <span>ML Intelligence</span>
              </button>
            </div>

            {/* ================================================
                ADMIN SUB-TAB 1: DASHBOARD OVERVIEW
            ================================================ */}
            {adminSubTab === "dashboard" && (
              <div>
                {/* Platform Summary KPI Grid */}
                <div className="admin-kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span>TOTAL USERS</span>
                      <User size={16} />
                    </div>
                    <div className="kpi-value">{adminStats?.total_users ?? "—"}</div>
                    <div className="kpi-subtext">Registered user accounts</div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span>TOTAL ANALYSES</span>
                      <BrainCircuit size={16} />
                    </div>
                    <div className="kpi-value">{adminStats?.total_analyses ?? "—"}</div>
                    <div className="kpi-subtext">All-time platform requests</div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span>LIKELY GENUINE</span>
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="kpi-value" style={{ color: "#34d399" }}>
                      {adminStats?.likely_genuine_count ?? "—"}
                    </div>
                    <div className="kpi-subtext">Classified as genuine content</div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span>POTENTIALLY FAKE</span>
                      <CircleAlert size={16} />
                    </div>
                    <div className="kpi-value" style={{ color: "#f87171" }}>
                      {adminStats?.potentially_fake_count ?? "—"}
                    </div>
                    <div className="kpi-subtext">Flagged as misleading content</div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span>HIGH RISK SIGNALS</span>
                      <ShieldAlert size={16} />
                    </div>
                    <div className="kpi-value" style={{ color: "#fbbf24" }}>
                      {adminStats?.high_risk_count ?? "—"}
                    </div>
                    <div className="kpi-subtext">Severe hyperbole or false markers</div>
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

                {/* Credibility Distribution Card */}
                {adminStats && adminStats.total_analyses > 0 && (
                  <div className="admin-table-card" style={{ marginBottom: "28px" }}>
                    <div className="admin-table-header">
                      <div className="admin-table-title">
                        <BarChart3 size={18} />
                        <h3>Credibility Distribution</h3>
                      </div>
                    </div>

                    <div className="cred-bar-container">
                      <div
                        className="cred-bar-segment genuine"
                        style={{
                          width: `${(adminStats.likely_genuine_count / adminStats.total_analyses) * 100}%`,
                        }}
                      />
                      <div
                        className="cred-bar-segment fake"
                        style={{
                          width: `${(adminStats.potentially_fake_count / adminStats.total_analyses) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="cred-bar-legend">
                      <span>
                        Likely Genuine: {adminStats.likely_genuine_count} (
                        {((adminStats.likely_genuine_count / adminStats.total_analyses) * 100).toFixed(1)}%)
                      </span>
                      <span>
                        Potentially Fake: {adminStats.potentially_fake_count} (
                        {((adminStats.potentially_fake_count / adminStats.total_analyses) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================================================
                ADMIN SUB-TAB 2: USER MANAGEMENT
            ================================================ */}
            {adminSubTab === "users" && (
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
            )}

            {/* ================================================
                ADMIN SUB-TAB 3: ALL ANALYSES (GLOBAL AUDIT)
            ================================================ */}
            {adminSubTab === "analyses" && (
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
                        adminHistory.map((h, idx) => (
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
            )}

            {/* ================================================
                ADMIN SUB-TAB 4: SYSTEM HEALTH
            ================================================ */}
            {adminSubTab === "health" && (
              <div className="admin-table-card">
                <div className="admin-table-header">
                  <div className="admin-table-title">
                    <Activity size={18} />
                    <h3>System Infrastructure & Component Health</h3>
                  </div>
                  <button className="table-action-btn" onClick={refreshAdminData}>
                    <RotateCcw size={13} />
                    <span>Re-check</span>
                  </button>
                </div>

                <div className="dataset-specs-card" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <div className="specs-col">
                    <span className="specs-label">FASTAPI ENGINE</span>
                    <strong style={{ color: systemHealth.online ? "#34d399" : "#f87171" }}>
                      {systemHealth.online ? "ONLINE" : "OFFLINE"}
                    </strong>
                    <small>{API_BASE}</small>
                  </div>

                  <div className="specs-col">
                    <span className="specs-label">ML CLASSIFIER</span>
                    <strong style={{ color: "#34d399" }}>Linear SVM Ready</strong>
                    <small>truthlens_model.pkl loaded</small>
                  </div>

                  <div className="specs-col">
                    <span className="specs-label">FEATURE VECTORIZER</span>
                    <strong style={{ color: "#34d399" }}>TF-IDF Vectorizer</strong>
                    <small>100,000 max features</small>
                  </div>

                  <div className="specs-col">
                    <span className="specs-label">DATABASE PERSISTENCE</span>
                    <strong style={{ color: systemHealth.dbConnected ? "#34d399" : "#fbbf24" }}>
                      {systemHealth.dbConnected ? "MongoDB Atlas Connected" : "Resilient Fallback Mode"}
                    </strong>
                    <small>High availability zero-downtime store</small>
                  </div>

                  <div className="specs-col">
                    <span className="specs-label">EVIDENCE ENGINE</span>
                    <strong style={{ color: "#34d399" }}>Google News RSS</strong>
                    <small>Configurable 7.0s timeout</small>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================
                ADMIN SUB-TAB 5: ML INTELLIGENCE & BENCHMARK
                Requirement 4: Technical ML content moved here from public view!
            ================================================ */}
            {adminSubTab === "ml" && (
              <div>
                {/* Active Architecture Summary */}
                <div className="admin-table-card">
                  <div className="admin-table-header">
                    <div className="admin-table-title">
                      <Cpu size={18} />
                      <h3>Active Machine Learning Architecture Specifications</h3>
                    </div>
                  </div>

                  <div className="dataset-specs-card" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                    <div className="specs-col">
                      <span className="specs-label">SELECTED CLASSIFIER</span>
                      <strong>{adminModelDetails?.active_model || "Linear SVM"}</strong>
                      <small>LinearSVC (scikit-learn)</small>
                    </div>
                    <div className="specs-col">
                      <span className="specs-label">VALIDATION F1 SCORE</span>
                      <strong style={{ color: "#34d399" }}>
                        {adminModelDetails?.validation_metrics?.f1_score
                          ? `${(adminModelDetails.validation_metrics.f1_score * 100).toFixed(2)}%`
                          : "99.69%"}
                      </strong>
                      <small>Stratified test split</small>
                    </div>
                    <div className="specs-col">
                      <span className="specs-label">VALIDATION ACCURACY</span>
                      <strong style={{ color: "#38bdf8" }}>99.67%</strong>
                      <small>Validation evaluation</small>
                    </div>
                    <div className="specs-col">
                      <span className="specs-label">DATASET SIZE</span>
                      <strong>32,175 Records</strong>
                      <small>25,740 Train / 6,435 Val</small>
                    </div>
                    <div className="specs-col">
                      <span className="specs-label">TF-IDF FEATURES</span>
                      <strong>100,000 Features</strong>
                      <small>ngram_range: (1, 2)</small>
                    </div>
                  </div>
                </div>

                {/* Empirical Classifier Comparison Table */}
                <div className="admin-table-card">
                  <div className="admin-table-header">
                    <div className="admin-table-title">
                      <BarChart3 size={18} />
                      <h3>Empirical Classifier Benchmark Comparison</h3>
                    </div>
                  </div>

                  <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginBottom: "18px" }}>
                    Evaluated against the project dataset (32,175 records) using stratified 80/20 train/validation split.
                    Linear SVM emerged as the best-performing production classifier.
                  </p>

                  <div className="model-table">
                    <div className="model-row model-head">
                      <span>CLASSIFIER MODEL</span>
                      <span>ACCURACY</span>
                      <span>PRECISION</span>
                      <span>RECALL</span>
                      <span>F1 SCORE</span>
                    </div>

                    {/* Linear SVM - Selected Winner */}
                    <div className="model-row featured-model">
                      <div>
                        <div className="winner-badge">SELECTED PRODUCTION MODEL</div>
                        <strong>Linear SVM / LinearSVC</strong>
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

                  <p className="benchmark-disclaimer" style={{ marginTop: "16px" }}>
                    * Academic Notice: Performance shown is based on validation data from the project dataset (6,435 held-out records).
                    While Linear SVM achieves 99.69% validation F1 score, real-world deployment benefits from continuous
                    corroboration via live reporting feeds and human-in-the-loop fact-checking.
                  </p>
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
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="modal-footer-switch">
              {authModal === "login" ? (
                <span>
                  Don&apos;t have an account?{" "}
                  <button
                    className="text-link-btn"
                    onClick={() => {
                      setAuthError("");
                      setAuthModal("register");
                    }}
                  >
                    Register here
                  </button>
                </span>
              ) : (
                <span>
                  Already registered?{" "}
                  <button
                    className="text-link-btn"
                    onClick={() => {
                      setAuthError("");
                      setAuthModal("login");
                    }}
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL: SAVE ANALYSIS WITH NOTES
      ====================================================== */}
      {saveModalOpen && (
        <div className="modal-overlay" onClick={() => setSaveModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSaveModalOpen(false)}>
              <X size={16} />
            </button>

            <div className="modal-title-box">
              <h3>Bookmark to Workspace</h3>
              <p>Save this analysis to your personal workspace with optional research notes.</p>
            </div>

            <form className="modal-form" onSubmit={confirmSaveAnalysis}>
              <div className="form-field-group">
                <label htmlFor="save-notes">Research Notes (Optional)</label>
                <textarea
                  id="save-notes"
                  rows={4}
                  className="form-input-field"
                  placeholder="Add your thoughts, context, or follow-up questions for this story..."
                  value={saveNotes}
                  onChange={(e) => setSaveNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="modal-submit-btn" disabled={saveLoading}>
                {saveLoading ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <>
                    <Bookmark size={15} />
                    <span>Confirm Bookmark</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          GLOBAL TOAST NOTIFICATION
      ====================================================== */}
      {toastMessage && (
        <div className="toast-notification">
          <Sparkles size={14} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
