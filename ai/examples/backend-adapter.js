/**
 * Example Backend Adapter for CivicFix AI
 *
 * Demonstrates how an integrating backend (e.g. Express, Fastify, NestJS)
 * passes its own genuine database query callback to `processComplaint`.
 *
 * Run with PowerShell:
 *   node examples/backend-adapter.js
 */

import { processComplaint } from "../src/index.js";

// Simulated backend ticket repository (in production, this queries SQLite, Postgres, Mongo, etc.)
const ticketDatabase = [
  {
    id: "CIV-9021",
    category: "pothole",
    summary: "Large tire-damaging pothole near metro pillar 42",
    location: "Ring Road, near metro pillar 42",
    severity: "high",
    status: "in_progress",
    createdAt: "2026-10-27T09:15:00Z",
  },
  {
    id: "CIV-8840",
    category: "garbage",
    summary: "Overflowing commercial dumpster blocking sidewalk",
    location: "Market Square Lane 3",
    severity: "medium",
    status: "open",
    createdAt: "2026-10-26T14:30:00Z",
  },
  {
    id: "CIV-7712",
    category: "streetlight",
    summary: "Flickering high-mast lamp",
    location: "Oakwood Avenue",
    severity: "low",
    status: "resolved",
    createdAt: "2026-10-20T18:00:00Z",
  },
];

/**
 * Genuine duplicate lookup function provided by the backend.
 * Queries actual persisted records based on category and fuzzy location match.
 *
 * @param {{ category: string, location: string }} criteria
 * @returns {Promise<Array>} Array of matching tickets
 */
async function backendLookupDuplicates({ category, location }) {
  console.log(`\n🔍 [Backend DB] Executing genuine lookup query:`);
  console.log(`   Criteria: category="${category}", location="${location}"`);

  const categoryNorm = (category || "").toLowerCase().trim();
  const locationNorm = (location || "").toLowerCase().trim();

  // Search real records
  const matches = ticketDatabase.filter((ticket) => {
    const categoryMatch = !categoryNorm || ticket.category === categoryNorm;
    const locationMatch =
      !locationNorm ||
      ticket.location.toLowerCase().includes(locationNorm) ||
      locationNorm.includes(ticket.location.toLowerCase());
    return categoryMatch && locationMatch;
  });

  console.log(`   Matches found in DB: ${matches.length}`);
  return matches.map((t) => ({
    id: t.id,
    category: t.category,
    summary: t.summary,
    location: t.location,
    severity: t.severity,
    status: t.status,
  }));
}

// Main execution demonstration
async function run() {
  console.log("=================================================");
  console.log(" CivicFix AI — Backend Integration Adapter Demo  ");
  console.log("=================================================\n");

  const complaintInput = {
    description: "There is a massive pothole right by metro pillar 42 on Ring Road that punctured two car tires this morning.",
    location: "Ring Road, near metro pillar 42",
    lookupDuplicates: backendLookupDuplicates,
  };

  console.log("📥 Incoming citizen complaint:");
  console.log(`   Description: "${complaintInput.description}"`);
  console.log(`   Location:    "${complaintInput.location}"\n`);

  try {
    console.log("🤖 Invoking processComplaint with genuine backend lookup callback...");
    const result = await processComplaint(complaintInput);

    console.log("\n✅ AI Processing Completed Successfully!");
    console.log("-------------------------------------------------");
    console.log("Extracted Fields:");
    console.log(`   Category : ${result.category}`);
    console.log(`   Summary  : ${result.summary}`);
    console.log(`   Location : ${result.location}`);
    console.log(`   Severity : ${result.severity}`);
    console.log("\nDuplicate Detection:");
    console.log(`   Duplicates found: ${result.duplicates.length}`);
    if (result.duplicates.length > 0) {
      console.log(`   Primary duplicate ticket ID: ${result.duplicates[0].id}`);
      console.log(`   Existing summary: "${result.duplicates[0].summary}"`);
    }
    console.log("\nAgent Metadata:");
    console.log(`   Model used               : ${result.meta.model}`);
    console.log(`   Native tool calling used : ${result.meta.nativeToolCallingUsed}`);
    console.log(`   Tool call invocations    : ${result.meta.toolCallsCount}`);
    console.log("-------------------------------------------------");
  } catch (error) {
    console.error("❌ Process failed:", error.name, error.message);
    if (error.details) {
      console.error("   Details:", JSON.stringify(error.details, null, 2));
    }
  }
}

run();
