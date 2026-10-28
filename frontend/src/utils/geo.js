// Geographic utilities for CivicFix AI Command Centre

// Known locality centroids for optional demo preview when raw records lack GPS coordinates
export const KNOWN_LOCALITY_CENTROIDS = {
  madhapur: { lat: 17.4483, lng: 78.3915, label: "Madhapur (Hitec City)" },
  kondapur: { lat: 17.4646, lng: 78.3667, label: "Kondapur" },
  gachibowli: { lat: 17.4401, lng: 78.3489, label: "Gachibowli" },
  miyapur: { lat: 17.4968, lng: 78.3548, label: "Miyapur" },
  kukatpally: { lat: 17.4947, lng: 78.3996, label: "Kukatpally" },
  jubileehills: { lat: 17.4319, lng: 78.4073, label: "Jubilee Hills" },
  banjarahills: { lat: 17.4156, lng: 78.4354, label: "Banjara Hills" },
  begumpet: { lat: 17.4447, lng: 78.4664, label: "Begumpet" },
  secunderabad: { lat: 17.4399, lng: 78.4983, label: "Secunderabad" },
  charminar: { lat: 17.3616, lng: 78.4747, label: "Charminar (Old City)" }
};

export const DEFAULT_CITY_CENTER = [17.4400, 78.3800]; // Hyderabad West / Cyberabad operational zone
export const DEFAULT_ZOOM = 12;

/**
 * Checks if a complaint has valid numeric coordinates
 */
export function hasValidCoordinates(complaint) {
  if (!complaint) return false;
  const lat = Number(complaint.latitude ?? complaint.lat);
  const lng = Number(complaint.longitude ?? complaint.lng);
  return (
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    (lat !== 0 || lng !== 0)
  );
}

/**
 * Extracts coordinates from complaint, returning [lat, lng] or null
 */
export function getCoordinates(complaint) {
  if (!complaint) return null;
  const lat = Number(complaint.latitude ?? complaint.lat);
  const lng = Number(complaint.longitude ?? complaint.lng);
  if (
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    (lat !== 0 || lng !== 0)
  ) {
    return [lat, lng];
  }
  return null;
}

/**
 * Matches locality text to known centroid for optional demo preview
 */
export function matchLocalityCentroid(locationText) {
  if (!locationText || typeof locationText !== "string") return null;
  const clean = locationText.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, coords] of Object.entries(KNOWN_LOCALITY_CENTROIDS)) {
    if (clean.includes(key)) {
      return coords;
    }
  }
  return null;
}

/**
 * Summarizes complaints by locality name
 */
export function getLocalityBreakdown(complaints) {
  const map = new Map();
  complaints.forEach((c) => {
    const rawLoc = c.location?.trim() || "Unspecified Area";
    // Normalize string: take first segment if comma separated
    const primaryName = rawLoc.split(",")[0].trim() || rawLoc;
    const existing = map.get(primaryName) || {
      name: primaryName,
      fullLocation: rawLoc,
      total: 0,
      open: 0,
      highPriority: 0,
      resolved: 0,
      complaints: []
    };
    existing.total += 1;
    if (c.status === "Open") existing.open += 1;
    if (c.status === "Resolved") existing.resolved += 1;
    if ((c.severity || "").toLowerCase() === "high" && c.status !== "Resolved") {
      existing.highPriority += 1;
    }
    existing.complaints.push(c);
    map.set(primaryName, existing);
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

