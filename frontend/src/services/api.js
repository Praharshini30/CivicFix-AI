import { mockComplaints } from "../data/mockComplaints";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function mockTriage(description) {
  const text = description.toLowerCase();
  let category = "General Civic Issue";
  let department = "Civic Services";
  let severity = "Medium";

  if (/pothole|road|footpath|pavement|traffic|street/.test(text)) {
    category = "Roads & Infrastructure";
    department = "Roads & Transport";
  } else if (/garbage|waste|rubbish|trash|sanitation/.test(text)) {
    category = "Waste Management";
    department = "Sanitation";
  } else if (/water|leak|drain|sewage/.test(text)) {
    category = "Water Supply";
    department = "Water Works";
  } else if (/light|lamp|electric|wire/.test(text)) {
    category = "Street Lighting";
    department = "Electrical Services";
  }

  if (/urgent|danger|accident|exposed wire|flood|severe|emergency/.test(text)) {
    severity = "High";
  } else if (/small|minor|slight/.test(text)) {
    severity = "Low";
  }

  const summary = description.trim().replace(/\s+/g, " ");
  return {
    category,
    department,
    severity,
    summary: summary.length > 135 ? `${summary.slice(0, 132)}...` : summary,
    triageSource: "Fallback"
  };
}

export async function getHealth() {
  if (USE_MOCKS) {
    await wait(180);
    return { status: "ok", mode: "mock" };
  }
  return request("/health");
}

export async function getComplaints() {
  if (USE_MOCKS) {
    await wait(350);
    return [...mockComplaints];
  }
  const data = await request("/complaints");
  return Array.isArray(data) ? data : data.complaints || [];
}

export async function createComplaint(payload) {
  if (USE_MOCKS) {
    await wait(850);
    const triage = mockTriage(payload.description);
    const duplicate = mockComplaints.find(
      (item) =>
        item.description?.toLowerCase() === payload.description.toLowerCase() ||
        item.summary?.toLowerCase() === payload.description.toLowerCase()
    );

    const latVal = payload.latitude !== undefined && payload.latitude !== "" ? Number(payload.latitude) : undefined;
    const lngVal = payload.longitude !== undefined && payload.longitude !== "" ? Number(payload.longitude) : undefined;

    const newRecord = {
      id: `CF-${Math.floor(1050 + Math.random() * 8999)}`,
      ...triage,
      description: payload.description,
      location: payload.location,
      latitude: !Number.isNaN(latVal) ? latVal : undefined,
      longitude: !Number.isNaN(lngVal) ? lngVal : undefined,
      status: "Open",
      duplicateOf: duplicate?.id || null,
      createdAt: new Date().toISOString()
    };
    mockComplaints.unshift(newRecord);
    return newRecord;
  }
  return request("/complaints", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateComplaintStatus(id, status) {
  if (USE_MOCKS) {
    await wait(300);
    const item = mockComplaints.find((c) => c.id === id);
    if (item) {
      item.status = status;
    }
    return { id, status };
  }
  return request(`/complaints/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function isUsingMocks() {
  return USE_MOCKS;
}
