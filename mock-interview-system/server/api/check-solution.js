import fetch from 'node-fetch';

const STRATA_MCP_URL = "https://api.stratascratch.com/mcp";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, question_id, language } = req.body;
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

    return res.json(data.result?.content || {});
  } catch (error) {
    console.error("Error checking solution:", error);
    return res.status(500).json({ error: error.message });
  }
}
