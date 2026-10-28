/**
 * CivicFix-AI: JSON Persistence Layer
 * Provides file-based persistent storage for civic complaints.
 * Automatically initializes data/complaints.json if not present.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default path points to backend/data/complaints.json
const DEFAULT_DATA_PATH = path.resolve(__dirname, '../../data/complaints.json');

class ComplaintStore {
  constructor(filePath = process.env.STORAGE_FILE_PATH || DEFAULT_DATA_PATH) {
    this.filePath = filePath;
    this.initialized = false;
    this.writeQueue = Promise.resolve();
  }

  /**
   * Configure custom storage path (useful for testing)
   */
  setStoragePath(newPath) {
    this.filePath = newPath;
    this.initialized = false;
  }

  /**
   * Automatically initializes directory and complaints.json file if missing.
   */
  async init() {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      try {
        await fs.access(this.filePath);
      } catch {
        // File does not exist, create it automatically with empty array
        await fs.writeFile(this.filePath, JSON.stringify([], null, 2), 'utf-8');
      }
      this.initialized = true;
    } catch (err) {
      console.error(`[ComplaintStore] Initialization error for ${this.filePath}:`, err);
      throw err;
    }
  }

  /**
   * Internal helper to read raw complaints array from disk
   */
  async _read() {
    if (!this.initialized) {
      await this.init();
    }
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (err) {
      if (err.code === 'ENOENT') {
        await this.init();
        return [];
      }
      console.warn(`[ComplaintStore] Warning: Could not parse ${this.filePath}, resetting to empty array.`);
      return [];
    }
  }

  /**
   * Internal serialized write to prevent race conditions during concurrent writes
   */
  async _write(items) {
    if (!this.initialized) {
      await this.init();
    }

    // Chain to write queue to avoid race conditions
    this.writeQueue = this.writeQueue.then(async () => {
      const data = JSON.stringify(items, null, 2);
      await fs.writeFile(this.filePath, data, 'utf-8');
    });

    return this.writeQueue;
  }

  /**
   * Retrieve all complaints, optionally filtered
   */
  async getAll(filterFn = null) {
    const items = await this._read();
    if (typeof filterFn === 'function') {
      return items.filter(filterFn);
    }
    return items;
  }

  /**
   * Retrieve single complaint by ID
   */
  async getById(id) {
    const items = await this._read();
    return items.find(c => c.id === id) || null;
  }

  /**
   * Persist a new complaint
   */
  async create(complaint) {
    const items = await this._read();
    items.unshift(complaint); // Newest first
    await this._write(items);
    return complaint;
  }

  /**
   * Update an existing complaint by ID
   */
  async update(id, updates = {}) {
    const items = await this._read();
    const index = items.findIndex(c => c.id === id);
    if (index === -1) {
      return null;
    }

    const updated = {
      ...items[index],
      ...updates,
      id, // Preserve original ID
      updatedAt: new Date().toISOString()
    };

    items[index] = updated;
    await this._write(items);
    return updated;
  }

  /**
   * Delete complaint by ID
   */
  async delete(id) {
    const items = await this._read();
    const filtered = items.filter(c => c.id !== id);
    if (filtered.length === items.length) {
      return false;
    }
    await this._write(filtered);
    return true;
  }

  /**
   * Reset store (useful for tests)
   */
  async clear() {
    await this._write([]);
  }
}

export const complaintStore = new ComplaintStore();
export { ComplaintStore };
