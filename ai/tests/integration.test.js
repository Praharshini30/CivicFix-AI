/**
 * Integration Test for CivicFix AI Module
 *
 * Calls the REAL locally installed Ollama model `gemma4:e2b` at http://127.0.0.1:11434.
 * Exercises genuine duplicate lookup against actual mock persisted tickets.
 * Verifies live inference, native tool calling, output schema validation, and duplicate detection.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  processComplaint,
  OllamaClient,
  VALID_CATEGORIES,
  VALID_SEVERITIES,
} from "../src/index.js";

describe("Live Integration Tests with local Ollama (gemma4:e2b)", { timeout: 180000 }, () => {
  const client = new OllamaClient();

  it("verifies Ollama connection and gemma4:e2b model tag availability", async () => {
    const status = await client.checkModelAvailability("gemma4:e2b");
    assert.equal(
      status.available,
      true,
      `Expected gemma4:e2b to be installed in Ollama. Found: ${status.models.join(", ")}`
    );
  });

  it("processes real complaint and executes genuine lookupDuplicates tool against persisted tickets", async () => {
    // Simulated database with real pre-existing tickets
    const persistedDatabase = [
      {
        id: "TICK-LIVE-001",
        category: "pothole",
        summary: "Dangerous crater in road near Central Station",
        location: "Central Station",
        severity: "high",
        status: "open",
      },
      {
        id: "TICK-LIVE-002",
        category: "garbage",
        summary: "Trash bin overflowing",
        location: "City Park Gate 2",
        severity: "low",
        status: "resolved",
      },
    ];

    let toolInvocationCount = 0;
    const capturedArgs = [];

    // Real callback querying the persisted records
    const lookupDuplicatesCallback = async ({ category, location }) => {
      toolInvocationCount++;
      capturedArgs.push({ category, location });

      const catNorm = (category || "").toLowerCase().trim();
      const locNorm = (location || "").toLowerCase().trim();

      const matched = persistedDatabase.filter((t) => {
        const catMatch = !catNorm || t.category === catNorm;
        const locMatch =
          !locNorm ||
          t.location.toLowerCase().includes(locNorm) ||
          locNorm.includes(t.location.toLowerCase());
        return catMatch && locMatch;
      });

      return matched;
    };

    const result = await processComplaint({
      description: "Huge pothole right outside Central Station causing major traffic delays and tire damage.",
      location: "Central Station",
      lookupDuplicates: lookupDuplicatesCallback,
    });

    console.log("\n[Integration Test 1 Result]");
    console.log("   Category:", result.category);
    console.log("   Summary:", result.summary);
    console.log("   Location:", result.location);
    console.log("   Severity:", result.severity);
    console.log("   Native tool calling used:", result.meta.nativeToolCallingUsed);
    console.log("   Tool invocations:", toolInvocationCount);
    console.log("   Duplicates found:", result.duplicates.length);

    // Validate schema
    assert.ok(
      VALID_CATEGORIES.includes(result.category),
      `Expected valid category, got "${result.category}"`
    );
    assert.equal(result.category, "pothole");

    assert.ok(typeof result.summary === "string" && result.summary.length > 0);
    assert.ok(typeof result.location === "string" && result.location.length > 0);

    assert.ok(
      VALID_SEVERITIES.includes(result.severity),
      `Expected valid severity, got "${result.severity}"`
    );

    // Validate duplicate lookup was genuinely executed
    assert.ok(toolInvocationCount >= 1, "Expected lookupDuplicates to have been invoked");
    assert.ok(result.duplicates.length >= 1, "Expected duplicate ticket to be detected");
    assert.equal(result.duplicates[0].id, "TICK-LIVE-001");
  });

  it("processes complaint when NO duplicates exist in storage", async () => {
    // Database contains no records matching this location
    const persistedDatabase = [
      {
        id: "TICK-OTHER-999",
        category: "streetlight",
        summary: "Lamp post broken",
        location: "Airport Road",
        severity: "low",
        status: "open",
      },
    ];

    let toolInvocationCount = 0;

    const lookupDuplicatesCallback = async ({ category, location }) => {
      toolInvocationCount++;
      const catNorm = (category || "").toLowerCase().trim();
      const locNorm = (location || "").toLowerCase().trim();

      return persistedDatabase.filter((t) => {
        const catMatch = !catNorm || t.category === catNorm;
        const locMatch = !locNorm || t.location.toLowerCase().includes(locNorm);
        return catMatch && locMatch;
      });
    };

    const result = await processComplaint({
      description: "Severe water leakage bursting out from underground main pipe flooding the residential street",
      location: "Riverdale Colony #12",
      lookupDuplicates: lookupDuplicatesCallback,
    });

    console.log("\n[Integration Test 2 Result]");
    console.log("   Category:", result.category);
    console.log("   Summary:", result.summary);
    console.log("   Location:", result.location);
    console.log("   Severity:", result.severity);
    console.log("   Duplicates found:", result.duplicates.length);

    assert.equal(result.category, "water leakage");
    assert.ok(VALID_SEVERITIES.includes(result.severity));
    assert.equal(result.duplicates.length, 0, "Expected zero duplicates for unseen location");
  });
});
