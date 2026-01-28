# StrataScratch Mock Interview System - Project Overview

## What We Built

We created a **full-featured mock interview platform** where data science candidates can practice coding interviews with an AI interviewer. Think of it like LeetCode or Interview Query, but specifically for StrataScratch questions with built-in AI assistance.

---

## The Complete User Journey

### 1. **Landing Page** (Home Screen)
When users arrive, they see a clean interface where they can customize their interview:

- **Choose a programming language**: SQL, Python, or R
- **Select their role**: Data Analyst, Data Scientist, ML Engineer, etc.
- **Pick difficulty level**: Easy, Medium, or Hard
- **Set time limit**: 30, 45, 60, 90, or 120 minutes
- **Number of questions**: 1 to 5 questions
- **Optional company filter**: Practice questions from specific companies (FAANG, etc.)

Once they hit "Start Interview," the system instantly loads questions matching their criteria.

### 2. **Interview Session** (Main Experience)
This is where the magic happens. The screen is split into sections:

**Left Side - The Problem:**
- Question description and requirements
- Database table schemas with column names and types
- Sample data from the tables
- Everything they need to understand the problem

**Right Side - Code Editor:**
- Professional Monaco editor (same as VS Code)
- Syntax highlighting for SQL/Python
- Line numbers and autocomplete
- They write their solution here

**Bottom - Test Results:**
- When they click "Test," their code runs and results appear below
- Shows formatted tables with query results
- Displays any errors clearly
- Helps them debug before final submission

**Chat Panel:**
- AI interviewer available anytime for help
- Can ask for hints, clarification, or explanations
- Agent provides guidance without giving away the answer
- Like having a real interviewer to talk to

**Top Bar:**
- Timer counting down
- Current question number (Question 1 of 3)
- "Next Question" and "Submit Interview" buttons

### 3. **Results Page** (Final Report)
After submitting all questions, users see a comprehensive performance dashboard:

**Overall Score:**
- Big circular progress indicator showing their score out of 10
- Percentage score (e.g., 75%)
- Percentile ranking vs other users
- Achievement badge (e.g., "Almost There" 🏆)

**Performance Breakdown:**
- Technical Skill score (out of 10)
- Code Quality score (out of 10)
- Communication score (out of 10)
- Comparison to their previous attempts
- Comparison to other users

**Score Distribution Chart:**
- Visual bar chart showing where they stand
- See the distribution of all user scores
- Their score highlighted in yellow

**Question-by-Question Summary:**
- Each question listed with:
  - ✅ or ❌ indicator (correct/incorrect)
  - Difficulty badge (Easy/Medium/Hard)
  - Points earned
  - Test cases passed (e.g., 5/5)

**Action Buttons:**
- "Try Another Interview" - Start fresh
- "Share Results" - Export or print results

---

## The Technology Behind It

### How It Works (Non-Technical Explanation)

**Three Main Parts:**

1. **Frontend (What Users See)**
   - Built with React (modern web framework)
   - Beautiful, responsive design
   - Works on desktop and mobile
   - Instant updates without page refreshes

2. **Backend (The Server)**
   - Node.js/Express server
   - Loads 413,000+ questions from a database file
   - Routes requests between frontend and AI
   - Handles all the heavy lifting

3. **AI Agent (The Smart Part)**
   - OpenAI Agent Builder workflow
   - Acts as the virtual interviewer
   - Executes code, checks solutions, provides feedback
   - Connects to StrataScratch's question database

### The AI Agent - Our Secret Sauce

Instead of writing complex logic ourselves, we use **OpenAI Agent Builder**:

- It's like having a smart assistant that knows how to:
  - Run code and show results
  - Grade solutions and explain mistakes
  - Answer questions without spoiling the answer
  - Format everything nicely with tables and emojis

- The agent connects to **StrataScratch's MCP server**, which gives it access to:
  - All 413k+ coding questions
  - Database schemas and sample data
  - Code execution environment
  - Solution checking system

**Why This Matters:**
- The AI can reason through problems (not just follow rules)
- It gives contextual, helpful feedback
- It formats responses beautifully (tables, colors, emojis)
- We can improve it by updating instructions, not rewriting code

---

## Key Features We Implemented

### ✅ Core Features (V1 - Current)

1. **Smart Question Selection**
   - Filters by language, difficulty, company, role
   - Never repeats questions you've solved
   - Instant loading (questions pre-cached)

