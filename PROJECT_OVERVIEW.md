# StrataScratch Mock Interview System - Project Overview

## What We Built

We created a **full-featured mock interview platform** where data science candidates can practice coding interviews with an AI interviewer. Think of it like LeetCode or Interview Query, but specifically for StrataScratch questions with built-in AI assistance.

---

## The Complete User Journey

### 1. **Home Page** (Public Landing)
When users first visit, they see a beautiful StrataScratch-branded landing page:

- **Hero Section**: "Master Data Skills Through Practice"
- **Stats Display**: 1,000+ questions, 500K+ members, 200+ companies
- **Call-to-Action Buttons**:
  - 🎯 Ace Interview Questions (navigates to interview setup)
  - 📊 Build Portfolio
  - 🔮 Try AI StrataTools
- **Company Logos**: FAANG and other top tech companies
- **Sign In / Sign Up**: Modal-based authentication (no page reload)

**Note**: The home page is public - no login required to browse.

### 2. **Interview Setup Page** (Protected - Login Required)
After clicking "Ace Interview Questions" and signing in, users customize their interview:

- **Choose a programming language**: SQL, Python, or R
- **Select their role**: Data Analyst, Data Scientist, ML Engineer, etc.
- **Pick difficulty level**: Easy, Medium, or Hard
- **Set time limit**: 30, 45, 60, 90, or 120 minutes
- **Number of questions**: 1 to 5 questions
- **Optional company filter**: Practice questions from specific companies (FAANG, etc.)

Once they hit "Start Interview," the system instantly loads questions matching their criteria.

### 3. **Interview Session** (Main Experience - Protected)
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

### 4. **Results Page** (Final Report - Protected)
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
   - Built with React + Vite (modern web framework)
   - Beautiful, responsive design
   - Works on desktop and mobile
   - Instant updates without page refreshes
   - **Authentication**: Clerk (modal sign-in/sign-up)
   - **Hosting**: Vercel (production deployment)

2. **Backend (Serverless Functions)**
   - Vercel serverless functions (deployed in cloud)
   - Loads questions from a database file
   - Routes requests between frontend and AI
   - Handles all the heavy lifting
   - **No traditional server needed** - scales automatically

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

### ✅ Core Features (V1 - DEPLOYED TO PRODUCTION)

1. **Public Landing Page**
   - StrataScratch-branded home page
   - No login required to browse
   - Clear call-to-action buttons
   - Company logos and trust indicators
   - Stats showcase (1,000+ questions, 500K+ members)

2. **User Authentication**
   - Clerk authentication integration
   - Modal-based sign-in/sign-up (no page redirects)
   - User profile with logout functionality
   - Protected routes for interview features

3. **Smart Question Selection**
   - Filters by language, difficulty, company, role
   - Never repeats questions you've solved
   - Instant loading (questions pre-cached)

4. **Real-Time Code Testing**
   - Test your code unlimited times before submitting
   - See actual query results in formatted tables
   - Clear error messages when something breaks
   - No penalty for testing

5. **AI-Powered Grading**
   - Submitting officially grades your solution
   - Get scored on correctness
   - Receive feedback on what to improve
   - Hints for getting it right (if wrong)

6. **Live AI Interviewer**
   - Chat with the agent anytime during interview
   - Ask for hints or clarification
   - Get strategic guidance without spoilers
   - Professional, concise responses

7. **Comprehensive Results Dashboard**
   - Visual score breakdown
   - Percentile ranking
   - Time efficiency analysis
   - Question-by-question review

8. **Professional UI/UX**
   - Clean, modern design matching StrataScratch branding
   - Intuitive navigation
   - Responsive layout
   - Smooth animations

9. **Production Deployment**
   - Hosted on Vercel (serverless architecture)
   - GitHub repository for version control
   - Environment variables secured
   - Auto-deploy on git push

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

### 2. Built the Backend (Serverless Architecture)

**Initial Development:**
- Built Express.js server for local testing
- Created API endpoints for the frontend to call
- Integrated the OpenAI agent using their SDK
- Loaded all questions into memory for fast filtering

