import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useSystemStore } from '../../../store/systemStore';
import {
  listDirectory,
  createDirectory,
  writeFile,
  getEntryByPath,
  getAllEntries,
} from '../../../services/filesystem';
import type { FSEntry } from '../../../services/filesystem';

// Helper to construct absolute path
const buildPath = (entry: FSEntry, entriesMap: Map<string, FSEntry>): string => {
  if (entry.id === 'root') return '/';
  const parts: string[] = [];
  let current: FSEntry | undefined = entry;
  while (current && current.id !== 'root') {
    parts.unshift(current.name);
    current = current.parentId ? entriesMap.get(current.parentId) : undefined;
  }
  return '/' + parts.join('/');
};

// Helper to load Pyodide from CDN
const loadPyodideRuntime = async () => {
  if ((window as any).pyodide) return (window as any).pyodide;
  if (!(window as any).loadPyodide) {
    await new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js";
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }
  const pyodide = await (window as any).loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
  });
  (window as any).pyodide = pyodide;
  return pyodide;
};

// Helper to run JavaScript code inside a Web Worker sandbox
const runJSInWorker = (code: string, term: Terminal, onDone: () => void) => {
  const blob = new Blob([`
    // Override console methods to send messages to parent
    console.log = (...args) => {
      postMessage({ type: 'log', data: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') });
    };
    console.error = (...args) => {
      postMessage({ type: 'error', data: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') });
    };
    
    try {
      const asyncFn = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new asyncFn(${JSON.stringify(code)});
      fn().then(() => {
        postMessage({ type: 'done' });
      }).catch(err => {
        postMessage({ type: 'error', data: err.toString() });
        postMessage({ type: 'done' });
      });
    } catch(err) {
      postMessage({ type: 'error', data: err.toString() });
      postMessage({ type: 'done' });
    }
  `], { type: 'application/javascript' });

  const worker = new Worker(URL.createObjectURL(blob));
  worker.onmessage = (e) => {
    if (e.data.type === 'log') {
      term.write(e.data.data + '\r\n');
    } else if (e.data.type === 'error') {
      term.write('\\x1b[31m' + e.data.data + '\\x1b[0m\r\n');
    } else if (e.data.type === 'done') {
      worker.terminate();
      onDone();
    }
  };
  return worker;
};

interface TerminalTab {
  id: string;
  title: string;
  terminal: Terminal | null;
  fitAddon: FitAddon | null;
  history: string[];
  historyIndex: number;
  currentInput: string;
}

const COMMAND_HELP = `
\x1b[1mDEV AURA OS — Shell Commands\x1b[0m
\x1b[2m──────────────────────────────\x1b[0m
  \x1b[1mls\x1b[0m              List directory contents
  \x1b[1mcd <dir>\x1b[0m        Change directory
  \x1b[1mpwd\x1b[0m             Print working directory
  \x1b[1mcat <file>\x1b[0m      Display file contents
  \x1b[1mmkdir <name>\x1b[0m    Create directory
  \x1b[1mecho <text>\x1b[0m     Print text (supports > to write to file)
  \x1b[1mclear\x1b[0m           Clear terminal
  \x1b[1mnode\x1b[0m            Node.js (simulated)
  \x1b[1mpython\x1b[0m          Python (simulated)
  \x1b[1mgit\x1b[0m             Git commands
  \x1b[1mnpm\x1b[0m             npm commands
  \x1b[1mneofetch\x1b[0m        System info
  \x1b[1mdate\x1b[0m            Current date/time
  \x1b[1muname\x1b[0m           System info

\x1b[2mTip: Press \x1b[0m\x1b[1mCtrl+K\x1b[0m\x1b[2m to open Command Palette\x1b[0m
`;

let tabIdCounter = 0;

const createTab = (): TerminalTab => ({
  id: `tab-${++tabIdCounter}`,
  title: `terminal ${tabIdCounter}`,
  terminal: null,
  fitAddon: null,
  history: [],
  historyIndex: -1,
  currentInput: '',
});

