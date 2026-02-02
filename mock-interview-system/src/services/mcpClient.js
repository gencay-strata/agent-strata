/**
 * MCP Client for StrataScratch Mock Interview System
 * Connects to the StrataScratch MCP server
 */

// Use local backend server in development, deployed backend in production
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (
  import.meta.env.PROD ? '' : 'http://localhost:3001'
);

class MCPClient {
  constructor() {
    this.headers = {
      "Accept": "application/json, text/event-stream",
      "Content-Type": "application/json",
      "User-Agent": "StrataScratch-MockInterview/1.0"
    };
  }

  /**
   * Get educational questions from StrataScratch
   * @param {Object} filters - Question filters
   * @param {string|number} filters.id - Question ID or slug
   * @param {string} filters.difficulty - easy, medium, hard
   * @param {string} filters.company - Company name
   * @param {boolean} filters.is_premium - Premium status
   * @returns {Promise<Array>} Questions array
   */
  async getEducationalQuestions(filters = {}) {
    try {
      console.log('Fetching questions with filters:', filters);

      const response = await fetch(`${BACKEND_URL}/api/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(filters)
      });

      const data = await response.json();
      console.log('Backend Response:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      return data.questions || [];
    } catch (error) {
      console.error("Error fetching questions:", error);
      throw error;
    }
  }

  /**
   * Run code (SQL or Python)
   * @param {Object} params
   * @param {string} params.code - Code to execute
   * @param {string} params.language - "sql" or "python"
   * @param {number} params.question_id - Question ID
   * @returns {Promise<Object>} Execution result
   */
  async runCode({ code, language, question_id }) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/run-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ code, language, question_id })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error("Error running code:", error);
      throw error;
    }
  }

  /**
   * Check solution correctness
   * @param {Object} params
   * @param {string} params.code - User's solution code
   * @param {number} params.question_id - Question ID
   * @param {string} params.language - "sql" or "python"
   * @returns {Promise<Object>} Evaluation result
   */
  async checkSolution({ code, question_id, language }) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/check-solution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ code, question_id, language })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error("Error checking solution:", error);
      throw error;
    }
  }

  /**
   * Send message to Interview Agent
   * @param {Object} params
   * @param {string} params.message - User message
   * @param {Object} params.context - Context (question_id, code, language, action)
   * @returns {Promise<Object>} Agent response
   */
  async sendAgentMessage({ message, context }) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/agent-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message, context })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error("Error sending agent message:", error);
      throw error;
    }
  }

  /**
   * Get dataset details (table schema)
   * @param {Object} params
   * @param {string} params.dataset_name - Table name
   * @param {number} params.question_id - Question ID
   * @param {string} params.code_type - "sql" or "python"
   * @returns {Promise<Object>} Dataset details
   */
  async getDatasetDetails({ dataset_name, question_id, code_type }) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dataset-details`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ dataset_name, question_id, code_type })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error("Error fetching dataset details:", error);
      throw error;
    }
  }

  /**
   * Fetch available tools from MCP server
   * @returns {Promise<Array>} Available tools
   */
  async getTools() {
    const payload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/list",
      params: {}
    };

    try {
      const response = await fetch(STRATA_URL, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      return data.result?.tools || [];
    } catch (error) {
      console.error("Error fetching tools:", error);
      throw error;
    }
  }
}

export default new MCPClient();
