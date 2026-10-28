import { useState } from "react";
import { MapPin, Send, FileText, Globe } from "lucide-react";

export default function ComplaintForm({
  description,
  setDescription,
  location,
  setLocation,
  latitude = "",
  setLatitude = () => {},
  longitude = "",
  setLongitude = () => {},
  onSubmit,
  loading,
  error
}) {
  const [showCoordsInput, setShowCoordsInput] = useState(false);

  return (
    <section className="panel form-panel" id="submit">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">CITIZEN INTAKE</p>
          <h2>Report an issue</h2>
          <p className="muted">
            Describe the civic problem. CivicFix AI classifies urgency and routes it to municipal teams.
          </p>
        </div>
        <div className="heading-icon">
          <FileText size={20} />
        </div>
      </div>

      <form onSubmit={onSubmit} className="complaint-form">
        <label htmlFor="description">What needs attention?</label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Example: A deep pothole near the school entrance is causing traffic to slow down..."
          minLength={10}
          maxLength={1200}
          required
          rows={4}
        />
        <div className="field-hint">
          {description.length}/1200 characters · Minimum 10
        </div>

        <label htmlFor="location">Issue location</label>
        <div className="input-with-icon">
          <MapPin size={17} />
          <input
            id="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Area, street, landmark or ward (e.g. Madhapur, Hyderabad)"
            maxLength={180}
            required
          />
        </div>

        {/* Optional Coordinate toggle for map precision */}
        <div className="coords-toggle-row">
          <button
            type="button"
            className="coords-toggle-btn"
            onClick={() => setShowCoordsInput(!showCoordsInput)}
          >
            <Globe size={13} />
            <span>{showCoordsInput ? "Hide GPS Coordinates" : "+ Add GPS Coordinates (for map marker)"}</span>
          </button>
        </div>

        {showCoordsInput && (
          <div className="coords-input-grid">
            <div>
              <label htmlFor="latitude" className="coords-sublabel">Latitude (e.g. 17.448)</label>
              <input
                id="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="17.4483"
                className="coords-input"
              />
            </div>
            <div>
              <label htmlFor="longitude" className="coords-sublabel">Longitude (e.g. 78.391)</label>
              <input
                id="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="78.3915"
                className="coords-input"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="inline-error" role="alert">
            {error}
          </div>
        )}

        <button className="primary-button submit-button" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : <Send size={16} />}
          {loading ? "Analysing complaint..." : "Submit & analyse"}
        </button>
        <p className="privacy-note">
          Please avoid sharing personally identifiable confidential information.
        </p>
      </form>
    </section>
  );
}
