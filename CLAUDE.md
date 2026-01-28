# StrataScratch Mock Interview System

## Project Overview
A full-stack mock interview platform for data science candidates featuring AI-powered code evaluation and real-time feedback using OpenAI Agent Builder.

**📘 For a comprehensive, non-technical overview of the entire project, see [PROJECT_OVERVIEW.md](../PROJECT_OVERVIEW.md)**

This document (CLAUDE.md) contains technical implementation details for developers. For product context, user journey explanations, and accessible descriptions, refer to PROJECT_OVERVIEW.md.

## Architecture

### Tech Stack
- **Frontend**: React + Vite
- **Backend**: Vercel Serverless Functions (deployed)
- **Authentication**: Clerk (modal-based sign-in/sign-up)
- **AI Agent**: OpenAI Agents SDK with GPT-5.2
- **Data Source**: StrataScratch MCP API + Local CSV (413k questions cached)
- **Code Evaluation**: MCP Tools (run_code, check_solution, get_datasets_details)
- **Hosting**: Vercel (https://vercel.com)
- **Repository**: GitHub (https://github.com/gencay-strata/agent-strata)

### Project Structure
```
agent-strata/
├── mock-interview-system/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx                 # Public landing page (StrataScratch-style)
│   │   │   ├── LandingPage.jsx          # Interview setup (protected route)
│   │   │   ├── InterviewSession.jsx     # Main interview UI (protected)
│   │   │   └── Results.jsx              # Post-interview summary (protected)
│   │   ├── components/
│   │   │   ├── CodeEditor.jsx           # Monaco editor
│   │   │   ├── ChatPanel.jsx            # AI chat interface
│   │   │   └── Timer.jsx                # Countdown timer
│   │   ├── services/
│   │   │   └── mcpClient.js             # Backend API client
│   │   └── styles/                      # CSS files
│   ├── api/                             # Vercel serverless functions
│   │   ├── questions.js                 # POST /api/questions
│   │   ├── agent-message.js             # POST /api/agent-message
│   │   ├── run-code.js                  # POST /api/run-code
│   │   ├── check-solution.js            # POST /api/check-solution
│   │   └── dataset-details.js           # POST /api/dataset-details
│   ├── server/
│   │   ├── agentClient.js               # OpenAI Agents SDK client
│   │   ├── questionDatabase.js          # CSV question cache
│   │   └── .env                         # API keys (OPENAI_API_KEY)
│   └── vercel.json                      # Vercel configuration
```

## Key Components

### 1. OpenAI Agent Builder + MCP Integration

**IMPORTANT**: This project uses **OpenAI Agent Builder** as the orchestration layer, which internally connects to the **StrataScratch MCP server** for data access and code execution.

#### Agent Builder Setup
- **Workflow ID**: `wf_69785b59a66081908294851545870e8105ee6027e0451e3f`
- **Access Point**: https://platform.openai.com/playground/agents
- **Workflow Name**: Interview Agent
- **Model**: GPT-5.2 with reasoning (effort: low, summary: auto)
- **Integration Method**: OpenAI Agents SDK (`@openai/agents` v0.4.3)

#### MCP Server Connection
The Agent Builder connects to StrataScratch MCP server via `hostedMcpTool`:

```javascript
const mcp = hostedMcpTool({
  serverLabel: "Strata_Tools",
  serverUrl: "https://api.stratascratch.com/mcp",
  serverDescription: "StrataScratch MCP Tools",
  allowedTools: [
    "check_solution",
    "get_datasets_details",
    "get_educational_questions",
    "run_code"
  ],
  requireApproval: "never"
});
```

#### Architecture Flow
```
Frontend (React)
    ↓ POST /api/agent-message
Vercel Serverless Function
    ↓ callInterviewAgent()
Agent Builder (OpenAI)
    ↓ hostedMcpTool
MCP Server (StrataScratch API)
    ↓ JSON-RPC 2.0
Database + Code Executor
```

#### Available MCP Tools (via Agent)
- `run_code(code, code_type, question_id)` - Test execution (not scored)
- `check_solution(code, code_type, question_id)` - Grade solution
- `get_datasets_details(dataset_name, question_id, code_type)` - Table schemas
- `get_educational_questions(id)` - Question details

#### Response Format
- **Type**: Plain markdown text (NOT JSON)
- **Style**: Tables and emojis (✅ ❌ 💡 ⚠️)
- **Location**: `server/agentClient.js`

#### Critical Design Decision
**Backend does NOT call MCP directly** - all MCP tool access goes through the Agent Builder workflow. This ensures:
- Consistent agent instructions and context
- Proper reasoning and formatting
- Traceability via OpenAI dashboard
- Single source of truth for interview logic

### 2. Question Database
- **Source**: Local CSV file with 413k+ StrataScratch questions
- **Preloaded**: On server startup for instant filtering
- **Filters**: Difficulty, company, language, question count
- **Location**: `server/questionDatabase.js`

### 3. Interview Flow
1. **Home Page (Public)** → StrataScratch-branded landing page
   - Sign In / Sign Up buttons (Clerk modal)
   - "Ace Interview Questions" CTA (navigates to /interview-setup)
   - Stats display (1,000+ questions, 500K+ members)
   - Company logos (FAANG, etc.)
2. **Interview Setup (Protected)** → User selects filters (SQL/Python, difficulty, company, duration)
3. **Interview Session (Protected)** → Questions displayed with:
   - Table schemas (fetched from MCP per question)
   - Sample data
   - Monaco code editor
   - Test/Submit buttons (routed through agent)
   - Chat panel for hints/questions
4. **Results Page (Protected)** → Score breakdown, percentile, time spent, question-by-question analysis

### 4. Test Results Display
- **Location**: Below code editor in InterviewSession
- **Format**: Green/red panel with formatted output
- **Source**: Agent's markdown response (includes tables)
- **CSS**: `styles/InterviewSession.css` (`.test-results-panel`)

## Important Implementation Details

### Agent Integration
- **Backend calls agent**: `POST /api/agent/message` → `callInterviewAgent()`
- **Agent uses MCP internally**: No direct MCP calls from backend
- **Response format**: `{type: 'test_result', content: "markdown text"}`
- **Frontend parsing**: Checks if content is string (agent) vs object (old MCP format)

### Question Schema Fetching
- **First question**: Fetched in `initializeInterview()` after questions load
- **Subsequent questions**: useEffect watches `currentQuestionIndex` changes
- **API**: `POST /api/dataset-details` → MCP `get_datasets_details`
- **Updates**: `questions[index]` state with tables and sample data

### State Management
- **questions**: Array of question objects with schemas
- **currentQuestionIndex**: Tracks active question (triggers schema fetch)
- **testResults**: Stores last test output (shows below editor)
- **submissions**: Array of {questionId, code, result} for final scoring
- **chatMessages**: Agent conversation history

## Critical Rules

### DO ✅
1. Always use agent for Test/Submit (never direct MCP)
2. Fetch table schema when `currentQuestionIndex` changes
3. Display agent responses as plain markdown text
4. Scope Results.css with `.results-container` prefix
5. Check `testResults && testResults.output` before rendering panel
6. Use `VITE_` prefix for environment variables (NOT `NEXT_PUBLIC_`)
7. Protect routes with Clerk's `<SignedIn>` and `<SignedOut>` components
8. Use modal mode for Clerk sign-in/sign-up buttons

### DON'T ❌
1. Don't call MCP directly from frontend
2. Don't parse agent responses as JSON (they're markdown strings)
3. Don't skip schema fetch on question changes
4. Don't let Results.css affect InterviewSession navbar
5. Don't create duplicate test result displays
6. Don't use Express server in production (use Vercel serverless)
7. Don't name serverless functions with slashes (use dashes: agent-message.js not agent/message.js)
8. Don't add NEXT_PUBLIC_ variables to Vercel (this is a Vite project)

## Environment Variables

### Local Development (.env)
```bash
# server/.env
OPENAI_API_KEY=sk-proj-...
WORKFLOW_ID=wf_69785b59a66081908294851545870e8105ee6027e0451e3f
WORKFLOW_VERSION=1

# Frontend (.env in root)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Vercel Production
Set these environment variables in Vercel dashboard:
- `OPENAI_API_KEY` - OpenAI API key for agent access
- `WORKFLOW_ID` - Agent Builder workflow ID
- `WORKFLOW_VERSION` - Workflow version (default: 1)
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key (NOT NEXT_PUBLIC_)

## Running the Project

### Local Development
```bash
# Frontend only (serverless functions run via Vercel CLI if needed)
cd mock-interview-system
npm run dev
```

### Production Deployment (Vercel)
```bash
# Build and deploy
cd mock-interview-system
npm run build
git add . && git commit -m "Your commit message"
git push origin main

# Vercel auto-deploys from GitHub
```

### Testing Serverless Functions Locally
```bash
# Install Vercel CLI
npm i -g vercel

# Run dev server with serverless functions
cd mock-interview-system
vercel dev
```

## Recent Changes & Fixes
1. ✅ Added Results page with score visualization
2. ✅ Fixed navbar CSS conflict (scoped to .results-container)
3. ✅ Added test results panel below code editor
4. ✅ Fixed null check for testResults rendering
5. ✅ Added useEffect to fetch schema on question change
6. ✅ Implemented agent response parsing (string vs object)
7. ✅ Converted Express backend to Vercel serverless functions
8. ✅ Integrated Clerk authentication (modal sign-in/sign-up)
9. ✅ Created public Home page (StrataScratch-branded)
10. ✅ Protected routes (/interview-setup, /interview, /results)
11. ✅ Fixed API endpoint routing (agent-message vs agent/message)
12. ✅ Deployed to Vercel production successfully

## Known Issues & TODOs
- [ ] Chat panel hint/question functionality
- [ ] Real-time score calculation on Results page
- [ ] Export/share results feature
- [ ] Optimize CSV loading for serverless (413k questions may cause cold starts)
- [ ] Add loading states for Clerk authentication
- [ ] Implement user profile/history page

## Agent Instructions Summary
The Interview Agent:
- Executes code with `run_code` tool (shows tables, execution time)
- Grades with `check_solution` tool (score, feedback, hints WITHOUT revealing solution)
- Answers questions about problem requirements (NO code solutions)
- Gives strategic hints when asked (guides thinking, NO direct answers)
- Uses emojis: ✅ ❌ 💡 ⚠️
- Formats output as markdown tables
- NO greetings, jumps straight to results

## MCP API Reference

### Connection Details
- **Base URL**: `https://api.stratascratch.com/mcp`
- **Authentication**: None required
- **Protocol**: JSON-RPC 2.0

### Available MCP Tools

#### 1. `run_code` - Execute Code (Not Scored)
Test code execution without official scoring.

**Parameters**:
- `code` (string): SQL or Python code to execute
- `code_type` (int): 1 = SQL, 2 = Python
- `question_id` (int): Question ID from database

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 123456789,
  "method": "tools/call",
  "params": {
    "name": "run_code",
    "arguments": {
      "code": "SELECT * FROM employees WHERE salary > 50000",
      "code_type": 1,
      "question_id": 2015
    }
  }
}
```

#### 2. `check_solution` - Grade Solution
Official solution evaluation with scoring.

**Parameters**:
- `code` (string): SQL or Python solution
- `code_type` (int): 1 = SQL, 2 = Python
- `question_id` (int): Question ID

**Response Format**: Score, correctness, feedback, hints

#### 3. `get_datasets_details` - Fetch Table Schemas
Retrieve table schemas and sample data for a question.

**Parameters**:
- `dataset_name` (string): Table name (can be empty for auto-detection)
- `question_id` (int): Question ID
- `code_type` (int): 1 = SQL, 2 = Python

**Returns**: Array of tables with columns, types, and sample rows

#### 4. `get_educational_questions` - Fetch Questions
Retrieve question details by ID.

**Parameters**:
- `id` (int): Question ID

## Trello Conversation Context

### Project Background (from conversations.tex)

**Key Stakeholders**:
- **Nathan Rosidi** (@nathanrosidi) - Product Manager, StrataScratch founder
- **Mehmet Gencay Isik** (@mehmetgencayisik) - AI/Agent Developer (me)
- **Anna Balatska** (@annabalatska) - Content/UX Lead
- **Sergey Parkhomenko** (@sergey_at_stratascratch) - Backend/Infrastructure

**Project Timeline**:
- Dec 2025: Initial concept and planning
- Jan 2026: UI mockups approved, agent development started
- Current: V1 implementation with OpenAI Agent Builder

### Feature Requirements

**1. User Filters (Landing Page)**
- **Language**: Python, R, SQL
- **Job Position**: Data Analyst, Data Scientist, Analytics Engineer, Product Analyst, ML Engineer
- **Skill Level**: Junior/Mid/Senior (or Easy/Medium/Hard)
- **Company Specific**: FAANG, specific companies (Premium feature)
- **Interview Type**: Coding, Full Interview (coding + soft skills)
- **Duration**: 30/45/60/90/120 minutes
- **Question Count**: 1-5 questions

**2. Interview Session**
- Time limit: 1 hour (matches Leetcode/Interview Query)
- 2-3 questions per session
- **Test vs Submit**: Separate buttons (Test = practice, Submit = scored)
- Real-time AI interviewer chat
- Code editor with Monaco
- Immediate scoring after each submission
- Avoid questions user has already solved

**3. Assessment & Scoring**
- **Visual Dashboard**: Performance graphs, percentile ranking
- **Text Review**: AI-written feedback per question
  - What was done well
  - What could be improved
  - Specific recommendations
- **Score Types**: Numeric (0-100), percentile, pass/fail

**4. Performance Tracking**
- Historical mock interview results
- Weak areas identification
- Recommended practice questions
- Progress over time

### Platform Decisions

**Why OpenAI Agent Builder?**
- Initially tested both Vertex (Claude API) and OpenAI
- OpenAI Agents SDK chosen for V1
- GPT-5.2 model with reasoning capabilities
- MCP integration for StrataScratch data

**Why MCP Server?**
- Unified data access across agents
- Question retrieval, code execution, solution checking
- Shared between Interview Agent, Review Agent, Performance Agent

**Conversation Style** (Trello Format):
```
@user message

