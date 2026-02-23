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
- **MCP calls**: Direct JSON-RPC from backend (`callMcpTool()` in `agentClient.js`)
- **SSE fix**: `Accept: application/json, text/event-stream` header required on every MCP call
- **Function calling**: `toolConfig: { functionCallingConfig: { mode: "ANY" } }` on first turn, `"AUTO"` after

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
- Don't call MCP directly from frontend
- Don't parse agent responses as JSON (they're markdown strings)
- Don't use Express in production (Vercel serverless only)
- Don't add NEXT_PUBLIC_ vars to Vercel

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
9. Deployed to Vercel production successfully

## Known Issues & TODOs
- [ ] Vercel deployment for Vertex AI blocked - waiting for service account key from Maks/Sergey
- [ ] Gemini response format: currently returns raw JSON instead of markdown tables (needs prompt tuning)
- [ ] Chat panel hint/question functionality
- [ ] Optimize CSV loading for serverless cold starts
- [ ] User profile/history page
