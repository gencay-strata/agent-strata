# StrataScratch Mock Interview System - Setup Guide

## 🎯 Complete System

This mock interview system connects to StrataScratch's MCP server to fetch real interview questions, run code, and check solutions.

## 🏗️ Architecture

```
Frontend (React) → Backend (Express) → StrataScratch MCP Server
   ↓                    ↓                      ↓
localhost:3000    localhost:3001    api.stratascratch.com/mcp
```

## 🚀 Quick Start

### 1. Start Backend Server (Port 3001)

```bash
cd server
npm install
npm start
```

You should see:
```
🚀 MCP Backend Server running on http://localhost:3001
```

### 2. Start Frontend (Port 3000)

In a new terminal:

```bash
npm install  # if not already done
npm run dev
```

You should see:
```
VITE v5.4.21  ready in 489 ms
➜  Local:   http://localhost:3000/
```

### 3. Open Browser

Visit http://localhost:3000

- Click "Start Interview Now" for quick start
- Or customize filters and click "Start Custom Interview"

## ✅ What's Working

### Backend Server (server/index.js)
- ✅ Connects to StrataScratch MCP at https://api.stratascratch.com/mcp
- ✅ Handles CORS for local development
- ✅ Proxies three MCP tools:
  - `GET /api/questions` → `get_educational_questions`
  - `POST /api/run-code` → `run_code`
  - `POST /api/check-solution` → `check_solution`
- ✅ Proper accept headers: `application/json, text/event-stream`

### Frontend
- ✅ StrataScratch branding (Roboto font, teal/orange colors)
- ✅ Landing page with filters
- ✅ Interview session with StrataScratch-like layout:
  - Left panel (40%): Question details, difficulty badge, description, table schema, sample data
  - Right panel (60%): Code editor with SQL/Python syntax highlighting
  - Top: Timer and question counter
  - Actions: Test button (runs code without scoring) and Submit button (official evaluation)

## 🧪 Testing

### Test MCP Connection

1. Open browser console (F12)
2. Start an interview
3. Look for logs:
   ```
   Fetching questions with filters: {difficulty: 'medium'}
   Backend Response: {questions: [...]}
   ```

### Test Question Fetching

Check backend server logs for:
```
MCP Payload: {...}
MCP Response: {...}
```

If you see errors, the console will show detailed MCP responses.

## 📁 Project Structure

```
mock-interview-system/
├── server/                  # Backend API
│   ├── index.js            # Express server with MCP integration
│   ├── package.json
│   └── node_modules/
├── src/
│   ├── components/
│   │   ├── CodeEditor.jsx  # CodeMirror editor
│   │   ├── ChatPanel.jsx   # (Not used in StrataScratch layout)
│   │   └── Timer.jsx       # Countdown timer
│   ├── pages/
│   │   ├── LandingPage.jsx      # Filter selection
│   │   └── InterviewSession.jsx  # Main interview (StrataScratch style)
│   ├── services/
│   │   └── mcpClient.js    # Calls backend API
│   ├── styles/
│   │   ├── global.css      # Roboto font + color variables
│   │   ├── LandingPage.css
│   │   └── InterviewSession.css  # StrataScratch-inspired design
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── vite.config.js
```

## 🎨 Design

- **Colors**: Teal (#00A699), Orange (#F89832), Purple (#A880DC)
- **Font**: Roboto (from Google Fonts)
- **Layout**: Matches StrataScratch interview UI
- **Theme**: White background for question panel, dark theme for code editor

## ❗ Troubleshooting

### Backend not starting
```bash
# Kill existing process
pkill -f "node index.js"

# Start again
cd server && npm start
```

### Frontend shows "Untitled Question"
- Check if backend is running on port 3001
- Check browser console for fetch errors
- Check backend logs for MCP response errors

### CORS errors
- Backend handles CORS automatically
- Make sure you're using `http://localhost:3001` not `https`

### Questions not loading
- Verify MCP server is accessible: https://api.stratascratch.com/mcp
- Check backend logs for detailed MCP responses
- Ensure accept header includes both `application/json, text/event-stream`

## 🔧 Configuration

### Change Backend Port

Edit `server/index.js`:
```javascript
const PORT = 3001;  // Change this
```

Then update `src/services/mcpClient.js`:
```javascript
const BACKEND_URL = "http://localhost:3001";  // Update this
```

### Add More Filters

Edit filter options in `src/pages/LandingPage.jsx` and pass them to `mcpClient.getEducationalQuestions()`.

## 📝 Next Steps

- [ ] Add Results/Assessment page
- [ ] Add Performance Tracking page
- [ ] Integrate Claude API for AI interviewer
- [ ] Add user authentication
- [ ] Deploy to Vercel

## 🐛 Known Issues

1. **MCP Response Format**: Parser handles multiple formats, but may need adjustment based on actual API responses
2. **Error Handling**: Basic error handling in place, production needs more robust error boundaries
3. **State Persistence**: Interview state lost on refresh (consider localStorage or backend)

## 💡 Development Tips

- Both servers support hot reload
- Backend logs show all MCP requests/responses
- Frontend console shows parsed questions
- Use browser DevTools Network tab to debug API calls
