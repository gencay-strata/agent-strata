import { callInterviewAgentRouted, parseSubmissionScores, callMcpTool, calculateScore } from '../server/agentClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context } = req.body;

    console.log('📨 Agent request:', { message, action: context?.action });

    // Special handling for submission: get OUTPUT score from MCP first, then AI logic eval
    if (context?.action === 'submit') {
      console.log('🎯 SUBMIT action detected - Getting OUTPUT score from MCP...');

      // Step 1: Call MCP check_solution to get OUTPUT score
      const mcpResult = await callMcpTool('check_solution', {
        code: context.code,
        code_type: context.language.toLowerCase() === 'python' ? 2 : 1,
        question_id: parseInt(context.question_id)
      });

      if (mcpResult.isError) {
        throw new Error(`MCP error: ${mcpResult.content[0]?.text || 'Unknown error'}`);
      }

      // Parse MCP response and calculate OUTPUT score
      const mcpData = JSON.parse(mcpResult.content[0].text);
      const outputScore = calculateScore(mcpData);

      console.log(`📊 MCP OUTPUT Score: ${outputScore}/100`);

      // Step 2: Call AI Agent for LOGIC evaluation
      const agentResponse = await callInterviewAgentRouted({ message, context });

      // Step 3: Parse Logic score and calculate final score
      const scores = parseSubmissionScores(agentResponse.response, outputScore);

      console.log(`📊 Final Scores - Logic: ${scores.logicScore}, Output: ${scores.outputScore}, Final: ${scores.finalScore}`);

      // Return structured data with calculated scores
      return res.json({
        type: 'submission_result',
        content: {
          ...scores,
          isCorrect: scores.finalScore >= 90
        }
      });
    }

    // For other actions (test, hint, chat), return response directly
    const agentResponse = await callInterviewAgentRouted({ message, context });
    console.log('✅ Agent response received');

    return res.json({
      type: context?.action === 'test' ? 'test_result' : 'chat_message',
      content: agentResponse.response
    });
  } catch (error) {
    console.error('❌ Agent failed:', error);
    return res.status(500).json({
      type: 'error',
      content: `Agent error: ${error.message}`
    });
  }
}
