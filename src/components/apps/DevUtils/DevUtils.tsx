import React, { useState, useCallback } from 'react';

type Tool = 'base64' | 'url' | 'jwt' | 'hash' | 'uuid' | 'timestamp';

const TOOLS: { id: Tool; label: string; icon: string; desc: string }[] = [
  { id: 'base64', label: 'Base64', icon: '⊡', desc: 'Encode / Decode' },
  { id: 'url', label: 'URL', icon: '⊞', desc: 'Encode / Decode' },
  { id: 'jwt', label: 'JWT', icon: '◑', desc: 'Decode & Inspect' },
  { id: 'hash', label: 'Hash', icon: '#', desc: 'SHA-256 / SHA-1' },
  { id: 'uuid', label: 'UUID', icon: '⊕', desc: 'Generate UUIDs' },
  { id: 'timestamp', label: 'Epoch', icon: '⏱', desc: 'Convert Timestamp' },
];

async function sha256(msg: string) {
  const msgBuf = new TextEncoder().encode(msg);
  const hashBuf = await crypto.subtle.digest('SHA-256', msgBuf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha1(msg: string) {
  const msgBuf = new TextEncoder().encode(msg);
  const hashBuf = await crypto.subtle.digest('SHA-1', msgBuf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format (must have 3 parts)');
    const decode = (str: string) => JSON.parse(atob(str.replace(/-/g, '+').replace(/_/g, '/')));
    return { header: decode(parts[0]), payload: decode(parts[1]), signature: parts[2], valid: true };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

// Tool Panels
const Base64Tool = () => {
  const [input, setInput] = useState('Hello, DevAura OS!');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [output, setOutput] = useState('');
  const [err, setErr] = useState('');

  const run = useCallback(() => {
    try {
      setErr('');
      if (mode === 'encode') setOutput(btoa(unescape(encodeURIComponent(input))));
      else setOutput(decodeURIComponent(escape(atob(input))));
    } catch { setErr('Invalid input for ' + mode); }
  }, [input, mode]);

  React.useEffect(() => { run(); }, [run]);

  return (
    <ToolLayout label="Base64 Encoder / Decoder" actions={
      <div style={{ display: 'flex', gap: 6 }}>
        {(['encode', 'decode'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={btnStyle(mode === m)}>{m.toUpperCase()}</button>
        ))}
      </div>
    }>
      <SplitIO input={input} setInput={setInput} output={output} err={err} inputLabel="INPUT" outputLabel="OUTPUT" />
    </ToolLayout>
  );
};

const URLTool = () => {
  const [input, setInput] = useState('https://devaura.dev/api?name=hello world&v=2.0&emoji=✓');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const output = React.useMemo(() => {
    try { return mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input); }
    catch { return 'Invalid input'; }
  }, [input, mode]);

  return (
    <ToolLayout label="URL Encoder / Decoder" actions={
      <div style={{ display: 'flex', gap: 6 }}>
        {(['encode', 'decode'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={btnStyle(mode === m)}>{m.toUpperCase()}</button>
        ))}
      </div>
    }>
      <SplitIO input={input} setInput={setInput} output={output} err="" inputLabel="INPUT" outputLabel="OUTPUT" />
    </ToolLayout>
  );
};

const JWTTool = () => {
  const SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJEZXYgQXVyYSIsImlhdCI6MTcxNjM0NDAwMCwiZXhwIjoxNzE2NDMwNDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const [token, setToken] = useState(SAMPLE);
  const result = React.useMemo(() => decodeJWT(token), [token]);

  return (
    <ToolLayout label="JWT Token Decoder">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'auto' }}>
        <div style={{ flexShrink: 0 }}>
          <label style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>JWT TOKEN</label>
          <textarea value={token} onChange={e => setToken(e.target.value)} rows={3} spellCheck={false}
            style={{ width: '100%', background: 'var(--abyss)', border: '1px solid var(--border)', borderRadius: 6, padding: 8, fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-primary)', outline: 'none', resize: 'none', userSelect: 'text' }} />
        </div>
        {'error' in result && result.error ? (
          <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 6, padding: 10, fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--red)' }}>✗ {result.error}</div>
        ) : (
          <>
            {[['HEADER', (result as Record<string, unknown>).header], ['PAYLOAD', (result as Record<string, unknown>).payload]].map(([title, data]) => (
              <div key={title as string} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{title as string}</div>
                <pre style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', userSelect: 'text' }}>
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            ))}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>SIGNATURE</div>
              <span style={{ fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--violet)', wordBreak: 'break-all', userSelect: 'text' }}>
                {(result as { signature?: string }).signature}
              </span>
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
};

const HashTool = () => {
  const [input, setInput] = useState('DevAura OS');
  const [sha256Val, setSha256Val] = useState('');
  const [sha1Val, setSha1Val] = useState('');

  React.useEffect(() => {
    sha256(input).then(setSha256Val);
    sha1(input).then(setSha1Val);
  }, [input]);

  return (
    <ToolLayout label="Hash Generator">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>INPUT STRING</label>
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={3} spellCheck={false}
            style={{ width: '100%', background: 'var(--abyss)', border: '1px solid var(--border)', borderRadius: 6, padding: 8, fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--text-primary)', outline: 'none', resize: 'none', userSelect: 'text' }} />
        </div>
        {[['SHA-256', sha256Val, 'var(--green)'], ['SHA-1', sha1Val, 'var(--yellow)']].map(([label, val, color]) => (
          <HashRow key={label} label={label} value={val} color={color} />
        ))}
      </div>
    </ToolLayout>
  );
};

const HashRow = ({ label, value, color }: { label: string; value: string; color: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>
        <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          style={{ fontSize: 9, padding: '2px 8px', borderRadius: 3, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
      <div style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: color as string, wordBreak: 'break-all', userSelect: 'text' }}>{value || '—'}</div>
    </div>
  );
};

const UUIDTool = () => {
  const [uuids, setUuids] = useState<string[]>(() => Array.from({ length: 5 }, generateUUID));
  const [count, setCount] = useState(5);
  return (
    <ToolLayout label="UUID v4 Generator" actions={
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Count:</span>
        <input type="number" min={1} max={20} value={count} onChange={e => setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
          style={{ width: 48, background: 'var(--abyss)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', color: 'var(--text-primary)', fontSize: 11, outline: 'none', textAlign: 'center' }} />
        <button onClick={() => setUuids(Array.from({ length: count }, generateUUID))} style={btnStyle(false)}>
          ↻ REGENERATE
        </button>
      </div>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {uuids.map((u, i) => {
          const [c, setC] = useState(false);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--text-primary)', flex: 1, userSelect: 'text' }}>{u}</span>
              <button onClick={() => { navigator.clipboard.writeText(u); setC(true); setTimeout(() => setC(false), 1200); }}
                style={{ fontSize: 9, padding: '2px 8px', borderRadius: 3, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {c ? '✓' : 'Copy'}
              </button>
            </div>
          );
        })}
      </div>
    </ToolLayout>
  );
};

const TimestampTool = () => {
  const [epoch, setEpoch] = useState(String(Math.floor(Date.now() / 1000)));
  const [dateStr, setDateStr] = useState('');
  const now = new Date();

  const fromEpoch = React.useMemo(() => {
    const n = Number(epoch);
    if (isNaN(n)) return null;
    const ms = n > 1e12 ? n : n * 1000;
    return new Date(ms);
  }, [epoch]);

  return (
    <ToolLayout label="Epoch / Timestamp Converter">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
          <div style={labelStyle}>CURRENT TIME</div>
          <div style={{ fontFamily: 'var(--font-code)', fontSize: 13, color: 'var(--cyan)', marginTop: 2 }}>{Math.floor(Date.now() / 1000)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{now.toISOString()}</div>
        </div>
        <div>
          <label style={labelStyle}>EPOCH TIMESTAMP (seconds or ms)</label>
          <input value={epoch} onChange={e => setEpoch(e.target.value)}
            style={{ width: '100%', background: 'var(--abyss)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontFamily: 'var(--font-code)', fontSize: 13, color: 'var(--text-primary)', outline: 'none', marginTop: 4 }} />
        </div>
        {fromEpoch && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              ['ISO 8601', fromEpoch.toISOString()],
              ['UTC', fromEpoch.toUTCString()],
              ['Local', fromEpoch.toLocaleString()],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0, paddingTop: 1 }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-primary)', textAlign: 'right', userSelect: 'text' }}>{val}</span>
              </div>
            ))}
          </div>
        )}
        <div>
          <label style={labelStyle}>DATE → EPOCH</label>
          <input type="datetime-local" value={dateStr} onChange={e => setDateStr(e.target.value)}
            style={{ width: '100%', background: 'var(--abyss)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--text-primary)', outline: 'none', marginTop: 4 }} />
          {dateStr && (
            <div style={{ fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--green)', marginTop: 6 }}>
              {Math.floor(new Date(dateStr).getTime() / 1000)}
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
};

// Shared helper components
const labelStyle: React.CSSProperties = { fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 };

const btnStyle = (active: boolean): React.CSSProperties => ({
  fontSize: 9, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', letterSpacing: 0.5, textTransform: 'uppercase' as const,
  border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
  background: active ? 'var(--cyan-dim)' : 'transparent',
  color: active ? 'var(--cyan)' : 'var(--text-secondary)',
});

const ToolLayout: React.FC<{ label: string; actions?: React.ReactNode; children: React.ReactNode }> = ({ label, actions, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: 0.5 }}>{label}</span>
      <div style={{ flex: 1 }} />
      {actions}
    </div>
    <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>{children}</div>
  </div>
);

const SplitIO = ({ input, setInput, output, err, inputLabel, outputLabel }: { input: string; setInput: (v: string) => void; output: string; err: string; inputLabel: string; outputLabel: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={labelStyle}>{inputLabel}</label>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={4} spellCheck={false}
          style={{ width: '100%', background: 'var(--abyss)', border: '1px solid var(--border)', borderRadius: 6, padding: 8, fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--text-primary)', outline: 'none', resize: 'none', userSelect: 'text' }} />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <label style={labelStyle}>{outputLabel}</label>
          <button onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
            style={{ fontSize: 9, padding: '2px 8px', borderRadius: 3, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        {err ? (
          <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 6, padding: 8, fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--red)' }}>{err}</div>
        ) : (
          <div style={{ background: 'var(--abyss)', border: '1px solid var(--border)', borderRadius: 6, padding: 8, fontFamily: 'var(--font-code)', fontSize: 12, color: 'var(--green)', wordBreak: 'break-all', userSelect: 'text', minHeight: 60 }}>{output}</div>
        )}
      </div>
    </div>
  );
};

export const DevUtilsApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const [activeTool, setActiveTool] = useState<Tool>('base64');

  const TOOL_COMPONENTS: Record<Tool, React.ReactNode> = {
    base64: <Base64Tool />,
    url: <URLTool />,
    jwt: <JWTTool />,
    hash: <HashTool />,
    uuid: <UUIDTool />,
    timestamp: <TimestampTool />,
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--abyss)' }}>
      {/* Sidebar */}
      <div style={{ width: 120, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
        <div style={{ fontSize: 8, letterSpacing: 2, color: 'var(--text-muted)', padding: '4px 12px 8px', textTransform: 'uppercase' }}>Tools</div>
        {TOOLS.map(tool => (
          <button key={tool.id} onClick={() => setActiveTool(tool.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px', gap: 2,
            background: activeTool === tool.id ? 'var(--cyan-dim)' : 'transparent',
            borderLeft: `2px solid ${activeTool === tool.id ? 'var(--cyan)' : 'transparent'}`,
            border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', width: '100%', textAlign: 'left',
          }}>
            <span style={{ fontSize: 13, color: activeTool === tool.id ? 'var(--cyan)' : 'var(--text-secondary)', fontFamily: 'var(--font-code)' }}>{tool.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: activeTool === tool.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{tool.label}</span>
            <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>{tool.desc}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {TOOL_COMPONENTS[activeTool]}
      </div>
    </div>
  );
};

export default DevUtilsApp;
