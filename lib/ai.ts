const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

export async function askClaude(
  systemPrompt: string,
  messages: ClaudeMessage[]
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data: ClaudeResponse = await res.json();
  return data.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}

export async function analyzeError(
  errorLog: string,
  projectContext: string,
  filePath?: string
): Promise<{
  diagnosis: string;
  suggestedFix: string;
  filePath: string;
  confidence: "high" | "medium" | "low";
}> {
  const systemPrompt = `You are a senior full-stack developer analyzing build/deployment errors.
You have access to the project's CLAUDE.md context. Your job is to:
1. Diagnose the root cause of the error
2. Suggest a concrete fix with actual code
3. Identify the file that needs to be changed

Respond in JSON format only:
{
  "diagnosis": "Clear explanation of what went wrong",
  "suggestedFix": "The actual code fix (full file content or diff)",
  "filePath": "path/to/file/that/needs/fixing",
  "confidence": "high|medium|low"
}`;

  const userMessage = `## Project Context (CLAUDE.md)
${projectContext}

## Error Log
${errorLog}

${filePath ? `## Suspected File: ${filePath}` : ""}

Analyze this error and provide a fix in JSON format.`;

  const response = await askClaude(systemPrompt, [
    { role: "user", content: userMessage },
  ]);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      diagnosis: response,
      suggestedFix: "Could not parse automated fix — manual review needed.",
      filePath: filePath || "unknown",
      confidence: "low",
    };
  }
}
