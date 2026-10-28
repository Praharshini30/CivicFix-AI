import { CheckCircle2, AlertTriangle, Sparkles, ArrowUpRight } from "lucide-react";

function Severity({ value }) {
  return <span className={`severity severity-${(value || "medium").toLowerCase()}`}>{value || "Unknown"} priority</span>;
}

export default function TriageResult({ result }) {
  if (!result) {
    return (
      <section className="panel triage-empty">
        <div className="empty-orbit"><Sparkles size={23} /></div>
        <h2>AI triage results</h2>
        <p className="muted">Submit a complaint to see its category, priority and recommended department.</p>
        <div className="triage-steps">
          <span><b>01</b> Understand the issue</span>
          <span><b>02</b> Assess urgency</span>
          <span><b>03</b> Route to a department</span>
        </div>
      </section>
    );
  }

  const duplicate = result.duplicateOf;
  return (
    <section className="panel triage-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ANALYSIS COMPLETE</p>
          <h2>AI triage results</h2>
        </div>
        <div className="success-icon"><CheckCircle2 size={20} /></div>
      </div>
      <div className="ticket-line">
        <span className="ticket-id">{result.id || "Ticket created"}</span>
        <span className={`source-label ${(result.triageSource || result.source || "").toLowerCase().includes("fallback") ? "source-fallback" : "source-ai"}`}>
          <Sparkles size={12} /> {result.triageSource || result.source || "Backend classification"}
        </span>
      </div>
      <div className="triage-summary">{result.summary || result.description || "Complaint received and queued for review."}</div>
      <div className="triage-metrics">
        <div><span>Category</span><strong>{result.category || "Pending classification"}</strong></div>
        <div><span>Severity</span><Severity value={result.severity} /></div>
        <div><span>Assigned department</span><strong>{result.department || "Civic Services"}</strong></div>
      </div>
      {duplicate ? (
        <div className="duplicate-warning"><AlertTriangle size={17} /><div><strong>Possible duplicate detected</strong><p>Related ticket: {typeof duplicate === "string" ? duplicate : duplicate.id || "Existing complaint"}</p></div></div>
      ) : (
        <div className="triage-note"><CheckCircle2 size={16} /> No duplicate was reported by the triage service.</div>
      )}
      <a className="text-link" href="#complaints">View complaint tracker <ArrowUpRight size={15} /></a>
    </section>
  );
}