Quoted context or question

Response/decision

Action items or next steps
```

### Design References
- **Inspiration**: Interview Query (IQ), LeetCode (LC)
- **IQ Standouts**: Voice TTS feature, visual assessment dashboard
- **LC Standouts**: Company-specific filters (premium), mock interview types
- **Our Differentiator**: AI-written reviews, top user solutions access, custom question generation

### Version Roadmap

**V1 (Current - DEPLOYED)**:
- ✅ Public home page (StrataScratch-style)
- ✅ Clerk authentication (modal sign-in/sign-up)
- ✅ Interview setup page with filters
- ✅ Interview session with Test/Submit
- ✅ Results page with scoring
- ✅ OpenAI Agent Builder integration
- ✅ MCP server integration
- ✅ Vercel serverless deployment
- ✅ GitHub repository (https://github.com/gencay-strata/agent-strata)

**V2 (Future)**:
- [ ] TTS voice interviewer (like IQ)
- [ ] Data project evaluation
- [ ] Custom question generation
- [ ] Top user solutions analysis
- [ ] Performance tracking dashboard
- [ ] Learning path integration

## OpenAI Agent Builder Setup Guide

### How We Created the Workflow

1. **Access Agent Builder**
   - Navigate to: https://platform.openai.com/playground/agents
   - Click "New Agent" or "New Workflow"

2. **Configure Agent Settings**
   - **Name**: Interview Agent
   - **Model**: GPT-5.2
   - **Reasoning Settings**:
     - Effort: low
     - Summary: auto
   - **Store**: Enabled (for conversation history)

3. **Add MCP Server Connection**
   - Click "Add Tool" → "MCP Server"
   - **Server URL**: `https://api.stratascratch.com/mcp`
   - **Server Label**: Strata_Tools
   - **Authentication**: None required
   - **Description**: StrataScratch MCP Tools
   - **Approval**: Never (auto-approve all calls)

