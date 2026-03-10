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
    // First, convert JSON tables to markdown tables
    let processed = text;

    // Detect JSON-like table structures: {"columns": [...], "data": [[...]]}
    const jsonTableRegex = /\{[^}]*"columns"\s*:\s*\[(.*?)\][^}]*"data"\s*:\s*\[([\s\S]*?)\]\s*\}/g;
    processed = processed.replace(jsonTableRegex, (match, columnsStr, dataStr) => {
      try {
        // Parse columns
        const columns = columnsStr.match(/"([^"]+)"/g)?.map(c => c.replace(/"/g, '')) || [];
        if (columns.length === 0) return match;

        // Parse data rows
        const dataRows = [];
        const rowMatches = dataStr.match(/\[([^\]]+)\]/g) || [];
        rowMatches.forEach(row => {
          const values = row.slice(1, -1).split(',').map(v => v.trim().replace(/"/g, ''));
          dataRows.push(values);
        });

        // Build markdown table
        let table = '| ' + columns.join(' | ') + ' |\n';
        table += '|' + columns.map(() => '---').join('|') + '|\n';
        dataRows.forEach(row => {
          table += '| ' + row.join(' | ') + ' |\n';
        });

        return table;
      } catch (e) {
        return match; // If parsing fails, return original
      }
    });

    // Now process markdown
    return processed
      // Markdown tables
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
