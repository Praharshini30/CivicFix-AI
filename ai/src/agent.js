import {
  SYSTEM_PROMPT,
  LOOKUP_DUPLICATES_TOOL_DEF,
  LOOKUP_DUPLICATES_TOOL_NAME,
} from "./schemas.js";
import {
  validateLookupDuplicatesArgs,
  parseAndValidateModelOutput,
} from "./validator.js";
import { CivicFixToolError } from "./errors.js";

/**
 * Execute the complaint extraction agent loop against Ollama.
 *
 * @param {object} params
 * @param {string} params.description
 * @param {string} params.location
 * @param {Function} [params.lookupDuplicates] - genuine backend callback
 * @param {object} params.config - resolved configuration
 * @param {import("./ollamaClient.js").OllamaClient} params.client
 */
export async function runAgentWorkflow({
  description,
  location,
  lookupDuplicates,
  config,
  client,
}) {
  const userContent = `Complaint description: "${description}"\nReported location: "${location}"`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  const tools = lookupDuplicates ? [LOOKUP_DUPLICATES_TOOL_DEF] : undefined;

  let toolCallsCount = 0;
  let nativeToolCallingUsed = false;
  let duplicates = [];
  const toolArgumentsHistory = [];

  let currentResponse = await client.chat({
    model: config.model,
    messages,
    tools,
    options: {
      temperature: 0.1,
    },
  });

  // Agent loop: continue while the model produces tool_calls
  while (true) {
    const assistantMsg = currentResponse?.message;
    if (!assistantMsg) {
      break;
    }

    const toolCalls = assistantMsg.tool_calls;
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      nativeToolCallingUsed = true;

      // Append assistant's tool-call message to the dialogue
      messages.push(assistantMsg);

      for (const call of toolCalls) {
        toolCallsCount++;

        if (toolCallsCount > config.maxToolCalls) {
          throw new CivicFixToolError(
            `Exceeded maximum allowed tool calls (${config.maxToolCalls})`,
            { toolCallsCount, maxToolCalls: config.maxToolCalls }
          );
        }

        const fnName = call.function?.name;
        const rawArgs = call.function?.arguments;

        // Strict tool name and arguments validation
        const validatedArgs = validateLookupDuplicatesArgs(fnName, rawArgs);
        toolArgumentsHistory.push(validatedArgs);

        let toolResult = [];
        if (typeof lookupDuplicates === "function") {
          try {
            toolResult = await lookupDuplicates(validatedArgs);
          } catch (toolErr) {
            throw new CivicFixToolError(
              `Caller lookupDuplicates callback threw an error: ${toolErr.message}`,
              { cause: toolErr, toolArgs: validatedArgs }
            );
          }
        }

        // Keep track of any duplicates found by the callback
        if (Array.isArray(toolResult) && toolResult.length > 0) {
          duplicates = toolResult;
        }

        // Supply tool execution output back to Ollama
        messages.push({
          role: "tool",
          content: JSON.stringify(toolResult ?? []),
        });
      }

      // Fetch the next assistant turn after tool results are provided
      currentResponse = await client.chat({
        model: config.model,
        messages,
        tools,
        options: {
          temperature: 0.1,
        },
      });
    } else {
      // Model responded with final message or plain text
      break;
    }
  }

  // Fallback: If caller provided a duplicate callback but the model did NOT natively call the tool
  if (!nativeToolCallingUsed && typeof lookupDuplicates === "function" && duplicates.length === 0) {
    try {
      const fallbackResult = await lookupDuplicates({
        category: "",
        location,
      });
      if (Array.isArray(fallbackResult) && fallbackResult.length > 0) {
        duplicates = fallbackResult;
      }
    } catch (fallbackErr) {
      throw new CivicFixToolError(
        `Fallback lookupDuplicates callback failed: ${fallbackErr.message}`,
        { cause: fallbackErr }
      );
    }
  }

  const rawFinalContent = currentResponse?.message?.content || "";
  const validatedExtraction = parseAndValidateModelOutput(rawFinalContent, location);

  return {
    category: validatedExtraction.category,
    summary: validatedExtraction.summary,
    location: validatedExtraction.location,
    severity: validatedExtraction.severity,
    duplicates,
    meta: {
      model: config.model,
      toolCallsCount,
      nativeToolCallingUsed,
      toolArgumentsHistory,
    },
  };
}
