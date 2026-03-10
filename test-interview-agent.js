// Test Interview Agent scoring logic
import { callInterviewAgentVertex } from './mock-interview-system/server/agentClient.js';

async function testAgentScoring() {
  console.log('🧪 Testing Interview Agent Scoring Logic\n');

  // Test case: Correct logic, but missing ORDER BY (partial credit test)
  // Question 9728 asks for violation counts by year
  const testCode = `SELECT EXTRACT(YEAR FROM inspection_date) as inspection_year, COUNT(*) as n_violations
FROM sf_restaurant_health_violations
GROUP BY inspection_year`;

  console.log('📝 Submitting partially correct code...\n');
  console.log('Code:', testCode);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const result = await callInterviewAgentVertex({
      message: 'Submit my solution',
      context: {
        action: 'submit',
        code: testCode,
        language: 'sql',
        question_id: 9728
      }
    });

    console.log('✅ Interview Agent Response:\n');
    console.log(result.response);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Extract score from response
    const scoreMatch = result.response.match(/Score:\s*(\d+)\/100/i);
    if (scoreMatch) {
      console.log(`📊 Extracted Score: ${scoreMatch[1]}/100`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAgentScoring();
