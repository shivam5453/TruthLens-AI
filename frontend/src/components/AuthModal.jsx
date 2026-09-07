import {
  X,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
  Sparkles
} from "lucide-react";

export default function AuthModal({
  authModal,
  setAuthModal,
  authForm,
  setAuthForm,
  authError,
  authLoading,
  handleAuthSubmit
}) {
  if (!authModal) return null;

  const isRegister = authModal === "register";

  const fillDemo = (role) => {
    if (role === "admin") {
      setAuthModal("login");
      setAuthForm({
        name: "",
        email: "admin@truthlens.ai",
        password: "AdminPassword123!",
        confirmPassword: ""
      });
    } else {
      setAuthModal("login");
      setAuthForm({
        name: "",
        email: "researcher@truthlens.ai",
        password: "UserPassword123!",
        confirmPassword: ""
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setAuthModal(null)} role="dialog" aria-modal="true">
      <div className="modal-card auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
            <h3>{isRegister ? "Create Research Account" : "Sign In to TruthLens AI"}</h3>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={() => setAuthModal(null)}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tab-bar">
          <button
            type="button"
            className={`auth-tab ${!isRegister ? "active" : ""}`}
            onClick={() => setAuthModal("login")}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegister ? "active" : ""}`}
            onClick={() => setAuthModal("register")}
          >
            <UserPlus size={14} />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error Notification */}
        {authError && (
          <div className="auth-error-alert" role="alert">
            <AlertCircle size={15} />
            <span>{authError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleAuthSubmit} className="auth-form">
          {isRegister && (
            <div className="form-field">
              <label htmlFor="auth-name">Full Name</label>
              <div className="field-input-wrap">
                <User size={15} className="field-icon" />
                <input
                  id="auth-name"
                  type="text"
                  placeholder="e.g. Dr. Alex Vance"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  required
                  disabled={authLoading}
                />
              </div>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="auth-email">Email Address</label>
            <div className="field-input-wrap">
              <Mail size={15} className="field-icon" />
              <input
                id="auth-email"
                type="email"
                placeholder="name@organization.org"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                required
                disabled={authLoading}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="auth-password">Password</label>
            <div className="field-input-wrap">
              <Lock size={15} className="field-icon" />
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                required
                disabled={authLoading}
              />
            </div>
          </div>

          {isRegister && (
            <div className="form-field">
              <label htmlFor="auth-confirm-password">Confirm Password</label>
              <div className="field-input-wrap">
                <Lock size={15} className="field-icon" />
                <input
                  id="auth-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={authForm.confirmPassword}
                  onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                  required
                  disabled={authLoading}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-auth-submit"
            disabled={authLoading}
          >
            {authLoading ? (
              <>
                <Loader2 size={16} className="btn-spinner" />
                <span>Processing...</span>
              </>
            ) : isRegister ? (
              <>
                <UserPlus size={16} />
                <span>Create Free Account</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Sign In to Workspace</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Fast-Fill Section for Evaluators */}
        <div className="demo-credentials-box">
          <div className="demo-box-header">
            <Sparkles size={12} />
            <span>Fast Evaluation Credentials:</span>
          </div>
          <div className="demo-buttons-row">
            <button
              type="button"
              className="btn-demo-quick"
              onClick={() => fillDemo("user")}
            >
              Fill Researcher Account
            </button>
            <button
              type="button"
              className="btn-demo-quick admin"
              onClick={() => fillDemo("admin")}
            >
              Fill Admin Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