**Production Conversion:**
- Converted Express endpoints to Vercel serverless functions
- Created `/api` directory with individual function files
- Each endpoint became a standalone serverless function
- Set up environment variables in Vercel dashboard

### 3. Integrated User Authentication

- Set up Clerk account and application
- Installed `@clerk/clerk-react` package
- Wrapped app with `ClerkProvider`
- Protected routes using `<SignedIn>` and `<SignedOut>` components
- Added modal sign-in/sign-up buttons
- Configured `VITE_CLERK_PUBLISHABLE_KEY` environment variable

### 4. Created the React Frontend

**Home Page (Public):**
- StrataScratch-branded landing page
- Hero section with stats
- CTA buttons
- Company logos
- Conditional sign-in/sign-up buttons

**Interview Setup Page (Protected):**
- Filter selection UI
- Start button with validation

**Interview Session (Protected):**
- Question display area
- Monaco code editor
- Test results panel
- Chat interface
- Timer and navigation

**Results Page (Protected):**
- Score visualization
- Performance charts
- Question summary
- Action buttons

### 5. Styled Everything

- Created CSS files for each page
- Used StrataScratch color scheme (blue, green)
- Made it responsive for all screen sizes
- Added smooth animations and transitions
- Styled authentication buttons

### 6. Deployed to Production

**GitHub Setup:**
- Created repository: https://github.com/gencay-strata/agent-strata
- Pushed all code with proper .gitignore
- Set up main branch for deployment

**Vercel Deployment:**
- Connected GitHub repository to Vercel
- Selected Vite as framework preset
- Configured environment variables
- Set up auto-deploy on git push
- Fixed serverless function routing issues

### 7. Connected Everything Together

- Frontend calls Vercel serverless API endpoints
- Serverless functions call OpenAI agent
- Agent calls MCP tools for data and execution
- Results flow back through the chain
- Everything happens in real-time
- Authentication handled by Clerk middleware

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
    │   │   ├── Home.jsx              # Public landing page
    │   │   ├── LandingPage.jsx       # Interview setup (protected)
    │   │   ├── InterviewSession.jsx  # Main interview UI (protected)
    │   │   └── Results.jsx           # Score dashboard (protected)
    │   ├── components/
    │   │   ├── CodeEditor.jsx        # Code editing area
    │   │   ├── ChatPanel.jsx         # AI chat interface
    │   │   └── Timer.jsx             # Countdown timer
    │   ├── services/
    │   │   └── mcpClient.js          # Talks to serverless API
    │   └── styles/                   # CSS files for styling
    │
    ├── api/                           # Vercel serverless functions
    │   ├── questions.js              # Question filtering endpoint
    │   ├── agent-message.js          # AI agent communication
    │   ├── run-code.js               # Code testing endpoint
    │   ├── check-solution.js         # Solution grading endpoint
    │   └── dataset-details.js        # Table schema endpoint
    │
    ├── server/                        # Shared backend logic
    │   ├── agentClient.js            # Connects to OpenAI agent
    │   ├── questionDatabase.js       # Loads and filters questions
    │   └── .env                      # Secret keys (not shared)
    │
    ├── vercel.json                    # Vercel deployment config
    └── .env                           # Frontend environment variables