4. **Select MCP Tools**
   Check the following tools to make them available:
   - ✅ check_solution
   - ✅ get_datasets_details
   - ✅ get_educational_questions
   - ✅ run_code

5. **Write Agent Instructions**
   Paste the complete instructions (see `server/agentClient.js` lines 26-88):
   ```
   You support candidates during StrataScratch technical interviews...
   [Full instructions defining Test vs Submit behavior, response formatting, etc.]
   ```

6. **Save and Deploy**
   - Click "Save" to create the workflow
   - Copy the **Workflow ID** (format: `wf_xxxxx...`)
   - This ID is used in the backend: `WORKFLOW_ID=wf_69785b59a66081908294851545870e8105ee6027e0451e3f`

7. **Test in Playground**
   - Use the "Try it" panel to test agent responses
   - Verify MCP tools are being called correctly
   - Check output formatting (markdown tables, emojis)

### Accessing the Workflow

**Option 1: Agent Builder Dashboard**
- URL: https://platform.openai.com/playground/agents
- Find "Interview Agent" in your workflows list
- Click to view/edit configuration

**Option 2: Direct Workflow Link** (if available)
- https://platform.openai.com/playground/agents/wf_69785b59a66081908294851545870e8105ee6027e0451e3f

**Option 3: Via API (Agents SDK)**
- The workflow is accessed programmatically via `Runner` class
- See `server/agentClient.js` for implementation details

