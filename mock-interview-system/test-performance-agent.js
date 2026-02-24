/**
 * Test script for Performance Agent (Agent 3)
 *
 * Run: node test-performance-agent.js
 *
 * This sends sample interview data to the Performance Agent
 * and prints the generated report.
 */

const sampleInterviewData = {
  sessionId: "test_session_" + Date.now(),
  userId: "test_user_123",
  questions: [
    {
      question_id: 9728,
      question_title: "Acceptance Rate By Date",
      difficulty: "Medium",
      company: "Meta",
      topic_tags: ["SQL", "Joins", "Self-Join", "Date Functions"],
      score: 60,
      hints_requested: 3,
      time_spent_seconds: 450, // 7.5 minutes
      test_runs: 5,
      submit_runs: 2,
      errors: [
        "Missing WHERE clause in date filtering",
        "Incorrect JOIN type (used LEFT JOIN instead of INNER JOIN)",
        "Self-join condition missing table alias"
      ]
    },
    {
      question_id: 9729,
      question_title: "Finding Updated Records",
      difficulty: "Easy",
      company: "Amazon",
      topic_tags: ["SQL", "Filtering", "WHERE Clause"],
      score: 100,
      hints_requested: 0,
      time_spent_seconds: 180, // 3 minutes
      test_runs: 2,
      submit_runs: 1,
      errors: []
    },
    {
      question_id: 10015,
      question_title: "Ranking Most Active Guests",
      difficulty: "Medium",
      company: "Airbnb",
      topic_tags: ["SQL", "Window Functions", "RANK", "Aggregation"],
      score: 55,
      hints_requested: 4,
      time_spent_seconds: 600, // 10 minutes
      test_runs: 7,
      submit_runs: 3,
      errors: [
        "RANK() function syntax error",
        "Missing PARTITION BY clause",
        "Incorrect ORDER BY direction"
      ]
    }
  ],
  totalTime: 1230, // 20.5 minutes total
  interviewType: "SQL",
  difficultyFilter: "Medium"
};

async function testPerformanceAgent() {
  try {
    console.log('🧪 Testing Performance Agent...\n');
    console.log('📤 Sending request to /api/performance-report\n');

    const response = await fetch('http://localhost:3000/api/performance-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleInterviewData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log('✅ Performance Agent response received!\n');
    console.log('📊 REPORT DATA:\n');
    console.log(JSON.stringify(result.report, null, 2));

    console.log('\n\n─────────────────────────────────────────');
    console.log('📈 SUMMARY:');
    console.log('─────────────────────────────────────────');
    console.log(`Overall Score: ${result.report.reportData.overallScore.score}/100`);
    console.log(`Percentile: ${result.report.reportData.overallScore.percentile}th`);
    console.log(`Questions Passed: ${result.report.reportData.overallScore.passedQuestions}/${result.report.reportData.overallScore.totalQuestions}`);
    console.log(`\nWeak Areas: ${result.report.reportData.weakAreas.length}`);
    result.report.reportData.weakAreas.forEach(area => {
      console.log(`  - ${area.topicFamily} (avg score: ${area.averageScore})`);
    });
    console.log(`\nRecommended Questions: ${result.report.reportData.recommendedQuestions.reduce((sum, group) => sum + group.questions.length, 0)}`);
    console.log(`\nNext Action: ${result.report.reportData.nextActionCTA.primaryAction.text}`);
    console.log(`  → ${result.report.reportData.nextActionCTA.primaryAction.questionTitle}`);
    console.log(`\nEncouragement: "${result.report.reportData.encouragementMessage}"`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPerformanceAgent();
}

export { testPerformanceAgent, sampleInterviewData };
