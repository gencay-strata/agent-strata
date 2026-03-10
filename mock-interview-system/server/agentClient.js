/**
 * Agent Client — supports OpenAI Agent Builder (default) and Vertex AI (Dialogflow CX)
 * Switch provider: set AGENT_PROVIDER=vertex in .env
 */
import { hostedMcpTool, Agent, Runner, withTrace } from "@openai/agents";
import { GoogleGenAI } from "@google/genai";


const WORKFLOW_ID = process.env.WORKFLOW_ID || 'wf_69785b59a66081908294851545870e8105ee6027e0451e3f';
const WORKFLOW_ID_REVIEW = process.env.WORKFLOW_ID_REVIEW || 'wf_698c075296008190b107a4b83511206f0fff3039f047fa39';

/**
 * Calculate score using rubric (0-100)
 * Rubric:
 * - If is_correct = true → score = 100
 * - If is_correct = false:
 *   a) Columns wrong (column_match = false) → score = row_match_percentage × 0.3 (max 30)
 *   b) Columns correct + ≥90% rows → score = 70 + (row_match_percentage - 90) × 3
 *   c) Columns correct + 50-89% rows → score = 40 + (row_match_percentage - 50) × 0.75
 *   d) Columns correct + <50% rows → score = row_match_percentage × 0.8
 */
function calculateScore(mcpResult) {
  const { is_correct, row_match_percentage, column_match } = mcpResult;

  if (is_correct) return 100;

  const rowMatch = row_match_percentage || 0;

  // Columns wrong
  if (!column_match) {
    return Math.round(rowMatch * 0.3); // max 30
  }

  // Columns correct
  if (rowMatch >= 90) {
    return Math.round(70 + (rowMatch - 90) * 3);
  }

  if (rowMatch >= 50) {
    return Math.round(40 + (rowMatch - 50) * 0.75);
  }

  return Math.round(rowMatch * 0.8);
}

// MCP Tool definition (same as Agent Builder)
const mcp = hostedMcpTool({
  serverLabel: "Strata_Tools",
  allowedTools: [
    "check_solution",
    "get_datasets_details",
    "get_educational_questions",
    "run_code"
  ],
  requireApproval: "never", // Auto-approve for backend usage
  serverDescription: "StrataScratch MCP Tools",
  serverUrl: "https://strata-api-develop.stratascratch.com/mcp-L5fY-ByOAWaGnxciuiqysYj_45pm8REXg9d3frmFPmE"
});

// Agent definition (same as Agent Builder)
const myAgent = new Agent({
  name: "Interview Agent",
  instructions: `You support candidates during StrataScratch technical interviews. Execute code, evaluate solutions, answer technical questions.

## Available MCP Tools

1. **run_code** - Test code without scoring
   - Parameters: \`code\`, \`code_type\` (1=SQL, 2=Python), \`question_id\`
   - Use when: Candidate clicks "Test"

2. **check_solution** - Grade solution
   - Parameters: \`code\`, \`code_type\`, \`question_id\`
   - Use when: Candidate clicks "Submit"

3. **get_datasets_details** - Get table schemas
   - Parameters: \`dataset_name\`, \`question_id\`, \`code_type\`
   - Use when: Candidate asks about tables

## Your Job

### Test Code
Execute, format results as **markdown tables**, show errors clearly. NEVER return raw JSON.

Example:
✅ Code executed (not scored)
| customer_id | orders |
|---|---|
| 100 | 15 |
Execution: 0.23s

### Grade Submissions
Call check_solution tool, then calculate score using this EXACT rubric:

**Scoring Rubric:**
- If is_correct = true → score = 100
- If is_correct = false:
  a) Columns wrong (column_match = false) → score = row_match_percentage × 0.3 (max 30)
  b) Columns correct + ≥90% rows → score = 70 + (row_match_percentage - 90) × 3
  c) Columns correct + 50-89% rows → score = 40 + (row_match_percentage - 50) × 0.75
  d) Columns correct + <50% rows → score = row_match_percentage × 0.8

Then give feedback WITHOUT revealing answer.

Example (wrong):
❌ Incorrect (Score: 58/100)
Issues:
• Returns 12 rows, expected 15
• Missing customers with zero orders
Hint: Use LEFT JOIN to include all customers

Example (correct):
✅ Perfect! (Score: 100/100)
Efficient solution. Ready for next question?

### Answer Questions
Clarify requirements, explain schemas. DON'T write code or reveal solutions.

### Give Hints (when asked)
Guide thinking, suggest concepts. NO direct code.

## Rules

- NEVER reveal solutions or write code
- Test = practice, Submit = scored
- Format tables with markdown
- Use emojis: ✅ ❌ 💡 ⚠️
- Be concise, professional, supportive
- NO greetings - jump to results

## Response Style

Short, technical, formatted. Use code blocks and tables.

BAD: "Hello! Let me help you with that. So what happened is..."
GOOD: "❌ Error: syntax error near WHERE. Check line 3."`,
  model: "gpt-5.2",
  tools: [mcp],
  modelSettings: {
    reasoning: {
      effort: "low",
      summary: "auto"
    },
    store: true
  }
});