2. **Real-Time Code Testing**
   - Test your code unlimited times before submitting
   - See actual query results in formatted tables
   - Clear error messages when something breaks
   - No penalty for testing

3. **AI-Powered Grading**
   - Submitting officially grades your solution
   - Get scored on correctness
   - Receive feedback on what to improve
   - Hints for getting it right (if wrong)

4. **Live AI Interviewer**
   - Chat with the agent anytime during interview
   - Ask for hints or clarification
   - Get strategic guidance without spoilers
   - Professional, concise responses

5. **Comprehensive Results Dashboard**
   - Visual score breakdown
   - Percentile ranking
   - Time efficiency analysis
   - Question-by-question review

6. **Professional UI/UX**
   - Clean, modern design matching StrataScratch branding
   - Intuitive navigation
   - Responsive layout
   - Smooth animations

### 🚧 Planned Features (V2 - Future)

- **Voice Interviewer** (Text-to-Speech) - Like Interview Query
- **Data Project Evaluation** - Beyond just coding
- **Custom Question Generator** - AI creates new problems
- **Top Solutions Gallery** - Learn from best submissions
- **Performance Tracking** - Track improvement over time
- **Learning Path Integration** - Personalized practice plans

---

## How We Set Everything Up

### 1. Created the OpenAI Agent Workflow

We went to OpenAI Agent Builder and:
- Created a new agent called "Interview Agent"
- Selected GPT-5.2 model (the smartest available)
- Connected it to StrataScratch's MCP server
- Gave it detailed instructions on how to act as an interviewer
- Enabled 4 key tools: run_code, check_solution, get_datasets_details, get_educational_questions

The workflow got an ID: `wf_69785b59a66081908294851545870e8105ee6027e0451e3f`

### 2. Built the Backend Server

- Installed necessary packages (@openai/agents, express, cors)
- Created API endpoints for the frontend to call
- Integrated the OpenAI agent using their SDK
- Loaded all questions into memory for fast filtering
- Set up environment variables (API keys, workflow ID)

### 3. Created the React Frontend

**Landing Page:**
- Filter selection UI
- Start button with validation

**Interview Session:**
- Question display area
- Monaco code editor
- Test results panel
- Chat interface
- Timer and navigation

**Results Page:**
- Score visualization
- Performance charts
- Question summary
- Action buttons

### 4. Styled Everything

- Created CSS files for each page
- Used StrataScratch color scheme (blue, green)
- Made it responsive for all screen sizes
- Added smooth animations and transitions

### 5. Connected Everything Together

- Frontend calls backend API endpoints
- Backend calls OpenAI agent
- Agent calls MCP tools for data and execution
- Results flow back through the chain
- Everything happens in real-time

---

## Important Design Decisions

### Why OpenAI Agent Builder + MCP?

**The Old Way (What We Avoided):**
- Write complex if/else logic in backend
- Call APIs directly without intelligence
- Get raw JSON responses that need parsing
- Hard to improve or update

**Our Way (Agent Builder + MCP):**
- Agent makes smart decisions
- Formats responses beautifully
- Easy to update by changing instructions
- Visual debugging in OpenAI dashboard
- Single source of truth

### Why Backend Doesn't Call MCP Directly?

We could have made the backend call StrataScratch's API directly, but we didn't because:
- The agent provides consistent formatting
- It adds reasoning and context
- We can see all interactions in OpenAI dashboard
- Instructions are centralized in one place
- Easier to improve over time

---

## File Structure Overview

```
agent-strata/
├── CLAUDE.md                          # Technical documentation (for developers)
├── PROJECT_OVERVIEW.md               # This file (for everyone)
├── conversations.tex                  # Product discussions from Trello
│
└── mock-interview-system/
    ├── src/                           # Frontend code
    │   ├── pages/
    │   │   ├── LandingPage.jsx       # Home screen with filters
    │   │   ├── InterviewSession.jsx  # Main interview UI
    │   │   └── Results.jsx           # Score dashboard
    │   ├── components/
    │   │   ├── CodeEditor.jsx        # Code editing area
    │   │   ├── ChatPanel.jsx         # AI chat interface
    │   │   └── Timer.jsx             # Countdown timer
    │   ├── services/
    │   │   └── mcpClient.js          # Talks to backend
    │   └── styles/                   # CSS files for styling
    │
    └── server/                        # Backend code
        ├── index.js                   # Main server file
        ├── agentClient.js            # Connects to OpenAI agent
        ├── questionDatabase.js       # Loads and filters questions
        └── .env                      # Secret keys (not shared)
```

