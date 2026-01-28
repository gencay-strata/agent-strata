import { getRandomQuestions, preloadQuestions } from '../server/questionDatabase.js';

// Helper function
function tryParseJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
}

// Preload on cold start
preloadQuestions();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { difficulty, company, language, questionCount = 2 } = req.body;

    const csvFilters = {
      difficulty: difficulty?.toLowerCase(),
      company: company,
      language: language?.toLowerCase(),
      is_premium: false
    };

    const selectedQuestions = getRandomQuestions(csvFilters, questionCount);

    if (selectedQuestions.length === 0) {
      return res.json({ questions: [] });
    }

    const formattedQuestions = selectedQuestions.map(q => ({
      id: q.id,
      slug: q.id,
      title: q.question_short || 'Question',
      question_short: q.question_short,
      description: q.question || 'No description available',
      question: q.question,
      difficulty: q.difficulty,
      company: q.companies || 'N/A',
      companies: q.companies,
      topics: q.job_positions,
      tables: tryParseJSON(q.tables),
      interview_date: q.interview_date,
      solution_postgres: q.solution_postgres,
      solution_mysql: q.solution_mysql,
      solution_python: q.solution_python,
      hints_postgres: q.hints_postgres,
      hints_python: q.hints_python,
      walkthrough_postgres: q.walkthrough_postgres,
      walkthrough_python: q.walkthrough_python,
      is_freemium: q.is_freemium
    }));

    return res.json({ questions: formattedQuestions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({ error: error.message });
  }
}
