import { callPerformanceAgentRouted } from '../server/agentClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      sessionId,
      userId,
      questions,
      totalTime,
      interviewType,
      difficultyFilter
    } = req.body;

    // Validation
    if (!sessionId || !userId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, userId, questions (array)'
      });
    }

    console.log('📨 Performance Agent request:', {
      sessionId,
      userId,
      questionCount: questions.length,
      interviewType
    });

    const performanceResponse = await callPerformanceAgentRouted({
      sessionId,
      userId,
      questions,
      totalTime,
      interviewType,
      difficultyFilter
    });

    console.log('✅ Performance Agent response received');

    return res.json({
      type: 'performance_report',
      sessionId,
      report: performanceResponse.report
    });
  } catch (error) {
    console.error('❌ Performance Agent failed:', error);
    return res.status(500).json({
      type: 'error',
      content: `Performance Agent error: ${error.message}`
    });
  }
}
