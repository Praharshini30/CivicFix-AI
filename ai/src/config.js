/**
 * Configuration module for CivicFix AI.
 * Loads values from process.env with robust defaults.
 */

export function resolveConfig(overrides = {}) {
  const baseUrl = (
    overrides.baseUrl ||
    process.env.OLLAMA_BASE_URL ||
    "http://127.0.0.1:11434"
  ).replace(/\/+$/, "");

  const model =
    overrides.model ||
    process.env.OLLAMA_MODEL ||
    "gemma4:e2b";

  const timeoutMs = Number.parseInt(
    overrides.timeoutMs ?? process.env.OLLAMA_TIMEOUT_MS ?? "120000",
    10
  );

  const maxToolCalls = Number.parseInt(
    overrides.maxToolCalls ?? process.env.MAX_TOOL_CALLS ?? "3",
    10
  );

  const maxInputLength = Number.parseInt(
    overrides.maxInputLength ?? process.env.MAX_INPUT_LENGTH ?? "4000",
    10
  );

  return {
    baseUrl,
    model,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 120000,
    maxToolCalls: Number.isFinite(maxToolCalls) && maxToolCalls > 0 ? maxToolCalls : 3,
    maxInputLength: Number.isFinite(maxInputLength) && maxInputLength > 0 ? maxInputLength : 4000,
  };
}
