# StrataScratch Mock Interview System

## Tech Stack
- **Frontend**: React + Vite
- **Backend**: Vercel Serverless Functions
- **Auth**: Clerk (modal sign-in/sign-up)
- **AI Agent**: Dual-provider - Vertex AI (Gemini 3 Pro) OR OpenAI Agents SDK (GPT-5.2)
- **Active Provider**: Vertex AI (`AGENT_PROVIDER=vertex` in server/.env)
- **MCP**: StrataScratch API (`https://api.stratascratch.com/mcp`) - JSON-RPC 2.0
- **Data**: Local CSV, 413k+ questions
- **Hosting**: Vercel | **Repo**: https://github.com/gencay-strata/agent-strata

## Project Structure
```
mock-interview-system/
├── src/
│   ├── pages/         Home.jsx, LandingPage.jsx, InterviewSession.jsx, Results.jsx
│   ├── components/    CodeEditor.jsx, ChatPanel.jsx, Timer.jsx
│   └── services/      mcpClient.js
├── api/               agent-message.js, review-feedback.js, questions.js, run-code.js, check-solution.js, dataset-details.js
├── server/
│   ├── agentClient.js      # Dual-provider: Vertex AI + OpenAI (router pattern)
│   ├── questionDatabase.js # CSV cache
│   └── .env                # API keys
└── vercel.json
```

## Agent Architecture

### Provider Switch
Set `AGENT_PROVIDER` env var to switch providers:
- `AGENT_PROVIDER=vertex` → Gemini 3 Pro via Vertex AI
- `AGENT_PROVIDER=openai` → GPT-5.2 via OpenAI Agent Builder

**Local switch**: Edit `server/.env` → change `AGENT_PROVIDER=vertex` to `AGENT_PROVIDER=openai`
**Vercel switch**: Vercel Dashboard → Settings → Environment Variables → update `AGENT_PROVIDER`

Router functions in `agentClient.js`:
- `callInterviewAgentRouted()` - used by `api/agent-message.js`
- `callReviewAgentRouted()` - used by `api/review-feedback.js`

### Vertex AI (Active)
- **Model**: `gemini-3-pro-preview` (or set `GEMINI_MODEL` env var)
- **Project**: `aispace-482111` | **Location**: `us-central1`
- **Auth local**: ADC via `gcloud auth application-default login` (no key file needed)
- **Auth Vercel**: Base64-encoded service account JSON → `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`
- **MCP URL**: `https://strata-api-develop.stratascratch.com/mcp-L5fY-ByOAWaGnxciuiqysYj_45pm8REXg9d3frmFPmE` (token-authenticated develop endpoint)
- **MCP calls**: Direct JSON-RPC from backend (`callMcpTool()` in `agentClient.js` and `api/dataset-details.js`)
- **SSE fix**: `Accept: application/json, text/event-stream` header required on every MCP call
- **Function calling**: `toolConfig: { functionCallingConfig: { mode: "ANY" } }` on first turn, `"AUTO"` after

**CRITICAL - MCP Response Format:**
- **Raw MCP response**: `{ content: [{ type: 'text', text: '{"datasets": [...]}' }], isError: false }`
- **Must parse**: Extract `result.content[0].text` and `JSON.parse()` it before returning to frontend
- **Why**: Vertex AI doesn't have native MCP support like OpenAI Agent Builder - we manually call MCP via JSON-RPC
- **Implementation**: All MCP endpoints (`api/dataset-details.js`, `api/run-code.js`, `api/check-solution.js`) handle parsing
- **Parsing pattern**:
  ```javascript
  const rawText = result.content[0].text;
  const parsedData = JSON.parse(rawText);
  return parsedData; // Clean JSON to frontend
  ```

### OpenAI (Fallback)
- **Workflow ID (Interview)**: `wf_69785b59a66081908294851545870e8105ee6027e0451e3f`
- **Workflow ID (Review)**: `wf_698c075296008190b107a4b83511206f0fff3039f047fa39`
- **SDK**: `@openai/agents` v0.4.3
- **MCP**: via `hostedMcpTool` (agent calls MCP internally)

### MCP Tools
- `run_code(code, code_type, question_id)` - Test execution (not scored)
- `check_solution(code, code_type, question_id)` - Grade solution
- `get_datasets_details(dataset_name, question_id, code_type)` - Table schemas
- `get_educational_questions(id)` - Question details

`code_type`: 1 = SQL, 2 = Python

**Score Field Format (check_solution response)**:
- **Raw MCP score**: `"100.00%"` (string with percent sign)
- **Must parse**: Remove `%` and convert to float before frontend display
- **Implementation**: `api/check-solution.js` handles parsing:
  ```javascript
  const score = parseFloat(data.score.replace('%', '')); // "100.00%" → 100.00
  ```
