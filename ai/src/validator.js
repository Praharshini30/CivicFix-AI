import {
  CivicFixValidationError,
  CivicFixToolError,
} from "./errors.js";
import {
  VALID_CATEGORIES,
  VALID_SEVERITIES,
  LOOKUP_DUPLICATES_TOOL_NAME,
} from "./schemas.js";

/**
 * Validates the caller arguments to `processComplaint`.
 */
export function validateInput({ description, location, lookupDuplicates }, maxInputLength = 4000) {
  if (typeof description !== "string" || !description.trim()) {
    throw new CivicFixValidationError(
      "Missing or invalid 'description': must be a non-empty string",
      { field: "description", value: description }
    );
  }

  if (description.length > maxInputLength) {
    throw new CivicFixValidationError(
      `'description' exceeds maximum allowed length of ${maxInputLength} characters`,
      { field: "description", length: description.length, maxLength: maxInputLength }
    );
  }

  if (typeof location !== "string" || !location.trim()) {
    throw new CivicFixValidationError(
      "Missing or invalid 'location': must be a non-empty string",
      { field: "location", value: location }
    );
  }

  if (location.length > 500) {
    throw new CivicFixValidationError(
      "'location' exceeds maximum allowed length of 500 characters",
      { field: "location", length: location.length, maxLength: 500 }
    );
  }

  if (lookupDuplicates !== undefined && typeof lookupDuplicates !== "function") {
    throw new CivicFixValidationError(
      "'lookupDuplicates' must be a function if provided",
      { field: "lookupDuplicates", type: typeof lookupDuplicates }
    );
  }

  return {
    description: description.trim(),
    location: location.trim(),
    lookupDuplicates,
  };
}

/**
 * Validates and normalizes arguments passed to the lookupDuplicates tool.
 */
export function validateLookupDuplicatesArgs(toolName, rawArgs) {
  if (toolName !== LOOKUP_DUPLICATES_TOOL_NAME) {
    throw new CivicFixToolError(`Unsupported tool invocation requested: "${toolName}"`, {
      expectedTool: LOOKUP_DUPLICATES_TOOL_NAME,
      receivedTool: toolName,
    });
  }

  let args = rawArgs;
  if (typeof rawArgs === "string") {
    try {
      args = JSON.parse(rawArgs);
    } catch (err) {
      throw new CivicFixToolError(
        `Failed to parse tool arguments as JSON: ${err.message}`,
        { rawArgs }
      );
    }
  }

  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new CivicFixToolError(
      "Tool arguments must be an object with { category, location }",
      { received: args }
    );
  }

  const category = typeof args.category === "string" ? args.category.trim() : "";
  const location = typeof args.location === "string" ? args.location.trim() : "";

  return { category, location };
}

/**
 * Extracts and strictly validates the model's final JSON output.
 * Throws CivicFixValidationError if output is malformed, missing required fields,
 * or contains invalid enum values.
 */
export function parseAndValidateModelOutput(rawText, fallbackLocation = "") {
  if (typeof rawText !== "string" || !rawText.trim()) {
    throw new CivicFixValidationError(
      "Model returned an empty or non-string response",
      { rawResponse: rawText }
    );
  }

  // 1. Strip markdown code fences if present (e.g. ```json\n...\n``` or ```\n...\n```)
  let cleaned = rawText
    .replace(/^[\s\S]*?```(?:json)?\s*/i, "")
    .replace(/```[\s\S]*$/, "")
    .trim();

  // If there are still surrounding characters, find the first outermost JSON object
  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (err) {
        throw new CivicFixValidationError(
          `Failed to parse model JSON: ${err.message}`,
          { rawResponse: rawText, candidate: jsonMatch[0] }
        );
      }
    } else {
      throw new CivicFixValidationError(
        "Model output does not contain a recognizable JSON object",
        { rawResponse: rawText }
      );
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CivicFixValidationError(
      "Model output is not a JSON object",
      { parsed }
    );
  }

  // 2. Validate 'category'
  if (typeof parsed.category !== "string" || !parsed.category.trim()) {
    throw new CivicFixValidationError(
      "Missing required field 'category' in model extraction",
      { parsed }
    );
  }
  const category = parsed.category.toLowerCase().trim();
  if (!VALID_CATEGORIES.includes(category)) {
    throw new CivicFixValidationError(
      `Invalid category "${parsed.category}". Must be one of: ${VALID_CATEGORIES.join(", ")}`,
      { field: "category", value: parsed.category, allowed: VALID_CATEGORIES }
    );
  }

  // 3. Validate 'summary'
  if (typeof parsed.summary !== "string" || !parsed.summary.trim()) {
    throw new CivicFixValidationError(
      "Missing or empty required field 'summary' in model extraction",
      { parsed }
    );
  }
  const summary = parsed.summary.trim();

  // 4. Validate 'location'
  let location = typeof parsed.location === "string" ? parsed.location.trim() : "";
  if (!location) {
    location = fallbackLocation;
  }
  if (!location) {
    throw new CivicFixValidationError(
      "Missing or empty required field 'location' in model extraction",
      { parsed }
    );
  }

  // 5. Validate 'severity'
  if (typeof parsed.severity !== "string" || !parsed.severity.trim()) {
    throw new CivicFixValidationError(
      "Missing required field 'severity' in model extraction",
      { parsed }
    );
  }
  const severity = parsed.severity.toLowerCase().trim();
  if (!VALID_SEVERITIES.includes(severity)) {
    throw new CivicFixValidationError(
      `Invalid severity "${parsed.severity}". Must be one of: ${VALID_SEVERITIES.join(", ")}`,
      { field: "severity", value: parsed.severity, allowed: VALID_SEVERITIES }
    );
  }

  return {
    category,
    summary,
    location,
    severity,
  };
}
