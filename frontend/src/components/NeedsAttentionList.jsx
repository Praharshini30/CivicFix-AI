import { useState } from "react";
import { AlertCircle, Clock, MapPin, CheckCircle, ArrowRight, Filter, ChevronRight } from "lucide-react";

export default function NeedsAttentionList({
  complaints = [],
  selectedComplaint = null,
  onSelectComplaint = () => {}
}) {
  const [filterMode, setFilterMode] = useState("priority"); // 'priority' | 'active' | 'all'

  // Filter complaints based on the selected mode
  const filtered = complaints.filter((item) => {
    const isResolved = item.status === "Resolved";
    const isHigh = (item.severity || "").toLowerCase() === "high";

    if (filterMode === "priority") {
      // High priority first, or unassigned/open
      return isHigh && !isResolved;
    }
    if (filterMode === "active") {
      return !isResolved;
    }
    return true;
  });

  // Sort: High priority first, then Open, then In Progress, then Resolved
  const sorted = [...filtered].sort((a, b) => {
    const aHigh = (a.severity || "").toLowerCase() === "high" ? 1 : 0;
    const bHigh = (b.severity || "").toLowerCase() === "high" ? 1 : 0;
    if (aHigh !== bHigh) return bHigh - aHigh;

    const statusOrder = { Open: 0, "In Progress": 1, Resolved: 2 };
    return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
  });

  const urgentCount = complaints.filter(
    (c) => (c.severity || "").toLowerCase() === "high" && c.status !== "Resolved"
  ).length;

  return (
    <div className="needs-attention-panel">
      {/* Header */}
      <div className="attention-header">
        <div>
          <div className="eyebrow">COMMAND DESK</div>
          <div className="attention-title-row">
            <h3 className="attention-title">Needs Attention</h3>
            <span className="urgent-badge" title="High priority open issues">
              {urgentCount} critical
            </span>
          </div>
        </div>
        <div className="attention-filter-pills" role="tablist" aria-label="Issue filter tabs">
          <button
            type="button"
            role="tab"
            aria-selected={filterMode === "priority"}
            className={`filter-tab ${filterMode === "priority" ? "tab-active" : ""}`}
            onClick={() => setFilterMode("priority")}
          >
            High Priority ({urgentCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterMode === "active"}
            className={`filter-tab ${filterMode === "active" ? "tab-active" : ""}`}
            onClick={() => setFilterMode("active")}
          >
            Active
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterMode === "all"}
            className={`filter-tab ${filterMode === "all" ? "tab-active" : ""}`}
            onClick={() => setFilterMode("all")}
          >
            All ({complaints.length})
          </button>
        </div>
      </div>

      {/* Complaint List */}
      <div className="attention-list-wrapper">
        {sorted.length === 0 ? (
          <div className="attention-empty">
            <CheckCircle size={32} className="empty-check-icon" />
            <strong>No issues in this queue</strong>
            <p className="muted">All high-priority complaints have been routed or addressed.</p>
          </div>
        ) : (
          <div className="attention-cards-stack">
            {sorted.map((item) => {
              const isSelected = selectedComplaint?.id === item.id;
              const isHigh = (item.severity || "").toLowerCase() === "high";
              const isResolved = item.status === "Resolved";

              return (
                <article
                  key={item.id}
                  className={`attention-card ${isSelected ? "card-selected" : ""} ${
                    isHigh && !isResolved ? "card-high-priority" : ""
                  }`}
                  onClick={() => onSelectComplaint(item)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onSelectComplaint(item);
                    }
                  }}
                  aria-label={`Complaint ${item.id}: ${item.category || "Issue"}`}
                >
                  <div className="card-top">
                    <span className="card-ticket-id">{item.id}</span>
                    <div className="card-badges">
                      <span
                        className={`severity-badge severity-${(item.severity || "medium").toLowerCase()}`}
                      >
                        {item.severity || "Normal"}
                      </span>
                      <span
                        className={`status-pill status-${(item.status || "open")
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {item.status || "Open"}
                      </span>
                    </div>
                  </div>

                  <h4 className="card-category">{item.category || "General Civic Issue"}</h4>

                  <p className="card-summary">
                    {item.summary || item.description || "No summary provided."}
                  </p>

                  <div className="card-footer">
                    <span className="card-location">
                      <MapPin size={12} />
                      <span className="loc-text">{item.location || "Unspecified location"}</span>
                    </span>
                    <span className="card-cta">
                      <span>Inspect</span>
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="attention-footer">
        <span>Click any card to pinpoint on map &amp; inspect case details</span>
      </div>
    </div>
  );
}

