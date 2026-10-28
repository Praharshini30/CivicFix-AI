/**
 * CivicFix AI Schemas, Allowed Enums, and Tool Definitions.
 */

export const VALID_CATEGORIES = Object.freeze([
  "pothole",
  "garbage",
  "water leakage",
  "streetlight",
  "other",
]);

export const VALID_SEVERITIES = Object.freeze([
  "low",
  "medium",
  "high",
]);

export const LOOKUP_DUPLICATES_TOOL_NAME = "lookupDuplicates";

/**
 * Native tool definition passed to Ollama /api/chat
 */
export const LOOKUP_DUPLICATES_TOOL_DEF = Object.freeze({
  type: "function",
  function: {
    name: LOOKUP_DUPLICATES_TOOL_NAME,
    description:
      "Query existing persisted civic complaint tickets to detect potential duplicates by category and/or location. Call this before finalizing the complaint extraction.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "Complaint category to match (e.g., 'pothole', 'garbage', 'water leakage', 'streetlight', 'other').",
        },
        location: {
          type: "string",
          description: "Location, neighborhood, or landmark to search near.",
        },
      },
      required: ["category", "location"],
    },
  },
});

export const SYSTEM_PROMPT = `You are CivicFix AI, an automated municipal intake agent.
Your mission:
1. Examine the citizen complaint description and reported location.
2. Call the tool "lookupDuplicates" with the suspected category and location to check for existing records.
3. After the tool returns its results, produce your final extraction as a strictly formatted JSON object.

Your final JSON object MUST have exactly these keys:
- "category": MUST be one of ["pothole", "garbage", "water leakage", "streetlight", "other"]
- "summary": A concise, clear summary of the specific issue (non-empty string)
- "location": The precise or extracted location (non-empty string)
- "severity": Urgency rating, MUST be one of ["low", "medium", "high"]

Output ONLY the raw JSON object. Do not enclose in backticks or markdown, and do not add conversational remarks.`;
