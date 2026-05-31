import React, { useState, useCallback } from 'react';

interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon: string;
  isLoading: boolean;
}

const QUICK_LINKS = [
  { icon: '🔍', title: 'Google', url: 'https://www.google.com' },
  { icon: '📦', title: 'npm', url: 'https://www.npmjs.com' },
  { icon: '🐙', title: 'GitHub', url: 'https://github.com' },
  { icon: '📖', title: 'MDN Docs', url: 'https://developer.mozilla.org' },
  { icon: '🟦', title: 'TypeScript', url: 'https://www.typescriptlang.org' },
  { icon: '⚡', title: 'Vite Docs', url: 'https://vitejs.dev' },
  { icon: '◆', title: 'Gemini', url: 'https://gemini.google.com' },
  { icon: '🎨', title: 'TailwindCSS', url: 'https://tailwindcss.com' },
];

let tabIdCounter = 0;

const createTab = (url = '', title = 'New Tab'): BrowserTab => ({
  id: `btab-${++tabIdCounter}`,
  url,
  title,
  favicon: '🌐',
  isLoading: false,
});

export const BrowserApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = ({ appProps }) => {
  const [tabs, setTabs] = useState<BrowserTab[]>(() => {
    if (appProps?.url) {
      const urlStr = appProps.url as string;
      const title = urlStr.split('/').pop() || 'Preview';
      return [createTab(urlStr, title)];
    }
    return [createTab()];
  });
  const [activeTab, setActiveTab] = useState(0);
  const [inputUrl, setInputUrl] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const currentTab = tabs[activeTab];

  const navigate = useCallback(
    (url: string) => {
      let finalUrl = url.trim();
      if (!finalUrl) return;

      // Intercept local preview
      if (
        finalUrl.startsWith('localhost') || 
        finalUrl.startsWith('http://localhost') || 
        finalUrl.startsWith('127.0.0.1') || 
        finalUrl.startsWith('http://127.0.0.1')
      ) {
        const path = finalUrl
          .replace(/^https?:\/\//, '')
          .replace(/^localhost(:\d+)?\/?/, '')
          .replace(/^127\.0\.0\.1(:\d+)?\/?/, '');
        finalUrl = window.location.origin + '/preview/' + path;
      }

      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && finalUrl.includes('.')) {
        finalUrl = 'https://' + finalUrl;
      } else if (!finalUrl.startsWith('http') && !finalUrl.includes('.')) {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
      }

      const title = (() => {
        try { return new URL(finalUrl).hostname; } catch { return finalUrl; }
      })();

      setTabs((prev) =>
        prev.map((t, i) =>
          i === activeTab
            ? { ...t, url: finalUrl, title, isLoading: true }
            : t
        )
      );
      setInputUrl('');
      setIframeKey((k) => k + 1);

      // Simulate loading done
      setTimeout(() => {
        setTabs((prev) =>
          prev.map((t, i) => (i === activeTab ? { ...t, isLoading: false } : t))
        );
      }, 1500);
    },
    [activeTab]
  );

  const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigate(inputUrl || currentTab.url);
    }
  };

  const addTab = () => {
    setTabs((prev) => [...prev, createTab()]);
    setActiveTab(tabs.length);
    setInputUrl('');
  };

  const closeTab = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    setTabs((prev) => prev.filter((_, idx) => idx !== i));
    setActiveTab((prev) => Math.min(prev, tabs.length - 2));
  };

  const displayUrl = inputFocused ? inputUrl : (currentTab.url || '');

  return (
    <div className="browser-window">
      {/* Navigation Bar */}
      <div className="browser-navbar">
        <button
          className="browser-nav-btn"
          onClick={() => window.history.back()}
          data-tooltip="Back"
        >
          ←
        </button>
        <button
          className="browser-nav-btn"
          onClick={() => window.history.forward()}
          data-tooltip="Forward"
        >
          →
        </button>
        <button
          className="browser-nav-btn"
          onClick={() => { setIframeKey((k) => k + 1); }}
          data-tooltip="Refresh"
        >
          ↻
        </button>

        <div className="browser-address-bar">
          <span className="browser-scheme">
            {currentTab.url ? '🔒' : '◉'}
          </span>
          <input
            className="browser-url-input"
            value={displayUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onFocus={() => { setInputFocused(true); setInputUrl(currentTab.url); }}
            onBlur={() => setInputFocused(false)}
            onKeyDown={handleAddressKeyDown}
            placeholder="Search or enter URL..."
            spellCheck={false}
          />
          {currentTab.isLoading && (
            <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--cyan)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          )}
        </div>

        <button className="browser-nav-btn" data-tooltip="Bookmark">☆</button>
        <button className="browser-nav-btn" data-tooltip="Extensions">⬙</button>
      </div>

      {/* Tabs */}
      <div className="browser-tabs">
        {tabs.map((tab, i) => (
          <div
            key={tab.id}
            className={`browser-tab ${i === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            <span className="browser-tab-favicon">{tab.favicon}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11 }}>
              {tab.title || 'New Tab'}
            </span>
            <span
              style={{ marginLeft: 4, opacity: 0.6, cursor: 'pointer', fontSize: 11 }}
              onClick={(e) => closeTab(i, e)}
            >
              ×
            </span>
          </div>
        ))}
        <div className="browser-new-tab" onClick={addTab}>+</div>
      </div>

      {/* Content */}
      <div className="browser-content">
        {currentTab.url ? (
          <>
            {currentTab.isLoading && <div className="browser-loading" />}
            <iframe
              key={iframeKey}
              src={currentTab.url}
              className="browser-iframe"
              sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
              title={currentTab.title}
              {...{ credentialless: "true" }}
              onLoad={() =>
                setTabs((prev) =>
                  prev.map((t, i) => (i === activeTab ? { ...t, isLoading: false } : t))
                )
              }
            />
          </>
        ) : (
          // New Tab Page
          <div
            style={{
              padding: '40px 32px',
              background: 'var(--abyss)',
              height: '100%',
              overflowY: 'auto',
            }}
          >
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  letterSpacing: 4,
                  color: 'var(--text-muted)',
                  marginBottom: 24,
                  textAlign: 'center',
                }}
              >
                DEV AURA BROWSER
              </h2>
              {/* Search */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 32,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 16px',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>🔍</span>
                <input
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: 'var(--text-primary)', fontSize: 14, fontFamily: 'var(--font-ui)',
                  }}
                  placeholder="Search the web or enter a URL..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate((e.target as HTMLInputElement).value);
                  }}
                  autoFocus
                />
              </div>
              {/* Quick Links */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                }}
              >
                {QUICK_LINKS.map((link) => (
                  <div
                    key={link.url}
                    onClick={() => navigate(link.url)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 8, padding: '14px 8px', background: 'var(--surface)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                      cursor: 'pointer', transition: 'all 0.12s', textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--cyan)';
                      e.currentTarget.style.background = 'var(--cyan-dim)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.background = 'var(--surface)';
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{link.icon}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{link.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
