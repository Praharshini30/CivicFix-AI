import { Search, RefreshCw, MapPin, Inbox, ChevronRight, Eye } from "lucide-react";
import { hasValidCoordinates } from "../utils/geo";

export default function ComplaintTable({
  complaints,
  search,
  setSearch,
  filter,
  setFilter,
  priorityFilter = "All priorities",
  setPriorityFilter = () => {},
  selectedComplaint = null,
  onSelectComplaint = () => {},
  onStatusChange,
  onRefresh,
  loading,
  error
}) {
  const visible = complaints.filter((item) => {
    const query = search.toLowerCase();
    const matchesSearch = [
      item.id,
      item.category,
      item.summary,
      item.location,
      item.department,
      item.status,
      item.severity
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));

    const matchesStatus = filter === "All statuses" || item.status === filter;
    const matchesPriority =
      priorityFilter === "All priorities" ||
      (item.severity || "").toLowerCase() === priorityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <section className="panel table-panel" id="complaints">
      <div className="table-top">
        <div>
          <p className="eyebrow">CASE MANAGEMENT REGISTRY</p>
          <h2>
            Complaints Registry{" "}
            <span className="count-pill">{complaints.length} records</span>
          </h2>
          <p className="muted">
            Detailed case log with inline status triage, department routing and geographic markers.
          </p>
        </div>
        <button
          className="icon-button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh complaints"
          title="Refresh complaints from backend"
        >
          <RefreshCw size={17} className={loading ? "spin" : ""} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="table-controls">
        <div className="search-box">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket, category, ward or keyword..."
            aria-label="Search complaints"
          />
        </div>

        <div className="table-filters-group">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter by status"
            className="filter-select"
          >
            <option>All statuses</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
            className="filter-select"
          >
            <option>All priorities</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="inline-error table-error" role="alert">
          {error}
        </div>
      )}

      {loading && complaints.length === 0 ? (
        <div className="table-state">
          <span className="spinner" /> Loading municipal complaints…
        </div>
      ) : visible.length === 0 ? (
        <div className="table-state">
          <Inbox size={32} />
          <strong>No complaints match your query</strong>
          <span>Try adjusting your search criteria or clear status filters.</span>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="civic-table">
            <thead>
              <tr>
                <th>Ticket &amp; Issue</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Location</th>
                <th>Department</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const isSelected = selectedComplaint?.id === item.id;
                const hasCoords = hasValidCoordinates(item);

                return (
                  <tr
                    key={item.id}
                    className={`table-row ${isSelected ? "row-selected" : ""}`}
                    onClick={() => onSelectComplaint(item)}
                  >
                    <td>
                      <div className="ticket-cell-group">
                        <strong className="ticket-id-tag">{item.id}</strong>
                        <span className="summary-cell">
                          {item.summary || item.description || "No summary available"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="category-cell">
                        {item.category || "General Civic Issue"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`severity-badge severity-${(item.severity || "medium").toLowerCase()}`}
                      >
                        {item.severity || "Unknown"}
                      </span>
                    </td>
                    <td>
                      <select
                        className={`status-select status-${(item.status || "open")
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                        value={item.status || "Open"}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onStatusChange(item.id, e.target.value)}
                        aria-label={`Update status for ${item.id}`}
                      >
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Resolved</option>
                      </select>
                    </td>
                    <td>
                      <div className="location-cell">
                        <MapPin
                          size={13}
                          className={hasCoords ? "loc-has-coords" : "loc-no-coords"}
                          title={hasCoords ? "Geocoded with coordinates" : "Locality text only"}
                        />
                        <span>{item.location || "Not specified"}</span>
                      </div>
                    </td>
                    <td>
                      <span className="department-tag">
                        {item.department || "Civic Services"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-inspect-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectComplaint(item);
                        }}
                        title="Open Case Dossier"
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-footer">
        <div>
          Showing <strong>{visible.length}</strong> of <strong>{complaints.length}</strong> recorded cases
        </div>
        <div className="table-footer-legend">
          <span className="legend-dot dot-green" /> Geocoded
          <span className="legend-dot dot-grey" /> Locality Text Only
        </div>
      </div>
    </section>
  );
}
