
# CivicFix AI — Backend Module

## Owner
Member 2 — Backend and Database

## Purpose
The backend manages civic complaint submissions, validates AI analysis, detects duplicates, assigns departments, creates tickets, and stores complaint records.

## Technology Stack
- Node.js
- Express.js
- CORS
- JSON-file persistence or SQLite

## Required API Endpoints

### GET /api/health
Checks whether the backend is running.

### GET /api/complaints
Returns all saved complaint tickets.

### POST /api/complaints
Accepts a complaint description and location, calls the AI analysis module, validates the result, checks for duplicates, assigns a department, creates a ticket, and saves it.

Request example:
{
  "description": "Large pothole near the college gate",
  "location": "Main college gate"
}

### PATCH /api/complaints/:id/status
Updates a ticket status.

Allowed statuses:
Open, In Progress, Resolved.

## Ticket Fields
- id
- description
- category
- summary
- location
- severity
- department
- status
- duplicateOf
- source
- createdAt

## Business Logic
- Validate all incoming requests.
- Validate the AI's structured output.
- Detect likely duplicate complaints.
- Route categories to appropriate departments.
- Generate unique ticket IDs.
- Persist tickets between server restarts.
- Handle missing data and model failures.
- Clearly distinguish AI results from rule-based fallback results.

## Department Mapping
- pothole → Roads
- garbage → Sanitation
- water leakage → Water Supply
- streetlight → Electrical Maintenance
- other → General Civic Services

## Integration
The backend communicates with the AI module and serves data to the React frontend. The frontend must never call Ollama directly.

Follow the shared API contract in the repository root.

## Deliverable
A tested Express API with persistent ticket storage and working integration.