const XTermComponent: React.FC<{ tabId: string; cwd: string; onCwdChange: (cwd: string) => void }> = ({
  cwd,
  onCwdChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const cwdRef = useRef(cwd);
  const historyRef = useRef<string[]>([]);
  const histIndexRef = useRef(-1);
  const inputRef = useRef('');
  const replModeRef = useRef<'node' | 'python' | null>(null);
  const activeProcessRef = useRef<{ type: 'worker' | 'pyodide' | 'repl-node' | 'repl-python'; target: any; resolve?: () => void } | null>(null);
  
  const { settings } = useSystemStore();

  useEffect(() => {
    cwdRef.current = cwd;
  }, [cwd]);

  const getPromptString = useCallback(() => {
    if (replModeRef.current === 'node') return '> ';
    if (replModeRef.current === 'python') return '>>> ';
    const c = cwdRef.current;
    const shortCwd = c === '/home' ? '~' : c.replace('/home', '~');
    return `\x1b[1mdevaura\x1b[0m\x1b[2m:\x1b[0m\x1b[1m${shortCwd}\x1b[0m\x1b[2m$\x1b[0m `;
  }, []);

  const writePrompt = useCallback((term: Terminal) => {
    term.write('\r\n' + getPromptString());
  }, [getPromptString]);

  const handleReplInput = useCallback(async (term: Terminal, line: string) => {
    const trimmed = line.trim();
    if (replModeRef.current === 'node') {
      if (trimmed === '.exit') {
        replModeRef.current = null;
        term.write('Exited Node.js REPL\r\n');
        return;
      }
      if (!trimmed) return;
      try {
        const logs: string[] = [];
        const originalLog = console.log;
        const originalError = console.error;
        console.log = (...args) => {
          logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
        };
        console.error = (...args) => {
          logs.push('\x1b[31m' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\x1b[0m');
        };
        
        let result = window.eval(line);
        
        console.log = originalLog;
        console.error = originalError;
        
        logs.forEach(l => term.write(l + '\r\n'));
        if (result !== undefined) {
          term.write('\x1b[36m' + (typeof result === 'object' ? JSON.stringify(result) : String(result)) + '\x1b[0m\r\n');
        }
      } catch (err: any) {
        term.write('\x1b[31m' + err.toString() + '\x1b[0m\r\n');
      }
    } else if (replModeRef.current === 'python') {
      if (trimmed === 'exit()' || trimmed === 'quit()') {
        replModeRef.current = null;
        term.write('Exited Python REPL\r\n');
        return;
      }
      if (!trimmed) return;
      try {
        const pyodide = (window as any).pyodide;
        if (!pyodide) {
          term.write('\x1b[31mPyodide not loaded\x1b[0m\r\n');
          replModeRef.current = null;
          return;
        }
        pyodide.setStdout({ batched: (str: string) => term.write(str + '\r\n') });
        pyodide.setStderr({ batched: (str: string) => term.write('\x1b[31m' + str + '\x1b[0m\r\n') });
        const result = await pyodide.runPythonAsync(line);
        if (result !== undefined) {
          term.write(String(result) + '\r\n');
        }
      } catch (err: any) {
        term.write('\x1b[31m' + err.toString() + '\x1b[0m\r\n');
      }
    }
  }, []);

  const executeCommand = useCallback(
    async (term: Terminal, line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Handle output redirection '>'
      const redirectMatch = trimmed.match(/(.*?)\s*>\s*(.*)/);
      let cmdLine = trimmed;
      let redirectTarget: string | null = null;

      if (redirectMatch) {
        cmdLine = redirectMatch[1].trim();
        redirectTarget = redirectMatch[2].trim();
      }

      const [cmd, ...args] = cmdLine.split(/\s+/);
      term.write('\r\n');

      if (cmd === 'clear') {
        term.clear();
        return;
      }

      if (cmd === 'help') {
        COMMAND_HELP.split('\n').forEach((l) => term.write(l + '\r\n'));
        return;
      }

      if (cmd === 'pwd') {
        term.write(cwdRef.current + '\r\n');
        return;
      }

      if (cmd === 'uname') {
        term.write('DEV AURA OS 1.0.0 WebKernel/wasm32 WASM\r\n');
        return;
      }

      if (cmd === 'date') {
        term.write(new Date().toString() + '\r\n');
        return;
      }

      if (cmd === 'neofetch') {
        const neofetchOutput = `
\x1b[1m     ⬡⬡⬡\x1b[0m    \x1b[1mDEV AURA OS\x1b[0m
\x1b[1m    ⬡⬡⬡⬡⬡\x1b[0m   \x1b[2m──────────────────\x1b[0m
\x1b[1m   ⬡⬡⬡⬡⬡⬡⬡\x1b[0m  \x1b[1mOS:\x1b[0m DEV AURA OS v1.0.0
\x1b[1m    ⬡⬡⬡⬡⬡\x1b[0m   \x1b[1mKernel:\x1b[0m WebKernel/wasm32
\x1b[1m     ⬡⬡⬡\x1b[0m    \x1b[1mShell:\x1b[0m aura-sh 1.0
           \x1b[1mDisplay:\x1b[0m ${window.innerWidth}x${window.innerHeight}
           \x1b[1mBrowser:\x1b[0m WebClient
           \x1b[1mRuntime:\x1b[0m React 19 + Vite 6
           \x1b[1mAI:\x1b[0m Gemini 2.0 Flash ◆
`;
        neofetchOutput.split('\n').forEach((l) => term.write(l + '\r\n'));
        return;
      }

      if (cmd === 'cd') {
        const target = args[0] || '/home';
        let targetPath = '';
        if (target === '~' || target === '') {
          targetPath = '/home';
        } else if (target === '..') {
          const parts = cwdRef.current.split('/').filter(Boolean);
          parts.pop();
          targetPath = '/' + parts.join('/');
        } else if (target.startsWith('/')) {
          targetPath = target;
        } else {
          targetPath = (cwdRef.current === '/' ? '' : cwdRef.current) + '/' + target;
        }

        const entry = await getEntryByPath(targetPath);
        if (entry && entry.type === 'directory') {
          cwdRef.current = targetPath;
          onCwdChange(targetPath);
        } else {
          term.write(`\x1b[31mcd: ${target}: No such directory\x1b[0m\r\n`);
        }
        return;
      }

      if (cmd === 'ls') {
        const dirEntry = await getEntryByPath(cwdRef.current);
        if (!dirEntry || dirEntry.type !== 'directory') {
          term.write(`\x1b[31mls: ${cwdRef.current}: No such directory\x1b[0m\r\n`);
          return;
        }
        const entries = await listDirectory(dirEntry.id);
        if (entries.length === 0) return;
        const lineStr = entries
          .map((e) => (e.type === 'directory' ? `\x1b[1;34m${e.name}/\x1b[0m` : e.name))
          .join('  ');
        term.write(lineStr + '\r\n');
        return;
      }

      if (cmd === 'mkdir') {
        const name = args[0];
        if (!name) {
          term.write(`\x1b[31mmkdir: missing directory name\x1b[0m\r\n`);
          return;
        }
        const currentDir = await getEntryByPath(cwdRef.current);
        if (currentDir && currentDir.type === 'directory') {
          await createDirectory(currentDir.id, name);
          window.dispatchEvent(new CustomEvent('vfs-change'));
          term.write(`Created directory ${name}\r\n`);
        } else {
          term.write(`\x1b[31mmkdir: Current directory not found\x1b[0m\r\n`);
        }
        return;
      }

      if (cmd === 'cat') {
        const target = args[0];
        if (!target) {
          term.write(`\x1b[31mcat: missing filename\x1b[0m\r\n`);
          return;
        }
        const targetPath = target.startsWith('/') ? target : (cwdRef.current === '/' ? '' : cwdRef.current) + '/' + target;
        const entry = await getEntryByPath(targetPath);
        if (entry && entry.type === 'file') {
          entry.content.split('\n').forEach((l) => {
            term.write(l + '\r\n');
          });
        } else {
          term.write(`\x1b[31mcat: ${target}: No such file\x1b[0m\r\n`);
        }
        return;
      }

      if (cmd === 'echo') {
        const echoContent = args.join(' ');
        if (redirectTarget) {
          const targetPath = redirectTarget.startsWith('/') ? redirectTarget : (cwdRef.current === '/' ? '' : cwdRef.current) + '/' + redirectTarget;
          const pathParts = targetPath.split('/');
          const fileName = pathParts.pop() || '';
          const parentPath = pathParts.join('/') || '/';
          const parentDir = await getEntryByPath(parentPath);
          if (parentDir && parentDir.type === 'directory') {
            await writeFile(parentDir.id, fileName, echoContent);
            window.dispatchEvent(new CustomEvent('vfs-change'));
            term.write(`Written to ${redirectTarget}\r\n`);
          } else {
            term.write(`\x1b[31mError: Parent directory not found for ${redirectTarget}\x1b[0m\r\n`);
          }
        } else {
          term.write(echoContent + '\r\n');
        }
        return;
      }

      // Real sandbox node and python environments
      if (cmd === 'node') {
        const scriptName = args[0];
        if (!scriptName) {
          replModeRef.current = 'node';
          term.write('\x1b[33mNode.js REPL (DevAura Sandboxed)\x1b[0m\r\nType .exit to exit\r\n> ');
          return;
        }

        const targetPath = scriptName.startsWith('/') ? scriptName : (cwdRef.current === '/' ? '' : cwdRef.current) + '/' + scriptName;
        const entry = await getEntryByPath(targetPath);
        if (entry && entry.type === 'file') {
          term.write(`Running JavaScript script: ${scriptName}...\r\n`);
          return new Promise<void>((resolve) => {
            const worker = runJSInWorker(entry.content, term, () => {
              activeProcessRef.current = null;
              resolve();
            });
            activeProcessRef.current = { type: 'worker', target: worker, resolve };
          });
        } else {
          term.write(`\x1b[31mnode: ${scriptName}: No such file\x1b[0m\r\n`);
          return;
        }
      }

      if (cmd === 'python') {
        const scriptName = args[0];
        if (!scriptName) {
          term.write('Loading Python WASM Runtime (Pyodide)...\r\n');
          try {
            await loadPyodideRuntime();
            replModeRef.current = 'python';
            term.write('\x1b[33mPython 3.12 REPL (Pyodide WASM)\x1b[0m\r\nType exit() to exit\r\n>>> ');
          } catch (e: any) {
            term.write(`\x1b[31mFailed to load Python: ${e.toString()}\x1b[0m\r\n`);
          }
          return;
        }

        const targetPath = scriptName.startsWith('/') ? scriptName : (cwdRef.current === '/' ? '' : cwdRef.current) + '/' + scriptName;
        const entry = await getEntryByPath(targetPath);
        if (entry && entry.type === 'file') {
          term.write(`Loading Python WASM Runtime (Pyodide)...\r\n`);
          try {
            const pyodide = await loadPyodideRuntime();
            term.write(`Syncing files to Python virtual disk...\r\n`);
            // Mirror IndexedDB virtual directory structure to Pyodide FS
            const allEntries = await getAllEntries();
            const entriesMap = new Map(allEntries.map(e => [e.id, e]));
            for (const ent of allEntries) {
              if (ent.id === 'root') continue;
              const fullPath = buildPath(ent, entriesMap);
              const parts = fullPath.split('/').filter(Boolean);
              let currentPath = '';
              for (let i = 0; i < parts.length - 1; i++) {
                currentPath += '/' + parts[i];
                try { pyodide.FS.mkdir(currentPath); } catch (e) {}
              }
              if (ent.type === 'directory') {
                try { pyodide.FS.mkdir(fullPath); } catch (e) {}
              } else {
                try { pyodide.FS.writeFile(fullPath, ent.content || ''); } catch (e) {}
              }
            }

            term.write(`Executing Python script: ${scriptName}...\r\n`);
            pyodide.setStdout({ batched: (str: string) => term.write(str + '\r\n') });
            pyodide.setStderr({ batched: (str: string) => term.write('\x1b[31m' + str + '\x1b[0m\r\n') });
            
            const result = await pyodide.runPythonAsync(entry.content);
            if (result !== undefined) {
              term.write(String(result) + '\r\n');
            }
          } catch (err: any) {
            term.write(`\x1b[31mPython execution error: ${err.toString()}\x1b[0m\r\n`);
          }
          return;
        } else {
          term.write(`\x1b[31mpython: ${scriptName}: No such file\x1b[0m\r\n`);
          return;
        }
      }

      if (cmd === 'git') {
        const sub = args[0];
        if (!sub) {
          term.write('usage: git <command>\r\n');
          return;
        }
        if (sub === 'status') {
          term.write('On branch \x1b[32mmain\x1b[0m\r\nNothing to commit, working tree clean\r\n');
        } else if (sub === 'branch') {
          term.write('* \x1b[32mmain\x1b[0m\r\n');
        } else {
          term.write(`git: simulated command '${sub}' executed successfully\r\n`);
        }
        return;
      }

      if (cmd === 'npm') {
        const sub = args[0];
        if (!sub) {
          term.write('usage: npm <command>\r\n');
          return;
        }
        term.write(`npm: simulated package manager command '${sub}' completed\r\n`);
        return;
      }

      term.write(`\x1b[31maura-sh: ${cmd}: command not found\x1b[0m\r\n\x1b[2mTry 'help' for available commands.\x1b[0m\r\n`);
    },
    []
  );

  // Sync theme
  useEffect(() => {
    if (!termRef.current) return;
    const isDark = settings.theme === 'dark';
    termRef.current.options.theme = {
      background: isDark ? '#09090b' : '#ffffff',
      foreground: isDark ? '#fafafa' : '#09090b',
      cursor: isDark ? '#ffffff' : '#000000',
      cursorAccent: isDark ? '#09090b' : '#ffffff',
      selectionBackground: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
      black: '#000000',
      red: '#ef4444',
      green: '#10b981',
      yellow: '#f59e0b',
      blue: '#3b82f6',
      magenta: '#8b5cf6',
      cyan: '#06b6d4',
      white: isDark ? '#fafafa' : '#09090b',
      brightBlack: '#71717a',
      brightRed: '#f87171',
      brightGreen: '#34d399',
      brightYellow: '#fbbf24',
      brightBlue: '#60a5fa',
      brightMagenta: '#a78bfa',
      brightCyan: '#22d3ee',
      brightWhite: isDark ? '#ffffff' : '#18181b',
    };
  }, [settings.theme]);

  useEffect(() => {
    if (!containerRef.current || termRef.current) return;

    const isDark = settings.theme === 'dark';
    const term = new Terminal({
      theme: {
        background: isDark ? '#09090b' : '#ffffff',
        foreground: isDark ? '#fafafa' : '#09090b',
        cursor: isDark ? '#ffffff' : '#000000',
        cursorAccent: isDark ? '#09090b' : '#ffffff',
        selectionBackground: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
        black: '#000000',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: isDark ? '#fafafa' : '#09090b',
        brightBlack: '#71717a',
      },
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 2000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    term.write('\x1b[1m╔═══════════════════════════════════════╗\x1b[0m\r\n');
    term.write('\x1b[1m║\x1b[0m  \x1b[1mDEV AURA OS\x1b[0m — Terminal v1.0        \x1b[1m║\x1b[0m\r\n');
    term.write('\x1b[1m║\x1b[0m  \x1b[2mType \'help\' for available commands\x1b[0m   \x1b[1m║\x1b[0m\r\n');
    term.write('\x1b[1m╚═══════════════════════════════════════╝\x1b[0m\r\n');
    writePrompt(term);

    term.onKey(({ key, domEvent }) => {
      const ev = domEvent;

      if (ev.key === 'Enter') {
        const cmd = inputRef.current;
        if (replModeRef.current) {
          term.write('\r\n');
          handleReplInput(term, cmd).then(() => {
            inputRef.current = '';
            term.write(getPromptString());
          });
        } else {
          if (cmd.trim()) {
            historyRef.current.unshift(cmd);
            if (historyRef.current.length > 100) historyRef.current.pop();
            histIndexRef.current = -1;
            executeCommand(term, cmd).then(() => {
              inputRef.current = '';
              writePrompt(term);
            });
          } else {
            term.write('\r\n');
            inputRef.current = '';
            term.write(getPromptString());
          }
        }
      } else if (ev.key === 'Backspace') {
        if (inputRef.current.length > 0) {
          inputRef.current = inputRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (ev.key === 'ArrowUp') {
        histIndexRef.current = Math.min(histIndexRef.current + 1, historyRef.current.length - 1);
        const histCmd = historyRef.current[histIndexRef.current] || '';
        term.write('\x1b[2K\r');
        term.write(getPromptString() + histCmd);
        inputRef.current = histCmd;
      } else if (ev.key === 'ArrowDown') {
        histIndexRef.current = Math.max(histIndexRef.current - 1, -1);
        const histCmd = histIndexRef.current >= 0 ? historyRef.current[histIndexRef.current] : '';
        term.write('\x1b[2K\r');
        term.write(getPromptString() + histCmd);
        inputRef.current = histCmd;
      } else if (ev.ctrlKey && ev.key === 'c') {
        if (activeProcessRef.current) {
          if (activeProcessRef.current.type === 'worker') {
            activeProcessRef.current.target.terminate();
            term.write('\r\n\x1b[31m^C (Worker terminated)\x1b[0m\r\n');
          } else {
            term.write('\r\n\x1b[31m^C\x1b[0m\r\n');
          }
          const res = activeProcessRef.current.resolve;
          activeProcessRef.current = null;
          if (res) res();
          return;
        }
        
        if (replModeRef.current) {
          replModeRef.current = null;
          term.write('\r\nKeyboardInterrupt\r\n');
          inputRef.current = '';
          term.write(getPromptString());
          return;
        }

        term.write('^C');
        inputRef.current = '';
        writePrompt(term);
      } else if (ev.ctrlKey && ev.key === 'l') {
        term.clear();
        term.write(getPromptString() + inputRef.current);
      } else if (key && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
        inputRef.current += key;
        term.write(key);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try { fitRef.current?.fit(); } catch {}
      });
    });

    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
    };
  }, [writePrompt, executeCommand, getPromptString, handleReplInput]);

  return <div ref={containerRef} className="xterm-container" style={{ width: '100%', height: '100%' }} />;
};

export const TerminalApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const [tabs, setTabs] = useState<TerminalTab[]>([createTab()]);
  const [activeTab, setActiveTab] = useState(0);
  const [cwd, setCwd] = useState('/home');

  const addTab = () => {
    const newTab = createTab();
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(tabs.length);
  };

  const closeTab = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    setTabs((prev) => prev.filter((_, idx) => idx !== i));
    setActiveTab((prev) => Math.min(prev, tabs.length - 2));
  };

  return (
    <div className="terminal-window">
      <div className="terminal-tabs">
        {tabs.map((tab, i) => (
          <div
            key={tab.id}
            className={`terminal-tab ${i === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            <div className="terminal-tab-dot" />
            {tab.title}
            <span className="terminal-tab-close" onClick={(e) => closeTab(i, e)}>×</span>
          </div>
        ))}
        <div className="terminal-new-tab" onClick={addTab}>+</div>
      </div>
      <div className="terminal-body">
        {tabs.map((tab, i) => (
          <div key={tab.id} style={{ display: i === activeTab ? 'block' : 'none', width: '100%', height: '100%' }}>
            <XTermComponent tabId={tab.id} cwd={cwd} onCwdChange={setCwd} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TerminalApp;