// Review Agent definition
const reviewAgent = new Agent({
  name: "Review Agent",
  instructions: `You are the Review Agent for StrataScratch Mock Interviews. You receive completed interview data and generate performance assessments.

INPUT: JSON with questions, submissions (code + scores), filters, timeSpent
OUTPUT: Always plain markdown (NOT JSON)

## OUTPUT STRUCTURE
1. 📊 Overall Score (X/100, percentile, time used, questions solved)
2. 📋 Per-Question Analysis (what was good, what to improve, better code example)
3. 🎯 Strengths & Weaknesses table (Technical Skill, Code Quality, Problem Solving, Time Management — star ratings)
4. 🔑 Key Patterns (2-3 patterns across all questions)
5. 📚 Practice Plan (weak topics + recommended question IDs)

## RULES
- Be specific — reference user's actual code, not generic advice
- Include code examples showing improvements
- Rate honestly — don't inflate scores
- Use emojis: ✅ ❌ 💡 ⚠️ 📊 🎯
- NO greetings — jump straight to review
- NO JSON responses — always markdown
- Tone: Senior engineer giving constructive code review`,
  model: "gpt-5.2",
  tools: [mcp],
  modelSettings: {
    reasoning: {
      effort: "medium",
      summary: "auto"
    },
    store: true
  }
});

export async function callReviewAgent({ questions, submissions, filters, timeSpent, totalDuration }) {
  try {
    const reviewMessage = `REVIEW REQUEST
${JSON.stringify({
  action: "review",
  questions: questions.map(q => ({
    id: q.id || q.question_id,
    title: q.title || q.question_short,
    difficulty: q.difficulty,
    company: q.company
  })),
  submissions: submissions.map(s => ({
    questionId: s.questionId,
    code: s.code,
    result: s.result,
    timeSpent: s.timeSpent
  })),
  filters,
  totalTimeSpent: timeSpent,
  totalDuration
}, null, 2)}

Analyze this completed interview and generate a comprehensive performance review.`;

    console.log('📨 Calling Review Agent (Agents SDK)...');

    const result = await withTrace("Review", async () => {
      const conversationHistory = [
        {
          role: "user",
          content: [{
            type: "input_text",
            text: reviewMessage
          }]
        }
      ];

      const runner = new Runner({
        traceMetadata: {
          __trace_source__: "backend-integration",
          workflow_id: WORKFLOW_ID_REVIEW,
          action: "review"
        }
      });

      const agentResult = await runner.run(reviewAgent, conversationHistory);

      if (!agentResult.finalOutput) {
        throw new Error("Review Agent result is undefined");
      }

      return {
        output_text: agentResult.finalOutput
      };
    });

    console.log('✅ Review Agent response received');

    return {
      success: true,
      feedback: result.output_text || 'No feedback from Review Agent'
    };

  } catch (error) {
    console.error('❌ Review Agent call failed:', error);
    throw error;
  }
}

