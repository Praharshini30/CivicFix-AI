/**
 * Unit Tests for CivicFix AI Module
 *
 * Uses Node.js native test runner (node:test) with mocked Ollama responses.
 * Tests input validation, output parsing, enum schemas, tool call loops,
 * tool argument validation, timeout handling, and Ollama errors.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  processComplaint,
  parseAndValidateModelOutput,
  validateInput,
  CivicFixValidationError,
  CivicFixOllamaError,
  CivicFixTimeoutError,
  CivicFixToolError,
  VALID_CATEGORIES,
  VALID_SEVERITIES,
} from "../src/index.js";

// ============================================================================
// 1. INPUT VALIDATION TESTS
// ============================================================================
describe("validateInput", () => {
  it("accepts valid input", () => {
    const res = validateInput({
      description: "Broken water pipe flooding the street",
      location: "Elm Street #4",
    });
    assert.equal(res.description, "Broken water pipe flooding the street");
    assert.equal(res.location, "Elm Street #4");
  });

  it("throws CivicFixValidationError for empty description", () => {
    assert.throws(
      () => validateInput({ description: "", location: "Main St" }),
      CivicFixValidationError
    );
    assert.throws(
      () => validateInput({ description: "   ", location: "Main St" }),
      CivicFixValidationError
    );
  });

  it("throws CivicFixValidationError for non-string description", () => {
    assert.throws(
      () => validateInput({ description: 12345, location: "Main St" }),
      CivicFixValidationError
    );
    assert.throws(
      () => validateInput({ description: null, location: "Main St" }),
      CivicFixValidationError
    );
  });

  it("throws CivicFixValidationError if description exceeds max length", () => {
    assert.throws(
      () =>
        validateInput(
          { description: "a".repeat(101), location: "Main St" },
          100
        ),
      CivicFixValidationError
    );
  });

  it("throws CivicFixValidationError for empty location", () => {
    assert.throws(
      () => validateInput({ description: "Pothole", location: "" }),
      CivicFixValidationError
    );
    assert.throws(
      () => validateInput({ description: "Pothole", location: "   " }),
      CivicFixValidationError
    );
  });

  it("throws CivicFixValidationError if location exceeds 500 chars", () => {
    assert.throws(
      () => validateInput({ description: "Pothole", location: "L".repeat(501) }),
      CivicFixValidationError
    );
  });

  it("throws CivicFixValidationError if lookupDuplicates is not a function", () => {
    assert.throws(
      () =>
        validateInput({
          description: "Pothole",
          location: "Main St",
          lookupDuplicates: "not-a-fn",
        }),
      CivicFixValidationError
    );
  });
});

// ============================================================================
// 2. MODEL OUTPUT PARSING & SCHEMA VALIDATION TESTS
// ============================================================================
describe("parseAndValidateModelOutput", () => {
  it("parses clean JSON successfully", () => {
    const raw = JSON.stringify({
      category: "pothole",
      summary: "Large crater on road",
      location: "Baker St",
      severity: "high",
    });
    const parsed = parseAndValidateModelOutput(raw, "Fallback");
    assert.equal(parsed.category, "pothole");
    assert.equal(parsed.summary, "Large crater on road");
    assert.equal(parsed.location, "Baker St");
    assert.equal(parsed.severity, "high");
  });

  it("strips markdown code fences (```json ... ```)", () => {
    const raw = "```json\n" + JSON.stringify({
      category: "garbage",
      summary: "Trash piling up near park",
      location: "Central Park West",
      severity: "medium",
    }) + "\n```";
    const parsed = parseAndValidateModelOutput(raw);
    assert.equal(parsed.category, "garbage");
    assert.equal(parsed.severity, "medium");
  });

  it("extracts JSON embedded inside surrounding conversational text", () => {
    const raw =
      "Certainly! Here is the JSON output you requested:\n\n" +
      JSON.stringify({
        category: "streetlight",
        summary: "Lamp post broken and dark",
        location: "Oak St",
        severity: "low",
      }) +
      "\n\nHope this helps your city!";
    const parsed = parseAndValidateModelOutput(raw);
    assert.equal(parsed.category, "streetlight");
    assert.equal(parsed.severity, "low");
  });

  it("throws CivicFixValidationError on completely malformed non-JSON", () => {
    assert.throws(
      () => parseAndValidateModelOutput("I cannot fulfill this request."),
      CivicFixValidationError
    );
  });

  it("throws CivicFixValidationError on empty model output", () => {
    assert.throws(
      () => parseAndValidateModelOutput("   "),
      CivicFixValidationError
    );
  });

  it("rejects invalid category enum values", () => {
    const raw = JSON.stringify({
      category: "meteorite_strike",
      summary: "Meteor fell",
      location: "Downtown",
      severity: "high",
    });
    assert.throws(
      () => parseAndValidateModelOutput(raw),
      (err) => {
        assert.ok(err instanceof CivicFixValidationError);
        assert.match(err.message, /Invalid category/);
        return true;
      }
    );
  });

  it("accepts all valid categories", () => {
    for (const cat of VALID_CATEGORIES) {
      const raw = JSON.stringify({
        category: cat,
        summary: `Summary for ${cat}`,
        location: "City Center",
        severity: "medium",
      });
      const parsed = parseAndValidateModelOutput(raw);
      assert.equal(parsed.category, cat);
    }
  });

  it("rejects invalid severity enum values", () => {
    const raw = JSON.stringify({
      category: "pothole",
      summary: "Huge hole",
      location: "Downtown",
      severity: "catastrophic", // invalid enum
    });
    assert.throws(
      () => parseAndValidateModelOutput(raw),
      (err) => {
        assert.ok(err instanceof CivicFixValidationError);
        assert.match(err.message, /Invalid severity/);
        return true;
      }
    );
  });

  it("accepts all valid severities", () => {
    for (const sev of VALID_SEVERITIES) {
      const raw = JSON.stringify({
        category: "water leakage",
        summary: "Pipe leaking",
        location: "Main St",
        severity: sev,
      });
      const parsed = parseAndValidateModelOutput(raw);
      assert.equal(parsed.severity, sev);
    }
  });

  it("throws CivicFixValidationError when summary is missing", () => {
    const raw = JSON.stringify({
      category: "pothole",
      summary: "",
      location: "Main St",
      severity: "low",
    });
    assert.throws(
      () => parseAndValidateModelOutput(raw),
      CivicFixValidationError
    );
  });

  it("falls back to caller location when model leaves location blank", () => {
    const raw = JSON.stringify({
      category: "other",
      summary: "Fallen tree branch",
      location: "",
      severity: "low",
    });
    const parsed = parseAndValidateModelOutput(raw, "Park Ave");
    assert.equal(parsed.location, "Park Ave");
  });
});

// ============================================================================
// 3. AGENT WORKFLOW & TOOL CALLING TESTS (MOCKED OLLAMA)
// ============================================================================
describe("processComplaint with mocked Ollama", () => {
  it("executes full native tool calling workflow when model requests it", async () => {
    let callIndex = 0;
    const recordedToolArgs = [];

    // Mock fetch to simulate Ollama responses:
    // Turn 1: Model returns tool_call for lookupDuplicates
    // Turn 2: Model returns final JSON output after receiving tool results
    const mockFetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      callIndex++;

      if (callIndex === 1) {
        // Assert tools were sent
        assert.ok(body.tools && body.tools.length > 0);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: "gemma4:e2b",
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: "call_abc123",
                  function: {
                    name: "lookupDuplicates",
                    arguments: {
                      category: "pothole",
                      location: "High Street",
                    },
                  },
                },
              ],
            },
          }),
        };
      }

      if (callIndex === 2) {
        // Verify tool message was sent back
        const toolMsg = body.messages.find((m) => m.role === "tool");
        assert.ok(toolMsg, "Expected tool message in turn 2");
        const parsedContent = JSON.parse(toolMsg.content);
        assert.equal(parsedContent[0].id, "TICK-99");

        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: "gemma4:e2b",
            message: {
              role: "assistant",
              content: JSON.stringify({
                category: "pothole",
                summary: "Dangerous pothole on High Street",
                location: "High Street",
                severity: "high",
              }),
            },
          }),
        };
      }
    };

    const mockLookup = async (args) => {
      recordedToolArgs.push(args);
      return [
        {
          id: "TICK-99",
          category: "pothole",
          summary: "Pre-existing pothole",
          location: "High Street",
          severity: "high",
        },
      ];
    };

    const result = await processComplaint({
      description: "Pothole broke my suspension on High Street",
      location: "High Street",
      lookupDuplicates: mockLookup,
      options: { fetchFn: mockFetch },
    });

    assert.equal(result.category, "pothole");
    assert.equal(result.severity, "high");
    assert.equal(result.duplicates.length, 1);
    assert.equal(result.duplicates[0].id, "TICK-99");
    assert.equal(result.meta.nativeToolCallingUsed, true);
    assert.equal(result.meta.toolCallsCount, 1);
    assert.equal(recordedToolArgs.length, 1);
    assert.equal(recordedToolArgs[0].category, "pothole");
  });

  it("enforces max tool calls limit when model loops", async () => {
    // Model continuously returns a tool call
    const loopingMockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        model: "gemma4:e2b",
        message: {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "call_loop",
              function: {
                name: "lookupDuplicates",
                arguments: { category: "pothole", location: "Anywhere" },
              },
            },
          ],
        },
      }),
    });

    await assert.rejects(
      () =>
        processComplaint({
          description: "Water leaking everywhere",
          location: "5th Ave",
          lookupDuplicates: async () => [],
          options: {
            fetchFn: loopingMockFetch,
            maxToolCalls: 2,
          },
        }),
      (err) => {
        assert.ok(err instanceof CivicFixToolError);
        assert.match(err.message, /Exceeded maximum allowed tool calls/);
        return true;
      }
    );
  });

  it("rejects unknown tool name returned by model", async () => {
    const badToolMockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        model: "gemma4:e2b",
        message: {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "call_bad",
              function: {
                name: "unauthorizedTool",
                arguments: {},
              },
            },
          ],
        },
      }),
    });

    await assert.rejects(
      () =>
        processComplaint({
          description: "Garbage on street",
          location: "Main St",
          lookupDuplicates: async () => [],
          options: { fetchFn: badToolMockFetch },
        }),
      CivicFixToolError
    );
  });

  it("handles caller lookupDuplicates callback throwing an error cleanly", async () => {
    const toolCallMockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        model: "gemma4:e2b",
        message: {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "call_1",
              function: {
                name: "lookupDuplicates",
                arguments: { category: "garbage", location: "Downtown" },
              },
            },
          ],
        },
      }),
    });

    const failingCallback = async () => {
      throw new Error("Database connection dropped");
    };

    await assert.rejects(
      () =>
        processComplaint({
          description: "Garbage overflowing",
          location: "Downtown",
          lookupDuplicates: failingCallback,
          options: { fetchFn: toolCallMockFetch },
        }),
      (err) => {
        assert.ok(err instanceof CivicFixToolError);
        assert.match(err.message, /Database connection dropped/);
        return true;
      }
    );
  });

  it("handles Ollama HTTP 500 error", async () => {
    const errorMockFetch = async () => ({
      ok: false,
      status: 500,
      text: async () => "Internal Ollama inference error",
    });

    await assert.rejects(
      () =>
        processComplaint({
          description: "Streetlight not working",
          location: "Pine Road",
          options: { fetchFn: errorMockFetch },
        }),
      (err) => {
        assert.ok(err instanceof CivicFixOllamaError);
        assert.equal(err.statusCode, 500);
        return true;
      }
    );
  });

  it("handles Ollama timeout cleanly", async () => {
    const timeoutMockFetch = async (_url, options) => {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    };

    await assert.rejects(
      () =>
        processComplaint({
          description: "Burst pipe",
          location: "Elm St",
          options: {
            fetchFn: timeoutMockFetch,
            timeoutMs: 50, // fast timeout for test
          },
        }),
      CivicFixTimeoutError
    );
  });
});
