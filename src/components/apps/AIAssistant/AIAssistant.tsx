import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { streamGeminiResponse, AURA_SYSTEM_PROMPT, type ChatMessage } from '../../../services/gemini';
import { useSystemStore } from '../../../store/systemStore';
import {
  getAllEntries,
  listDirectory,
  createDirectory,
  writeFile,
} from '../../../services/filesystem';

const SLASH_COMMANDS = [
  { cmd: '/explain', desc: 'Explain code or concept' },
  { cmd: '/refactor', desc: 'Suggest refactoring' },
  { cmd: '/debug', desc: 'Debug an error' },
  { cmd: '/generate', desc: 'Generate code' },
  { cmd: '/test', desc: 'Generate tests' },
  { cmd: '/docs', desc: 'Generate docs' },
];

const WELCOME_MESSAGE: ChatMessage = {
  role: 'model',
  content: `Hello! I'm **AURA**, your AI co-developer inside DEV AURA OS.

I have full awareness of your workspace — open files, terminal output, git state, and running processes.

**What I can do:**
- Explain any code, error, or concept
- Generate full modules from specs
- Refactor and optimize across your project
- Debug from logs + code context
- Generate tests and documentation

**Try asking:**
- \`/explain\` the TypeScript file in the editor
- \`/generate\` a REST API endpoint
- \`/debug\` my error message
- Or just ask anything in plain English.

How can I accelerate your development today?`,
};

// Helper to construct a directory tree representation string
const getDirectoryTreeString = (entries: any[]): string => {
  const buildTree = (parentId: string | null, indent: string): string => {
    const children = entries.filter((e) => e.parentId === parentId);
    children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    let result = '';
    for (const child of children) {
      result += `${indent}${child.type === 'directory' ? '⬡' : '📄'} ${child.name}\n`;
      if (child.type === 'directory') {
        result += buildTree(child.id, indent + '  ');
      }
    }
    return result;
  };
  return buildTree('root', '');
};

// Helper to write files with nested directories into VFS
const writeVFSFile = async (fullPath: string, content: string) => {
  const parts = fullPath.split('/').filter(Boolean);
  if (parts.length === 0) return;
  const fileName = parts.pop()!;
  
  let currentParentId = 'root';
  for (const part of parts) {
    const children = await listDirectory(currentParentId);
    const existingDir = children.find(c => c.name === part && c.type === 'directory');
    if (existingDir) {
      currentParentId = existingDir.id;
    } else {
      const newDir = await createDirectory(currentParentId, part);
      currentParentId = newDir.id;
    }
  }
  await writeFile(currentParentId, fileName, content);
};

