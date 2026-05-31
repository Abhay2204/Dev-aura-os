import React, { useState, useCallback } from 'react';

const SAMPLE_A = `function greet(name) {
  console.log("Hello, " + name + "!");
  return true;
}

const VERSION = "1.0.0";
const DEBUG = false;
`;

const SAMPLE_B = `function greet(name, greeting = "Hello") {
  console.log(greeting + ", " + name + "!");
  console.log("Welcome to DevAura OS");
  return greeting;
}

const VERSION = "2.0.0";
`;

type DiffType = 'equal' | 'added' | 'removed';
interface DiffLine { type: DiffType; text: string; lineA?: number; lineB?: number; }

function computeDiff(aText: string, bText: string): DiffLine[] {
  const aLines = aText.split('\n');
  const bLines = bText.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based line diff
  const n = aLines.length;
  const m = bLines.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    if (aLines[i] === bLines[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
    else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
  }

  let i = 0, j = 0, lineA = 1, lineB = 1;
  while (i < n || j < m) {
    if (i < n && j < m && aLines[i] === bLines[j]) {
      result.push({ type: 'equal', text: aLines[i], lineA, lineB });
      i++; j++; lineA++; lineB++;
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ type: 'added', text: bLines[j], lineB });
      j++; lineB++;
    } else {
      result.push({ type: 'removed', text: aLines[i], lineA });
      i++; lineA++;
    }
  }
  return result;
}

export const DiffViewerApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const [textA, setTextA] = useState(SAMPLE_A);
  const [textB, setTextB] = useState(SAMPLE_B);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  const diff = useCallback(() => computeDiff(textA, textB), [textA, textB])();

  const added = diff.filter(d => d.type === 'added').length;
  const removed = diff.filter(d => d.type === 'removed').length;

  const lineStyle = (type: DiffType): React.CSSProperties => ({
    background: type === 'added' ? 'rgba(52,211,153,0.1)' : type === 'removed' ? 'rgba(248,113,113,0.1)' : 'transparent',
    borderLeft: `2px solid ${type === 'added' ? 'var(--green)' : type === 'removed' ? 'var(--red)' : 'transparent'}`,
    display: 'flex', alignItems: 'flex-start', minHeight: 21,
  });

  const lineNumStyle: React.CSSProperties = {
    width: 32, flexShrink: 0, fontFamily: 'var(--font-code)', fontSize: 10,
    color: 'var(--text-muted)', padding: '0 6px', textAlign: 'right', userSelect: 'none',
    borderRight: '1px solid var(--border)',
  };

  const lineTextStyle = (type: DiffType): React.CSSProperties => ({
    flex: 1, fontFamily: 'var(--font-code)', fontSize: 12, lineHeight: 1.7,
    padding: '0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    color: type === 'added' ? 'var(--green)' : type === 'removed' ? 'var(--red)' : 'var(--text-primary)',
  });

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--abyss)', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)' }}>View</span>
        {(['split', 'unified'] as const).map(v => (
          <button key={v} onClick={() => setViewMode(v)} style={{
            fontSize: 10, padding: '3px 10px', borderRadius: 4, cursor: 'pointer',
            border: `1px solid ${viewMode === v ? 'var(--cyan)' : 'var(--border)'}`,
            background: viewMode === v ? 'var(--cyan-dim)' : 'transparent',
            color: viewMode === v ? 'var(--cyan)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5,
          }}>{v}</button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: 'var(--green)' }}>+{added} added</span>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-code)', color: 'var(--red)' }}>-{removed} removed</span>
      </div>

      {/* Editor inputs */}
      {viewMode === 'split' && (
        <div style={{ display: 'flex', height: '40%', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          {(['A', 'B'] as const).map((side, idx) => (
            <div key={side} style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: idx === 0 ? '1px solid var(--border)' : undefined }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', padding: '5px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', textTransform: 'uppercase', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: idx === 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{idx === 0 ? '−' : '+'}</span>
                <span>Original {side}</span>
              </div>
              <textarea
                value={idx === 0 ? textA : textB}
                onChange={e => idx === 0 ? setTextA(e.target.value) : setTextB(e.target.value)}
                spellCheck={false}
                style={{
                  flex: 1, background: 'var(--abyss)', border: 'none', outline: 'none',
                  padding: 10, fontFamily: 'var(--font-code)', fontSize: 12, lineHeight: 1.7,
                  resize: 'none', color: 'var(--text-primary)', userSelect: 'text',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Diff output */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', padding: '6px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 2 }}>▸ DIFF OUTPUT</div>
        {viewMode === 'unified' ? (
          <div>
            {diff.map((line, i) => (
              <div key={i} style={lineStyle(line.type)}>
                <span style={lineNumStyle}>{line.lineA ?? ''}</span>
                <span style={lineNumStyle}>{line.lineB ?? ''}</span>
                <span style={{ ...lineTextStyle(line.type), paddingLeft: 14 }}>
                  {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}{line.text}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex' }}>
            {/* Left side — original */}
            <div style={{ flex: 1, borderRight: '1px solid var(--border)' }}>
              {diff.map((line, i) => line.type !== 'added' ? (
                <div key={i} style={lineStyle(line.type === 'removed' ? 'removed' : 'equal')}>
                  <span style={lineNumStyle}>{line.lineA}</span>
                  <span style={lineTextStyle(line.type === 'removed' ? 'removed' : 'equal')}>{line.text}</span>
                </div>
              ) : (
                <div key={i} style={{ ...lineStyle('equal'), opacity: 0 }}>
                  <span style={lineNumStyle}> </span>
                  <span style={lineTextStyle('equal')}> </span>
                </div>
              ))}
            </div>
            {/* Right side — modified */}
            <div style={{ flex: 1 }}>
              {diff.map((line, i) => line.type !== 'removed' ? (
                <div key={i} style={lineStyle(line.type === 'added' ? 'added' : 'equal')}>
                  <span style={lineNumStyle}>{line.lineB}</span>
                  <span style={lineTextStyle(line.type === 'added' ? 'added' : 'equal')}>{line.text}</span>
                </div>
              ) : (
                <div key={i} style={{ ...lineStyle('equal'), opacity: 0 }}>
                  <span style={lineNumStyle}> </span>
                  <span style={lineTextStyle('equal')}> </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* If unified mode — show editor inputs below */}
      {viewMode === 'unified' && (
        <div style={{ display: 'flex', height: '32%', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
          {(['A', 'B'] as const).map((side, idx) => (
            <div key={side} style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: idx === 0 ? '1px solid var(--border)' : undefined }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', padding: '5px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', textTransform: 'uppercase', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: idx === 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{idx === 0 ? '−' : '+'}</span>
                Original {side}
              </div>
              <textarea
                value={idx === 0 ? textA : textB}
                onChange={e => idx === 0 ? setTextA(e.target.value) : setTextB(e.target.value)}
                spellCheck={false}
                style={{ flex: 1, background: 'var(--abyss)', border: 'none', outline: 'none', padding: 10, fontFamily: 'var(--font-code)', fontSize: 12, lineHeight: 1.7, resize: 'none', color: 'var(--text-primary)', userSelect: 'text' }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiffViewerApp;