```

---

## What Each File Does (Simplified)

### Frontend Files

**Home.jsx** (NEW - Public)
- StrataScratch-branded landing page
- Hero section with stats and company logos
- CTA buttons for interview, portfolio, AI tools
- Conditional sign-in/sign-up buttons (Clerk)
- UserButton for logged-in users
- No authentication required to view

**LandingPage.jsx** (Protected)
- Interview setup screen
- Collects user preferences (language, difficulty, etc.)
- Validates selections
- Starts the interview
- Requires user to be signed in

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

### Backend Files (Serverless Functions)

**api/questions.js**
- Serverless function for question filtering
- Takes filter criteria (language, difficulty, company)
- Returns matching questions from CSV
- Deployed on Vercel

**api/agent-message.js**
- Serverless function for AI communication
- Routes Test/Submit actions to OpenAI agent
- Returns formatted responses
- Handles errors gracefully

**api/run-code.js**
- Serverless function for code testing
- Executes code via MCP server
- Returns test results
- No scoring (practice mode)

**api/check-solution.js**
- Serverless function for solution grading
- Official scoring endpoint
- Returns score, feedback, hints
- Via MCP server

**api/dataset-details.js**
- Serverless function for table schemas
- Fetches column names, types, sample data
- Returns formatted table information
- Used when questions change

**server/agentClient.js** (Shared)
- Connects to OpenAI Agent Builder
- Defines the agent configuration
- Sends requests to the agent
- Returns formatted responses
- Used by serverless functions

**server/questionDatabase.js** (Shared)
- Reads 413k questions from CSV
- Filters by criteria
- Returns matching questions quickly
- Preloaded for fast filtering

### Configuration Files

**server/.env** (Backend secrets)
- OpenAI API key
- Workflow ID
- Workflow version

**mock-interview-system/.env** (Frontend secrets)
- VITE_CLERK_PUBLISHABLE_KEY (Clerk authentication)

**vercel.json**
- Vercel deployment configuration
- API rewrites for serverless functions

**package.json**
- Lists all dependencies
- Defines scripts (build, dev, preview)

---

## How to Run the Project

### Local Development

**Start the Frontend** (serverless functions won't work locally without Vercel CLI)
```bash
cd mock-interview-system
npm run dev
```
This opens the app on http://localhost:5173

### Production (Vercel)

**The app is deployed and live!**
- Visit the production URL (provided by Vercel)
- All serverless functions work automatically
- Authentication via Clerk
- Auto-deploys when you push to GitHub

### Testing Locally with Serverless Functions

**Install Vercel CLI**
```bash
npm i -g vercel
```

**Run with serverless functions enabled**
```bash
cd mock-interview-system
vercel dev
```

**Step 3: Use the App**
- Open browser to the local URL
- Browse public home page
- Click "Ace Interview Questions"
- Sign in/sign up via Clerk modal
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
- Vercel (serverless deployment)
- Clerk (authentication)
- Monaco Editor (code editor)
- GitHub (version control)

**Documentation:**
- CLAUDE.md - Technical details for developers
- PROJECT_OVERVIEW.md - This overview for everyone
- conversations.tex - Product discussions and requirements

---

## Current Status

**What's Working (DEPLOYED TO PRODUCTION):**
- ✅ Public home page with StrataScratch branding
- ✅ Clerk authentication (modal sign-in/sign-up)
- ✅ Protected routes for interview features
- ✅ Complete interview flow (home → setup → session → results)
- ✅ AI agent integration with MCP server
- ✅ Code testing and submission
- ✅ Real-time grading and feedback
- ✅ Chat functionality
- ✅ Results dashboard with visualizations
- ✅ Question filtering and selection
- ✅ Timer and progress tracking
- ✅ Vercel serverless deployment
- ✅ GitHub repository with auto-deploy

**Known Limitations:**
- Chat hints not fully implemented yet
- Real-time score calculation could be more detailed
- Export/share results feature pending
- CSV loading may cause cold starts on serverless functions

**Next Steps:**
- Polish chat functionality
- Implement user profile/history page
- Optimize CSV loading for serverless
- Add performance tracking dashboard
- Prepare for V2 features (voice, custom questions)
- User testing and feedback collection

---

## Summary

We built a **professional mock interview platform** that combines:
- Beautiful, intuitive UI with public landing page
- Secure authentication via Clerk
- AI-powered interviewer
- Real code execution
- Comprehensive feedback
- Performance analytics
- Production deployment on Vercel

It's **deployed and live**, ready for users to practice their data science interview skills in a realistic environment, with the added benefit of an AI assistant that never gets tired and always provides helpful, constructive feedback.

The system is **scalable and maintainable**, with:
- Serverless architecture (no server management needed)
- Clear documentation for future developers
- GitHub version control with auto-deploy
- Solid architectural foundation for adding new features
- Modern authentication system
