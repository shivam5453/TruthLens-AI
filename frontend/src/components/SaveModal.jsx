import {
  X,
  Bookmark,
  FileText,
  Loader2
} from "lucide-react";

export default function SaveModal({
  saveModalOpen,
  setSaveModalOpen,
  saveNotes,
  setSaveNotes,
  saveLoading,
  confirmSaveAnalysis
}) {
  if (!saveModalOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setSaveModalOpen(false)} role="dialog" aria-modal="true">
      <div className="modal-card save-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Bookmark size={18} />
            <h3>Bookmark Analysis to Workspace</h3>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={() => setSaveModalOpen(false)}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={confirmSaveAnalysis} className="save-form">
          <p className="save-form-intro">
            Save this credibility dossier to your personal workspace. Add research notes, citations, or investigation labels.
          </p>

          <div className="form-field">
            <label htmlFor="save-notes">
              <FileText size={13} />
              <span>Research Notes / Context (optional)</span>
            </label>
            <textarea
              id="save-notes"
              className="save-textarea"
              rows={4}
              placeholder="e.g. Flagged for fact-checking follow-up; corroborated by Geneva energy communique..."
              value={saveNotes}
              onChange={(e) => setSaveNotes(e.target.value)}
              disabled={saveLoading}
            />
          </div>

          <div className="modal-actions-row">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={() => setSaveModalOpen(false)}
              disabled={saveLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modal-confirm"
              disabled={saveLoading}
            >
              {saveLoading ? (
                <>
                  <Loader2 size={15} className="btn-spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Bookmark size={15} />
                  <span>Save Bookmark</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
