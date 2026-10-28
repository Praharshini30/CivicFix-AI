import {
  Activity,
  LayoutDashboard,
  MapPin,
  ClipboardList,
  PlusCircle,
  ShieldCheck,
  Menu,
  Compass
} from "lucide-react";

export default function Sidebar({ active, setActive, mobileOpen, setMobileOpen, onOpenNewComplaint }) {
  const links = [
    { label: "Command Centre", icon: LayoutDashboard, target: "command-centre" },
    { label: "City Issue Map", icon: Compass, target: "map-section" },
    { label: "Complaints Registry", icon: ClipboardList, target: "complaints" },
    { label: "Report Issue", icon: PlusCircle, target: "submit" }
  ];

  function handleNavigate(target) {
    setActive(target);
    setMobileOpen(false);
    if (target === "submit" && onOpenNewComplaint) {
      onOpenNewComplaint();
    }
    const el = document.getElementById(target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <>
      <button
        className="mobile-menu"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        <Menu size={21} />
      </button>

      {mobileOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Activity size={22} strokeWidth={2.5} />
          </div>
          <div>
            <strong>CivicFix<span> AI</span></strong>
            <small>COMMAND CENTRE</small>
          </div>
        </div>

        <div className="workspace-label">CITY OPERATIONS</div>

        <nav>
          {links.map(({ label, icon: Icon, target }) => (
            <button
              key={target}
              type="button"
              className={`nav-link ${active === target ? "nav-active" : ""}`}
              onClick={() => handleNavigate(target)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-shield">
            <ShieldCheck size={18} />
          </div>
          <strong>Municipal Intelligence</strong>
          <p>Map-centred triage &amp; rapid case response for civic field teams.</p>
          <div className="sidebar-version">
            CIVICFIX AI <span>GHMC OPERATIONS · v2.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