---

## What Each File Does (Simplified)

### Frontend Files

**LandingPage.jsx**
- Shows the initial screen
- Collects user preferences (language, difficulty, etc.)
- Validates selections
- Starts the interview

**InterviewSession.jsx**
- Displays current question
- Shows table schemas and sample data
- Manages code editor
- Handles Test and Submit buttons
- Displays test results below code
- Manages chat with AI
- Tracks time and progress

**Results.jsx**
- Shows final score and percentile
- Displays performance breakdown by category
- Lists all questions with scores
- Offers action buttons (retry, share)

**CodeEditor.jsx**
- Professional code editor component
- Syntax highlighting
- Line numbers
- Auto-completion

**ChatPanel.jsx**
- Chat interface for talking to AI
- Shows conversation history
- Handles sending messages

**Timer.jsx**
- Countdown timer display
- Shows time remaining
- Warns when time is low

### Backend Files

**index.js**
- Main Express server
- Sets up API routes
- Handles CORS (cross-origin requests)
- Loads question database on startup

**agentClient.js**
- Connects to OpenAI Agent Builder
- Defines the agent configuration
- Sends requests to the agent
- Returns formatted responses

**questionDatabase.js**
- Reads 413k questions from CSV
- Filters by criteria
- Returns matching questions quickly

### Configuration Files

**.env**
- OpenAI API key
- Workflow ID
- Other secrets

**package.json**
- Lists all dependencies
- Defines scripts (start, dev)

---

## How to Run the Project

**Step 1: Start the Backend**
```bash
cd mock-interview-system/server
npm run dev
```
This starts the server on http://localhost:3001

**Step 2: Start the Frontend**
```bash
cd mock-interview-system
npm run dev
```
This opens the app on http://localhost:3000

**Step 3: Use the App**
- Open browser to http://localhost:3000
- Select your preferences
- Start coding!

---

## Success Metrics

What makes this project successful:

✅ **User Experience**
- Clean, professional design
- Fast page loads (questions cached)
- Smooth transitions
- Clear error messages
- Responsive on all devices

✅ **AI Performance**
- Accurate code execution
- Fair solution grading
- Helpful feedback without spoilers
- Fast response times
- Proper formatting

✅ **Technical Quality**
- Well-documented code
- Modular architecture
- Error handling
- Security best practices
- Scalable design

---

## Team & Resources

**Development Team:**
- Mehmet Gencay Isik - Full-stack development & AI integration

**Stakeholders:**
- Nathan Rosidi - Product Manager, StrataScratch founder
- Anna Balatska - Content/UX Lead
- Sergey Parkhomenko - Backend/Infrastructure

**External Tools:**
- OpenAI Agent Builder (AI orchestration)
- StrataScratch MCP Server (questions & execution)
- React + Vite (frontend framework)
- Express.js (backend server)
- Monaco Editor (code editor)

**Documentation:**
- CLAUDE.md - Technical details for developers
- PROJECT_OVERVIEW.md - This overview for everyone
- conversations.tex - Product discussions and requirements

---

## Current Status

**What's Working:**
- ✅ Complete interview flow (landing → session → results)
- ✅ AI agent integration with MCP server
- ✅ Code testing and submission
- ✅ Real-time grading and feedback
- ✅ Chat functionality
- ✅ Results dashboard with visualizations
- ✅ Question filtering and selection
- ✅ Timer and progress tracking

**Known Limitations:**
- Chat hints not fully implemented yet
- Need to add validation for custom interview button
- Real-time score calculation could be more detailed
- Export/share results feature pending

**Next Steps:**
- Polish chat functionality
- Add user authentication
- Implement performance tracking
- Prepare for V2 features (voice, custom questions)
- User testing and feedback collection

---

## Summary

We built a **professional mock interview platform** that combines:
- Beautiful, intuitive UI
- AI-powered interviewer
- Real code execution
- Comprehensive feedback
- Performance analytics

It's **ready for users** to practice their data science interview skills in a realistic environment, with the added benefit of an AI assistant that never gets tired and always provides helpful, constructive feedback.

The system is **scalable and maintainable**, with clear documentation for future developers and a solid architectural foundation for adding new features.
