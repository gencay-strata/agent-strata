import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import ChatPanel from '../components/ChatPanel';
import Timer from '../components/Timer';
import mcpClient from '../services/mcpClient';
import { Play, Send, CheckCircle } from 'lucide-react';
import '../styles/InterviewSession.css';

const InterviewSession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { filters } = location.state || {};

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [code, setCode] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(filters?.duration * 60 || 3600);

  useEffect(() => {
    if (!filters) {
      navigate('/');
      return;
    }
    initializeInterview();
  }, [filters]);

  // Fetch table schema when question changes
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion && currentQuestion.id) {
        console.log(`🔄 Question changed to index ${currentQuestionIndex}, fetching schema for question ${currentQuestion.id}`);
        fetchTableSchemaFromMCP(currentQuestion.id, currentQuestionIndex);
      }
    }
  }, [currentQuestionIndex]);

  const initializeInterview = async () => {
    setIsLoading(true);
    console.log('🚀 Initializing interview with filters:', filters);

    try {
      // Fetch questions based on filters
      console.log('📡 Fetching questions from backend...');
      const fetchedQuestions = await mcpClient.getEducationalQuestions({
        difficulty: filters.skillLevel.toLowerCase(),
        company: filters.company || undefined,
        language: filters.language,
        questionCount: filters.questionCount
      });

      console.log('✅ Fetched questions:', fetchedQuestions);

      // Parse questions (already filtered and limited by backend)
      const parsedQuestions = parseQuestions(fetchedQuestions);
      const selectedQuestions = parsedQuestions;

      console.log('✅ Parsed questions:', selectedQuestions);

      // Set questions first (without schema)
      setQuestions(selectedQuestions);

      // Fetch real table schema and sample data from MCP for the first question
      if (selectedQuestions.length > 0) {
        console.log('🔄 Fetching table schema from MCP for first question...', selectedQuestions[0].id);
        // Delay slightly to ensure state is set
        setTimeout(() => {
          fetchTableSchemaFromMCP(selectedQuestions[0].id, 0);
        }, 100);
      }

      // Initialize chat with first question
      if (selectedQuestions.length > 0) {
        console.log('✅ Setting up chat with first question');
        const welcomeMessage = {
          role: 'assistant',
          content: `Welcome to your ${filters.skillLevel} ${filters.language} interview for ${filters.jobPosition}!\n\nYou have ${filters.duration} minutes to complete ${filters.questionCount} question(s).\n\nLet's begin with Question 1:\n\n**${selectedQuestions[0].title}**\n\n${selectedQuestions[0].description}\n\nFeel free to ask clarifying questions before you start coding!`,
          timestamp: new Date()
        };
        setChatMessages([welcomeMessage]);
        console.log('✅ Interview initialized successfully!');
      } else {
        console.error('❌ No questions found!');
      }
    } catch (error) {
      console.error('❌ Failed to initialize interview:', error);
      console.error('Error details:', error.message, error.stack);
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, there was an error loading the interview questions: ${error.message}. Please try again.`,
        timestamp: new Date()
      };
      setChatMessages([errorMessage]);
      // Set a dummy question so we don't stay on loading screen
      setQuestions([{
        id: 'error',
        title: 'Error Loading Questions',
        description: error.message,
        difficulty: 'medium',
        company: 'N/A'
      }]);
    } finally {
      console.log('🏁 Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const parseQuestions = (rawQuestions) => {
    console.log('Parsing questions:', rawQuestions);

    // Parse the MCP response format
    if (Array.isArray(rawQuestions)) {
      return rawQuestions.map(q => {
        console.log('Raw question object:', q);

        // Handle different question formats
        const question = {
          id: q.id || q.question_id || q.ID || 'unknown',
          title: q.title || q.question_title || q.name || q.Title || q.question_short || 'Untitled Question',
          description: q.description || q.question || q.Question || q.question_text || q.body || 'No description available',
          difficulty: q.difficulty || q.difficulty_level || q.Difficulty || filters.skillLevel,
          company: q.company || q.companies || q.Company || filters.company,
          topic: q.topic || q.topics || q.category,
          language: filters.language.toLowerCase(),
          tables: q.tables || q.table_schema || q.schema,
          sample_data: q.sample_data || q.sampleData || q.sample_output,
          table_schema: q.table_schema || q.tables?.[0],
          solution: q.solution || q.answer,
          hints: q.hints || q.hint
        };

        console.log('Parsed question:', question);
        return question;
      });
    }

    console.log('No questions to parse');
    return [];
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage = {
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      // Simple AI response for clarifying questions
      // In a full implementation, you'd use Claude API here
      const response = generateAIResponse(userInput, questions[currentQuestionIndex]);

      const aiMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch table schema and sample data from MCP using get_datasets_details
  const fetchTableSchemaFromMCP = async (questionId, questionIndex) => {
    try {
      const question = questions[questionIndex];

      console.log(`📡 Fetching MCP dataset details for question ${questionId}...`);

      // Call MCP with question_id (it will return the correct datasets)
      const response = await fetch('http://localhost:3001/api/dataset-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_name: '', // Not used, question_id determines the dataset
          question_id: questionId,
          code_type: filters?.language || 'sql'
        })
      });

      const data = await response.json();
      console.log(`✅ Dataset details received:`, data);

      // Parse MCP response
      let parsedData = null;
      if (Array.isArray(data)) {
        const textContent = data.find(block => block.type === 'text');
        if (textContent) {
          try {
            parsedData = JSON.parse(textContent.text);
          } catch (e) {
            console.error('Failed to parse dataset details:', e);
            return;
          }
        }
      }

      if (!parsedData || !parsedData.datasets) {
        console.log('No datasets found in MCP response');
        return;
      }

      // Format tables with schema from MCP
      const formattedTables = parsedData.datasets.map(dataset => ({
        name: dataset.name,
        columns: dataset.columns || []
      }));

      console.log('✅ Formatted tables:', formattedTables);

      // Generate sample data based on first table's schema
      let sampleData = [];
      if (formattedTables.length > 0 && formattedTables[0].columns) {
        const firstTable = formattedTables[0];
        // Create 3 rows of sample data
        for (let i = 1; i <= 3; i++) {
          const row = {};
          firstTable.columns.forEach(col => {
            // Generate dummy data based on type
            if (col.type.includes('int') || col.type.includes('bigint')) {
              row[col.name] = i * 100;
            } else if (col.type.includes('date')) {
              row[col.name] = `2024-01-${String(i).padStart(2, '0')}`;
            } else if (col.type.includes('boolean')) {
              row[col.name] = i % 2 === 0 ? 'true' : 'false';
            } else {
              row[col.name] = `sample_${i}`;
            }
          });
          sampleData.push(row);
        }
      }

      console.log('✅ Generated sample data:', sampleData);

      // Update question with MCP data
      if (formattedTables.length > 0) {
        setQuestions(prev => {
          const updated = [...prev];
          updated[questionIndex] = {
            ...updated[questionIndex],
            tables: formattedTables,
            sample_data: sampleData.length > 0 ? sampleData : updated[questionIndex].sample_data
          };
          return updated;
        });
        console.log('✅ Updated question with MCP dataset details and sample data');
      }
    } catch (error) {
      console.error('❌ Failed to fetch MCP dataset details:', error);
    }
  };

  const renderTableSchema = (tables) => {
    if (!tables) return null;

    // Handle different table schema formats
    const tableArray = Array.isArray(tables) ? tables : [tables];

    return tableArray.map((table, idx) => (
      <div key={idx} className="table-schema">
        <h4>📋 Table Schema: {table.name || table.table_name || `Table ${idx + 1}`}</h4>
        <table className="schema-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {table.columns?.map((col, cidx) => (
              <tr key={cidx}>
                <td><code>{col.name || col.column_name}</code></td>
                <td><span className="type-badge">{col.type || col.data_type}</span></td>
              </tr>
            )) || Object.entries(table.schema || {}).map(([colName, colType]) => (
              <tr key={colName}>
                <td><code>{colName}</code></td>
                <td><span className="type-badge">{colType}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ));
  };

  const generateAIResponse = (userQuestion, currentQuestion) => {
    // Simple keyword-based responses
    const lowerQuestion = userQuestion.toLowerCase();

    if (lowerQuestion.includes('hint') || lowerQuestion.includes('help')) {
      return `Here's a hint: Think about how you would ${currentQuestion.language === 'sql' ? 'join tables and filter data' : 'iterate through the data structure'}. Break down the problem step by step.`;
    }

    if (lowerQuestion.includes('clarif') || lowerQuestion.includes('what')) {
      return `Good question! ${currentQuestion.description}\n\nThe key is to focus on ${currentQuestion.language === 'sql' ? 'writing efficient queries' : 'optimizing your algorithm'}. Let me know if you need more details about any specific part.`;
    }

    if (lowerQuestion.includes('time') || lowerQuestion.includes('long')) {
      return `Take your time to think through the solution. You have ${Math.floor(timeRemaining / 60)} minutes remaining. Quality matters more than speed!`;
    }

    return `That's a great question! For this problem, consider the requirements carefully. ${currentQuestion.description}\n\nFeel free to start coding when you're ready, or ask more questions if needed.`;
  };

  const handleTestCode = async () => {
    if (!code.trim()) {
      alert('Please write some code first!');
      return;
    }

    setIsLoading(true);
    setTestResults(null);

    try {
      // Use agent for test execution
      const result = await mcpClient.sendAgentMessage({
        message: 'Test my code',
        context: {
          action: 'test',
          code,
          language: filters.language.toLowerCase(),
          question_id: questions[currentQuestionIndex].id
        }
      });

      console.log('🧪 Raw test result from backend:', result);

      // Backend returns: {type: 'test_result', content: {...}}
      let parsedData = null;

      if (result.type === 'test_result' && result.content) {
        parsedData = result.content;
      } else if (Array.isArray(result)) {
        // Old MCP format fallback
        const textContent = result.find(block => block.type === 'text');
        if (textContent) {
          try {
            parsedData = JSON.parse(textContent.text);
          } catch (e) {
            parsedData = { error: textContent.text };
          }
        }
      }

      console.log('✅ Parsed test data:', parsedData);

      // Agent returns formatted markdown text directly
      // Check if it's a string (agent response) or object (old MCP format)
      const isAgentResponse = typeof parsedData === 'string';

      if (isAgentResponse) {
        // Agent already formatted the response - use it directly
        const testMessage = {
          role: 'assistant',
          content: parsedData,
          timestamp: new Date()
        };

        setChatMessages(prev => [...prev, testMessage]);

        // Set test results for UI state
        const hasError = parsedData.includes('❌') || parsedData.toLowerCase().includes('error');
        setTestResults({
          success: !hasError,
          output: parsedData,
          error: hasError ? 'Code execution failed' : null,
          message: hasError ? '❌ Error running code' : '✅ Code executed successfully!'
        });
      } else {
        // Old MCP format fallback (structured data)
        const success = parsedData && !parsedData.error;

        setTestResults({
          success: success,
          output: parsedData ? JSON.stringify(parsedData, null, 2) : 'No output',
          error: parsedData?.error,
          message: success ? '✅ Code executed successfully! (Not scored yet)' : '❌ Error running code'
        });

        // Format output for display
        let formattedOutput = '';
        if (parsedData && parsedData.results) {
          // Format as table if we have structured results
          const { columns, data } = parsedData.results;
          formattedOutput = `✅ **Code executed successfully!** (Not scored yet)\n\n**Query Results:**\n\n`;
          formattedOutput += `| ${columns.join(' | ')} |\n`;
          formattedOutput += `| ${columns.map(() => '---').join(' | ')} |\n`;
          data.forEach(row => {
            formattedOutput += `| ${row.join(' | ')} |\n`;
          });
          formattedOutput += `\n⏱️ **Execution time:** ${parsedData.execution_time?.toFixed(4)}s`;
        } else if (parsedData && parsedData.error) {
          formattedOutput = `❌ **Error running code:**\n\n\`\`\`\n${parsedData.error}\n\`\`\``;
        } else {
          formattedOutput = `\`\`\`json\n${JSON.stringify(parsedData, null, 2)}\n\`\`\``;
        }

        const testMessage = {
          role: 'assistant',
          content: `${formattedOutput}\n\n💡 This was a test run only. Click **Submit** when you're ready for official evaluation.`,
          timestamp: new Date()
        };

        setChatMessages(prev => [...prev, testMessage]);
      }
    } catch (error) {
      console.error('❌ Test error:', error);
      setTestResults({
        success: false,
        error: error.message,
        message: 'Error running code'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!code.trim()) {
      alert('Please write some code first!');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to submit this solution? It will be officially scored.');
    if (!confirmed) return;

    setIsLoading(true);

    try {
      // Use agent for solution submission
      const result = await mcpClient.sendAgentMessage({
        message: 'Submit my solution',
        context: {
          action: 'submit',
          code,
          language: filters.language.toLowerCase(),
          question_id: questions[currentQuestionIndex].id
        }
      });

      console.log('📝 Raw submission result from backend:', result);

      // Backend returns: {type: 'submission_result', content: ...}
      let agentResponse = null;

      if (result.type === 'submission_result' && result.content) {
        agentResponse = result.content;
      } else if (Array.isArray(result)) {
        // Old MCP format fallback
        const textContent = result.find(block => block.type === 'text');
        if (textContent) {
          try {
            agentResponse = JSON.parse(textContent.text);
          } catch (e) {
            agentResponse = textContent.text;
          }
        }
      }

      console.log('✅ Agent response:', agentResponse);

      // Check if agent response is a string (formatted text) or object (structured data)
      const isAgentText = typeof agentResponse === 'string';

      if (isAgentText) {
        // Agent returned formatted markdown text - use it directly
        const resultMessage = {
          role: 'assistant',
          content: agentResponse,
          timestamp: new Date()
        };

        setChatMessages(prev => [...prev, resultMessage]);

        // Try to determine if solution was correct from agent's response
        const isCorrect = agentResponse.includes('✅') &&
                         (agentResponse.includes('Perfect') ||
                          agentResponse.includes('Correct') ||
                          agentResponse.includes('100/100'));

        const submission = {
          questionId: questions[currentQuestionIndex].id,
          code,
          result: { feedback: agentResponse, correct: isCorrect },
          timestamp: new Date()
        };

        setSubmissions(prev => [...prev, submission]);

        // Move to next question if correct
        if (isCorrect && currentQuestionIndex < questions.length - 1) {
          setTimeout(() => moveToNextQuestion(), 2000);
        } else if (currentQuestionIndex >= questions.length - 1) {
          // Interview complete
          setTimeout(() => {
            navigate('/results', {
              state: {
                filters,
                questions,
                submissions: [...submissions, submission],
                timeSpent: (filters.duration * 60) - timeRemaining
              }
            });
          }, 3000);
        }
      } else {
        // Old MCP structured format fallback
        const parsedResult = agentResponse || {
          feedback: 'Error: Could not parse submission result',
          correct: false
        };

        const submission = {
          questionId: questions[currentQuestionIndex].id,
          code,
          result: parsedResult,
          timestamp: new Date()
        };

        setSubmissions(prev => [...prev, submission]);

        const resultMessage = {
          role: 'assistant',
          content: `**Submission Result:**\n\n${parsedResult.correct ? '✅ Correct!' : '❌ Incorrect'}\n\n${parsedResult.feedback || parsedResult.message || ''}\n\n${currentQuestionIndex < questions.length - 1 ? "Ready for the next question? Let me know!" : "You've completed all questions! Great work!"}`,
          timestamp: new Date()
        };

        setChatMessages(prev => [...prev, resultMessage]);

        // Move to next question if available
        if (parsedResult.correct && currentQuestionIndex < questions.length - 1) {
          setTimeout(() => moveToNextQuestion(), 2000);
        } else if (currentQuestionIndex >= questions.length - 1) {
          // Interview complete
          setTimeout(() => {
            navigate('/results', {
              state: {
                filters,
                questions,
                submissions: [...submissions, submission],
                timeSpent: (filters.duration * 60) - timeRemaining
              }
            });
          }, 3000);
        }
      }
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Error checking solution: ${error.message}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const moveToNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setCode('');
    setTestResults(null);

    const nextQuestionMessage = {
      role: 'assistant',
      content: `Great! Let's move to Question ${nextIndex + 1}:\n\n**${questions[nextIndex].title}**\n\n${questions[nextIndex].description}`,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, nextQuestionMessage]);
  };

  const handleTimeUp = () => {
    alert('Time is up! Submitting your interview...');
    navigate('/results', {
      state: {
        filters,
        questions,
        submissions,
        timeSpent: filters.duration * 60
      }
    });
  };

  if (!filters || questions.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading interview questions...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="interview-container">
      {/* StrataScratch Navigation Bar (Non-interactive) */}
      <div className="strata-navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <span className="strata-logo">stratascratch</span>
            <nav className="navbar-links">
              <span>Coding Questions</span>
              <span>Non-coding Questions</span>
              <span>Data Projects</span>
              <span>Tools</span>
              <span>Guides</span>
            </nav>
          </div>
          <div className="navbar-right">
            <span>Login</span>
            <span className="register-btn">Register</span>
          </div>
        </div>
      </div>

      {/* Interview Progress Bar */}
      <header className="interview-header">
        <div className="header-left">
          <span className="question-progress">Question {currentQuestionIndex + 1} of {questions.length}</span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="header-right">
          <Timer
            initialTime={timeRemaining}
            onTimeUp={handleTimeUp}
            onTick={setTimeRemaining}
          />
          <button className="end-interview-btn">End Interview</button>
        </div>
      </header>

      <div className="interview-content">
        {/* Left Panel - Question Details */}
        <div className="question-panel">
          <div className="question-details">
            {/* Question Title */}
            <h1 className="question-title-main">{currentQuestion.title}</h1>

            {/* Metadata: Last Updated, Difficulty, ID */}
            <div className="question-metadata">
              <span className="last-updated">
                Last Updated: {currentQuestion.interview_date || 'January 2026'}
              </span>
              <span className="difficulty-badge-inline">
                <span className="difficulty-icon">▼</span> {currentQuestion.difficulty === '2' ? 'Medium' : currentQuestion.difficulty === '1' ? 'Easy' : 'Hard'}
              </span>
              <span className="question-id">ID {currentQuestion.id}</span>
              <div className="like-dislike">
                <button className="like-btn">👍 337</button>
                <button className="dislike-btn">👎</button>
              </div>
            </div>

            {/* Question Description */}
            <div className="question-description">
              <p>{currentQuestion.description}</p>
            </div>

            {/* Badges: Company, Topics */}
            <div className="question-meta">
              <span className="company-badge">{currentQuestion.company || 'Google'}</span>
              <span className="topic-badge">{currentQuestion.topic || 'Window Functions'}</span>
            </div>

            {/* Table Schema */}
            {currentQuestion.tables && renderTableSchema(currentQuestion.tables)}
            {currentQuestion.table_schema && !currentQuestion.tables && (
              <div className="table-schema">
                <h4>📋 Table Schema: {currentQuestion.table_schema.name || 'employees'}</h4>
                <table className="schema-table">
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(currentQuestion.table_schema.columns || {}).map(([col, type]) => (
                      <tr key={col}>
                        <td><code>{col}</code></td>
                        <td><span className="type-badge">{type}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sample Data */}
            {currentQuestion.sample_data && (
              <div className="sample-data">
                <h4>Sample Data:</h4>
                <table>
                  <thead>
                    <tr>
                      {Object.keys(currentQuestion.sample_data[0] || {}).map(key => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentQuestion.sample_data.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val, vidx) => (
                          <td key={vidx}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Hint Button */}
            <div className="question-footer">
              <button className="hint-btn">
                <span>💡</span> Need a hint?
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="code-panel">
          <div className="code-header">
            <div className="language-selector">
              <span className="language-label">{filters.language}</span>
            </div>
            <div className="code-actions">
              <button
                onClick={handleTestCode}
                disabled={isLoading}
                className="btn-test"
              >
                <Play size={18} />
                Test
              </button>
              <button
                onClick={handleSubmitCode}
                disabled={isLoading}
                className="btn-submit"
              >
                <CheckCircle size={18} />
                Submit
              </button>
            </div>
          </div>

          <CodeEditor
            code={code}
            onChange={setCode}
            language={filters.language.toLowerCase()}
          />

          {/* Test Results Display */}
          {testResults && testResults.output && (
            <div className={`test-results-panel ${testResults.success ? 'success' : 'error'}`}>
              <div className="results-header">
                <span className="results-icon">
                  {testResults.success ? '✅' : '❌'}
                </span>
                <span className="results-title">
                  {testResults.message || 'Test Results'}
                </span>
              </div>
              <div className="results-content">
                <pre>{testResults.output}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewSession;