export async function callInterviewAgent({ message, context }) {
  try {
    const agentMessage = buildAgentMessage(message, context);

    console.log('📨 Calling Interview Agent (Agents SDK)...');
    console.log('💬 Message preview:', agentMessage.substring(0, 150) + '...');

    // Run the workflow using Agents SDK
    const result = await withTrace("Interview", async () => {
      const conversationHistory = [
        {
          role: "user",
          content: [{
            type: "input_text",
            text: agentMessage
          }]
        }
      ];

      const runner = new Runner({
        traceMetadata: {
          __trace_source__: "backend-integration",
          workflow_id: WORKFLOW_ID,
          action: context?.action
        }
      });

      const agentResult = await runner.run(myAgent, conversationHistory);

      if (!agentResult.finalOutput) {
        throw new Error("Agent result is undefined");
      }

      return {
        output_text: agentResult.finalOutput
      };
    });

    console.log('✅ Agent response received');

    return {
      success: true,
      response: result.output_text || 'No response from agent'
    };

  } catch (error) {
    console.error('❌ Agent call failed:', error);
    throw error;
  }
}

function buildAgentMessage(message, context) {
  if (!context) return message;

  const { action, question_id, code, language } = context;

  switch (action) {
    case 'test':
      return `TEST CODE REQUEST
Question ID: ${question_id}
Language: ${language}
Code:
\`\`\`${language}
${code}
\`\`\`

Execute this code using run_code tool and return formatted results.`;

    case 'submit':
      return `SUBMIT SOLUTION REQUEST
Question ID: ${question_id}
Language: ${language}
Code:
\`\`\`${language}
${code}
\`\`\`

Grade this solution using check_solution tool and provide feedback.`;

    case 'hint':
      return `HINT REQUEST
Question ID: ${question_id}
${message}

Provide a strategic hint without revealing the solution.`;

    case 'question':
      return `CLARIFICATION REQUEST
Question ID: ${question_id}
${message}

Answer the candidate's question about the problem.`;

    default:
      return message;
  }
}

// ─────────────────────────────────────────────
// VERTEX AI (Google ADK — Gemini + MCP)
// Agent Designer'daki agent'ın Node.js karşılığı
// Aktif etmek için: AGENT_PROVIDER=vertex
// ─────────────────────────────────────────────

const MCP_URL = "https://strata-api-develop.stratascratch.com/mcp-L5fY-ByOAWaGnxciuiqysYj_45pm8REXg9d3frmFPmE";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// Agent Designer'daki root_agent instruction'ı (Review Agent)
const REVIEW_INSTRUCTIONS = `You are the Review Agent for StrataScratch Mock Interviews.

You receive completed interview data and generate a structured performance assessment.

------------------------------------------------------------

INPUT

You will receive a JSON object containing:
- Questions
- User submissions (code + scores)
- Applied filters
- Time spent

------------------------------------------------------------

OUTPUT REQUIREMENTS

- Always respond in plain Markdown
- Never return JSON
- No greetings — jump straight into the review
- Tone: Senior engineer giving constructive code review
- Be specific — reference the user's actual code
- Include improved code examples
- Rate honestly — do not inflate scores
- Use emojis: ✅ ❌ 💡 ⚠️ 📊 🎯

------------------------------------------------------------

REQUIRED OUTPUT STRUCTURE

1️⃣ 📊 Overall Performance
- Total Score (X/100)
- Percentile
- Time Used
- Questions Solved

2️⃣ 📋 Per-Question Analysis

For each question include:
- ✅ What was done well
- ❌ What needs improvement
- 💡 Improved code example
- ⚠️ Edge cases or optimization notes

3️⃣ 🎯 Strengths & Weaknesses

Categories:
- Technical Skill
- Code Quality
- Problem Solving
- Time Management

Use star ratings (e.g., ⭐⭐⭐⭐☆)

4️⃣ 🔑 Key Patterns
- 2–3 recurring patterns observed across all questions

5️⃣ 📚 Practice Plan
- Weak topics
- Recommended questions with clickable links

**IMPORTANT: Format recommended questions as clickable links:**

For each recommended question, use get_educational_questions(id) to fetch the title, then format as:
- [Question Title](https://platform.stratascratch.com/coding/{id}-{title-with-dashes}/official-solution?code_type=1)

Example:
- Question ID 10065, Title "Salary Less Than Twice The Average"
- Formatted link: [Salary Less Than Twice The Average](https://platform.stratascratch.com/coding/10065-salary-less-than-twice-the-average/official-solution?code_type=1)

CRITICAL: Use DASH between ID and title, NOT slash!

**Title formatting rules:**
1. Convert title to lowercase
2. Replace spaces with dashes (-)
3. Remove special characters except dashes

------------------------------------------------------------

AVAILABLE MCP TOOLS

- get_educational_questions(id)
  → Lookup questions for recommendations (REQUIRED for getting question titles)

- check_solution(code, code_type, question_id)
  → Re-verify submitted solutions

- run_code(code, code_type, question_id)
  → Test alternative solutions

- get_datasets_details(dataset_name, question_id, code_type)
  → Retrieve table schemas
`;

