import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRandomQuestions, preloadQuestions } from './questionDatabase.js';
import { callInterviewAgent } from './agentClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const STRATA_MCP_URL = "https://api.stratascratch.com/mcp";

app.use(cors());
app.use(express.json());

// Serve static files from React build (for production)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Helper function to safely parse JSON
function tryParseJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
}

// Preload questions database on server start
console.log('🔄 Preloading questions database...');
preloadQuestions();
console.log('✅ Questions database ready!');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get educational questions
app.post('/api/questions', async (req, res) => {
  try {
    const { difficulty, company, language, questionCount = 2 } = req.body;
    console.log('Fetching questions with filters:', { difficulty, company, language, questionCount });

    // Step 1: Filter questions from local CSV database
    const csvFilters = {
      difficulty: difficulty?.toLowerCase(),
      company: company,
      language: language?.toLowerCase(),
      is_premium: false // Only free questions for now
    };

    const selectedQuestions = getRandomQuestions(csvFilters, questionCount);
    console.log(`Selected ${selectedQuestions.length} questions from CSV:`, selectedQuestions.map(q => q.id));

    if (selectedQuestions.length === 0) {
      return res.json({ questions: [] });
    }

    // Format questions directly from CSV (FAST - no MCP calls!)
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
      interview_date: q.interview_date, // Add interview date for "Last Updated"
      // Include solutions and hints based on language
      solution_postgres: q.solution_postgres,
      solution_mysql: q.solution_mysql,
      solution_python: q.solution_python,
      hints_postgres: q.hints_postgres,
      hints_python: q.hints_python,
      walkthrough_postgres: q.walkthrough_postgres,
      walkthrough_python: q.walkthrough_python,
      is_freemium: q.is_freemium
    }));

    console.log(`✅ Returning ${formattedQuestions.length} questions from CSV (instant!)`);
    return res.json({ questions: formattedQuestions });

    // OLD MCP CODE - Disabled for speed (MCP adds 10+ seconds delay)
    /*
    // Step 2: Fetch full details from MCP for selected question IDs
    const mcpQuestions = [];

    for (const csvQuestion of selectedQuestions) {
      try {
        const payload = {
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "get_educational_questions",
            arguments: {
              id: parseInt(csvQuestion.id)
            }
          }
        };

        console.log('Fetching MCP details for question:', csvQuestion.id);

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
          console.error('MCP error for question', csvQuestion.id, ':', data.error);
          continue;
        }

        // Parse MCP response
        console.log('Raw MCP response for question', csvQuestion.id, ':', JSON.stringify(data, null, 2));
        const content = data.result?.content;
        let questionDetails = null;

        if (Array.isArray(content)) {
          const textContent = content.find(block => block.type === 'text');
          if (textContent) {
            try {
              questionDetails = JSON.parse(textContent.text);
            } catch {
              questionDetails = content[0];
            }
          }
        } else if (typeof content === 'string') {
          try {
            questionDetails = JSON.parse(content);
          } catch {
            questionDetails = null;
          }
        } else if (content && typeof content === 'object') {
          questionDetails = content;
        }

        if (questionDetails) {
          // Merge CSV metadata with MCP details - include tables and other data from CSV
          const mergedQuestion = {
            ...questionDetails,
            id: csvQuestion.id,
            difficulty: csvQuestion.difficulty || questionDetails.difficulty,
            company: csvQuestion.companies || questionDetails.company,
            // Add CSV-specific data
            tables: csvQuestion.tables ? tryParseJSON(csvQuestion.tables) : null,
            question_long: csvQuestion.question || questionDetails.question,
            topics: csvQuestion.topics,
            solution_postgres: csvQuestion.solution_postgres,
            solution_mysql: csvQuestion.solution_mysql,
            solution_python: csvQuestion.solution_python
          };
          console.log('Merged question data:', JSON.stringify(mergedQuestion, null, 2));
          mcpQuestions.push(mergedQuestion);
        } else {
          console.log('No questionDetails parsed for question', csvQuestion.id);
        }
      } catch (error) {
        console.error('Error fetching question', csvQuestion.id, ':', error);
      }
    }

    // If MCP fetch failed, return CSV data as fallback
    if (mcpQuestions.length === 0) {
      console.log('No MCP questions fetched, using CSV fallback');
      const fallbackQuestions = selectedQuestions.map(q => ({
        id: q.id,
        title: q.question_short || 'Question',
        description: q.question || 'No description available',
        difficulty: q.difficulty,
        company: q.companies
      }));
      return res.json({ questions: fallbackQuestions });
    }

    console.log(`Returning ${mcpQuestions.length} MCP questions to frontend`);
    res.json({ questions: mcpQuestions });
    */
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Run code
app.post('/api/run-code', async (req, res) => {
  try {
    const { code, language, question_id } = req.body;

    // Map language string to code_type integer: 1 = SQL, 2 = Python
    const codeTypeInt = language.toLowerCase() === 'python' ? 2 : 1;

    const payload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "run_code",
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
      return res.status(400).json({ error: data.error.message || "Failed to run code" });
    }

    res.json(data.result?.content || {});
  } catch (error) {
    console.error("Error running code:", error);
    res.status(500).json({ error: error.message });
  }
});

