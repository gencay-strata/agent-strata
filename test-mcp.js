// Test MCP check_solution response format
const MCP_URL = "https://strata-api-develop.stratascratch.com/mcp-L5fY-ByOAWaGnxciuiqysYj_45pm8REXg9d3frmFPmE";

async function testCheckSolution() {
  console.log('🔍 Testing MCP check_solution response format...\n');

  // Test 1: Intentionally wrong SQL (like Tihomir's test)
  const wrongCode = `
SELECT customer_id, COUNT(*) as orders
FROM orders
WHERE invalid_column = 1
GROUP BY customer_id
`;

  // Test 2: Correct SQL (simple example)
  const correctCode = `
SELECT customer_id, COUNT(*) as orders
FROM orders
GROUP BY customer_id
`;

  const testCases = [
    {
      name: 'Wrong SQL (syntax error)',
      code: wrongCode,
      question_id: 9728, // Random question ID
      code_type: 1 // SQL
    },
    {
      name: 'Correct SQL',
      code: correctCode,
      question_id: 9728,
      code_type: 1
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📝 Test: ${testCase.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
      const payload = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "check_solution",
          arguments: {
            code: testCase.code,
            code_type: testCase.code_type,
            question_id: testCase.question_id
          }
        }
      };

      const response = await fetch(MCP_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json, text/event-stream",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        const text = await response.text();
        console.log('📡 Response Type: SSE Stream');
        console.log('Raw SSE:\n', text.substring(0, 500), '...\n');

        // Parse last valid JSON from SSE
        const lines = text.split("\n").filter(l => l.startsWith("data:"));
        for (let i = lines.length - 1; i >= 0; i--) {
          const raw = lines[i].replace(/^data:\s*/, "").trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.result) {
              console.log('✅ Parsed Result:');
              console.log(JSON.stringify(parsed.result, null, 2));
              break;
            }
          } catch (e) {
            // Skip non-JSON lines
          }
        }
      } else {
        const data = await response.json();
        console.log('📡 Response Type: JSON');
        console.log('✅ Full Response:');
        console.log(JSON.stringify(data, null, 2));
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Test complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testCheckSolution();
