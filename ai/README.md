# CivicFix AI — Local-First Civic Complaint Agent AI/ML Module

A local-first, zero-runtime-dependency AI/ML agent module for the **CivicFix AI** complaint intake platform.

Built specifically to operate with a locally running **Ollama** instance and the installed **`gemma4:e2b`** model. This module is strictly decoupled from any web server or database implementation—allowing the backend engineering team to integrate it cleanly into Express, Fastify, NestJS, background workers, or CLI tools.

---

## Table of Contents

- [Architectural Role](#architectural-role)
- [Public Interface](#public-interface)
- [Schemas and Allowed Enums](#schemas-and-allowed-enums)
- [Agent & Tool-Calling Workflow](#agent--tool-calling-workflow)
- [Verification Results (`gemma4:e2b`)](#verification-results-gemma4e2b)
- [Prerequisites](#prerequisites)
- [Exact PowerShell Commands](#exact-powershell-commands)
  - [1. Environment Setup](#1-environment-setup)
  - [2. Run Unit Tests (Mocked Ollama)](#2-run-unit-tests-mocked-ollama)
  - [3. Run Integration Tests (Real Local Model)](#3-run-integration-tests-real-local-model)
  - [4. Run Backend Integration Adapter Demo](#4-run-backend-integration-adapter-demo)
- [Backend Integration Guide](#backend-integration-guide)
- [Error Handling Reference](#error-handling-reference)
- [Files in Repository](#files-in-repository)
- [Limitations & Unverified Items](#limitations--unverified-items)

---

## Architectural Role

Per the architectural boundary specifications:
- **Included**:
  - Direct communication with Ollama's local HTTP API (`http://127.0.0.1:11434/api/chat`).
  - Strict input validation and safe length bounds.
  - Multi-turn native tool-calling agent loop (`lookupDuplicates`).
  - Fallback deterministic duplicate query handling if tool calling is skipped.
  - Model output JSON extraction and strict schema/enum enforcement.
  - Zero external npm runtime dependencies (uses Node.js 20+ built-ins: `fetch`, `node:test`, `node:assert`).
- **Excluded by Design** (handled by the companion backend repository):
  - HTTP server listeners (Express/Fastify).
  - React/web frontend.
  - Ticket ID generation (e.g. `CIV-XXXX`).
  - Authoritative department routing.
  - Database persistence.

---

## Public Interface

```javascript
import { processComplaint } from "./src/index.js";

const result = await processComplaint({
  description: "String: citizen complaint text",
  location: "String: reported location or landmark",
  lookupDuplicates: async ({ category, location }) => {
    // Backend callback returning array of matching records from its DB
    return [/* tickets */];
  },
  options: {
    // Optional overrides
    baseUrl: "http://127.0.0.1:11434",
    model: "gemma4:e2b",
    timeoutMs: 120000,
    maxToolCalls: 3,
    maxInputLength: 4000,
  }
});
```

### Return Value Shape

```json
{
  "category": "pothole",
  "summary": "Massive pothole on Ring Road near metro pillar 42 causing vehicle damage",
  "location": "Ring Road, near metro pillar 42",
  "severity": "high",
  "duplicates": [
    {
      "id": "CIV-9021",
      "category": "pothole",
      "summary": "Large tire-damaging pothole near metro pillar 42",
      "location": "Ring Road, near metro pillar 42",
      "severity": "high",
      "status": "in_progress"
    }
  ],
  "meta": {
    "model": "gemma4:e2b",
    "nativeToolCallingUsed": true,
    "toolCallsCount": 1,
    "toolArgumentsHistory": [
      { "category": "pothole", "location": "Ring Road, near metro pillar 42" }
    ]
  }
}
```

---

## Schemas and Allowed Enums

Strict validation is enforced on both caller inputs and model outputs:

| Field | Type / Allowed Enums | Description |
|---|---|---|
| `category` | `"pothole"`, `"garbage"`, `"water leakage"`, `"streetlight"`, `"other"` | Any other value triggers `CivicFixValidationError` |
| `summary` | Non-empty `string` | Concise, synthesized summary of the incident |
| `location` | Non-empty `string` (max 500 chars) | Caller supplied or model-refined location |
| `severity` | `"low"`, `"medium"`, `"high"` | Priority level; any other value triggers `CivicFixValidationError` |

---

## Agent & Tool-Calling Workflow

1. **System Directive**: The agent is prompted to evaluate the incident and invoke `lookupDuplicates` with the candidate `category` and `location`.
2. **Native Tool Calling**:
   - The tool specification for `lookupDuplicates` is passed in the Ollama `/api/chat` request payload.
   - When the model returns a `message.tool_calls` block, the module parses the tool arguments, validates the tool name, and executes the caller's genuine `lookupDuplicates` callback.
   - The returned records are passed back to the model in a `{ role: "tool", content: JSON.stringify(records) }` message.
3. **Safety Bounds**:
   - Tool calls are capped at `maxToolCalls` (default: 3). If the model enters an infinite tool-calling loop, a `CivicFixToolError` is thrown.
4. **Deterministic Fallback**:
   - If the model provides an answer on Turn 1 without invoking the tool, the module executes the caller's `lookupDuplicates` callback deterministically with the complaint's location so the backend never misses duplicate detection.

---

## Verification Results (`gemma4:e2b`)

Tested on local environment with **Ollama v0.40.12** and **`gemma4:e2b`** (Windows 11):

| Test Category | Tested Against | Result | Observations |
|---|---|---|---|
| **Ollama Local HTTP API** | `http://127.0.0.1:11434` | ✅ **PASS** | Responds with HTTP 200 on `/api/tags` and `/api/chat`. |
| **Native Tool Calling** | `gemma4:e2b` live model | ✅ **PASS** | Model produces native `tool_calls` array with `name: "lookupDuplicates"` and valid JSON arguments `{ category, location }`. |
| **Multi-Turn Synthesis** | `gemma4:e2b` live model | ✅ **PASS** | After receiving `{ role: "tool" }` response, model synthesizes final output without crashing or repeating tool calls. |
| **Duplicate Retrieval** | Persisted tickets mock | ✅ **PASS** | Primary duplicate ticket `CIV-9021` successfully returned through genuine backend callback. |
| **Output JSON Extraction** | Live model & unit tests | ✅ **PASS** | Cleanly handles markdown fences (````json ... ````) and embedded JSON objects. |
| **Enum Enforcement** | Unit test suite | ✅ **PASS** | Invalid categories (e.g. `meteorite`) and severities (e.g. `catastrophic`) strictly rejected with `CivicFixValidationError`. |
| **Timeout Handling** | Mocked client | ✅ **PASS** | AbortController fires after `timeoutMs` and throws `CivicFixTimeoutError`. |

---

## Prerequisites

- **Node.js**: `v20.0.0` or higher (`v24.13.0` verified).
- **Ollama**: Installed and running locally (`http://127.0.0.1:11434`).
- **Model**: `ollama pull gemma4:e2b` (already installed).

---

## Exact PowerShell Commands

Open PowerShell in the workspace root (`c:\Users\suheal\OneDrive\Desktop\Hacktober`):

### 1. Environment Setup

```powershell
# Copy example environment configuration (optional, defaults are embedded)
Copy-Item .env.example .env

# Verify Ollama is running and gemma4:e2b is installed
ollama list
```

### 2. Run Unit Tests (Mocked Ollama)

Runs 24 unit tests verifying input validation, JSON extraction, enum schemas, tool-call loops, timeouts, and error scenarios:

```powershell
npm test
```

### 3. Run Integration Tests (Real Local Model)

Runs live end-to-end inference and native tool calling against the local `gemma4:e2b` model:

```powershell
npm run test:integration
```

### 4. Run All Tests Together

```powershell
npm run test:all
```

### 5. Run Backend Integration Adapter Demo

Runs the standalone runnable example demonstrating how an Express/Fastify/NestJS backend connects its actual database query to `processComplaint`:

```powershell
npm run example
```

---

## Backend Integration Guide

Here is how your backend team member can import and use this module in their Express route handler:

```javascript
import express from "express";
import { processComplaint, CivicFixValidationError } from "civicfix-ai";
import { findExistingTickets, saveTicket } from "./db.js";

const app = express();
app.use(express.json());

app.post("/api/complaints", async (req, res) => {
  try {
    const { description, location } = req.body;

    // AI Processing with real DB lookup callback
    const aiResult = await processComplaint({
      description,
      location,
      lookupDuplicates: async ({ category, location }) => {
        // Query your PostgreSQL / SQLite / Mongo database
        return await findExistingTickets({ category, location });
      },
    });

    // Backend-controlled fields (not generated by AI)
    const newTicket = {
      id: `CIV-${Date.now().toString(36).toUpperCase()}`,
      category: aiResult.category,
      summary: aiResult.summary,
      location: aiResult.location,
      severity: aiResult.severity,
      department: mapCategoryToDepartment(aiResult.category), // authoritative business logic
      status: "open",
      duplicateOf: aiResult.duplicates.length > 0 ? aiResult.duplicates[0].id : null,
      createdAt: new Date().toISOString(),
    };

    await saveTicket(newTicket);
    return res.status(201).json(newTicket);

  } catch (err) {
    if (err instanceof CivicFixValidationError) {
      return res.status(400).json({ error: err.message, details: err.details });
    }
    return res.status(500).json({ error: "Civic complaint processing failed", message: err.message });
  }
});
```

---

## Error Handling Reference

All custom errors inherit from `CivicFixError`:

| Error Class | When It Is Thrown | Useful Properties |
|---|---|---|
| `CivicFixValidationError` | Missing or invalid caller arguments; invalid model schema or unapproved enum value | `err.details` |
| `CivicFixOllamaError` | Ollama service unreachable, non-200 HTTP status, or internal model error | `err.statusCode`, `err.details` |
| `CivicFixTimeoutError` | Ollama inference exceeds configured `timeoutMs` | `err.timeoutMs` |
| `CivicFixToolError` | Model requests unknown tool, tool loop exceeds `maxToolCalls`, or callback throws | `err.details` |

---

## Files in Repository

```
c:\Users\suheal\OneDrive\Desktop\Hacktober\
├── package.json               # ES module config, test & demo scripts
├── .gitignore                 # Excludes node_modules, temp logs, env files
├── .env.example               # Configuration defaults documentation
├── README.md                  # Complete architectural & operational guide
├── src/
│   ├── index.js               # Main public entry point exporting processComplaint & errors
│   ├── config.js              # Environment variable resolver
│   ├── errors.js              # Typed error classes (ValidationError, OllamaError, TimeoutError, ToolError)
│   ├── schemas.js             # Allowed enums, system prompt, and tool definition
│   ├── validator.js           # Strict input and output validators
│   ├── ollamaClient.js        # Low-level HTTP client with timeout management
│   └── agent.js               # Multi-turn tool execution loop and fallback handling
├── examples/
│   └── backend-adapter.js     # Runnable integration demonstration with a ticket repository
└── tests/
    ├── unit.test.js           # 24 unit tests covering validation, schemas, and mock tool calling
    └── integration.test.js    # Live integration tests calling local gemma4:e2b
```

---

## Limitations & Unverified Items

1. **Hardware-Dependent Inference Latency**: On local CPU/GPU hardware, `gemma4:e2b` multi-turn inference took ~36 seconds for tool call + synthesis. In production, configure `OLLAMA_TIMEOUT_MS` to at least `120000` (2 minutes).
2. **Concurrent Invocations**: Local Ollama queues requests sequentially by default unless configured with `OLLAMA_NUM_PARALLEL`. High concurrent load on the integrating backend should use a job queue (e.g. BullMQ or worker threads).
3. **External Network Exposure**: By design, this module binds to `127.0.0.1:11434` and does not expose endpoints externally.
