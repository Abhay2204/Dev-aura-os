import React, { useState } from 'react';

interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

export const APIClientApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'params'>('params');
  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true }
  ]);
  const [params, setParams] = useState<KeyValuePair[]>([
    { key: '', value: '', enabled: true }
  ]);
  const [body, setBody] = useState('{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}');
  
  const [response, setResponse] = useState<any>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState<number | null>(null);
  const [sizeBytes, setSizeBytes] = useState<number | null>(null);
  const [activeResponseTab, setActiveResponseTab] = useState<'body' | 'headers'>('body');

  // Keep URL parameters in sync
  const updateUrlFromParams = (currentParams: KeyValuePair[]) => {
    try {
      const urlObj = new URL(url.split('?')[0]);
      currentParams.forEach(p => {
        if (p.enabled && p.key) {
          urlObj.searchParams.set(p.key, p.value);
        }
      });
      setUrl(urlObj.toString());
    } catch {
      // Ignore if URL is not fully formed yet
    }
  };

  const handleParamChange = (index: number, field: 'key' | 'value' | 'enabled', val: any) => {
    const updated = [...params];
    updated[index] = { ...updated[index], [field]: val };
    setParams(updated);
    
    // Auto-add new empty row
    if (index === updated.length - 1 && (updated[index].key || updated[index].value)) {
      setParams([...updated, { key: '', value: '', enabled: true }]);
    }
    
    updateUrlFromParams(updated);
  };

  const handleHeaderChange = (index: number, field: 'key' | 'value' | 'enabled', val: any) => {
    const updated = [...headers];
    updated[index] = { ...updated[index], [field]: val };
    setHeaders(updated);
    
    if (index === updated.length - 1 && (updated[index].key || updated[index].value)) {
      setHeaders([...updated, { key: '', value: '', enabled: true }]);
    }
  };

  const executeRequest = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResponse(null);
    setStatus(null);
    setTimeElapsed(null);
    setSizeBytes(null);

    const startTime = performance.now();
    const requestHeaders = new Headers();
    headers.forEach(h => {
      if (h.enabled && h.key && h.value) {
        requestHeaders.append(h.key, h.value);
      }
    });

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (method !== 'GET' && body.trim()) {
      requestOptions.body = body;
    }

    try {
      const res = await fetch(url, requestOptions);
      const endTime = performance.now();
      
      setStatus(res.status);
      setStatusText(res.statusText);
      setTimeElapsed(Math.round(endTime - startTime));

      // Extract Headers
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });
      setResponseHeaders(resHeaders);

      const text = await res.text();
      setSizeBytes(text.length);

      try {
        const json = JSON.parse(text);
        setResponse(json);
      } catch {
        setResponse(text);
      }
    } catch (err: any) {
      const endTime = performance.now();
      setStatus(0);
      setStatusText('CORS Blocked / Network Error');
      setTimeElapsed(Math.round(endTime - startTime));
      setResponse({
        error: err.message || 'Failed to fetch',
        message: 'Could not connect to URL. If this is a client-side CORS error, ensure the API endpoint has CORS enabled or supports requests from browser client applications.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apiclient-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--void)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: '12px' }}>
      
      {/* Request Row */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <select
          value={method}
          onChange={(e: any) => setMethod(e.target.value)}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            padding: '6px 12px',
            fontSize: '12px',
            fontFamily: 'var(--font-code)',
            fontWeight: 'bold',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/endpoint"
          style={{
            flex: 1,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            padding: '6px 12px',
            fontFamily: 'var(--font-code)',
            fontSize: '12px',
            outline: 'none'
          }}
        />

        <button
          onClick={executeRequest}
          disabled={loading}
          className="btn"
          style={{
            background: 'var(--text-primary)',
            color: 'var(--void)',
            fontWeight: 'bold',
            padding: '6px 16px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            border: 'none',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'SENDING...' : 'SEND'}
        </button>
      </div>

      {/* Tabs list */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button
          onClick={() => setActiveTab('params')}
          style={{
            background: activeTab === 'params' ? 'var(--void)' : 'none',
            border: 'none',
            borderRight: '1px solid var(--border)',
            borderBottom: activeTab === 'params' ? '1px solid transparent' : 'none',
            color: activeTab === 'params' ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: activeTab === 'params' ? 'bold' : 'normal'
          }}
        >
          PARAMS
        </button>
        <button
          onClick={() => setActiveTab('headers')}
          style={{
            background: activeTab === 'headers' ? 'var(--void)' : 'none',
            border: 'none',
            borderRight: '1px solid var(--border)',
            borderBottom: activeTab === 'headers' ? '1px solid transparent' : 'none',
            color: activeTab === 'headers' ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: activeTab === 'headers' ? 'bold' : 'normal'
          }}
        >
          HEADERS ({headers.filter(h => h.key && h.enabled).length})
        </button>
        <button
          onClick={() => setActiveTab('body')}
          style={{
            background: activeTab === 'body' ? 'var(--void)' : 'none',
            border: 'none',
            borderRight: '1px solid var(--border)',
            borderBottom: activeTab === 'body' ? '1px solid transparent' : 'none',
            color: activeTab === 'body' ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: activeTab === 'body' ? 'bold' : 'normal'
          }}
        >
          BODY
        </button>
      </div>

      {/* Config Panels */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: 'var(--void)', minHeight: '120px' }}>
        
        {/* PARAMS */}
        {activeTab === 'params' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
              <div></div>
              <div>KEY</div>
              <div>VALUE</div>
            </div>
            {params.map((p, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={(e) => handleParamChange(idx, 'enabled', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <input
                  value={p.key}
                  onChange={(e) => handleParamChange(idx, 'key', e.target.value)}
                  placeholder="Parameter Key"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-code)' }}
                />
                <input
                  value={p.value}
                  onChange={(e) => handleParamChange(idx, 'value', e.target.value)}
                  placeholder="Value"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-code)' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* HEADERS */}
        {activeTab === 'headers' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
              <div></div>
              <div>HEADER KEY</div>
              <div>VALUE</div>
            </div>
            {headers.map((h, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={h.enabled}
                  onChange={(e) => handleHeaderChange(idx, 'enabled', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <input
                  value={h.key}
                  onChange={(e) => handleHeaderChange(idx, 'key', e.target.value)}
                  placeholder="Header Name"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-code)' }}
                />
                <input
                  value={h.value}
                  onChange={(e) => handleHeaderChange(idx, 'value', e.target.value)}
                  placeholder="Value"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-code)' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* BODY */}
        {activeTab === 'body' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{\n  "key": "value"\n}'
              style={{
                width: '100%',
                flex: 1,
                minHeight: '120px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-code)',
                fontSize: '12px',
                padding: '10px',
                resize: 'vertical',
                outline: 'none'
              }}
            />
          </div>
        )}
      </div>

      {/* Response Section */}
      <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border)', background: 'var(--abyss)' }}>
        
        {/* Response Info bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>RESPONSE</span>
          
          {status !== null && (
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
              <div>
                STATUS: <span style={{ fontWeight: 'bold', color: status >= 200 && status < 300 ? '#00ff88' : '#ff4b4b' }}>{status} {statusText}</span>
              </div>
              <div>
                TIME: <span style={{ fontWeight: 'bold' }}>{timeElapsed} ms</span>
              </div>
              {sizeBytes !== null && (
                <div>
                  SIZE: <span style={{ fontWeight: 'bold' }}>{(sizeBytes / 1024).toFixed(2)} KB</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Response Tabs */}
        {status !== null && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <button
              onClick={() => setActiveResponseTab('body')}
              style={{
                background: activeResponseTab === 'body' ? 'var(--abyss)' : 'none',
                border: 'none',
                borderRight: '1px solid var(--border)',
                color: activeResponseTab === 'body' ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              BODY
            </button>
            <button
              onClick={() => setActiveResponseTab('headers')}
              style={{
                background: activeResponseTab === 'headers' ? 'var(--abyss)' : 'none',
                border: 'none',
                borderRight: '1px solid var(--border)',
                color: activeResponseTab === 'headers' ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              HEADERS
            </button>
          </div>
        )}

        {/* Response Output */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          {status === null ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              NO REQUEST SENT YET
            </div>
          ) : activeResponseTab === 'body' ? (
            <pre style={{ margin: 0, fontFamily: 'var(--font-code)', fontSize: '11px', color: '#00ff88', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {typeof response === 'object' ? JSON.stringify(response, null, 2) : response}
            </pre>
          ) : (
            <div>
              {Object.entries(responseHeaders).map(([k, v]) => (
                <div key={k} style={{ marginBottom: '4px', fontFamily: 'var(--font-code)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}:</span> <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default APIClientApp;
