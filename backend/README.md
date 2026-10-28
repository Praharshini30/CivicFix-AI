# CivicFix AI — Backend Module

## Owner
Member 2 — Backend and Database

## Purpose
The backend manages civic complaint submissions, validates AI analysis, detects duplicates, assigns departments, creates tickets, and stores complaint records.

## Technology Stack
- Node.js (ES Modules)
- Express.js
- CORS
- JSON-file persistence (`data/complaints.json`)
- Native Node Test Runner (`node:test`) & Supertest

---

## Architecture Overview

```
CivicFix-AI/
└── backend/
    ├── server.js                          # Startup entrypoint & HTTP listener (Port 3001)
    ├── src/
    │   ├── app.js                         # Express configuration, routes & middleware
    │   ├── ai/
    │   │   └── aiAdapter.js               # AI integration boundary (Ollama / Gemini / Fallback)
    │   ├── services/
    │   │   ├── complaintService.js        # Complaint intake, lifecycle & deduplication
    │   │   └── complaintStore.js          # JSON persistence layer
    │   └── utils/
    │       └── complaintRules.js          # Input validation, taxonomy & fallback engine
    ├── data/
    │   └── complaints.json                # Persisted tickets (Created automatically)
    ├── tests/
    │   └── complaints.test.js             # Automated API integration tests
    ├── .env                               # Environment configurations
    ├── .gitignore                         # Git exclusion rules
    └── README.md                          # Project documentation
```

---

## Required API Endpoints

### GET /api/health
Checks whether the backend is running.
- **Response**: `{ status: "ok", service: "CivicFix AI Backend", uptime: ..., timestamp: ... }`

### GET /api/complaints
Returns all saved complaint tickets (supports `?category=...`, `?status=...`, `?search=...`).

### POST /api/complaints
Accepts a complaint description and location, calls the AI analysis module, validates the result, checks for duplicates, assigns a department, creates a ticket, and saves it.

**Request example:**
```json
{
  "description": "Large pothole near the college gate",
  "location": "Main college gate"
}
```

### PATCH /api/complaints/:id/status
Updates a ticket status.

**Request example:**
```json
{
  "status": "In Progress"
}
```

**Allowed statuses:**
`Open`, `In Progress`, `Resolved`, `Duplicate`

---

## Ticket Fields

- `id` — Unique identifier (UUID)
- `description` — Original complaint description
- `category` — `pothole`, `garbage`, `water leakage`, `streetlight`, `other`
- `summary` — 1-sentence issue summary
- `location` — Location string or coordinates
- `severity` — `Low`, `Medium`, `High`, `Critical`
- `department` — Assigned civic department
- `status` — `Open`, `In Progress`, `Resolved`, `Duplicate`
- `duplicateOf` — ID of primary ticket if flagged as duplicate (or null)
- `source` — `ai` or `rule-based fallback`
- `createdAt` — ISO timestamp

---

## Department Mapping
- `pothole` → `Roads`
- `garbage` → `Sanitation`
- `water leakage` → `Water Supply`
- `streetlight` → `Electrical Maintenance`
- `other` → `General Civic Services`

---

## Integration
The backend communicates with the AI module (local Ollama or fallback) and serves data to the React frontend. The frontend must never call Ollama directly.
Follows the shared API contract in `API-CONTRACT.md`.

---

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
`.env` defaults to port 3001:
```ini
PORT=3001
NODE_ENV=development
STORAGE_FILE_PATH=./data/complaints.json
OLLAMA_URL=http://localhost:11434
```

### 3. Start Development Server
```bash
npm run dev
# or: npm start
```

### 4. Run Automated Tests
```bash
npm test
```
