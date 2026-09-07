import {
  LayoutDashboard,
  History,
  Bookmark,
  FileText,
  Settings,
  PlusCircle,
  Download,
  Trash2,
  Share2,
  CheckCircle2,
  CircleAlert,
  Search,
  Filter,
  ShieldCheck,
  Moon,
  Sun,
  Calendar,
  Loader2
} from "lucide-react";

export default function UserWorkspace({
  user,
  workspaceSubTab,
  setWorkspaceSubTab,
  userHistory,
  userHistoryLoading,
  userHistorySearch,
  setUserHistorySearch,
  userHistoryFilter,
  setUserHistoryFilter,
  savedItems,
  savedItemsLoading,
  onDeleteHistoryItem,
  onRemoveSaved,
  onExportPdf,
  onExportJson,
  onNewAnalysis,
  theme,
  toggleTheme,
  handleLogout
}) {
  const genuineCount = userHistory.filter((i) => i.prediction === 1).length;
  const misleadingCount = userHistory.filter((i) => i.prediction === 0).length;
  const totalCount = userHistory.length;
  const savedCount = savedItems.length;

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recent";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return String(dateStr);
    }
  };

  const formatConfidence = (val) => {
    if (typeof val !== "number") return "85%";
    const num = val > 1 ? val : val * 100;
    return `${Math.round(num)}%`;
  };

  const filteredHistory = userHistory.filter((item) => {
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

  return (
    <div className="workspace-shell">
      {/* Workspace Header & Subtabs */}
      <div className="workspace-header-bar">
        <div className="workspace-user-welcome">
          <div className="workspace-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="workspace-title-info">
            <h2>Welcome back, {user?.name || "Researcher"}</h2>
            <span className="workspace-role-pill">
              <ShieldCheck size={13} />
              <span>Workspace • Role: {user?.role || "user"}</span>
            </span>
          </div>
        </div>

        <div className="workspace-nav-pills">
          <button
            type="button"
            className={`ws-nav-btn ${workspaceSubTab === "dashboard" ? "active" : ""}`}
            onClick={() => setWorkspaceSubTab("dashboard")}
          >
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={`ws-nav-btn ${workspaceSubTab === "history" ? "active" : ""}`}
            onClick={() => setWorkspaceSubTab("history")}
          >
            <History size={14} />
            <span>History ({totalCount})</span>
          </button>
          <button
            type="button"
            className={`ws-nav-btn ${workspaceSubTab === "saved" ? "active" : ""}`}
            onClick={() => setWorkspaceSubTab("saved")}
          >
            <Bookmark size={14} />
            <span>Saved ({savedCount})</span>
          </button>
          <button
            type="button"
            className={`ws-nav-btn ${workspaceSubTab === "reports" ? "active" : ""}`}
            onClick={() => setWorkspaceSubTab("reports")}
          >
            <FileText size={14} />
            <span>Reports</span>
          </button>
          <button
            type="button"
            className={`ws-nav-btn ${workspaceSubTab === "settings" ? "active" : ""}`}
            onClick={() => setWorkspaceSubTab("settings")}
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: DASHBOARD OVERVIEW */}
      {workspaceSubTab === "dashboard" && (
        <div className="workspace-tab-content">
          {/* KPI Cards Grid */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Total Analyses</span>
                <History size={18} className="kpi-icon total" />
              </div>
              <div className="kpi-value">{totalCount}</div>
              <span className="kpi-subtext">Claims analyzed to date</span>
            </div>

            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Likely Genuine</span>
                <CheckCircle2 size={18} className="kpi-icon genuine" />
              </div>
              <div className="kpi-value genuine">{genuineCount}</div>
              <span className="kpi-subtext">
                {totalCount > 0 ? `${Math.round((genuineCount / totalCount) * 100)}% of your submissions` : "No submissions"}
              </span>
            </div>

            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Misleading Flagged</span>
                <CircleAlert size={18} className="kpi-icon fake" />
              </div>
              <div className="kpi-value fake">{misleadingCount}</div>
              <span className="kpi-subtext">
                {totalCount > 0 ? `${Math.round((misleadingCount / totalCount) * 100)}% of your submissions` : "No submissions"}
              </span>
            </div>

            <div className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-label">Bookmarked Dossiers</span>
                <Bookmark size={18} className="kpi-icon saved" />
              </div>
              <div className="kpi-value saved">{savedCount}</div>
              <span className="kpi-subtext">Saved with research notes</span>
            </div>
          </div>

          {/* Quick Action Banner */}
          <div className="workspace-action-banner">
            <div className="banner-copy">
              <h3>Start a New Credibility Investigation</h3>
              <p>Analyze breaking headlines or statements against linguistic models and live Google News RSS evidence.</p>
            </div>
            <button
              type="button"
              className="btn-ws-primary"
              onClick={onNewAnalysis}
            >
              <PlusCircle size={16} />
              <span>Launch Analyzer</span>
            </button>
          </div>

          {/* Recent Activity List */}
          <div className="workspace-section-block">
            <div className="block-header">
              <h3>Recent Research Activity</h3>
              <button
                type="button"
                className="btn-text-link"
                onClick={() => setWorkspaceSubTab("history")}
              >
                View Full History →
              </button>
            </div>

            {userHistoryLoading ? (
              <div className="loading-state-box">
                <Loader2 size={24} className="btn-spinner" />
                <span>Loading your workspace history...</span>
              </div>
            ) : userHistory.length === 0 ? (
              <div className="empty-state-box">
                <History size={32} />
                <h4>No analyses recorded yet</h4>
                <p>Analyze your first news story or claim to begin tracking credibility metrics.</p>
                <button
                  type="button"
                  className="btn-ws-primary"
                  onClick={onNewAnalysis}
                >
                  Analyze a Story
                </button>
              </div>
            ) : (
              <div className="recent-analyses-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Claim / Headline</th>
                      <th>Assessment</th>
                      <th>Confidence</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userHistory.slice(0, 5).map((item, idx) => (
                      <tr key={item.id || item._id || idx}>
                        <td className="claim-cell">
                          <strong>{item.title || "Untitled News Claim"}</strong>
                          <span className="claim-text-snippet">
                            {item.text ? item.text.slice(0, 80) + "..." : ""}
                          </span>
                        </td>
                        <td>
                          <span className={`table-verdict-pill ${item.prediction === 1 ? "genuine" : "fake"}`}>
                            {item.prediction === 1 ? "Likely Genuine" : "Likely Misleading"}
                          </span>
                        </td>
                        <td>
                          <span className="table-conf-val">
                            {formatConfidence(item.confidence)}
                          </span>
                        </td>
                        <td>{formatDate(item.created_at)}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="btn-table-action"
                              onClick={() => onExportPdf(item.id || item._id)}
                              title="Export PDF Report"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-table-action delete"
                              onClick={() => onDeleteHistoryItem(item.id || item._id)}
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: HISTORY */}
      {workspaceSubTab === "history" && (
        <div className="workspace-tab-content">
          <div className="workspace-filter-toolbar">
            <div className="search-input-wrap">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search your analysis history..."
                value={userHistorySearch}
                onChange={(e) => setUserHistorySearch(e.target.value)}
              />
            </div>

            <div className="filter-select-wrap">
              <Filter size={15} />
              <select
                value={userHistoryFilter}
                onChange={(e) => setUserHistoryFilter(e.target.value)}
              >
                <option value="all">All Assessments ({totalCount})</option>
                <option value="genuine">Likely Genuine ({genuineCount})</option>
                <option value="fake">Likely Misleading ({misleadingCount})</option>
              </select>
            </div>
          </div>

          {userHistoryLoading ? (
            <div className="loading-state-box">
              <Loader2 size={24} className="btn-spinner" />
              <span>Loading analysis records...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="empty-state-box">
              <History size={32} />
              <h4>No matching analyses found</h4>
              <p>Try adjusting your search query or filter options.</p>
            </div>
          ) : (
            <div className="history-cards-stack">
              {filteredHistory.map((item, idx) => (
                <div className="history-record-card" key={item.id || item._id || idx}>
                  <div className="history-card-top">
                    <span className={`table-verdict-pill ${item.prediction === 1 ? "genuine" : "fake"}`}>
                      {item.prediction === 1 ? "Likely Genuine" : "Likely Misleading"}
                    </span>
                    <span className="history-card-date">
                      <Calendar size={12} />
                      <span>{formatDate(item.created_at)}</span>
                    </span>
                  </div>

                  <h4 className="history-card-title">{item.title || "Untitled Claim"}</h4>
                  {item.text && <p className="history-card-body">{item.text}</p>}

                  <div className="history-card-bottom">
                    <div className="history-score-tag">
                      <span>Confidence:</span>
                      <strong>{formatConfidence(item.confidence)}</strong>
                    </div>

                    <div className="history-actions-row">
                      <button
                        type="button"
                        className="btn-history-tool"
                        onClick={() => onExportPdf(item.id || item._id)}
                        title="Download Branded PDF Dossier"
                      >
                        <Download size={13} />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        className="btn-history-tool"
                        onClick={() => onExportJson(item.id || item._id)}
                        title="Export Structured JSON"
                      >
                        <Share2 size={13} />
                        <span>JSON</span>
                      </button>
                      <button
                        type="button"
                        className="btn-history-tool delete"
                        onClick={() => onDeleteHistoryItem(item.id || item._id)}
                        title="Delete record from your history"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: SAVED ANALYSES */}
      {workspaceSubTab === "saved" && (
        <div className="workspace-tab-content">
          <div className="saved-header-info">
            <h3>Bookmarked Credibility Dossiers</h3>
            <p>Analyses saved for research follow-up, thesis citation, or fact-checking documentation.</p>
          </div>

          {savedItemsLoading ? (
            <div className="loading-state-box">
              <Loader2 size={24} className="btn-spinner" />
              <span>Loading saved items...</span>
            </div>
          ) : savedItems.length === 0 ? (
            <div className="empty-state-box">
              <Bookmark size={32} />
              <h4>No bookmarked analyses yet</h4>
              <p>When reviewing any credibility dossier in the analyzer, click "Save" to keep it here with research notes.</p>
            </div>
          ) : (
            <div className="saved-cards-stack">
              {savedItems.map((item, idx) => (
                <div className="saved-record-card" key={item.id || item._id || idx}>
                  <div className="saved-card-header">
                    <span className="saved-badge">
                      <Bookmark size={13} />
                      <span>BOOKMARKED</span>
                    </span>
                    <span className="saved-date">{formatDate(item.created_at)}</span>
                  </div>

                  <h4 className="saved-title">{item.title || "Saved Analysis"}</h4>
                  {item.text && <p className="saved-snippet">{item.text}</p>}

                  {item.notes && (
                    <div className="saved-notes-box">
                      <strong>Researcher Notes:</strong>
                      <p>{item.notes}</p>
                    </div>
                  )}

                  <div className="saved-card-footer">
                    <div className="saved-tools">
                      <button
                        type="button"
                        className="btn-history-tool"
                        onClick={() => onExportPdf(item.analysis_id || item.id)}
                        title="Download PDF"
                      >
                        <Download size={13} />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        className="btn-history-tool"
                        onClick={() => onExportJson(item.analysis_id || item.id)}
                        title="Download JSON"
                      >
                        <Share2 size={13} />
                        <span>JSON</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn-remove-saved"
                      onClick={() => onRemoveSaved(item.id || item._id)}
                    >
                      <Trash2 size={13} />
                      <span>Remove Bookmark</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: REPORTS & EXPORTS */}
      {workspaceSubTab === "reports" && (
        <div className="workspace-tab-content">
          <div className="reports-overview-card">
            <h3>Credibility Distribution & Research Reports</h3>
            <p>Aggregate evaluation statistics for claims analyzed across your research account.</p>

            <div className="distribution-bar-wrap">
              <div className="dist-labels">
                <span className="dist-label genuine">Likely Genuine: {genuineCount} ({totalCount > 0 ? Math.round((genuineCount / totalCount) * 100) : 0}%)</span>
                <span className="dist-label fake">Likely Misleading: {misleadingCount} ({totalCount > 0 ? Math.round((misleadingCount / totalCount) * 100) : 0}%)</span>
              </div>
              <div className="dist-track">
                <div
                  className="dist-fill genuine"
                  style={{ width: `${totalCount > 0 ? (genuineCount / totalCount) * 100 : 50}%` }}
                />
                <div
                  className="dist-fill fake"
                  style={{ width: `${totalCount > 0 ? (misleadingCount / totalCount) * 100 : 50}%` }}
                />
              </div>
            </div>

            <div className="reports-tools-box">
              <h4>Export Tools & Integration</h4>
              <p>Every analysis in your workspace supports publication-grade PDF and schema-validated JSON export.</p>
              <div className="report-buttons-row">
                <button
                  type="button"
                  className="btn-ws-primary"
                  onClick={() => setWorkspaceSubTab("history")}
                >
                  <FileText size={15} />
                  <span>Browse Exportable Dossiers</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: SETTINGS */}
      {workspaceSubTab === "settings" && (
        <div className="workspace-tab-content">
          <div className="settings-cards-grid">
            <div className="settings-card">
              <h3>Account Information</h3>
              <div className="settings-info-list">
                <div className="settings-row">
                  <span className="row-label">Full Name</span>
                  <strong className="row-val">{user?.name || "User"}</strong>
                </div>
                <div className="settings-row">
                  <span className="row-label">Email</span>
                  <strong className="row-val">{user?.email || "N/A"}</strong>
                </div>
                <div className="settings-row">
                  <span className="row-label">Assigned Role</span>
                  <span className={`role-badge ${user?.role}`}>{user?.role || "user"}</span>
                </div>
                <div className="settings-row">
                  <span className="row-label">Member Since</span>
                  <span className="row-val">{formatDate(user?.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <h3>Appearance & Theme</h3>
              <p>Switch between the dark-first AI SaaS aesthetic and the high-contrast light theme.</p>
              <div className="theme-preference-picker">
                <button
                  type="button"
                  className={`btn-theme-select ${theme === "dark" ? "active" : ""}`}
                  onClick={() => {
                    if (theme !== "dark") toggleTheme();
                  }}
                >
                  <Moon size={16} />
                  <span>Dark Theme</span>
                </button>
                <button
                  type="button"
                  className={`btn-theme-select ${theme === "light" ? "active" : ""}`}
                  onClick={() => {
                    if (theme !== "light") toggleTheme();
                  }}
                >
                  <Sun size={16} />
                  <span>Light Theme</span>
                </button>
              </div>
            </div>

            <div className="settings-card danger-zone">
              <h3>Session Management</h3>
              <p>Sign out of your current session across this browser.</p>
              <button
                type="button"
                className="btn-logout-danger"
                onClick={handleLogout}
              >
                Sign Out of Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