export const AIAssistantApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const { settings, activeFileId, activeFileContent, addNotification } = useSystemStore();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = { role: 'user', content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');
      setIsStreaming(true);
      abortRef.current = false;

      // Add empty assistant message for streaming
      let assistantContent = '';
      setMessages((prev) => [...prev, { role: 'model', content: '' }]);

      let dynamicSystemPrompt = AURA_SYSTEM_PROMPT;
      try {
        const allEntries = await getAllEntries();
        const treeStr = getDirectoryTreeString(allEntries);
        const activeFileStr = activeFileId 
          ? `Active File Path: ${activeFileId}\nActive File Content:\n\`\`\`\n${activeFileContent}\n\`\`\``
          : 'No file is currently active in the editor.';

        dynamicSystemPrompt = `${AURA_SYSTEM_PROMPT}

WORKSPACE CONTEXT:
-----------------
Directory Tree:
${treeStr}

Active Editor File:
${activeFileStr}

IMPORTANT - WRITE FILE CAPABILITY:
You can write, update, or create files directly in the user's workspace.
To write a file, output a special XML tag block containing the absolute path in the workspace and the complete file contents:
<write_file path="/absolute/path/to/file.ext">
complete file content here
</write_file>
When the user sees this block, the OS will automatically parse it and write the file content into the Virtual File System (VFS).
Make sure to specify the complete file content. Only write files if requested or if it's the clear action to solve the user's request. Always output the XML tags clearly and format files properly.`;
      } catch (err) {
        console.error("Error building system prompt context:", err);
      }

      try {
        const apiMessages = newMessages.map((m) => ({
          role: m.role === 'model' ? 'model' as const : 'user' as const,
          content: m.content,
        }));

        for await (const chunk of streamGeminiResponse(
          apiMessages,
          dynamicSystemPrompt,
          settings.geminiApiKey
        )) {
          if (abortRef.current) break;
          assistantContent += chunk;
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: 'model', content: assistantContent },
          ]);
        }

        // Parse write_file blocks on final content
        const regex = /<write_file\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/write_file>/g;
        let match;
        let filesWritten = 0;
        while ((match = regex.exec(assistantContent)) !== null) {
          const filePath = match[1];
          const fileContent = match[2];
          try {
            await writeVFSFile(filePath, fileContent);
            filesWritten++;
          } catch (e: any) {
            addNotification({
              type: 'error',
              title: 'VFS Sync Failed',
              message: `Failed to write ${filePath}: ${e.toString()}`
            });
          }
        }
        if (filesWritten > 0) {
          window.dispatchEvent(new CustomEvent('vfs-change'));
          addNotification({
            type: 'success',
            title: 'Workspace Updated',
            message: `AURA successfully wrote ${filesWritten} file(s) to workspace.`
          });
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: 'model',
            content: 'Sorry, I encountered an error. Please check your API key in Settings → AI.',
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, settings.geminiApiKey, activeFileId, activeFileContent, addNotification]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const isApiKeyMissing = !settings.geminiApiKey || settings.geminiApiKey === 'your_gemini_api_key_here';

  return (
    <div className="ai-window">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-icon">◆</div>
        <div className="ai-header-info">
          <div className="ai-header-name">AURA AI</div>
          <div className="ai-header-status">
            <div className="ai-status-dot" />
            {isApiKeyMissing ? 'No API Key' : 'Gemini 2.0 Flash'}
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 11, padding: '3px 8px' }}
          onClick={() => setMessages([WELCOME_MESSAGE])}
        >
          Clear
        </button>
      </div>

      {/* Context Bar */}
      <div className="ai-context-bar">
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 4 }}>Context:</span>
        <div className="ai-context-chip">◈ editor</div>
        <div className="ai-context-chip">▶ terminal</div>
        <div className="ai-context-chip">⑂ main</div>
      </div>

      {/* API Key Warning */}
      {isApiKeyMissing && (
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--yellow-dim)',
            borderBottom: '1px solid rgba(255, 204, 0, 0.2)',
            fontSize: 11,
            color: 'var(--yellow)',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          ⚠ Set your Gemini API key in Settings → AI to enable full AI features.
        </div>
      )}

      {/* Messages */}
      <div className="ai-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-msg ${msg.role === 'user' ? 'user' : 'assistant'}`}>
            <div className="ai-msg-avatar">
              {msg.role === 'user' ? '👤' : '◆'}
            </div>
            <div className="ai-msg-bubble">
              {msg.role === 'model' && msg.content === '' ? (
                <div className="ai-typing-indicator">
                  <div className="ai-typing-dot" />
                  <div className="ai-typing-dot" />
                  <div className="ai-typing-dot" />
                </div>
              ) : (
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const isBlock = className?.includes('language-');
                      return isBlock ? (
                        <pre><code {...props} className={className}>{children}</code></pre>
                      ) : (
                        <code {...props}>{children}</code>
                      );
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="ai-input-area">
        <div className="ai-slash-commands">
          {SLASH_COMMANDS.map((sc) => (
            <div
              key={sc.cmd}
              className="ai-slash-cmd"
              onClick={() => {
                setInput(sc.cmd + ' ');
                textareaRef.current?.focus();
              }}
              data-tooltip={sc.desc}
            >
              {sc.cmd}
            </div>
          ))}
        </div>
        <div className="ai-input-row">
          <textarea
            ref={textareaRef}
            className="ai-textarea"
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={isStreaming}
          />
          <button
            className="ai-send-btn"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? '■' : '↑'}
          </button>
        </div>
      </div>
    </div>
  );
};
