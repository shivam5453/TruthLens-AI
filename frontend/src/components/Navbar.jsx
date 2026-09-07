import {
  ShieldCheck,
  BrainCircuit,
  Sparkles,
  LayoutDashboard,
  ShieldAlert,
  LogIn,
  UserPlus,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Layers,
  HelpCircle
} from "lucide-react";

export default function Navbar({
  activeTab,
  setActiveTab,
  user,
  systemHealth,
  theme,
  toggleTheme,
  mobileMenuOpen,
  setMobileMenuOpen,
  openAuthModal,
  handleLogout,
  setWorkspaceSubTab
}) {
  return (
    <header className="navbar-container">
      <nav className="navbar" aria-label="Main Navigation">
        {/* Brand Logo */}
        <a
          href="#top"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("analyzer");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <div className="brand-mark">
            <ShieldCheck size={20} />
          </div>
          <div className="brand-copy">
            <strong>TruthLens</strong>
            <span className="brand-ai-tag">AI</span>
          </div>
        </a>

        {/* Desktop Navigation Links / Tabs */}
        <div className="nav-center">
          {!user ? (
            <div className="nav-links-public">
              <button
                type="button"
                className={`nav-link-btn ${activeTab === "analyzer" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("analyzer");
                  const el = document.getElementById("analyzer");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <BrainCircuit size={14} />
                <span>Analyze</span>
              </button>
              <a href="#how-it-works" className="nav-link-btn">
                <Sparkles size={14} />
                <span>How It Works</span>
              </a>
              <a href="#features" className="nav-link-btn">
                <Layers size={14} />
                <span>Features</span>
              </a>
              <a href="#responsible-ai" className="nav-link-btn">
                <HelpCircle size={14} />
                <span>About</span>
              </a>
            </div>
          ) : (
            <div className="nav-tabs-bar">
              <button
                type="button"
                className={`nav-tab-item ${activeTab === "analyzer" ? "active" : ""}`}
                onClick={() => setActiveTab("analyzer")}
              >
                <BrainCircuit size={14} />
                <span>Analyzer</span>
              </button>

              <button
                type="button"
                className={`nav-tab-item ${activeTab === "workspace" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("workspace");
                  if (setWorkspaceSubTab) setWorkspaceSubTab("dashboard");
                }}
              >
                <LayoutDashboard size={14} />
                <span>My Workspace</span>
              </button>

              {user?.role === "admin" && (
                <button
                  type="button"
                  className={`nav-tab-item ${activeTab === "admin" ? "active" : ""}`}
                  onClick={() => setActiveTab("admin")}
                >
                  <ShieldAlert size={14} />
                  <span>Admin Portal</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Navigation & Status Controls */}
        <div className="nav-actions">
          {/* Live Engine Status Indicator */}
          <div
            className="system-status"
            title={
              systemHealth.status === "checking"
                ? "Checking backend engine status..."
                : systemHealth.online
                ? "FastAPI Engine Online"
                : "Engine Offline / Reconnecting"
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
            <strong className="status-val">
              {systemHealth.status === "checking"
                ? "Checking..."
                : systemHealth.online
                ? "ONLINE"
                : "OFFLINE"}
            </strong>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Authenticated User Profile Pill or Public Auth Buttons */}
          {user ? (
            <div className="user-profile-badge">
              <div className="user-avatar-circle">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="user-info-text">
                <span className="user-name">{user.name}</span>
                <span className={`role-badge ${user.role}`}>{user.role}</span>
              </div>
              <button
                type="button"
                className="btn-logout"
                onClick={handleLogout}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="nav-auth-group">
              <button
                type="button"
                className="btn-signin"
                onClick={() => openAuthModal("login")}
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                className="btn-getstarted"
                onClick={() => openAuthModal("register")}
              >
                <UserPlus size={13} />
                <span>Get Started</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <button
            type="button"
            className={`mobile-drawer-link ${activeTab === "analyzer" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("analyzer");
              setMobileMenuOpen(false);
              const el = document.getElementById("analyzer");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <BrainCircuit size={16} />
            <span>Credibility Analyzer</span>
          </button>

          {!user ? (
            <>
              <a
                href="#how-it-works"
                className="mobile-drawer-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Sparkles size={16} />
                <span>How It Works</span>
              </a>
              <a
                href="#features"
                className="mobile-drawer-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Layers size={16} />
                <span>Features</span>
              </a>
              <a
                href="#responsible-ai"
                className="mobile-drawer-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <HelpCircle size={16} />
                <span>Responsible AI</span>
              </a>

              <div className="mobile-drawer-divider" />

              <div className="mobile-auth-stack">
                <button
                  type="button"
                  className="btn-signin mobile-auth-btn"
                  onClick={() => {
                    openAuthModal("login");
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogIn size={15} />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  className="btn-getstarted mobile-auth-btn"
                  onClick={() => {
                    openAuthModal("register");
                    setMobileMenuOpen(false);
                  }}
                >
                  <UserPlus size={15} />
                  <span>Create Free Account</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`mobile-drawer-link ${activeTab === "workspace" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("workspace");
                  if (setWorkspaceSubTab) setWorkspaceSubTab("dashboard");
                  setMobileMenuOpen(false);
                }}
              >
                <LayoutDashboard size={16} />
                <span>My Workspace</span>
              </button>

              {user?.role === "admin" && (
                <button
                  type="button"
                  className={`mobile-drawer-link ${activeTab === "admin" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("admin");
                    setMobileMenuOpen(false);
                  }}
                >
                  <ShieldAlert size={16} />
                  <span>Admin Portal</span>
                </button>
              )}

              <div className="mobile-drawer-divider" />

              <div className="mobile-user-row">
                <div className="user-avatar-circle">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="user-info-text">
                  <span className="user-name">{user.name}</span>
                  <span className={`role-badge ${user.role}`}>{user.role}</span>
                </div>
                <button
                  type="button"
                  className="btn-logout-mobile"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
