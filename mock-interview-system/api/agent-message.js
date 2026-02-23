import { callInterviewAgentRouted } from '../server/agentClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context } = req.body;

    console.log('📨 Agent request:', { message, action: context?.action });

    const agentResponse = await callInterviewAgentRouted({ message, context });
    console.log('✅ Agent response received');

    return res.json({
      type: context?.action === 'test' ? 'test_result' : 'submission_result',
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
