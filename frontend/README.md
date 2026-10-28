
# CivicFix AI — Frontend Module

## Owner
Member 3 — Frontend and User Experience

## Purpose
The frontend provides an intuitive interface for submitting civic complaints, viewing AI-generated analysis, and tracking complaint tickets.

## Technology Stack
- React
- Vite
- JavaScript
- Tailwind CSS or standard CSS
- Lucide React icons

## Required Features

### 1. Complaint Submission
- Textarea for the complaint description.
- Input for the complaint location.
- Submit button.
- Loading, success, and error states.

### 2. Dashboard
Display:
- Total complaints
- Open complaints
- High-priority complaints
- Resolved complaints

### 3. AI Triage Results
Display:
- Complaint category
- Summary
- Severity recommendation
- Assigned department
- Ticket ID
- Possible duplicate warning

### 4. Complaint Management
- Display saved tickets in a table.
- Show category, location, severity, department, and status.
- Allow status updates.
- Refresh data from the backend.

## Backend Integration
Base URL:
http://localhost:3001

Endpoints:
- GET /api/health
- GET /api/complaints
- POST /api/complaints
- PATCH /api/complaints/:id/status

Use the API contract in the repository root.

The frontend must communicate with the Express backend only. Never call the Ollama API directly from the browser.

Use an environment variable such as VITE_API_URL to configure the backend address.

## User Experience
- Responsive layout.
- Clear priority indicators.
- Readable ticket tables.
- Loading and error messages.
- Useful empty states.
- Consistent visual styling.

## Testing
- Test complaint submission.
- Test dashboard loading.
- Test API failures.
- Test ticket status updates.
- Test the UI against the integrated backend.

## Submission
Help prepare the README, screenshots, and demo workflow. The complete project must be runnable locally by the judges.

## Deliverable
A polished React frontend integrated with the real backend API.
