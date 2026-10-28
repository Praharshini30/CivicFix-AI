import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Wifi,
  WifiOff,
  Bell,
  Plus,
  Compass,
  ListFilter,
  Layers,
  MapPin,
  TrendingUp,
  X
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import CityMap from "./components/CityMap";
import NeedsAttentionList from "./components/NeedsAttentionList";
import ComplaintDetailPanel from "./components/ComplaintDetailPanel";
import ComplaintTable from "./components/ComplaintTable";
import ComplaintForm from "./components/ComplaintForm";
import TriageResult from "./components/TriageResult";
import {
  createComplaint,
  getComplaints,
  getHealth,
  isUsingMocks,
  updateComplaintStatus
} from "./services/api";

export default function App() {
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [demoGeocode, setDemoGeocode] = useState(false);

  // Form input state
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latestResult, setLatestResult] = useState(null);
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // UI & Network state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tableError, setTableError] = useState("");
  const [notice, setNotice] = useState("");
  const [apiState, setApiState] = useState("checking");
  const [statusBusy, setStatusBusy] = useState("");

  // Table filters & search
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");

  // Navigation & responsive state
  const [active, setActive] = useState("command-centre");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("map"); // 'map' | 'list'

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    setTableError("");
    try {
      const [items, health] = await Promise.all([
        getComplaints(),
        getHealth().catch(() => null)
      ]);
      setComplaints(items);
      setApiState(
        health?.status === "ok" && !isUsingMocks()
          ? "online"
          : isUsingMocks()
          ? "mock"
          : "offline"
      );
    } catch (err) {
      setTableError(
        `Could not load complaints: ${err.message}. Check the API URL and backend.`
      );
      setApiState("offline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  // Key performance indicators (4 compact statistics)
  const stats = useMemo(
    () => ({
      total: complaints.length,
      open: complaints.filter((c) => c.status === "Open").length,
      high: complaints.filter(
        (c) =>
          (c.severity || "").toLowerCase() === "high" &&
          c.status !== "Resolved"
      ).length,
      resolved: complaints.filter((c) => c.status === "Resolved").length
    }),
    [complaints]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const payload = {
        description: description.trim(),
        location: location.trim(),
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined
      };
      const result = await createComplaint(payload);
      setLatestResult(result);
      setDescription("");
      setLocation("");
      setLatitude("");
      setLongitude("");
      setNotice(`Complaint ${result.id || ""} submitted and triaged successfully.`);
      await loadComplaints();
      setShowIntakeModal(false);
      document.getElementById("triage")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
      setError(`Submission failed: ${err.message}. Your complaint has not been confirmed.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id, status) {
    const previous = complaints;
    setStatusBusy(id);
    setTableError("");
    setComplaints((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item))
    );
    if (selectedComplaint?.id === id) {
      setSelectedComplaint((prev) => (prev ? { ...prev, status } : null));
    }
    try {
      await updateComplaintStatus(id, status);
      setNotice(`Complaint ${id} status updated to ${status}.`);
    } catch (err) {
      setComplaints(previous);
      setTableError(`Could not update ${id}: ${err.message}`);
    } finally {
      setStatusBusy("");
    }
  }

  function handleSelectComplaint(item) {
    setSelectedComplaint(item);
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={active}
        setActive={setActive}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onOpenNewComplaint={() => setShowIntakeModal(true)}
      />

      <main className="main-content">
        {/* Compact Header */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="breadcrumbs">
              <span>City Operations</span>
              <span className="crumb-slash">/</span>
              <strong>Command Centre</strong>
            </div>
            <span className="command-subtag">GHMC Incident Desk</span>
          </div>

          <div className="topbar-right">
            <span className={`connection-pill connection-${apiState}`}>
              <span className="connection-dot" />
              {apiState === "online"
                ? "API Connected"
                : apiState === "mock"
                ? "Demo Mode"
                : apiState === "checking"
                ? "Connecting"
                : "API Offline"}
            </span>

            <button
              type="button"
              className="topbar-cta-btn"
              onClick={() => {
                setShowIntakeModal(true);
              }}
            >
              <Plus size={15} />
              <span>New Complaint</span>
            </button>

            <button
              className="notification-button"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={17} />
              <i />
            </button>

            <div className="avatar" title="Municipal Officer">GH</div>
          </div>
        </header>

        <div className="page-content" id="command-centre">
          {/* Welcome Banner */}
          <section className="welcome-row">
            <div>
              <div className="date-label">
                MUNICIPAL EMERGENCY &amp; CIVIC SERVICES <span className="live-dot" /> LIVE OPERATIONS
              </div>
              <h1>City Issue Command Centre</h1>
              <p className="muted">
                Geospatial situational awareness, prioritized municipal response queues, and case registry.
              </p>
            </div>

            <div className="welcome-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  const el = document.getElementById("submit");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  else setShowIntakeModal(true);
                }}
              >
                <Plus size={15} />
                <span>Intake Form</span>
              </button>
            </div>
          </section>

          {/* Success Banner */}
          {notice && (
            <div className="success-banner" role="status">
              <CheckCircle2 size={17} />
              <span>{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}

          {/* Four Compact Statistics */}
          <section className="stats-grid" aria-label="Complaint statistics">
            <StatCard
              label="Total Complaints"
              value={stats.total}
              detail="All municipal records"
              icon={Activity}
              tone="tone-blue"
            />
            <StatCard
              label="Open Complaints"
              value={stats.open}
              detail="Awaiting field assignment"
              icon={Clock3}
              tone="tone-amber"
            />
            <StatCard
              label="High Priority"
              value={stats.high}
              detail="Critical response needed"
              icon={AlertCircle}
              tone="tone-red"
            />
            <StatCard
              label="Resolved Issues"
              value={stats.resolved}
              detail="Completed &amp; closed"
              icon={FileCheck2}
              tone="tone-green"
            />
          </section>

          {/* Mobile View Toggle (Map vs List) */}
          <div className="mobile-view-selector" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === "map"}
              className={`mobile-tab-btn ${mobileTab === "map" ? "tab-selected" : ""}`}
              onClick={() => setMobileTab("map")}
            >
              <Compass size={15} />
              <span>Interactive Map</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === "list"}
              className={`mobile-tab-btn ${mobileTab === "list" ? "tab-selected" : ""}`}
              onClick={() => setMobileTab("list")}
            >
              <ListFilter size={15} />
              <span>Needs Attention ({stats.open})</span>
            </button>
          </div>

          {/* Two-Column Command-Centre Section (approx 60% Map / 40% Priority List) */}
          <section className="command-centre-layout" id="map-section">
            <div className={`map-column ${mobileTab === "list" ? "mobile-hidden" : ""}`}>
              <CityMap
                complaints={complaints}
                selectedComplaint={selectedComplaint}
                onSelectComplaint={handleSelectComplaint}
                demoGeocode={demoGeocode}
                onToggleDemoGeocode={() => setDemoGeocode(!demoGeocode)}
              />
            </div>

            <div className={`attention-column ${mobileTab === "map" ? "mobile-hidden" : ""}`}>
              <NeedsAttentionList
                complaints={complaints}
                selectedComplaint={selectedComplaint}
                onSelectComplaint={handleSelectComplaint}
              />
            </div>
          </section>

          {/* Selected Complaint Detail Dossier (Modal / Slide-in Panel) */}
          {selectedComplaint && (
            <ComplaintDetailPanel
              complaint={selectedComplaint}
              onClose={() => setSelectedComplaint(null)}
              onStatusChange={handleStatusChange}
              statusBusy={Boolean(statusBusy)}
            />
          )}

          {/* Recent Complaints Table */}
          <section className="table-section-wrap">
            <ComplaintTable
              complaints={complaints}
              search={search}
              setSearch={setSearch}
              filter={filter}
              setFilter={setFilter}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              selectedComplaint={selectedComplaint}
              onSelectComplaint={handleSelectComplaint}
              onStatusChange={handleStatusChange}
              onRefresh={loadComplaints}
              loading={loading || Boolean(statusBusy)}
              error={tableError}
            />
          </section>

          {/* Citizen Intake & AI Triage Section */}
          <div className="section-title-row">
            <div>
              <p className="eyebrow">CITIZEN PORTAL</p>
              <h2>Submit and Triage New Complaint</h2>
            </div>
            <span className="powered-label">
              <TrendingUp size={14} /> AI Department Routing
            </span>
          </div>

          <section className="intake-grid">
            <ComplaintForm
              description={description}
              setDescription={setDescription}
              location={location}
              setLocation={setLocation}
              latitude={latitude}
              setLatitude={setLatitude}
              longitude={longitude}
              setLongitude={setLongitude}
              onSubmit={handleSubmit}
              loading={submitting}
              error={error}
            />
            <div id="triage">
              <TriageResult result={latestResult} />
            </div>
          </section>

          {/* Modal Intake Dialog when opened from Header button */}
          {showIntakeModal && (
            <div
              className="detail-modal-backdrop"
              onClick={() => setShowIntakeModal(false)}
              role="dialog"
              aria-modal="true"
            >
              <div className="intake-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header-row">
                  <div>
                    <span className="eyebrow">DIRECT REPORTING</span>
                    <h3 className="modal-title">New Complaint Intake</h3>
                  </div>
                  <button
                    type="button"
                    className="detail-close-btn"
                    onClick={() => setShowIntakeModal(false)}
                    aria-label="Close dialog"
                  >
                    <X size={18} />
                  </button>
                </div>

                <ComplaintForm
                  description={description}
                  setDescription={setDescription}
                  location={location}
                  setLocation={setLocation}
                  latitude={latitude}
                  setLatitude={setLatitude}
                  longitude={longitude}
                  setLongitude={setLongitude}
                  onSubmit={handleSubmit}
                  loading={submitting}
                  error={error}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="footer">
            <div className="footer-brand">
              <Activity size={15} />
              <span>CivicFix AI · Municipal Command System</span>
            </div>
            <span>Restrained civic-service operations &amp; triage management</span>
            <span className="footer-status">
              {apiState === "online" ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isUsingMocks()
                ? "Mock Mode Active"
                : apiState === "online"
                ? "Express Backend Connected"
                : "Backend Offline"}
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
