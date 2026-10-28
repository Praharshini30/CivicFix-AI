import {
  CivicFixOllamaError,
  CivicFixTimeoutError,
} from "./errors.js";

/**
 * Low-level HTTP client for Ollama's local API.
 * Encapsulates fetch logic, AbortController timeouts, status handling,
 * and dependency-injection for testing.
 */
export class OllamaClient {
  constructor({ baseUrl, timeoutMs, fetchFn = globalThis.fetch } = {}) {
    this.baseUrl = (baseUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
    this.timeoutMs = timeoutMs || 120000;
    this.fetch = fetchFn;
  }

  /**
   * Check connection to Ollama and verify if a model tag is available.
   */
  async checkModelAvailability(modelName) {
    const url = `${this.baseUrl}/api/tags`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await this.fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new CivicFixOllamaError(
          `Ollama tags check failed with status ${res.status}`,
          res.status
        );
      }
      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models : [];
      const match = models.some(
        (m) =>
          m.name === modelName ||
          m.name === `${modelName}:latest` ||
          (m.model && m.model.startsWith(modelName))
      );
      return { available: match, models: models.map((m) => m.name) };
    } catch (err) {
      if (err.name === "AbortError") {
        throw new CivicFixTimeoutError("Ollama tags request timed out", 10000);
      }
      if (err instanceof CivicFixOllamaError) throw err;
      throw new CivicFixOllamaError(
        `Failed to connect to Ollama at ${this.baseUrl}: ${err.message}`,
        null,
        { cause: err }
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Post chat completion request to /api/chat.
   */
  async chat({ model, messages, tools, options, format }) {
    const url = `${this.baseUrl}/api/chat`;
    const payload = {
      model,
      messages,
      stream: false,
    };

    if (tools && Array.isArray(tools) && tools.length > 0) {
      payload.tools = tools;
    }
    if (options && typeof options === "object") {
      payload.options = options;
    }
    if (format) {
      payload.format = format;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errorBody = "";
        try {
          errorBody = await res.text();
        } catch { /* ignore */ }
        throw new CivicFixOllamaError(
          `Ollama /api/chat responded with HTTP ${res.status}: ${errorBody}`,
          res.status,
          { responseBody: errorBody }
        );
      }

      const data = await res.json();
      return data;
    } catch (err) {
      if (err.name === "AbortError") {
        throw new CivicFixTimeoutError(
          `Ollama request timed out after ${this.timeoutMs}ms`,
          this.timeoutMs
        );
      }
      if (err instanceof CivicFixOllamaError || err instanceof CivicFixTimeoutError) {
        throw err;
      }
      throw new CivicFixOllamaError(
        `Failed to reach Ollama at ${url}: ${err.message}`,
        null,
        { cause: err }
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
