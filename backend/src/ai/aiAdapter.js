/**
 * CivicFix-AI: AI Integration Boundary
 * Encapsulates calls to local Ollama (open-weight model) or Gemini API,
 * with deterministic fallback to the rule engine when models are offline.
 * Adheres to API-CONTRACT.md taxonomy and fields.
 */

import {
  fallbackAnalyzeComplaint,
  CATEGORIES,
  DEPARTMENTS,
  SEVERITY_LEVELS,
  normalizeCategory
} from '../utils/complaintRules.js';

export class AIAdapter {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3';
    this.geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || null;
    this.geminiModel = process.env.AI_MODEL || 'gemini-1.5-flash';
  }

  isConfigured() {
    return Boolean(this.geminiKey || this.ollamaUrl);
  }

  /**
   * Main triage method: calls Ollama first, then Gemini if configured,
   * falling back reliably to rule-based classification if offline.
   */
  async analyzeComplaint(complaintData) {
    // 1. Try local Ollama if reachable
    try {
      const ollamaResult = await this._callOllama(complaintData);
      if (ollamaResult && ollamaResult.category) {
        return ollamaResult;
      }
    } catch {
      // Ollama not running or timed out, continue to fallback / Gemini
    }

    // 2. Try Gemini API if key is present
    if (this.geminiKey) {
      try {
        const geminiResult = await this._callGemini(complaintData);
        if (geminiResult && geminiResult.category) {
          return geminiResult;
        }
      } catch (err) {
        console.warn(`[AIAdapter] Gemini API call failed: ${err.message}`);
      }
    }

    // 3. Fallback to rule engine
    return fallbackAnalyzeComplaint(complaintData);
  }

  /**
   * Calls local Ollama service
   */
  async _callOllama({ description, location, category }) {
    const prompt = `You are the civic grievance classifier for CivicFix AI.
Available categories: pothole, garbage, water leakage, streetlight, other.
Severity options: Low, Medium, High, Critical.

Complaint details:
Description: ${description}
Location: ${typeof location === 'object' ? JSON.stringify(location) : location}
User category: ${category || 'none'}

Return strictly JSON matching this format:
{
  "category": "pothole | garbage | water leakage | streetlight | other",
  "summary": "Short 1-sentence summary",
  "severity": "Low | Medium | High | Critical"
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // Fast 2s timeout

    try {
      const res = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          format: 'json',
          stream: false
        })
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Ollama returned status ${res.status}`);

      const data = await res.json();
      const parsed = JSON.parse(data.response);
      const cat = normalizeCategory(parsed.category) || CATEGORIES.OTHER;

      return {
        category: cat,
        department: DEPARTMENTS[cat] || DEPARTMENTS[CATEGORIES.OTHER],
        severity: parsed.severity || SEVERITY_LEVELS.Medium,
        summary: parsed.summary || description.slice(0, 50),
        source: 'ai'
      };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Calls Google Gemini API
   */
  async _callGemini({ description, location, category }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiKey}`;
    const prompt = `Analyze this civic complaint for CivicFix AI.
Available categories: pothole, garbage, water leakage, streetlight, other.
Severity: Low, Medium, High, Critical.

Description: ${description}
Location: ${typeof location === 'object' ? JSON.stringify(location) : location}
User category: ${category || 'none'}

Return strictly JSON:
{
  "category": "category",
  "summary": "1-sentence summary",
  "severity": "Low | Medium | High | Critical"
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Gemini status ${res.status}`);

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawText);
      const cat = normalizeCategory(parsed.category) || CATEGORIES.OTHER;

      return {
        category: cat,
        department: DEPARTMENTS[cat] || DEPARTMENTS[CATEGORIES.OTHER],
        severity: parsed.severity || SEVERITY_LEVELS.Medium,
        summary: parsed.summary || description.slice(0, 50),
        source: 'ai'
      };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }
}

export const aiAdapter = new AIAdapter();
