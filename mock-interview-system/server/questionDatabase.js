import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for loaded questions
let questionsCache = null;

// Read and parse CSV file
function loadQuestions() {
  // Return cached questions if available
  if (questionsCache) {
    console.log('📦 Using cached questions');
    return questionsCache;
  }

  console.log('📂 Loading questions from CSV...');
  const csvPath = path.join(__dirname, 'stratabase.educationalquestion.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  const questions = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = parseCSVLine(lines[i]);
    const question = {};

    headers.forEach((header, index) => {
      question[header] = values[index] || '';
    });

    questions.push(question);
  }

  // Cache the loaded questions
  questionsCache = questions;
  console.log(`✅ Loaded and cached ${questions.length} questions`);

  return questions;
}

// Parse CSV line handling quoted values with commas
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

// Filter questions based on criteria
export function filterQuestions(filters = {}) {
  const allQuestions = loadQuestions();
  console.log(`Total questions loaded: ${allQuestions.length}`);

  if (allQuestions.length > 0) {
    console.log('Sample question:', {
      id: allQuestions[0].id,
      difficulty: allQuestions[0].difficulty,
      companies: allQuestions[0].companies,
      question_short: allQuestions[0].question_short
    });
  }

  let filtered = allQuestions;

  // Filter by difficulty
  if (filters.difficulty) {
    const difficultyMap = {
      'easy': ['1', 'Easy'],
      'medium': ['2', 'Medium'],
      'hard': ['3', 'Hard']
    };

    const targetDifficulties = difficultyMap[filters.difficulty.toLowerCase()] || [];
    console.log('Filtering by difficulty:', filters.difficulty, 'looking for:', targetDifficulties);

    filtered = filtered.filter(q =>
      targetDifficulties.some(d =>
        q.difficulty === d || q.difficulty_level === d
      )
    );

    console.log(`After difficulty filter: ${filtered.length} questions`);
  }

  // Filter by company
  if (filters.company) {
    filtered = filtered.filter(q =>
      q.companies && q.companies.toLowerCase().includes(filters.company.toLowerCase())
    );
    console.log(`After company filter: ${filtered.length} questions`);
  }

  // Filter by language/type
  if (filters.language) {
    const lang = filters.language.toLowerCase();
    console.log('Filtering by language:', lang);

    // Check if question has solution for this language
    if (lang === 'sql') {
      filtered = filtered.filter(q =>
        q.solution_postgres || q.solution_mysql || q.solution_mssql || q.solution_oracle
      );
    } else if (lang === 'python') {
      filtered = filtered.filter(q =>
        q.solution_python || q.solution_pyspark
      );
    } else if (lang === 'r') {
      filtered = filtered.filter(q => q.solution_r);
    }

    console.log(`After language filter: ${filtered.length} questions`);
  }

  // Filter by premium status
  if (filters.is_premium !== undefined) {
    filtered = filtered.filter(q => {
      const isPremium = q.is_premium === 'True' || q.is_premium === '1' || q.is_premium === true;
      return isPremium === filters.is_premium;
    });
  }

  return filtered;
}

// Get random questions from filtered set
export function getRandomQuestions(filters = {}, count = 1) {
  const filtered = filterQuestions(filters);

  if (filtered.length === 0) {
    return [];
  }

  // Shuffle and take requested count
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Preload questions on module import
export function preloadQuestions() {
  loadQuestions();
}

export default {
  filterQuestions,
  getRandomQuestions,
  preloadQuestions
};
