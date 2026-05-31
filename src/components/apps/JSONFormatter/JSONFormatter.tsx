import React, { useState, useCallback } from 'react';

type JsonNode = string | number | boolean | null | JsonNode[] | { [key: string]: JsonNode };

const SAMPLE_JSON = `{
  "project": "DevAura OS",
  "version": "2.0.0",
  "stack": ["React", "TypeScript", "Vite"],
  "ai": {
    "engine": "Gemini 2.0 Flash",
    "context": true,
    "fileWrite": true
  },
  "features": 12,
  "stable": true,
  "deprecated": null
}`;

interface TreeNodeProps {
  keyName?: string;
  value: JsonNode;
  depth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ keyName, value, depth }) => {
  const [collapsed, setCollapsed] = useState(depth > 2);
  const isObj = typeof value === 'object' && value !== null && !Array.isArray(value);
  const isArr = Array.isArray(value);
  const isComplex = isObj || isArr;
  const entries = isObj ? Object.entries(value as Record<string, JsonNode>) : isArr ? (value as JsonNode[]).map((v, i) => [String(i), v] as [string, JsonNode]) : [];

  const getValueColor = (v: JsonNode): string => {
    if (v === null) return 'var(--red)';
    if (typeof v === 'boolean') return 'var(--yellow)';
    if (typeof v === 'number') return '#60a5fa';
    if (typeof v === 'string') return 'var(--green)';
    return 'var(--text-primary)';
  };

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0, fontFamily: 'var(--font-code)', fontSize: 12, lineHeight: 1.8 }}>
      <span>
        {keyName !== undefined && (
          <span style={{ color: '#c084fc' }}>"{keyName}"<span style={{ color: 'var(--text-muted)' }}>: </span></span>
        )}
        {isComplex ? (
          <span
            onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: 'pointer', userSelect: 'none', color: 'var(--text-secondary)' }}
          >
            <span style={{ color: '#facc15', marginRight: 4 }}>{collapsed ? '▶' : '▼'}</span>
            <span style={{ color: 'var(--text-muted)' }}>{isArr ? '[' : '{'}</span>
            {collapsed && (
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}> {entries.length} items </span>
            )}
            {collapsed && <span style={{ color: 'var(--text-muted)' }}>{isArr ? ']' : '}'}</span>}
          </span>
        ) : (
          <span style={{ color: getValueColor(value) }}>
            {value === null ? 'null' : typeof value === 'string' ? `"${value}"` : String(value)}
          </span>
        )}
      </span>
      {isComplex && !collapsed && (
        <div>
          {entries.map(([k, v]) => (
            <TreeNode key={k} keyName={isArr ? undefined : k} value={v} depth={depth + 1} />
          ))}
          <span style={{ color: 'var(--text-muted)' }}>{isArr ? ']' : '}'}</span>
        </div>
      )}
    </div>
  );
};

export const JSONFormatterApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [parsed, setParsed] = useState<JsonNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'tree' | 'formatted' | 'minified'>('tree');
  const [spaces, setSpaces] = useState(2);
  const [copied, setCopied] = useState(false);

  const parseAndFormat = useCallback((raw: string, m: 'tree' | 'formatted' | 'minified', sp: number) => {
    try {
      const obj = JSON.parse(raw);
      setParsed(obj);
      setError(null);
      if (m === 'tree') {
        setOutput('');
      } else if (m === 'formatted') {
        setOutput(JSON.stringify(obj, null, sp));
      } else {
        setOutput(JSON.stringify(obj));
      }
    } catch (e: unknown) {
      setParsed(null);
      setError((e as Error).message);
      setOutput('');
    }
  }, []);

  const handleInput = (v: string) => {
    setInput(v);
    parseAndFormat(v, mode, spaces);
  };

  const handleMode = (m: 'tree' | 'formatted' | 'minified') => {
    setMode(m);
    parseAndFormat(input, m, spaces);
  };

  const handleSpaces = (sp: number) => {
    setSpaces(sp);
    if (mode === 'formatted') parseAndFormat(input, mode, sp);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mode === 'tree' ? input : output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  React.useEffect(() => { parseAndFormat(input, mode, spaces); }, []);

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--abyss)', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        borderBottom: '1px solid var(--border)', background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>MODE</span>
        {(['tree', 'formatted', 'minified'] as const).map(m => (
          <button
            key={m}
            className="btn"
            onClick={() => handleMode(m)}
            style={{
              fontSize: 10, padding: '3px 10px', letterSpacing: 1,
              background: mode === m ? 'var(--cyan)' : 'transparent',
              color: mode === m ? 'var(--void)' : 'var(--text-secondary)',
              border: `1px solid ${mode === m ? 'var(--cyan)' : 'var(--border)'}`,
              borderRadius: 4, cursor: 'pointer', textTransform: 'uppercase',
            }}
          >{m}</button>
        ))}
        {mode === 'formatted' && (
          <>
            <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>INDENT</span>
            {[2, 4].map(n => (
              <button key={n} className="btn" onClick={() => handleSpaces(n)} style={{
                fontSize: 10, padding: '2px 8px', cursor: 'pointer',
                background: spaces === n ? 'var(--cyan-dim)' : 'transparent',
                color: spaces === n ? 'var(--cyan)' : 'var(--text-muted)',
                border: `1px solid ${spaces === n ? 'var(--cyan)' : 'var(--border)'}`, borderRadius: 3,
              }}>{n}sp</button>
            ))}
          </>
        )}
        <div style={{ flex: 1 }} />
        {error && <span style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'var(--font-code)' }}>✗ {error}</span>}
        {!error && parsed !== null && <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--font-code)' }}>✓ Valid JSON</span>}
        <button className="btn" onClick={handleCopy} style={{ fontSize: 10, padding: '3px 10px', cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-secondary)', background: 'transparent' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <button className="btn" onClick={() => { setInput(''); setParsed(null); setError(null); setOutput(''); }} style={{ fontSize: 10, padding: '3px 10px', cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', background: 'transparent' }}>
          Clear
        </button>
      </div>

      {/* Main panels */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', padding: '6px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', textTransform: 'uppercase' }}>
            ▸ INPUT
          </div>
          <textarea
            value={input}
            onChange={e => handleInput(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1, background: 'var(--abyss)', color: 'var(--text-primary)',
              border: 'none', outline: 'none', padding: 12,
              fontFamily: 'var(--font-code)', fontSize: 12, lineHeight: 1.7,
              resize: 'none', userSelect: 'text',
            }}
            placeholder="Paste JSON here..."
          />
        </div>

        {/* Output / Tree */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', padding: '6px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', textTransform: 'uppercase' }}>
            ▸ {mode === 'tree' ? 'INTERACTIVE TREE' : mode === 'formatted' ? 'FORMATTED' : 'MINIFIED'}
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {error && (
              <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 6, padding: 12, fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--red)' }}>
                <div style={{ marginBottom: 4, fontWeight: 700 }}>✗ Parse Error</div>
                {error}
              </div>
            )}
            {!error && mode === 'tree' && parsed !== null && (
              <TreeNode value={parsed} depth={0} />
            )}
            {!error && mode !== 'tree' && output && (
              <pre style={{ fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.7, userSelect: 'text', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {output}
              </pre>
            )}
            {!error && !output && mode === 'tree' && !parsed && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>
                Paste JSON in the left panel to get started
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JSONFormatterApp;
