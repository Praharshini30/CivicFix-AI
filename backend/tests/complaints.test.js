/**
 * CivicFix-AI: Automated API & Integration Tests
 * Validates endpoints according to API-CONTRACT.md.
 */

import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { app } from '../src/app.js';
import { complaintStore } from '../src/services/complaintStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_STORAGE_PATH = path.resolve(__dirname, 'test-complaints.json');

describe('CivicFix-AI API Tests', () => {
  beforeEach(async () => {
    complaintStore.setStoragePath(TEST_STORAGE_PATH);
    await complaintStore.clear();
  });

  after(async () => {
    try {
      await fs.unlink(TEST_STORAGE_PATH);
    } catch {
      // Ignore cleanup error
    }
  });

  describe('Health Endpoint', () => {
    test('GET /api/health returns healthy backend status', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.service, 'CivicFix AI Backend');
      assert.ok(typeof res.body.uptime === 'number');
    });
  });

  describe('POST /api/complaints', () => {
    test('Creates ticket with required fields per API contract', async () => {
      const payload = {
        description: 'Large pothole near college gate',
        location: 'Main college gate'
      };

      const res = await request(app)
        .post('/api/complaints')
        .send(payload);

      assert.equal(res.status, 201);
      assert.ok(res.body.id);
      assert.equal(res.body.description, payload.description);
      assert.equal(res.body.location, payload.location);
      assert.equal(res.body.category, 'pothole');
      assert.equal(res.body.department, 'Roads');
      assert.equal(res.body.status, 'Open');
      assert.equal(res.body.duplicateOf, null);
      assert.ok(['Low', 'Medium', 'High', 'Critical'].includes(res.body.severity));
      assert.ok(res.body.createdAt);
      assert.ok(res.body.summary);
      assert.ok(res.body.source);
    });

    test('Rejects request missing required description or location', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .send({ description: '' });

      assert.equal(res.status, 400);
      assert.ok(res.body.error);
    });

    test('Detects duplicate complaint at the same location', async () => {
      const original = {
        description: 'Streetlight broken and dark on 2nd Avenue',
        location: '2nd Avenue Street'
      };

      const res1 = await request(app).post('/api/complaints').send(original);
      assert.equal(res1.status, 201);
      const originalId = res1.body.id;

      // Duplicate report
      const duplicate = {
        description: 'Dark streetlight broken on 2nd Avenue',
        location: '2nd Avenue Street'
      };

      const res2 = await request(app).post('/api/complaints').send(duplicate);
      assert.equal(res2.status, 200);
      assert.equal(res2.body.status, 'Duplicate');
      assert.equal(res2.body.duplicateOf, originalId);
    });
  });

  describe('GET /api/complaints', () => {
    test('Returns array of tickets', async () => {
      await request(app).post('/api/complaints').send({
        description: 'Garbage dump accumulating near lake',
        location: 'Bellandur Lake'
      });

      await request(app).post('/api/complaints').send({
        description: 'Drinking water pipe burst and leaking',
        location: 'Indiranagar 100ft Road'
      });

      const res = await request(app).get('/api/complaints');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.equal(res.body.length, 2);
    });

    test('Filters by category and status', async () => {
      await request(app).post('/api/complaints').send({
        description: 'Massive garbage rotting on sidewalk',
        location: 'MG Road'
      });

      const res = await request(app).get('/api/complaints?category=garbage');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].category, 'garbage');
      assert.equal(res.body[0].department, 'Sanitation');
    });
  });

  describe('PATCH /api/complaints/:id/status', () => {
    test('Updates ticket status to In Progress and Resolved', async () => {
      const createRes = await request(app).post('/api/complaints').send({
        description: 'Open manhole cover on main road',
        location: 'Koramangala 5th Block'
      });

      const id = createRes.body.id;

      const patchRes = await request(app)
        .patch(`/api/complaints/${id}/status`)
        .send({ status: 'In Progress' });

      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.body.status, 'In Progress');

      const resolveRes = await request(app)
        .patch(`/api/complaints/${id}/status`)
        .send({ status: 'Resolved' });

      assert.equal(resolveRes.status, 200);
      assert.equal(resolveRes.body.status, 'Resolved');
    });

    test('Rejects invalid status value', async () => {
      const createRes = await request(app).post('/api/complaints').send({
        description: 'Broken streetlight on street 4',
        location: 'Street 4'
      });

      const res = await request(app)
        .patch(`/api/complaints/${createRes.body.id}/status`)
        .send({ status: 'UnknownStatus' });

      assert.equal(res.status, 400);
    });
  });

  describe('Dashboard Analytics', () => {
    test('GET /api/complaints/analytics returns ticket counts', async () => {
      await request(app).post('/api/complaints').send({
        description: 'Water leakage from broken pipeline',
        location: 'Sector 3'
      });

      const res = await request(app).get('/api/complaints/analytics');
      assert.equal(res.status, 200);
      assert.ok(res.body.total >= 1);
      assert.ok(res.body.open >= 1);
    });
  });
});