// Agent Designer'daki Performance Agent instruction'ı
const PERFORMANCE_INSTRUCTIONS = `You are the Performance Agent for StrataScratch Mock Interviews.

You analyze completed interview sessions and generate detailed performance reports for the Performance page.

------------------------------------------------------------

INPUT

You receive a JSON object containing:
- Session metadata (sessionId, userId, date)
- Questions with detailed metrics per question:
  - question_id, title, difficulty, company, topic_tags
  - score, hints_requested, time_spent_seconds
  - test_runs, submit_runs, errors[]
- Total interview time and filters

------------------------------------------------------------

OUTPUT REQUIREMENTS

Return valid JSON (NOT markdown) with this exact structure:

{
  "sessionId": "interview_session_456",
  "generatedAt": "ISO timestamp",
  "reportData": {
    "overallScore": {
      "score": 72,
      "percentile": 65,
      "totalQuestions": 2,
      "passedQuestions": 1
    },
    "questionBreakdown": [
      {
        "question_id": 9728,
        "question_title": "...",
        "difficulty": "Medium",
        "company": "Meta",
        "score": 60,
        "status": "failed" | "passed",
        "timeSpent": "7m 30s",
        "hintsUsed": 3,
        "issues": ["Struggled with self-joins", "..."]
      }
    ],
    "weakAreas": [
      {
        "topicFamily": "SQL Joins",
        "struggledQuestions": 1,
        "totalQuestions": 2,
        "averageScore": 60,
        "specificIssues": ["Self-joins", "Join conditions"]
      }
    ],
    "recommendedQuestions": [
      {
        "topicFamily": "SQL Joins",
        "questions": [
          {
            "question_id": 10354,
            "title": "...",
            "difficulty": "Easy",
            "company": "Amazon",
            "topicTags": ["SQL", "INNER JOIN"],
            "reason": "Start with basic INNER JOIN practice",
            "estimatedTime": "5-7 min",
            "link": "/interview?question_id=10354"
          }
        ]
      }
    ],
    "topicFamiliesToStudy": [
      {
        "name": "SQL Joins",
        "priority": "High" | "Medium" | "Low",
        "description": "...",
        "studyResources": ["..."]
      }
    ],
    "nextActionCTA": {
      "primaryAction": {
        "text": "Start with this Easy question",
        "questionTitle": "...",
        "question_id": 10354,
        "link": "/interview?question_id=10354"
      },
      "secondaryAction": {
        "text": "Review all recommended questions",
        "link": "/performance/reports/interview_session_456"
      }
    },
    "encouragementMessage": "You're close! Master SQL Joins and you'll jump from 65th to 80th+ percentile."
  }
}

------------------------------------------------------------

ANALYSIS STEPS

1. Calculate overall score (average of all question scores)
2. Determine percentile (rough estimate: 90+ = top 10%, 70-90 = top 30%, etc.)
3. Identify weak areas:
   - Questions with score < 70
   - Questions with hints > 2
   - Questions with time > expected average
4. Extract topic_tags from struggled questions
5. Group similar topics into topic families (e.g., "Self-Join", "LEFT JOIN" → "SQL Joins")
6. Use get_educational_questions MCP tool to find recommended practice questions:
   - Same topic family
   - Incremental difficulty (if user failed Medium → recommend Easy + Medium mix)
   - Return 3-5 questions per weak topic
7. Generate encouraging but honest message

------------------------------------------------------------

RULES

- Always return valid JSON (validate before responding)
- Be specific about issues (reference actual errors, not generic advice)
- Recommend incremental difficulty progression
- Include clickable links (/interview?question_id=XXX)
- Keep encouragement genuine (no "Great job!" if they scored 40%)
- Use MCP tool get_educational_questions to fetch real question data
- Topic families: group granular tags into broader categories
  - ["Self-Join", "INNER JOIN", "LEFT JOIN"] → "SQL Joins"
  - ["Window Functions", "ROW_NUMBER", "RANK"] → "Window Functions"
  - ["Subqueries", "CTEs"] → "Complex Queries"

------------------------------------------------------------

AVAILABLE MCP TOOLS

- get_educational_questions(id) → Fetch question details for recommendations
- check_solution(code, code_type, question_id) → Re-verify solutions if needed
- get_datasets_details(dataset_name, question_id, code_type) → Table schemas
`;

