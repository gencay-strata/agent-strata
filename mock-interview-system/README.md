# StrataScratch Mock Interview System

An AI-powered mock interview platform for data science candidates, featuring real-time code execution, AI feedback, and progress tracking.

## Features

- **Customizable Filters**: Choose language (SQL/Python/R), difficulty, company, and more
- **Split-View Interface**: Chat with AI interviewer while coding
- **Real-time Code Execution**: Test and submit solutions with instant feedback
- **Timer System**: Practice under realistic interview pressure
- **MCP Integration**: Direct connection to StrataScratch's question database

## Tech Stack

- **Frontend**: React 18 + Vite
- **Routing**: React Router v6
- **Code Editor**: CodeMirror 6
- **Icons**: Lucide React
- **MCP Client**: Custom integration with StrataScratch API

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
mock-interview-system/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ChatPanel.jsx
│   │   ├── CodeEditor.jsx
│   │   └── Timer.jsx
│   ├── pages/            # Page components
│   │   ├── LandingPage.jsx
│   │   └── InterviewSession.jsx
│   ├── services/         # API and external services
│   │   └── mcpClient.js
│   ├── styles/           # CSS files
│   │   ├── global.css
│   │   ├── LandingPage.css
│   │   ├── InterviewSession.css
│   │   ├── ChatPanel.css
│   │   └── Timer.css
│   ├── App.jsx           # Root component
│   └── main.jsx          # Entry point
├── index.html
├── vite.config.js
└── package.json
```

## MCP Tools Available

### 1. get_educational_questions
Retrieve questions from StrataScratch database with filters for:
- ID/slug
- Difficulty (easy/medium/hard)
- Company
- Premium status

### 2. run_code
Execute SQL or Python code against question datasets.
Returns output/errors without scoring.

### 3. check_solution
Compare user solution against official solution.
Returns correctness + detailed feedback.

## Deployment

This project is configured for Vercel deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## Environment Variables

No environment variables required for basic functionality. The MCP server URL is hardcoded to StrataScratch's API.

## Future Enhancements

- [ ] Results/Assessment page with AI review
- [ ] Performance tracking dashboard
- [ ] User authentication
- [ ] Interview history persistence
- [ ] Advanced AI interviewer with Claude API integration
- [ ] Video/audio recording
- [ ] Collaborative interview mode

## License

MIT
