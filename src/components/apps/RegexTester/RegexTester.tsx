import React, { useState, useEffect, useRef, useCallback } from 'react';

const SAMPLE_TEXT = `Hello world! This is a sample text for regex testing.
Phone: +1-800-555-0123
Email: dev@aura.os
URL: https://devaura.dev/api/v2
Date: 2026-05-22
Hex Color: #1a2b3c
IPv4: 192.168.1.100`;

const PRESETS = [
  { name: 'Email', pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}', flags: 'gi' },
  { name: 'URL', pattern: 'https?:\\/\\/[^\\s]+', flags: 'gi' },
  { name: 'Phone', pattern: '\\+?[1-9][\\d\\s\\-().]{7,}\\d', flags: 'g' },
  { name: 'Hex Color', pattern: '#[0-9a-fA-F]{3,6}', flags: 'gi' },
  { name: 'IPv4', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: 'g' },
  { name: 'Date', pattern: '\\d{4}-\\d{2}-\\d{2}', flags: 'g' },
  { name: 'Numbers', pattern: '-?\\d+(\\.\\d+)?', flags: 'g' },
];

const FLAG_LIST = ['g', 'i', 'm', 's', 'u', 'y'] as const;
type Flag = typeof FLAG_LIST[number];

interface Match {
  value: string;
  index: number;
  groups: (string | undefined)[];
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const RegexTesterApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const [pattern, setPattern] = useState('[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}');
  const [flags, setFlags] = useState<Set<Flag>>(new Set(['g', 'i']));
  const [testText, setTestText] = useState(SAMPLE_TEXT);
  const [matches, setMatches] = useState<Match[]>([]);
  const [regexError, setRegexError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState('');
  const highlightRef = useRef<HTMLDivElement>(null);

  const COLORS = ['rgba(251,191,36,0.3)', 'rgba(96,165,250,0.3)', 'rgba(52,211,153,0.3)', 'rgba(248,113,113,0.3)', 'rgba(192,132,252,0.3)'];

  const compute = useCallback(() => {
    if (!pattern) { setMatches([]); setRegexError(null); setHighlighted(escapeHtml(testText)); return; }
    try {
      const flagStr = Array.from(flags).join('');
      const re = new RegExp(pattern, flagStr.includes('g') ? flagStr : flagStr + 'g');
      const found: Match[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(testText)) !== null) {
        found.push({ value: m[0], index: m.index, groups: m.slice(1) });
        if (!flagStr.includes('g')) break;
      }
      setMatches(found);
      setRegexError(null);

      // Build highlighted HTML
      let result = '';
      let lastIdx = 0;
      found.forEach((match, i) => {
        result += escapeHtml(testText.slice(lastIdx, match.index));
        const color = COLORS[i % COLORS.length];
        result += `<mark style="background:${color};border-radius:2px;padding:0 1px;">${escapeHtml(match.value)}</mark>`;
        lastIdx = match.index + match.value.length;
      });
      result += escapeHtml(testText.slice(lastIdx));
      setHighlighted(result.replace(/\n/g, '<br/>'));
    } catch (e: unknown) {
      setRegexError((e as Error).message);
      setMatches([]);
      setHighlighted(escapeHtml(testText));
    }
  }, [pattern, flags, testText]);

  useEffect(() => { compute(); }, [compute]);

  const toggleFlag = (f: Flag) => {
    setFlags(prev => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    setPattern(p.pattern);
    setFlags(new Set(p.flags.split('') as Flag[]));
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--abyss)', flexDirection: 'column' }}>
      {/* Regex Input Bar */}
      <div style={{ flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-code)', fontSize: 16, color: 'var(--text-muted)' }}>/</span>
          <input
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            style={{
              flex: 1, background: 'var(--abyss)', border: `1px solid ${regexError ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 6, padding: '6px 10px', fontFamily: 'var(--font-code)', fontSize: 13,
              color: regexError ? 'var(--red)' : 'var(--text-primary)', outline: 'none',
            }}
            placeholder="Enter regex pattern..."
            spellCheck={false}
          />
          <span style={{ fontFamily: 'var(--font-code)', fontSize: 16, color: 'var(--text-muted)' }}>/</span>
          {FLAG_LIST.map(f => (
            <button key={f} onClick={() => toggleFlag(f)} style={{
              width: 22, height: 22, borderRadius: 4, border: `1px solid ${flags.has(f) ? 'var(--cyan)' : 'var(--border)'}`,
              background: flags.has(f) ? 'var(--cyan-dim)' : 'transparent',
              color: flags.has(f) ? 'var(--cyan)' : 'var(--text-muted)', fontFamily: 'var(--font-code)',
              fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{f}</button>
          ))}
        </div>
        {/* Presets */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1.5, textTransform: 'uppercase' }}>Presets</span>
          {PRESETS.map(p => (
            <button key={p.name} onClick={() => applyPreset(p)} style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 3, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', letterSpacing: 0.5,
            }}>{p.name}</button>
          ))}
        </div>
        {regexError && <div style={{ fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--red)' }}>✗ {regexError}</div>}
      </div>

      {/* Body split */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left — Test text + highlighted */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', padding: '6px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
            <span>▸ TEST STRING</span>
            <span style={{ color: matches.length > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </span>
          </div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <textarea
              value={testText}
              onChange={e => setTestText(e.target.value)}
              spellCheck={false}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '50%',
                background: 'var(--abyss)', border: 'none', borderBottom: '1px solid var(--border)',
                outline: 'none', padding: 12, fontFamily: 'var(--font-code)', fontSize: 12,
                lineHeight: 1.7, resize: 'none', color: 'var(--text-primary)', userSelect: 'text',
              }}
            />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, bottom: 0 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', padding: '6px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', textTransform: 'uppercase' }}>▸ HIGHLIGHTED PREVIEW</div>
              <div
                ref={highlightRef}
                dangerouslySetInnerHTML={{ __html: highlighted }}
                style={{
                  padding: '10px 12px', fontFamily: 'var(--font-code)', fontSize: 12,
                  lineHeight: 1.7, color: 'var(--text-secondary)', overflow: 'auto',
                  height: 'calc(100% - 28px)', userSelect: 'text',
                }}
              />
            </div>
          </div>
        </div>

        {/* Right — Match list */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', padding: '6px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', textTransform: 'uppercase' }}>▸ MATCH RESULTS</div>
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px' }}>
            {matches.length === 0 && !regexError && (
              <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', paddingTop: 30 }}>No matches found</div>
            )}
            {matches.map((m, i) => (
              <div key={i} style={{ marginBottom: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>Match {i + 1}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>idx: {m.index}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--green)', wordBreak: 'break-all', background: COLORS[i % COLORS.length], borderRadius: 3, padding: '2px 6px', display: 'inline-block' }}>
                  {m.value}
                </div>
                {m.groups.some(g => g !== undefined) && (
                  <div style={{ marginTop: 4 }}>
                    {m.groups.map((g, gi) => g !== undefined && (
                      <div key={gi} style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>
                        Group {gi + 1}: <span style={{ color: 'var(--text-secondary)' }}>{g}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegexTesterApp;
