import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Compass,
  Crosshair,
  Layers,
  MapPin,
  MapPinOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  Info
} from "lucide-react";
import {
  DEFAULT_CITY_CENTER,
  DEFAULT_ZOOM,
  getCoordinates,
  hasValidCoordinates,
  matchLocalityCentroid,
  getLocalityBreakdown
} from "../utils/geo";

// Custom DivIcon factory for accessible, restrained priority markers
function createCustomMarkerIcon(complaint, isSelected) {
  const status = (complaint.status || "").toLowerCase();
  const severity = (complaint.severity || "").toLowerCase();

  let tone = "normal";
  if (status === "resolved") {
    tone = "resolved";
  } else if (severity === "high") {
    tone = "high";
  }

  const selectedClass = isSelected ? "marker-selected" : "";
  const pulseHtml = tone === "high" ? '<span class="marker-pulse-ring"></span>' : "";

  return L.divIcon({
    className: "leaflet-civic-marker-wrapper",
    html: `
      <div class="civic-pin civic-pin-${tone} ${selectedClass}" title="${complaint.id} - ${complaint.category || 'Issue'}">
        ${pulseHtml}
        <div class="pin-badge">
          <span class="pin-inner"></span>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16]
  });
}

export default function CityMap({
  complaints = [],
  selectedComplaint = null,
  onSelectComplaint = () => {},
  demoGeocode = false,
  onToggleDemoGeocode = () => {}
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Derive coordinates for each complaint
  const complaintsWithCoords = complaints.map((c) => {
    let coords = getCoordinates(c);
    let isCentroidPreview = false;
    if (!coords && demoGeocode) {
      const matched = matchLocalityCentroid(c.location);
      if (matched) {
        coords = [matched.lat, matched.lng];
        isCentroidPreview = true;
      }
    }
    return {
      complaint: c,
      coords,
      isCentroidPreview
    };
  });

  const validPlotItems = complaintsWithCoords.filter((item) => item.coords !== null);
  const totalCount = complaints.length;
  const mappedCount = validPlotItems.length;
  const localityBreakdown = getLocalityBreakdown(complaints);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CITY_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: true
    });

    // Clean OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
    }).addTo(map);

    // Dedicated layer group for complaint markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;
    setMapReady(true);

    // Initial resize sync
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync container resize
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullscreen, mappedCount]);

  // Update markers when complaints, selection, or demoGeocode changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (validPlotItems.length === 0) {
      return;
    }

    const latLngs = [];

    validPlotItems.forEach(({ complaint, coords, isCentroidPreview }) => {
      const isSelected = selectedComplaint?.id === complaint.id;
      const icon = createCustomMarkerIcon(complaint, isSelected);

      const marker = L.marker(coords, {
        icon,
        zIndexOffset: isSelected ? 1000 : 0
      });

      // Construct compact, restrained popup
      const popupContent = document.createElement("div");
      popupContent.className = "civic-map-popup";
      popupContent.innerHTML = `
        <div class="popup-header">
          <span class="popup-ticket">${complaint.id}</span>
          <span class="popup-badge badge-${(complaint.severity || "medium").toLowerCase()}">${complaint.severity || "Normal"}</span>
        </div>
        <div class="popup-title">${complaint.category || "Civic Complaint"}</div>
        <div class="popup-summary">${complaint.summary || complaint.description || "No description provided."}</div>
        <div class="popup-meta">
          <div class="popup-row">
            <span class="meta-label">Status:</span>
            <span class="status-pill status-${(complaint.status || "open").toLowerCase().replace(/\s+/g, "-")}">${complaint.status || "Open"}</span>
          </div>
          <div class="popup-row">
            <span class="meta-label">Location:</span>
            <span class="meta-loc">${complaint.location || "Unspecified"}</span>
          </div>
          ${isCentroidPreview ? '<div class="popup-preview-tag">Locality Centroid Preview</div>' : ""}
        </div>
        <button class="popup-action-btn" type="button" data-id="${complaint.id}">
          Inspect Complaint Details →
        </button>
      `;

      popupContent.querySelector(".popup-action-btn")?.addEventListener("click", () => {
        onSelectComplaint(complaint);
      });

      marker.bindPopup(popupContent, {
        maxWidth: 290,
        className: "civic-leaflet-popup",
        autoPanPadding: [30, 30]
      });

      marker.on("click", () => {
        onSelectComplaint(complaint);
      });

      markersLayer.addLayer(marker);
      latLngs.push(coords);

      // If this marker is selected, open popup
      if (isSelected) {
        marker.openPopup();
      }
    });

    // Auto-fit to active markers on first load or dataset change
    if (latLngs.length > 0 && !selectedComplaint) {
      try {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } catch {
        // fallback
      }
    }
  }, [validPlotItems.length, selectedComplaint?.id, demoGeocode]);

  // Center on selected complaint if it has coordinates
  useEffect(() => {
    if (!selectedComplaint || !mapInstanceRef.current) return;
    const targetItem = validPlotItems.find(
      (item) => item.complaint.id === selectedComplaint.id
    );
    if (targetItem && targetItem.coords) {
      mapInstanceRef.current.flyTo(targetItem.coords, 14, { duration: 0.8 });
    }
  }, [selectedComplaint?.id]);

  // Map control actions
  function handleZoomIn() {
    mapInstanceRef.current?.zoomIn();
  }

  function handleZoomOut() {
    mapInstanceRef.current?.zoomOut();
  }

  function handleFitBounds() {
    if (!mapInstanceRef.current) return;
    if (validPlotItems.length > 0) {
      const bounds = L.latLngBounds(validPlotItems.map((p) => p.coords));
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else {
      mapInstanceRef.current.setView(DEFAULT_CITY_CENTER, DEFAULT_ZOOM);
    }
  }

  function handleResetView() {
    mapInstanceRef.current?.setView(DEFAULT_CITY_CENTER, DEFAULT_ZOOM);
  }

  return (
    <div className={`city-map-card ${isFullscreen ? "map-card-fullscreen" : ""}`}>
      {/* Map Header / Control Bar */}
      <div className="map-toolbar">
        <div className="map-toolbar-left">
          <div className="map-title-wrap">
            <span className="live-dot" />
            <h3 className="map-title">City Issue Map</h3>
          </div>
          <span className="map-coord-status">
            {mappedCount > 0 ? (
              <span className="coord-tag coord-tag-active">
                <MapPin size={12} /> {mappedCount} of {totalCount} geolocated
                {demoGeocode && <span className="demo-badge">Centroid preview</span>}
              </span>
            ) : (
              <span className="coord-tag coord-tag-empty">
                <MapPinOff size={12} /> 0 of {totalCount} with coordinates
              </span>
            )}
          </span>
        </div>

        {/* Minimal map action controls */}
        <div className="map-toolbar-right">
          <button
            type="button"
            className="map-ctrl-btn"
            onClick={handleFitBounds}
            title="Fit to complaint locations"
            aria-label="Fit to complaints"
          >
            <Crosshair size={15} />
            <span className="ctrl-btn-text">Fit</span>
          </button>
          <button
            type="button"
            className="map-ctrl-btn"
            onClick={handleResetView}
            title="Reset to city center"
            aria-label="Reset city view"
          >
            <Compass size={15} />
          </button>
          <div className="map-zoom-group">
            <button
              type="button"
              className="map-zoom-btn"
              onClick={handleZoomIn}
              title="Zoom in"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              className="map-zoom-btn"
              onClick={handleZoomOut}
              title="Zoom out"
              aria-label="Zoom out"
            >
              −
            </button>
          </div>
          <button
            type="button"
            className="map-ctrl-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit expanded view" : "Expand map"}
            aria-label="Toggle map size"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Map Container Viewport */}
      <div className="map-viewport-wrapper">
        <div ref={mapContainerRef} className="map-leaflet-container" />

        {/* Small, restrained map legend */}
        <div className="map-legend" aria-label="Map priority legend">
          <div className="legend-item">
            <span className="legend-swatch legend-high" />
            <span>High priority</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch legend-normal" />
            <span>Normal / Medium</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch legend-resolved" />
            <span>Resolved</span>
          </div>
        </div>

        {/* Useful Empty State Overlay when no complaint coordinates exist */}
        {validPlotItems.length === 0 && (
          <div className="map-empty-overlay" role="region" aria-label="Location coordinates status">
            <div className="empty-overlay-content">
              <div className="empty-badge-row">
                <div className="empty-icon-wrap">
                  <MapPinOff size={22} />
                </div>
                <div>
                  <h4 className="empty-heading">No GPS Coordinates in Complaint Records</h4>
                  <p className="empty-desc">
                    Existing complaints contain text localities (e.g. <em>Madhapur, Kondapur</em>) but lack numeric latitude &amp; longitude coordinates. Markers require coordinate data to plot.
                  </p>
                </div>
              </div>

              {/* Locality Breakdown from Actual Records */}
              <div className="locality-breakdown-card">
                <div className="locality-header">
                  <span>Locality Breakdown from Active Complaints ({totalCount} reports)</span>
                  <span className="locality-badge">{localityBreakdown.length} wards / areas</span>
                </div>
                <div className="locality-list">
                  {localityBreakdown.map((loc) => (
                    <div key={loc.name} className="locality-row">
                      <div className="locality-info">
                        <MapPin size={13} className="loc-pin-icon" />
                        <strong className="locality-name">{loc.name}</strong>
                      </div>
                      <div className="locality-stats">
                        {loc.highPriority > 0 && (
                          <span className="loc-pill loc-high">{loc.highPriority} High</span>
                        )}
                        {loc.open > 0 && (
                          <span className="loc-pill loc-open">{loc.open} Open</span>
                        )}
                        {loc.resolved > 0 && (
                          <span className="loc-pill loc-resolved">{loc.resolved} Resolved</span>
                        )}
                        <span className="loc-total">{loc.total} total</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action bar for demo / testing */}
              <div className="empty-action-bar">
                <div className="action-hint">
                  <Info size={14} />
                  <span>To view markers without backend coordinates, toggle locality centroid preview:</span>
                </div>
                <button
                  type="button"
                  className="preview-centroid-btn"
                  onClick={onToggleDemoGeocode}
                >
                  <Sparkles size={14} />
                  <span>{demoGeocode ? "Disable Preview" : "Preview Locality Centroids on Map"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Sub-footer Status */}
      <div className="map-footer-bar">
        <div className="footer-left-info">
          <span>Operational Zone: <strong>Hyderabad Metropolitan (GHMC)</strong></span>
          <span className="divider-dot">•</span>
          <span>OpenStreetMap &amp; Leaflet Engine</span>
        </div>
        {mappedCount > 0 && (
          <button
            type="button"
            className="text-btn-toggle"
            onClick={onToggleDemoGeocode}
            title="Toggle between raw records and preview centroids"
          >
            {demoGeocode ? "Show Raw Unmapped State" : "Preview Centroid Pins"}
          </button>
        )}
      </div>
    </div>
  );
}

