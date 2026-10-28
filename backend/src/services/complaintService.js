/**
 * CivicFix-AI: Complaint Service
 * Orchestrates intake, deduplication, AI triage, status management, and persistence.
 * Adheres to API-CONTRACT.md ticket fields and business logic.
 */

import crypto from 'node:crypto';
import { complaintStore } from './complaintStore.js';
import { aiAdapter } from '../ai/aiAdapter.js';
import {
  validateComplaintInput,
  isPotentialDuplicate,
  normalizeStatus,
  COMPLAINT_STATUS
} from '../utils/complaintRules.js';

export class ComplaintService {
  constructor(store = complaintStore, ai = aiAdapter) {
    this.store = store;
    this.ai = ai;
  }

  /**
   * Intake complaint: accepts description & location, performs AI triage,
   * checks for duplicates, assigns department, and persists ticket.
   */
  async submitComplaint(inputData) {
    const validation = validateComplaintInput(inputData);
    if (!validation.isValid) {
      const err = new Error(validation.errors.join('; '));
      err.statusCode = 400;
      err.errors = validation.errors;
      throw err;
    }

    const {
      description,
      location,
      title = null,
      category = null
    } = inputData;

    // Run AI or rule-based triage
    const analysis = await this.ai.analyzeComplaint({
      title: title || description.slice(0, 50),
      description,
      category,
      location
    });

    // Check for duplicates among active tickets
    const activeComplaints = await this.store.getAll(
      c => c.status !== COMPLAINT_STATUS.RESOLVED
    );

    const duplicateCandidate = activeComplaints.find(existing =>
      isPotentialDuplicate(
        { description, location, category: analysis.category, title },
        existing
      )
    );

    const now = new Date().toISOString();
    const ticketId = crypto.randomUUID();

    if (duplicateCandidate) {
      const duplicateTicket = {
        id: ticketId,
        description: description.trim(),
        category: analysis.category,
        summary: analysis.summary,
        location,
        severity: analysis.severity,
        department: analysis.department,
        status: COMPLAINT_STATUS.DUPLICATE,
        duplicateOf: duplicateCandidate.id,
        source: analysis.source,
        createdAt: now,
        // Additional helpers
        title: title ? title.trim() : analysis.summary,
        upvotes: 0,
        timeline: [
          {
            event: 'FLAGGED_DUPLICATE',
            timestamp: now,
            note: `Linked to primary ticket #${duplicateCandidate.id}`
          }
        ]
      };

      await this.store.create(duplicateTicket);

      // Increment duplicate count and upvotes on original ticket
      await this.store.update(duplicateCandidate.id, {
        duplicateCount: (duplicateCandidate.duplicateCount || 0) + 1,
        upvotes: (duplicateCandidate.upvotes || 0) + 1,
        linkedDuplicates: [...(duplicateCandidate.linkedDuplicates || []), ticketId]
      });

      return {
        isDuplicate: true,
        primaryComplaintId: duplicateCandidate.id,
        complaint: duplicateTicket,
        ticket: duplicateTicket
      };
    }

    // New Primary Ticket matching API-CONTRACT.md fields
    const newTicket = {
      id: ticketId,
      description: description.trim(),
      category: analysis.category,
      summary: analysis.summary,
      location,
      severity: analysis.severity,
      department: analysis.department,
      status: COMPLAINT_STATUS.OPEN,
      duplicateOf: null,
      source: analysis.source,
      createdAt: now,
      // Additional helpers
      title: title ? title.trim() : analysis.summary,
      upvotes: 0,
      duplicateCount: 0,
      linkedDuplicates: [],
      timeline: [
        {
          event: 'CREATED',
          timestamp: now,
          note: `Ticket created via ${analysis.source} and routed to ${analysis.department}`
        }
      ]
    };

    await this.store.create(newTicket);

    return {
      isDuplicate: false,
      complaint: newTicket,
      ticket: newTicket
    };
  }

  /**
   * Return all complaint tickets
   */
  async listComplaints(filters = {}) {
    let items = await this.store.getAll();
    const { status, category, severity, department, search } = filters;

    if (status) {
      const norm = normalizeStatus(status);
      items = items.filter(c => norm ? c.status === norm : c.status.toLowerCase() === status.toLowerCase());
    }

    if (category) {
      items = items.filter(c => c.category.toLowerCase() === category.toLowerCase());
    }

    if (severity) {
      items = items.filter(c => c.severity.toLowerCase() === severity.toLowerCase());
    }

    if (department) {
      items = items.filter(c => c.department.toLowerCase().includes(department.toLowerCase()));
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        c =>
          c.description.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          (typeof c.location === 'string' && c.location.toLowerCase().includes(q))
      );
    }

    return items;
  }

  /**
   * Get single complaint by ID
   */
  async getComplaintById(id) {
    const item = await this.store.getById(id);
    if (!item) {
      const err = new Error(`Ticket #${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    return item;
  }

  /**
   * Update status: Open, In Progress, Resolved
   */
  async updateComplaintStatus(id, newStatus, notes = '') {
    const normalized = normalizeStatus(newStatus);
    if (!normalized) {
      const err = new Error(`Invalid status: ${newStatus}. Allowed: Open, In Progress, Resolved, Duplicate`);
      err.statusCode = 400;
      throw err;
    }

    const complaint = await this.getComplaintById(id);
    const now = new Date().toISOString();

    const updated = await this.store.update(id, {
      status: normalized,
      updatedAt: now,
      timeline: [
        ...(complaint.timeline || []),
        {
          event: `STATUS_${normalized.toUpperCase().replace(/\s+/g, '_')}`,
          status: normalized,
          timestamp: now,
          note: notes || `Status changed from ${complaint.status} to ${normalized}`
        }
      ]
    });

    return updated;
  }

  /**
   * Upvote ticket
   */
  async upvoteComplaint(id) {
    const complaint = await this.getComplaintById(id);
    const newUpvotes = (complaint.upvotes || 0) + 1;
    return this.store.update(id, { upvotes: newUpvotes });
  }

  /**
   * Analytics breakdown for dashboard
   */
  async getAnalytics() {
    const all = await this.store.getAll();
    const byStatus = {};
    const byCategory = {};
    const bySeverity = {};
    const byDepartment = {};
    let totalDuplicates = 0;

    for (const c of all) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;
      byDepartment[c.department] = (byDepartment[c.department] || 0) + 1;
      if (c.status === COMPLAINT_STATUS.DUPLICATE) totalDuplicates++;
    }

    return {
      total: all.length,
      open: byStatus[COMPLAINT_STATUS.OPEN] || 0,
      inProgress: byStatus[COMPLAINT_STATUS.IN_PROGRESS] || 0,
      resolved: byStatus[COMPLAINT_STATUS.RESOLVED] || 0,
      duplicates: totalDuplicates,
      byStatus,
      byCategory,
      bySeverity,
      byDepartment
    };
  }
}

export const complaintService = new ComplaintService();