### Backend Integration Code

The workflow is called from Express backend using OpenAI Agents SDK:

```javascript
import { hostedMcpTool, Agent, Runner, withTrace } from "@openai/agents";

// Define MCP connection (matches Agent Builder config)
const mcp = hostedMcpTool({
  serverLabel: "Strata_Tools",
  serverUrl: "https://api.stratascratch.com/mcp",
  allowedTools: ["check_solution", "get_datasets_details", "get_educational_questions", "run_code"],
  requireApproval: "never"
});

// Define agent (matches Agent Builder config)
const myAgent = new Agent({
  name: "Interview Agent",
  instructions: `[Same instructions as Agent Builder]`,
  model: "gpt-5.2",
  tools: [mcp],
  modelSettings: {
    reasoning: { effort: "low", summary: "auto" },
    store: true
  }
});

// Execute workflow
export async function callInterviewAgent({ message, context }) {
  const result = await withTrace("Interview", async () => {
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "backend-integration",
        workflow_id: WORKFLOW_ID,
        action: context?.action
      }
    });
    return await runner.run(myAgent, conversationHistory);
  });
  return { success: true, response: result.output_text };
}
```

### Why This Architecture?

**Agent Builder + MCP = Perfect Combination**
- **Agent Builder**: Orchestrates multi-step reasoning, tool selection, response formatting
- **MCP Server**: Provides data access, code execution, solution checking
- **Single Workflow**: All interview logic in one place (not scattered across backend)
- **Visual Debugging**: Agent Builder dashboard shows tool calls, reasoning steps
- **Version Control**: Workflow ID allows rollback if instructions change

