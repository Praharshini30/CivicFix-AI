/**
 * CivicFix AI — Local-First Civic Complaint Agent AI/ML Module
 *
 * Public Interface:
 *   export async function processComplaint({ description, location, lookupDuplicates, options })
 */

import { resolveConfig } from "./config.js";
import { validateInput } from "./validator.js";
import { OllamaClient } from "./ollamaClient.js";
import { runAgentWorkflow } from "./agent.js";

export {
  CivicFixError,
  CivicFixValidationError,
  CivicFixOllamaError,
  CivicFixTimeoutError,
  CivicFixToolError,
} from "./errors.js";

export {
  VALID_CATEGORIES,
  VALID_SEVERITIES,
  LOOKUP_DUPLICATES_TOOL_DEF,
  LOOKUP_DUPLICATES_TOOL_NAME,
} from "./schemas.js";

export { resolveConfig } from "./config.js";
export { OllamaClient } from "./ollamaClient.js";
export { parseAndValidateModelOutput, validateInput } from "./validator.js";

/**
 * Process a citizen civic complaint using local Ollama model (gemma4:e2b).
 *
 * @param {object} params
 * @param {string} params.description - Natural-language complaint details
 * @param {string} params.location - Landmark, street, or neighborhood
 * @param {Function} [params.lookupDuplicates] - Async callback: ({ category, location }) => Promise<Array>
 * @param {object} [params.options] - Optional overrides for baseUrl, timeoutMs, model, maxToolCalls, fetchFn
 * @returns {Promise<{
 *   category: "pothole"|"garbage"|"water leakage"|"streetlight"|"other",
 *   summary: string,
 *   location: string,
 *   severity: "low"|"medium"|"high",
 *   duplicates: Array<any>,
 *   meta: {
 *     model: string,
 *     toolCallsCount: number,
 *     nativeToolCallingUsed: boolean,
 *     toolArgumentsHistory: Array<any>
 *   }
 * }>}
 */
export async function processComplaint({
  description,
  location,
  lookupDuplicates,
  options = {},
} = {}) {
  const config = resolveConfig(options);
  const validated = validateInput(
    { description, location, lookupDuplicates },
    config.maxInputLength
  );

  const client = new OllamaClient({
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    fetchFn: options.fetchFn || globalThis.fetch,
  });

  return runAgentWorkflow({
    description: validated.description,
    location: validated.location,
    lookupDuplicates: validated.lookupDuplicates,
    config,
    client,
  });
}
