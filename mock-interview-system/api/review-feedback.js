import { callReviewAgentRouted } from '../server/agentClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { questions, submissions, filters, timeSpent, totalDuration } = req.body;

    console.log('📨 Review Agent request:', {
      questionCount: questions?.length,
      submissionCount: submissions?.length
    });

    const reviewResponse = await callReviewAgentRouted({
      questions,
      submissions,
      filters,
      timeSpent,
      totalDuration
    });

    console.log('✅ Review Agent response received');

    return res.json({
      type: 'review',
      content: reviewResponse.feedback
    });
  } catch (error) {
    console.error('❌ Review Agent failed:', error);
    return res.status(500).json({
      type: 'error',
      content: `Review Agent error: ${error.message}`
    });
  }
}