**Comparison to Alternatives**:
- ❌ **Direct MCP calls**: No reasoning, no context, raw JSON responses
- ❌ **Backend logic**: Hardcoded if/else, difficult to improve
- ✅ **Agent Builder + MCP**: Best of both worlds

## Contact & Resources
- **Production URL**: [Your Vercel deployment URL]
- **GitHub Repository**: https://github.com/gencay-strata/agent-strata
- **OpenAI Agent Builder**: https://platform.openai.com/playground/agents
- **Our Workflow**: wf_69785b59a66081908294851545870e8105ee6027e0451e3f
- **StrataScratch MCP Docs**: https://api.stratascratch.com/mcp
- **Clerk Dashboard**: https://dashboard.clerk.com
- **Local Project**: /Users/learnai/Desktop/agent-strata
- **Trello Conversations**: /Users/learnai/Desktop/agent-strata/conversations.tex
- **Team Slack**: StrataScratch workspace

## Authentication System (Clerk)

### Setup
- **Provider**: Clerk (https://clerk.com)
- **Integration**: `@clerk/clerk-react` package
- **Sign-in Mode**: Modal (not redirect)
- **Environment Variable**: `VITE_CLERK_PUBLISHABLE_KEY`

### Implementation Details

**App.jsx - Route Protection**
```javascript
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';

<ClerkProvider publishableKey={clerkPubKey}>
  <Router>
    <Routes>
      {/* Public route */}
      <Route path="/" element={<Home />} />

      {/* Protected routes */}
      <Route path="/interview-setup" element={
        <>
          <SignedIn><LandingPage /></SignedIn>
          <SignedOut><RedirectToSignIn /></SignedOut>
        </>
      } />
    </Routes>
  </Router>
</ClerkProvider>
```

**Home.jsx - Conditional UI**
```javascript
import { UserButton, SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/clerk-react';

{/* Show for logged-out users */}
<SignedOut>
  <SignInButton mode="modal">
    <button className="sign-in-btn">Sign In</button>
  </SignInButton>
  <SignUpButton mode="modal">
    <button className="sign-up-btn">Sign Up</button>
  </SignUpButton>
</SignedOut>

{/* Show for logged-in users */}
<SignedIn>
  <UserButton afterSignOutUrl="/" />
</SignedIn>
```

### User Flow
1. **Unauthenticated**: User sees public home page with "Sign In" and "Sign Up" buttons
2. **Click CTA**: "Ace Interview Questions" button navigates to `/interview-setup`
3. **Auth Check**: If not signed in, Clerk shows sign-in modal
4. **Post-Auth**: After signing in, user accesses interview setup and can start practicing

### Configuration in Vercel
Add environment variable in Vercel dashboard:
- Key: `VITE_CLERK_PUBLISHABLE_KEY`
- Value: `pk_test_...` (from Clerk dashboard)
