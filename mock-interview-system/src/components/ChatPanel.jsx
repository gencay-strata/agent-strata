import React, { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';
import '../styles/ChatPanel.css';

const ChatPanel = ({ messages, isLoading }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTimestamp = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMarkdown = (text) => {
    let processed = text;

    // Helper function to convert JSON to markdown table
    const convertJsonToTable = (content) => {
      let converted = content;

      // Python dict format: {'col1': [...], 'col2': [...]}
      const pythonDictRegex = /\{['"]?(\w+)['"]?\s*:\s*\[([^\]]+)\](?:\s*,\s*['"]?(\w+)['"]?\s*:\s*\[([^\]]+)\])*\}/g;
      converted = converted.replace(pythonDictRegex, (match) => {
        try {
          const kvPairs = [];
          const kvRegex = /['"]?(\w+)['"]?\s*:\s*\[([^\]]+)\]/g;
          let kvMatch;
          while ((kvMatch = kvRegex.exec(match)) !== null) {
            const key = kvMatch[1];
            const values = kvMatch[2].split(',').map(v => v.trim().replace(/['"]/g, ''));
            kvPairs.push({ key, values });
          }

          if (kvPairs.length === 0) return match;

          const columns = kvPairs.map(kv => kv.key);
          const numRows = Math.max(...kvPairs.map(kv => kv.values.length));

          let table = '| ' + columns.join(' | ') + ' |\n';
          table += '|' + columns.map(() => '---').join('|') + '|\n';

          for (let i = 0; i < numRows; i++) {
            const row = kvPairs.map(kv => kv.values[i] || '');
            table += '| ' + row.join(' | ') + ' |\n';
          }

          return table;
        } catch (e) {
          return match;
        }
      });

      // Nested JSON: {"results": {"index": [...], "columns": [...], "data": [...]}}
      const nestedJsonRegex = /\{[^{}]*"results"\s*:\s*\{[^}]*"(?:index|columns)"\s*:[^}]*\}[^}]*\}/g;
      converted = converted.replace(nestedJsonRegex, (match) => {
        try {
          const cleaned = match.replace(/'/g, '"');
          const parsed = JSON.parse(cleaned);

          if (!parsed.results || !parsed.results.columns) return match;

          const columns = parsed.results.columns;
          const data = parsed.results.data || [];

          let table = '| ' + columns.join(' | ') + ' |\n';
          table += '|' + columns.map(() => '---').join('|') + '|\n';

          if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
            data.forEach(row => {
              table += '| ' + row.join(' | ') + ' |\n';
            });
          }

          return table;
        } catch (e) {
          return match;
        }
      });

      // Simple JSON: {"columns": [...], "data": [[...]]}
      const jsonTableRegex = /\{[^}]*"columns"\s*:\s*\[(.*?)\][^}]*"data"\s*:\s*\[([\s\S]*?)\]\s*\}/g;
      converted = converted.replace(jsonTableRegex, (match, columnsStr, dataStr) => {
        try {
          const columns = columnsStr.match(/"([^"]+)"/g)?.map(c => c.replace(/"/g, '')) || [];
          if (columns.length === 0) return match;

          const dataRows = [];
          const rowMatches = dataStr.match(/\[([^\]]+)\]/g) || [];
          rowMatches.forEach(row => {
            const values = row.slice(1, -1).split(',').map(v => v.trim().replace(/"/g, ''));
            dataRows.push(values);
          });

          let table = '| ' + columns.join(' | ') + ' |\n';
          table += '|' + columns.map(() => '---').join('|') + '|\n';
          dataRows.forEach(row => {
            table += '| ' + row.join(' | ') + ' |\n';
          });

          return table;
        } catch (e) {
          return match;
        }
      });

      return converted;
    };

    // Step 1: Convert JSON inside code blocks first
    processed = processed.replace(/```(?:json|python|sql)?\n?([\s\S]*?)```/g, (match, code) => {
      const converted = convertJsonToTable(code);
      // If conversion created a table, return it without code block
      if (converted.includes('|') && converted !== code) {
        return converted;
      }
      // Otherwise keep as code block
      return match;
    });

    // Step 2: Convert JSON in normal text
    processed = convertJsonToTable(processed);

    // Step 3: Process markdown formatting
    return processed
      .replace(/\|(.+)\|/g, (match) => {
        return match; // Keep table rows as-is for now
      })
      // Code blocks with backticks
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Convert markdown tables to HTML
      .replace(/(\|.+\|\n)+/g, (tableMatch) => {
        const rows = tableMatch.trim().split('\n');
        if (rows.length < 2) return tableMatch;

        let html = '<table class="result-table">';
        rows.forEach((row, idx) => {
          if (idx === 1 && row.match(/^[\|\-\s]+$/)) return; // Skip separator row

          const cells = row.split('|').filter(c => c.trim());
          const tag = idx === 0 ? 'th' : 'td';
          html += '<tr>';
          cells.forEach(cell => {
            html += `<${tag}>${cell.trim()}</${tag}>`;
          });
          html += '</tr>';
        });
        html += '</table>';
        return html;
      })
      // Line breaks
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="chat-panel">
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-avatar">
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div className="message-content">
              <div className="message-header">
                <span className="message-role">
                  {msg.role === 'user' ? 'You' : 'AI Interviewer'}
                </span>
                <span className="message-time">
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
              <div
                className="message-text"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
              />
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant-message">
            <div className="message-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatPanel;