// Check solution
app.post('/api/check-solution', async (req, res) => {
  try {
    const { code, question_id, language } = req.body;

    // Map language string to code_type integer: 1 = SQL, 2 = Python
    const codeTypeInt = language.toLowerCase() === 'python' ? 2 : 1;

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

    res.json(data.result?.content || {});
  } catch (error) {
    console.error("Error checking solution:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get dataset details (table schema and sample data)
app.post('/api/dataset-details', async (req, res) => {
  try {
    const { dataset_name, question_id, code_type } = req.body;

    // Map code_type string to integer: 1 = SQL, 2 = Python
    const codeTypeInt = code_type === 'python' ? 2 : 1;

    const payload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "get_datasets_details",
        arguments: {
          question_id: parseInt(question_id) || 0,
          code_type: codeTypeInt,
          dataset_name
        }
      }
    };

    console.log(`📡 Fetching dataset details for: ${dataset_name} (question_id: ${question_id}, code_type: ${codeTypeInt})`);

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
      return res.status(400).json({ error: data.error.message || "Failed to get dataset details" });
    }

    console.log(`✅ Received dataset details:`, data.result);
    res.json(data.result?.content || {});
  } catch (error) {
    console.error("Error fetching dataset details:", error);
    res.status(500).json({ error: error.message });
  }
});

// Agent communication endpoint
app.post('/api/agent/message', async (req, res) => {
  try {
    const { message, context } = req.body;
    // context includes: question_id, code, language, action (test/submit/hint/question)

    console.log('📨 Agent request:', { message, action: context?.action });

    // Call Interview Agent (Agents SDK with MCP tools)
    try {
      console.log('🤖 Calling Interview Agent via Agents SDK...');
      const agentResponse = await callInterviewAgent({ message, context });
      console.log('✅ Agent response received');

      // Agent handles MCP internally and returns formatted text
      return res.json({
        type: context?.action === 'test' ? 'test_result' : 'submission_result',
        content: agentResponse.response
      });
    } catch (agentError) {
      console.error('❌ Agent failed:', agentError);
      return res.status(500).json({
        type: 'error',
        content: `Agent error: ${agentError.message}`
      });
    }

    // OPTION 2: Direct MCP Call (FALLBACK)
    if (context?.action === 'test') {
      // Direct MCP call for testing
      const codeTypeInt = context.language.toLowerCase() === 'python' ? 2 : 1;

      const payload = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "run_code",
          arguments: {
            code: context.code,
            code_type: codeTypeInt,
            question_id: parseInt(context.question_id)
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
        return res.json({
          type: 'error',
          content: `❌ Error: ${data.error.message || 'Failed to execute code'}`
        });
      }

      // Parse MCP response
      const mcpContent = data.result?.content;
      let parsedResult = null;

      if (Array.isArray(mcpContent)) {
        const textContent = mcpContent.find(block => block.type === 'text');
        if (textContent) {
          try {
            parsedResult = JSON.parse(textContent.text);
          } catch (e) {
            parsedResult = textContent.text;
          }
        }
      }

      return res.json({
        type: 'test_result',
        content: parsedResult || mcpContent
      });
    }

    if (context?.action === 'submit') {
      // Agent calls check_solution tool via MCP
      const codeTypeInt = context.language.toLowerCase() === 'python' ? 2 : 1;

      const payload = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "check_solution",
          arguments: {
            code: context.code,
            code_type: codeTypeInt,
            question_id: parseInt(context.question_id)
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
        return res.json({
          type: 'error',
          content: `❌ Error: ${data.error.message || 'Failed to check solution'}`
        });
      }

      // Parse MCP response
      const mcpContent = data.result?.content;
      let parsedResult = null;

      if (Array.isArray(mcpContent)) {
        const textContent = mcpContent.find(block => block.type === 'text');
        if (textContent) {
          try {
            parsedResult = JSON.parse(textContent.text);
          } catch (e) {
            parsedResult = textContent.text;
          }
        }
      }

      return res.json({
        type: 'submission_result',
        content: parsedResult || mcpContent
      });
    }

    // For hints and questions, agent would use its knowledge + context
    // This will be handled by Vertex AI Agent directly
    res.json({
      type: 'agent_response',
      content: 'Agent integration ready. Please configure Vertex AI Agent.'
    });

  } catch (error) {
    console.error("Error in agent communication:", error);
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 MCP Backend Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${distPath}`);
});