- **Why**: Frontend expects numeric score (0-100), MCP returns string percentage

## Environment Variables

### server/.env (local)
```bash
AGENT_PROVIDER=vertex
GEMINI_MODEL=gemini-3-pro-preview
GOOGLE_CLOUD_PROJECT=aispace-482111
GOOGLE_CLOUD_LOCATION=us-central1
# Local auth via ADC (gcloud auth application-default login) - no key needed
OPENAI_API_KEY=sk-proj-...
WORKFLOW_ID=wf_69785b59a66081908294851545870e8105ee6027e0451e3f
WORKFLOW_ID_REVIEW=wf_698c075296008190b107a4b83511206f0fff3039f047fa39
WORKFLOW_VERSION=1
```

### .env (frontend root)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Vercel (production)
- `AGENT_PROVIDER` - vertex or openai
- `GEMINI_MODEL` - gemini-3-pro-preview
- `GOOGLE_CLOUD_PROJECT` - aispace-482111
- `GOOGLE_CLOUD_LOCATION` - us-central1
- `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` - Base64-encoded service account JSON (pending from Maks/Sergey)
  - **How to set**: Once you have the JSON key file:
    1. `base64 -i service-account-key.json | tr -d '\n'` → copy output
    2. Vercel Dashboard → Settings → Environment Variables → add `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` → paste
    3. Redeploy (or wait for next push)
- `OPENAI_API_KEY` - OpenAI key (fallback)
- `WORKFLOW_ID`, `WORKFLOW_ID_REVIEW`, `WORKFLOW_VERSION`
- `VITE_CLERK_PUBLISHABLE_KEY`

## Interview Flow
1. **Home** (public) - Sign In/Up via Clerk modal
2. **Interview Setup** (protected) - filters: language, difficulty, company, duration
3. **Interview Session** (protected) - Monaco editor, Test/Submit buttons, chat panel, timer
4. **Results** (protected) - score, percentile, question-by-question analysis

## Critical Rules

### DO
- Use `VITE_` prefix for frontend env vars (not `NEXT_PUBLIC_`)
- Fetch table schema when `currentQuestionIndex` changes
- Display agent responses as plain markdown (not JSON)
- Scope `Results.css` with `.results-container` prefix
- Serverless function filenames use dashes (agent-message.js, not agent/message.js)
- `vercel.json` must include `functions: { includeFiles: "server/**" }` for bundling

### DON'T
- Don't call MCP directly from frontend (use `/api/dataset-details`, `/api/run-code`, `/api/check-solution` endpoints)
- Don't parse agent chat responses as JSON (they're markdown strings)
- Don't use Express in production (Vercel serverless only)
- Don't add NEXT_PUBLIC_ vars to Vercel
- Don't use falsy checks (`!dataset_name`) for optional string params - use `=== undefined` or `=== null`
- Don't return raw MCP responses to frontend - always parse `content[0].text` first
- Don't pass percentage strings (`"100.00%"`) to frontend - parse to float first
- Don't use `import.meta.env.PROD` for runtime URL detection - use `window.location.hostname` instead

## Running Locally
```bash
cd mock-interview-system
npm run dev        # frontend only
vercel dev         # frontend + serverless functions
```

## Deployment
```bash
git add . && git commit -m "message"
git push origin main   # Vercel auto-deploys
```

## Team
- **Nathan Rosidi** (@nathanrosidi) - PM, StrataScratch founder
- **Mehmet Gencay Isik** (@mehmetgencayisik) - AI/Agent Developer
- **Anna Balatska** (@annabalatska) - Content/UX
- **Sergey Parkhomenko** (@sergey_at_stratascratch) - Backend/Infra
- **Maks** - GCP/Infrastructure (service account key owner)

## Resources
- GitHub: https://github.com/gencay-strata/agent-strata
- OpenAI Agent Builder: https://platform.openai.com/playground/agents
- Clerk Dashboard: https://dashboard.clerk.com
- GCP Project: https://console.cloud.google.com (aispace-482111)
- Local path: /Users/learnai/Desktop/agent-strata

## Recent Changes
1. Integrated Vertex AI (Gemini 3 Pro) as primary agent provider
2. Built dual-provider router (OpenAI fallback still works)
3. Fixed MCP SSE header (`Accept: application/json, text/event-stream`)
4. Fixed Gemini function calling (`toolConfig: { functionCallingConfig: { mode: "ANY" } }`)
5. Fixed `vercel.json` bundling (`includeFiles: "server/**"`)
6. Fixed Timer setState React warning (separate useEffect for onTick)
7. Added Results page with score visualization
8. Integrated Clerk authentication (modal sign-in/sign-up)
9. **Fixed dataset details display (Feb 18, 2026):**
   - Created `/api/dataset-details` endpoint for manual MCP calls (Vertex AI lacks native MCP support)
   - Fixed MCP response parsing: extract `content[0].text` and parse JSON before returning
   - Fixed validation: allow empty string for `dataset_name` (only check `undefined/null`)
   - Fixed frontend parameter passing: use object syntax `{dataset_name, question_id, code_type}`
   - Fixed runtime hostname detection for `BACKEND_URL` (was hardcoded to localhost in production)
