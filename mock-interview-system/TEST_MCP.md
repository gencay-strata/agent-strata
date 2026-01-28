# MCP Integration Test Plan

## Current Status
- ✅ Design updated to StrataScratch branding (Roboto font, teal/orange colors)
- ✅ MCP client enhanced with better logging and response parsing
- 🔄 Need to test actual MCP connection

## Testing Steps

### 1. Check Browser Console
Open browser console (F12) and look for:
- "Fetching questions with filters:" - Shows filter parameters
- "MCP Payload:" - Shows JSON-RPC request being sent
- "MCP Response:" - Shows actual API response
- "Parsing questions:" - Shows what data is being parsed
- "Parsed question:" - Shows individual question objects

### 2. Expected Behavior

#### Success Case:
```
Fetching questions with filters: {difficulty: 'medium', company: 'Meta'}
MCP Payload: {...}
MCP Response: {result: {content: [...]}}
Parsing questions: [...]
Parsed question: {id: 10087, title: "...", description: "..."}
```

#### Failure Case:
If you see "undefined" in question display:
1. Check if MCP response is empty
2. Check if response format doesn't match parser
3. Check network tab for CORS or 404 errors

### 3. Common Issues & Fixes

#### Issue: "undefined" question title/description
**Cause:** MCP response format doesn't match parser expectations
**Fix:** Check console logs to see actual response structure, update parseQuestions() accordingly

#### Issue: CORS error
**Cause:** MCP server doesn't allow cross-origin requests from localhost
**Fix:** May need proxy or backend server for production

#### Issue: 404 Not Found
**Cause:** MCP endpoint URL is incorrect
**Fix:** Verify STRATA_URL in mcpClient.js

## Current Implementation

### MCP Client (mcpClient.js)
- Enhanced with detailed console logging
- Handles multiple response formats:
  - Array of content blocks with text
  - Direct JSON string
  - Single object
- Parses JSON when needed

### Question Parser (InterviewSession.jsx)
- Supports multiple field name variations:
  - id / question_id / ID
  - title / name / Title / question_title
  - description / question / Question / body
- Falls back to "Untitled Question" / "No description available" if missing

## Next Steps

1. Open http://localhost:3000 in browser
2. Click "Start Interview Now" or configure custom settings
3. Check browser console for logs
4. If questions show "undefined", share console logs for debugging
5. If questions load properly, test Test Run and Submit buttons
