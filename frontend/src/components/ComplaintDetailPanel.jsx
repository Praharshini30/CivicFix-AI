import {
  X,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Sparkles,
  ExternalLink,
  Navigation
} from "lucide-react";
import { getCoordinates } from "../utils/geo";

export default function ComplaintDetailPanel({
  complaint = null,
  onClose = () => {},
  onStatusChange = () => {},
  statusBusy = false
}) {
  if (!complaint) return null;

  const coords = getCoordinates(complaint);
  const isHigh = (complaint.severity || "").toLowerCase() === "high";
  const duplicate = complaint.duplicateOf;

  return (
    <div className="detail-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="detail-panel"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Panel Header */}
        <div className="detail-header">
          <div className="detail-header-left">
            <span className="eyebrow">CASE DOSSIER</span>
            <div className="detail-id-row">
              <h3 className="detail-ticket-id">{complaint.id}</h3>
              <span
                className={`severity-badge severity-${(complaint.severity || "medium").toLowerCase()}`}
              >
                {complaint.severity || "Medium"} Priority
              </span>
            </div>
          </div>
          <button
            type="button"
            className="detail-close-btn"
            onClick={onClose}
            aria-label="Close dossier"
          >
            <X size={18} />
          </button>
        </div>

        {/* Panel Body */}
        <div className="detail-body">
          {/* Status Bar & Quick Actions */}
          <div className="detail-status-card">
            <div className="status-current">
              <span className="status-label">Current Status:</span>
              <span
                className={`status-pill status-${(complaint.status || "open")
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {complaint.status || "Open"}
              </span>
            </div>

            <div className="status-actions">
              <span className="status-change-label">Transition:</span>
              <div className="status-btn-group">
                {["Open", "In Progress", "Resolved"].map((targetStatus) => (
                  <button
                    key={targetStatus}
                    type="button"
                    disabled={statusBusy || complaint.status === targetStatus}
                    className={`status-change-btn ${
                      complaint.status === targetStatus ? "btn-active-status" : ""
                    }`}
                    onClick={() => onStatusChange(complaint.id, targetStatus)}
                  >
                    {targetStatus}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Core Issue Summary */}
          <div className="detail-section">
            <h4 className="detail-section-title">Issue Summary</h4>
            <div className="detail-summary-box">
              <p className="summary-text">
                {complaint.summary || complaint.description || "No summary provided."}
              </p>
              {complaint.description && complaint.description !== complaint.summary && (
                <div className="original-description">
                  <span className="desc-label">Original Citizen Report:</span>
                  <p>{complaint.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Department & Triage Breakdown */}
          <div className="detail-grid-two">
            <div className="detail-meta-item">
              <div className="meta-icon-label">
                <Building2 size={14} />
                <span>Assigned Department</span>
              </div>
              <strong className="meta-value">{complaint.department || "Civic Services"}</strong>
            </div>

            <div className="detail-meta-item">
              <div className="meta-icon-label">
                <Sparkles size={14} />
                <span>Triage Origin</span>
              </div>
              <span
                className={`source-label ${(complaint.triageSource || complaint.source || "")
                  .toLowerCase()
                  .includes("fallback")
                  ? "source-fallback"
                  : "source-ai"}`}
              >
                {complaint.triageSource || complaint.source || "AI Assisted"}
              </span>
            </div>
          </div>

          {/* Geographic Location & Coordinates */}
          <div className="detail-section">
            <h4 className="detail-section-title">Geographic Location</h4>
            <div className="location-detail-card">
              <div className="loc-text-row">
                <MapPin size={16} className="loc-pin" />
                <div>
                  <strong className="loc-title">{complaint.location || "Location not provided"}</strong>
                  <div className="loc-sub">City: Hyderabad · Zone: GHMC Western Corridor</div>
                </div>
              </div>

              <div className="coords-spec-row">
                <span className="coords-label">Coordinates:</span>
                {coords ? (
                  <span className="coords-val font-mono">
                    Lat: {coords[0].toFixed(5)}, Lng: {coords[1].toFixed(5)}
                  </span>
                ) : (
                  <span className="coords-missing">
                    No GPS coordinates attached (Locality text only)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Duplicate Detection Alert */}
          {duplicate && (
            <div className="duplicate-alert-banner">
              <AlertTriangle size={18} />
              <div>
                <strong>Potential Duplicate Detected</strong>
                <p>
                  This report matches existing record{" "}
                  <strong>{typeof duplicate === "string" ? duplicate : duplicate.id}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Panel Footer */}
        <div className="detail-footer">
          <button type="button" className="detail-done-btn" onClick={onClose}>
            Done Reviewing
          </button>
        </div>
      </div>
    </div>
  );
}

