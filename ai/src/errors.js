/**
 * Custom error hierarchy for CivicFix AI module.
 * Enables calling code to discriminate between input validation,
 * Ollama connectivity, model output validation, timeouts, and tool errors.
 */

export class CivicFixError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

export class CivicFixValidationError extends CivicFixError {
  constructor(message, details = null) {
    super(message, details);
  }
}

export class CivicFixOllamaError extends CivicFixError {
  constructor(message, statusCode = null, details = null) {
    super(message, details);
    this.statusCode = statusCode;
  }
}

export class CivicFixTimeoutError extends CivicFixError {
  constructor(message = "Ollama request timed out", timeoutMs = null) {
    super(message, { timeoutMs });
    this.timeoutMs = timeoutMs;
  }
}

export class CivicFixToolError extends CivicFixError {
  constructor(message, details = null) {
    super(message, details);
  }
}
