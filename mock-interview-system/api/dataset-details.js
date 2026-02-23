/**
 * Vercel Serverless Function
 * Route: POST /api/dataset-details
 * Purpose: Fetch table schemas via MCP get_datasets_details
 */

import fetch from 'node-fetch';

const MCP_URL = 'https://strata-api-develop.stratascratch.com/mcp-L5fY-ByOAWaGnxciuiqysYj_45pm8REXg9d3frmFPmE';

/**
 * Calls MCP get_datasets_details tool via JSON-RPC 2.0
 */
async function callMcpTool(toolName, params) {
  const payload = {
    jsonrpc: '2.0',
    id: `req-${Date.now()}`,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: params
    }
  };

  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream' // SSE fix
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MCP HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`MCP Error ${data.error.code}: ${data.error.message}`);
  }

  return data.result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dataset_name, question_id, code_type } = req.body;

  // dataset_name is optional (can be empty string), question_id and code_type are required
  if (question_id === undefined || question_id === null ||
      code_type === undefined || code_type === null) {
    return res.status(400).json({
      error: 'Missing required fields: question_id, code_type'
    });
  }

  try {
    console.log(`📊 Fetching schema for: ${dataset_name} (Q${question_id}, type ${code_type})`);

    const result = await callMcpTool('get_datasets_details', {
      dataset_name,
      question_id: String(question_id),
      code_type: Number(code_type)
    });

    console.log(`✅ MCP raw result:`, result);

    // Parse MCP response: result.content[0].text contains JSON
    if (result.content && result.content[0] && result.content[0].text) {
      const parsedData = JSON.parse(result.content[0].text);
      console.log(`✅ Parsed dataset details:`, parsedData);
      return res.status(200).json(parsedData);
    }

    // Fallback: return raw result
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ MCP dataset-details error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch dataset details'
    });
  }
}