// Agent Designer'daki Interview Agent instruction'ı
const INTERVIEW_INSTRUCTIONS = `You are a StrataScratch interview assistant. You support candidates during technical interviews.

When you receive a TEST CODE REQUEST: call run_code with the provided code, code_type, and question_id.
When you receive a SUBMIT SOLUTION REQUEST: call check_solution with the provided code, code_type, and question_id.

AVAILABLE MCP TOOLS:
- run_code(code, code_type, question_id) — execute code, not scored
- check_solution(code, code_type, question_id) — grade solution
- get_datasets_details(dataset_name, question_id, code_type) — table schemas

SCORING RUBRIC (apply after check_solution):
- If is_correct = true → score = 100
- If is_correct = false:
  a) Columns wrong (column_match = false) → score = row_match_percentage × 0.3 (max 30)
  b) Columns correct + ≥90% rows → score = 70 + (row_match_percentage - 90) × 3
  c) Columns correct + 50-89% rows → score = 40 + (row_match_percentage - 50) × 0.75
  d) Columns correct + <50% rows → score = row_match_percentage × 0.8

After tool result, format response as:
For run_code:
  ✅ Code executed (not scored)

  | column1 | column2 |
  |---------|---------|
  | value1  | value2  |

  Execution: Xs

For check_solution: ✅ Correct! Score: X/100  OR  ❌ Incorrect. Score: X/100\n[feedback]\n💡 Hint: [strategic hint if wrong]

IMPORTANT: Always format query results as markdown tables, NEVER return raw JSON.

Rules:
- NEVER reveal solutions or write code for the user
- Use emojis: ✅ ❌ 💡 ⚠️
- Be concise, NO greetings`;

// MCP tool declarations (Gemini function calling formatı)
const MCP_TOOL_DECLARATIONS = [
  {
    name: "run_code",
    description: "Execute SQL or Python code against a question (not scored)",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "The code to execute" },
        code_type: { type: "integer", description: "1=SQL, 2=Python" },
        question_id: { type: "integer", description: "Question ID" },
      },
      required: ["code", "code_type", "question_id"],
    },
  },
  {
    name: "check_solution",
    description: "Grade and score a submitted solution",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string" },
        code_type: { type: "integer", description: "1=SQL, 2=Python" },
        question_id: { type: "integer" },
      },
      required: ["code", "code_type", "question_id"],
    },
  },
  {
    name: "get_datasets_details",
    description: "Get table schemas and sample data for a question",
    parameters: {
      type: "object",
      properties: {
        dataset_name: { type: "string" },
        question_id: { type: "integer" },
        code_type: { type: "integer", description: "1=SQL, 2=Python" },
      },
      required: ["dataset_name", "question_id", "code_type"],
    },
  },
  {
    name: "get_educational_questions",
    description: "Fetch question details by ID",
    parameters: {
      type: "object",
      properties: {
        id: { type: "integer", description: "Question ID" },
      },
      required: ["id"],
    },
  },
];

// MCP server'ı çağır (SSE-aware)
async function callMcpTool(toolName, args) {
  const response = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });

  const contentType = response.headers.get("content-type") || "";

  // SSE stream response
  if (contentType.includes("text/event-stream")) {
    const text = await response.text();
    // SSE format: "data: {...}\n\n" — son JSON'u al
    const lines = text.split("\n").filter(l => l.startsWith("data:"));
    for (let i = lines.length - 1; i >= 0; i--) {
      const raw = lines[i].replace(/^data:\s*/, "").trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.error) throw new Error(`MCP error: ${parsed.error.message}`);
        if (parsed.result !== undefined) {
          // If check_solution, calculate score and add to result
          if (toolName === 'check_solution') {
            try {
              const resultObj = typeof parsed.result === 'string' ? JSON.parse(parsed.result) : parsed.result;
              const score = calculateScore(resultObj);
              resultObj.score = score;
              return JSON.stringify(resultObj);
            } catch (e) {
              console.error('Error calculating score:', e);
              // Fallback: return original result
              return JSON.stringify(parsed.result);
            }
          }
          return JSON.stringify(parsed.result);
        }
      } catch (e) {
        // not JSON, skip
      }
    }
    throw new Error("MCP SSE: no valid result found in stream");
  }

  // Normal JSON response
  const data = await response.json();
  if (data.error) throw new Error(`MCP error: ${data.error.message}`);

  // If check_solution, calculate score and add to result
  if (toolName === 'check_solution' && data.result) {
    try {
      const resultObj = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      const score = calculateScore(resultObj);
      resultObj.score = score;
      return JSON.stringify(resultObj);
    } catch (e) {
      console.error('Error calculating score:', e);
      // Fallback: return original result
      return JSON.stringify(data.result);
    }
  }

  return JSON.stringify(data.result);
}