10. Deployed to Vercel production successfully
11. **Fixed score parsing (March 11, 2026):**
   - MCP returns score as string with percent sign (`"100.00%"`)
   - Added parsing in `api/check-solution.js`: remove `%` and convert to float
   - Fixed `InterviewSession.jsx` to handle numeric scores correctly
   - Updated `Results.jsx` to display scores with proper percentage formatting
12. **Standardized MCP response parsing across all endpoints:**
   - `api/dataset-details.js`: Parse `content[0].text` for dataset schemas
   - `api/run-code.js`: Parse `content[0].text` for execution results
   - `api/check-solution.js`: Parse `content[0].text` + extract numeric score
   - All endpoints return clean JSON (not wrapped in MCP response structure)

## Known Issues & TODOs
- [x] ~~Vercel deployment for Vertex AI~~ - **RESOLVED**: Production deployed successfully
- [x] ~~Dataset details not showing~~ - **RESOLVED**: Created `/api/dataset-details` with MCP response parsing
- [x] ~~Score not displaying correctly~~ - **RESOLVED**: Parse MCP percentage string to float in `api/check-solution.js`
- [ ] Chat panel hint/question functionality
- [ ] Optimize CSV loading for serverless cold starts
- [ ] User profile/history page
- [ ] Add loading states for Test/Submit buttons
- [ ] Error handling for MCP timeout/failures

## Troubleshooting Guide

### Dataset Details Not Showing (Vertex AI Migration Issue)
**Symptoms**: Question metadata/table schemas missing on interview page, console shows "No datasets found in MCP response"

**Root Cause**: OpenAI Agent Builder had native MCP support (`hostedMcpTool`) - agent fetched schemas automatically. Vertex AI lacks this, requiring manual frontend → backend → MCP flow.

**Solution Steps**:
1. **Backend**: Create `api/dataset-details.js` endpoint
2. **Parse MCP response**: Extract `result.content[0].text` and `JSON.parse()` before returning
3. **Validation**: Allow empty strings (`dataset_name: ''`) - only reject `undefined/null`
4. **Frontend**: Call `mcpClient.getDatasetDetails({ dataset_name, question_id, code_type })` (object syntax!)
5. **Runtime detection**: Use `window.location.hostname === 'localhost'` for `BACKEND_URL` (not `import.meta.env.PROD`)

**Files Modified**:
- `api/dataset-details.js` - MCP endpoint with response parsing
- `src/services/mcpClient.js` - Runtime hostname detection
- `src/pages/InterviewSession.jsx` - Object parameter syntax

### Score Not Displaying (MCP String Format Issue)
**Symptoms**: Score shows as `undefined` or `NaN` on Results page, console shows `"100.00%"` string

**Root Cause**: MCP `check_solution` returns score as string with percent sign (`"100.00%"`), frontend expects numeric value (0-100).

**Solution Steps**:
1. **Backend parsing**: In `api/check-solution.js`, extract score from MCP response:
   ```javascript
   const rawText = result.content[0].text;
   const data = JSON.parse(rawText);
   const score = parseFloat(data.score.replace('%', '')); // "100.00%" → 100.00
   return { ...data, score }; // Return with numeric score
   ```
2. **Frontend usage**: `InterviewSession.jsx` and `Results.jsx` treat score as number (0-100)
3. **Display formatting**: Add `%` sign back in UI when rendering: `{score.toFixed(1)}%`

**Files Modified**:
- `api/check-solution.js` - Score parsing from MCP response
- `src/pages/InterviewSession.jsx` - Handle numeric scores in submission flow
- `src/pages/Results.jsx` - Display scores with percentage formatting

### MCP Response Parsing Pattern
**All MCP endpoints follow this pattern**:
```javascript
// 1. Call MCP tool via callMcpTool()
const result = await callMcpTool(toolName, params);

// 2. Check for errors
if (result.isError) {
  throw new Error(result.content[0].text);
}

// 3. Extract and parse text content
const rawText = result.content[0].text;
const parsedData = JSON.parse(rawText);

// 4. Additional parsing if needed (e.g., score conversion)
const cleanData = {
  ...parsedData,
  score: parsedData.score ? parseFloat(parsedData.score.replace('%', '')) : undefined
};

// 5. Return clean JSON to frontend
return cleanData;
```

**Applied in**:
- `api/dataset-details.js` - Dataset schemas
- `api/run-code.js` - Code execution results
- `api/check-solution.js` - Solution grading + score parsing
