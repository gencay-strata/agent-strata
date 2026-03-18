import fetch from 'node-fetch';
import { callInterviewAgentRouted } from '../server/agentClient.js';

const STRATA_MCP_URL = "https://api.stratascratch.com/mcp";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, question_id, language, question_title } = req.body;
    const codeTypeInt = language.toLowerCase() === 'python' ? 2 : 1;

    // Step 1: Get output score from MCP (25% weight)
    const payload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "check_solution",
        arguments: {
          code,
          code_type: codeTypeInt,
          question_id: parseInt(question_id)
        }
      }
    };

    const response = await fetch(STRATA_MCP_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json",
        "User-Agent": "StrataScratch-MockInterview/1.0"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message || "Failed to check solution" });
    }

    const mcpResult = data.result?.content || {};

    // Parse MCP response to get output correctness
    let outputScore = 0;
    let isCorrect = false;

    if (mcpResult.length > 0 && mcpResult[0]?.text) {
      try {
        const parsedResult = JSON.parse(mcpResult[0].text);
        isCorrect = parsedResult.is_correct || false;
        // If correct, output score is 100, otherwise calculate based on MCP data
        outputScore = isCorrect ? 100 : 50; // Simplified for now, can be refined
      } catch (e) {
        console.error('Failed to parse MCP result:', e);
      }
    }

    // Step 2: Get logic evaluation from AI agent (75% weight)
    const logicEvalMessage = `LOGIC EVALUATION REQUEST

Question: ${question_title || `ID ${question_id}`}
Language: ${language}

User's Code:
\`\`\`${language}
${code}
\`\`\`

Output Correctness Score (from MCP): ${outputScore}/100 ${isCorrect ? '✅ Correct result' : '❌ Incorrect result'}

Your task: Evaluate the CODE LOGIC and provide:
1. Logic Score: 0-100 (based on approach, efficiency, code quality)
2. Logic Explanation: What did they do well? What needs improvement?

Focus on:
- Problem-solving approach
- Code structure and readability
- Algorithm efficiency
- Edge case handling
- SQL/Python best practices

Return in this format:
Logic Score: [0-100]
Explanation: [detailed feedback]`;

    console.log('📨 Requesting logic evaluation from AI agent...');

    const logicResult = await callInterviewAgentRouted({
      message: logicEvalMessage,
      context: { action: 'logic_eval', question_id, language }
    });

    // Parse AI response to extract logic score and explanation
    let logicScore = 75; // Default fallback
    let logicExplanation = logicResult.response || 'Code logic evaluation completed.';

    // Try to extract score from response (format: "Logic Score: 85")
    const scoreMatch = logicResult.response?.match(/Logic Score:\s*(\d+)/i);
    if (scoreMatch) {
      logicScore = parseInt(scoreMatch[1]);
    }

    // Step 3: Combine scores (75% logic + 25% output)
    const finalScore = Math.round((logicScore * 0.75) + (outputScore * 0.25));

    console.log(`📊 Scores - Logic: ${logicScore}, Output: ${outputScore}, Final: ${finalScore}`);

    // Step 4: Return detailed breakdown
    return res.json({
      finalScore,
      logicScore,
      logicExplanation,
      outputScore,
      outputExplanation: isCorrect
        ? '✅ Output matches expected result perfectly'
        : '❌ Output does not match expected result',
      isCorrect,
      mcpResult // Include original MCP data for debugging
    });

  } catch (error) {
    console.error("Error checking solution:", error);
    return res.status(500).json({ error: error.message });
  }
}