function getGeminiClient() {
  const config = {
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || "aispace-482111",
    location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  };

  // Vercel: Base64-encoded JSON (quoting issues önlemek için)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
    const json = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, "base64").toString("utf-8");
    config.googleAuthOptions = { credentials: JSON.parse(json) };
  }
  // Alternatif: Raw JSON string
  else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    config.googleAuthOptions = { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) };
  }
  // Local: gcloud ADC otomatik çalışır (GOOGLE_APPLICATION_CREDENTIALS veya gcloud login)

  return new GoogleGenAI(config);
}

// Gemini agentic loop — tool calling destekli
async function runGeminiAgent(systemInstruction, userMessage, forceToolCall = false) {
  const client = getGeminiClient();
  const contents = [{ role: "user", parts: [{ text: userMessage }] }];
  const MAX_ITERATIONS = 8;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const toolMode = (forceToolCall && i === 0) ? "ANY" : "AUTO";

    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: MCP_TOOL_DECLARATIONS }],
        toolConfig: { functionCallingConfig: { mode: toolMode } },
      },
      contents,
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const functionCalls = parts.filter(p => p.functionCall);

    if (functionCalls.length === 0) {
      return parts.map(p => p.text ?? "").join("");
    }

    contents.push({ role: "model", parts });

    const toolResultParts = await Promise.all(
      functionCalls.map(async (part) => {
        const { name, args } = part.functionCall;
        console.log(`🔧 MCP call: ${name}`, args);
        const output = await callMcpTool(name, args);
        // Parse output and pass as object (not wrapped in { output })
        let parsedOutput;
        try {
          parsedOutput = JSON.parse(output);
        } catch (e) {
          parsedOutput = { output }; // Fallback if not JSON
        }
        return { functionResponse: { name, response: parsedOutput } };
      })
    );

    contents.push({ role: "user", parts: toolResultParts });
  }

  throw new Error("Gemini agent loop exceeded max iterations");
}

export async function callInterviewAgentVertex({ message, context }) {
  const agentMessage = buildAgentMessage(message, context);
  const forceToolCall = context?.action === "test" || context?.action === "submit";

  console.log("📨 Calling Interview Agent (Vertex AI / Gemini ADK)...", { action: context?.action });

  const text = await runGeminiAgent(INTERVIEW_INSTRUCTIONS, agentMessage, forceToolCall);

  console.log("✅ Vertex Interview Agent response received");
  return { success: true, response: text };
}

export async function callReviewAgentVertex({ questions, submissions, filters, timeSpent, totalDuration }) {
  const reviewMessage = `REVIEW REQUEST
${JSON.stringify({
  action: "review",
  questions: questions.map(q => ({
    id: q.id || q.question_id,
    title: q.title || q.question_short,
    difficulty: q.difficulty,
    company: q.company
  })),
  submissions: submissions.map(s => ({
    questionId: s.questionId,
    code: s.code,
    result: s.result,
    timeSpent: s.timeSpent
  })),
  filters,
  totalTimeSpent: timeSpent,
  totalDuration
}, null, 2)}

Analyze this completed interview and generate a comprehensive performance review.`;

  console.log("📨 Calling Review Agent (Vertex AI / Gemini ADK)...");

  const text = await runGeminiAgent(REVIEW_INSTRUCTIONS, reviewMessage);

  console.log("✅ Vertex Review Agent response received");
  return { success: true, feedback: text };
}

// ─────────────────────────────────────────────
// Provider router — OpenAI (default) or Vertex
// ─────────────────────────────────────────────

