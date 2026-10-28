
# CivicFix AI — API Contract

## Backend base URL
http://localhost:3001

## Endpoints

### GET /api/health
Check backend status.

### GET /api/complaints
Return all complaint tickets.

### POST /api/complaints
Request:
{
  "description": "Large pothole near college gate",
  "location": "Main college gate"
}

### PATCH /api/complaints/:id/status
Request:
{
  "status": "In Progress"
}

Allowed statuses: Open, In Progress, Resolved.

## Ticket fields

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

## Categories
pothole, garbage, water leakage, streetlight, other

## Departments
Roads, Sanitation, Water Supply,
Electrical Maintenance, General Civic Services

## Architecture
React frontend → Express backend → local Ollama model.

The frontend must never call Ollama directly.
The backend validates AI output and creates tickets.
