/**
 * CivicFix-AI: Express API Application
 * Strict implementation of API-CONTRACT.md:
 * - GET /api/health
 * - GET /api/complaints
 * - POST /api/complaints
 * - PATCH /api/complaints/:id/status
 */

import express from 'express';
import cors from 'cors';
import { complaintService } from './services/complaintService.js';
import { aiAdapter } from './ai/aiAdapter.js';
import { CATEGORIES, DEPARTMENTS, COMPLAINT_STATUS, SEVERITY_LEVELS } from './utils/complaintRules.js';

const app = express();

app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// GET /api/health & /health
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'CivicFix AI Backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    aiConfigured: aiAdapter.isConfigured()
  });
});

// GET /api/categories (Taxonomy helper)
app.get('/api/categories', (req, res) => {
  res.json({
    categories: Object.values(CATEGORIES),
    departments: DEPARTMENTS,
    severities: Object.values(SEVERITY_LEVELS),
    statuses: Object.values(COMPLAINT_STATUS)
  });
});

// GET /api/complaints/analytics (Dashboard helper)
app.get('/api/complaints/analytics', async (req, res, next) => {
  try {
    const analytics = await complaintService.getAnalytics();
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

// GET /api/complaints - Returns all saved complaint tickets
app.get('/api/complaints', async (req, res, next) => {
  try {
    const tickets = await complaintService.listComplaints(req.query);
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// GET /api/complaints/:id - Single ticket
app.get('/api/complaints/:id', async (req, res, next) => {
  try {
    const ticket = await complaintService.getComplaintById(req.params.id);
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// POST /api/complaints - Intake and AI triage
app.post('/api/complaints', async (req, res, next) => {
  try {
    const result = await complaintService.submitComplaint(req.body);
    const status = result.isDuplicate ? 200 : 201;
    res.status(status).json(result.complaint);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/complaints/:id/status - Update ticket status
app.patch('/api/complaints/:id/status', async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }
    const updated = await complaintService.updateComplaintStatus(req.params.id, status, notes);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/complaints/:id/upvote
app.post('/api/complaints/:id/upvote', async (req, res, next) => {
  try {
    const updated = await complaintService.upvoteComplaint(req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.statusCode || 500;
  if (status >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('[Error]', err);
  }
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    errors: err.errors || undefined
  });
});

export default app;
export { app };
