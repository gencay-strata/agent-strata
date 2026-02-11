/**
 * OpenAI Agents SDK Client for Interview Agent + Review Agent
 * Uses the actual Agent Builder workflows
 */
import { hostedMcpTool, Agent, Runner, withTrace } from "@openai/agents";

const WORKFLOW_ID = process.env.WORKFLOW_ID || 'wf_69785b59a66081908294851545870e8105ee6027e0451e3f';
const WORKFLOW_ID_REVIEW = process.env.WORKFLOW_ID_REVIEW || 'wf_698c075296008190b107a4b83511206f0fff3039f047fa39';

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
Execute, format results as tables, show errors clearly.

Example:
✅ Code executed (not scored)
| customer_id | orders |
|---|---|
| 100 | 15 |
Execution: 0.23s

### Grade Submissions
Score solution, give feedback WITHOUT revealing answer.

Example (wrong):
❌ Incorrect (Score: 45/100)
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

export default {
  callInterviewAgent,
  callReviewAgent
};