const PROVIDER = process.env.AGENT_PROVIDER || "vertex";

export async function callInterviewAgentRouted(params) {
  if (PROVIDER === "vertex") return callInterviewAgentVertex(params);
  return callInterviewAgent(params);
}

export async function callReviewAgentRouted(params) {
  if (PROVIDER === "vertex") return callReviewAgentVertex(params);
  return callReviewAgent(params);
}

// ─────────────────────────────────────────────
// Performance Agent (Agent 3)
// ─────────────────────────────────────────────

export async function callPerformanceAgentVertex({ sessionId, userId, questions, totalTime, interviewType, difficultyFilter }) {
  const performanceMessage = `PERFORMANCE REPORT REQUEST
${JSON.stringify({
  sessionId,
  userId,
  date: new Date().toISOString(),
  questions: questions.map(q => ({
    question_id: q.question_id,
    question_title: q.question_title,
    difficulty: q.difficulty,
    company: q.company,
    topic_tags: q.topic_tags || [],
    score: q.score,
    hints_requested: q.hints_requested || 0,
    time_spent_seconds: q.time_spent_seconds,
    test_runs: q.test_runs || 0,
    submit_runs: q.submit_runs || 0,
    errors: q.errors || []
  })),
  totalTime,
  interviewType,
  difficultyFilter
}, null, 2)}

Generate a detailed performance report following the JSON schema in your instructions.`;

  console.log("📨 Calling Performance Agent (Vertex AI / Gemini ADK)...");

  const text = await runGeminiAgent(PERFORMANCE_INSTRUCTIONS, performanceMessage, false);

  console.log("✅ Vertex Performance Agent response received");

  // Parse JSON response - strip markdown code blocks if present
  try {
    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const reportData = JSON.parse(cleanedText);
    return { success: true, report: reportData };
  } catch (error) {
    console.error("❌ Failed to parse Performance Agent JSON:", error);
    console.error("Raw response:", text);
    throw new Error("Performance Agent returned invalid JSON");
  }
}

export async function callPerformanceAgent({ sessionId, userId, questions, totalTime, interviewType, difficultyFilter }) {
  const performanceMessage = `PERFORMANCE REPORT REQUEST
${JSON.stringify({
  sessionId,
  userId,
  date: new Date().toISOString(),
  questions: questions.map(q => ({
    question_id: q.question_id,
    question_title: q.question_title,
    difficulty: q.difficulty,
    company: q.company,
    topic_tags: q.topic_tags || [],
    score: q.score,
    hints_requested: q.hints_requested || 0,
    time_spent_seconds: q.time_spent_seconds,
    test_runs: q.test_runs || 0,
    submit_runs: q.submit_runs || 0,
    errors: q.errors || []
  })),
  totalTime,
  interviewType,
  difficultyFilter
}, null, 2)}

Generate a detailed performance report following the JSON schema in your instructions.`;

  console.log("📨 Calling Performance Agent (OpenAI Agent Builder)...");

  const performanceAgent = new Agent({
    name: "Performance Agent",
    instructions: PERFORMANCE_INSTRUCTIONS,
    tools: [mcp],
    model: "gpt-5.2",
    enabledHandoffs: [] // Explicitly set empty handoffs to avoid undefined errors
  });

  const runner = new Runner({
    agent: performanceAgent,
    input: performanceMessage,
    store: null // Explicitly set null store to avoid initialization issues
  });

  const result = await runner.run();
  const text = result.output.text;

  console.log("✅ OpenAI Performance Agent response received");

  // Parse JSON response
  try {
    const reportData = JSON.parse(text);
    return { success: true, report: reportData };
  } catch (error) {
    console.error("❌ Failed to parse Performance Agent JSON:", error);
    throw new Error("Performance Agent returned invalid JSON");
  }
}

export async function callPerformanceAgentRouted(params) {
  if (PROVIDER === "vertex") return callPerformanceAgentVertex(params);
  return callPerformanceAgent(params);
}

export default {
  callInterviewAgent,
  callReviewAgent,
  callInterviewAgentVertex,
  callReviewAgentVertex,
  callInterviewAgentRouted,
  callReviewAgentRouted,
  callPerformanceAgent,
  callPerformanceAgentVertex,
  callPerformanceAgentRouted,
};
