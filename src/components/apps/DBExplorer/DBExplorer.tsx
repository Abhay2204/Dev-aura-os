import React, { useState, useEffect, useRef } from 'react';

interface SQLTable {
  name: string;
  columns: string[];
  rows: Record<string, any>[];
}

// Helper to load sql.js from CDN
const loadSqlJsRuntime = async () => {
  if ((window as any).SQL) return (window as any).SQL;
  if (!(window as any).initSqlJs) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js";
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }
  const SQL = await (window as any).initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
  });
  (window as any).SQL = SQL;
  return SQL;
};

export const DBExplorerApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const [query, setQuery] = useState(
    `-- DevAura SQLite Editor\nCREATE TABLE developers (\n  id INTEGER PRIMARY KEY,\n  name TEXT,\n  role TEXT,\n  commits INTEGER\n);\n\nINSERT INTO developers VALUES (1, 'Abhay', 'Fullstack Dev', 142);\nINSERT INTO developers VALUES (2, 'AURA AI', 'Assistant', 952);\nINSERT INTO developers VALUES (3, 'Sarah', 'UX Engineer', 84);\n\nSELECT * FROM developers;`
  );
  const [tables, setTables] = useState<Record<string, SQLTable>>({});
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[][] } | null>(null);
  const [statusMessage, setStatusMessage] = useState('SQLite loading...');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const dbRef = useRef<any>(null);

  useEffect(() => {
    const initDb = async () => {
      try {
        setLoading(true);
        setStatusMessage('Loading SQLite WASM Runtime...');
        const SQL = await loadSqlJsRuntime();
        dbRef.current = new SQL.Database();
        setLoading(false);
        setStatusMessage('SQLite ready.');
        executeSQL(query);
      } catch (err: any) {
        setError('Failed to load SQLite WASM: ' + err.toString());
        setLoading(false);
      }
    };
    initDb();

    return () => {
      if (dbRef.current) {
        try {
          dbRef.current.close();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  const executeSQL = (sql: string) => {
    if (!dbRef.current) return;
    setError(null);
    setStatusMessage('Running...');

    try {
      const results = dbRef.current.exec(sql);

      // Query schemas / tables
      const tablesResult = dbRef.current.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
      const tableNames: string[] = [];
      if (tablesResult.length > 0 && tablesResult[0].values) {
        tablesResult[0].values.forEach((row: any) => {
          tableNames.push(row[0]);
        });
      }

      // Rebuild tables state mapping
      const nextTables: Record<string, SQLTable> = {};
      for (const name of tableNames) {
        const infoResult = dbRef.current.exec(`PRAGMA table_info(${name});`);
        const columns: string[] = [];
        if (infoResult.length > 0 && infoResult[0].values) {
          infoResult[0].values.forEach((row: any) => {
            columns.push(row[1]);
          });
        }

        const rowsResult = dbRef.current.exec(`SELECT * FROM ${name};`);
        const rows: Record<string, any>[] = [];
        if (rowsResult.length > 0 && rowsResult[0].values) {
          rowsResult[0].values.forEach((row: any) => {
            const rowObj: Record<string, any> = {};
            columns.forEach((col, idx) => {
              rowObj[col] = row[idx];
            });
            rows.push(rowObj);
          });
        }

        nextTables[name] = {
          name,
          columns,
          rows
        };
      }
      setTables(nextTables);

      // Display the final SELECT statement output if available
      if (results.length > 0) {
        const lastResult = results[results.length - 1];
        setQueryResult({
          columns: lastResult.columns,
          rows: lastResult.values
        });
        setStatusMessage(`Executed successfully. Returned ${lastResult.values.length} rows.`);
      } else {
        setQueryResult(null);
        setStatusMessage('Statements executed successfully.');
      }
    } catch (err: any) {
      setError(err.message || 'SQL execution error');
      setQueryResult(null);
    }
  };

  const handleTableClick = (name: string) => {
    setActiveTable(name);
    const selectQuery = `SELECT * FROM ${name};`;
    setQuery(selectQuery);
    executeSQL(selectQuery);
  };

  const handleExport = () => {
    if (!dbRef.current) return;
    try {
      const binaryArray = dbRef.current.export();
      const blob = new Blob([binaryArray], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database.db';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('Database exported successfully.');
    } catch (err: any) {
      setError('Export failed: ' + err.toString());
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setLoading(true);
        setStatusMessage('Importing database file...');
        const SQL = await loadSqlJsRuntime();
        const u8 = new Uint8Array(reader.result as ArrayBuffer);
        
        if (dbRef.current) {
          try { dbRef.current.close(); } catch {}
        }
        dbRef.current = new SQL.Database(u8);
        setLoading(false);
        executeSQL("SELECT 1;"); // Dummy query to trigger schema refresh
        setStatusMessage(`Imported database: ${file.name}`);
      } catch (err: any) {
        setError('Failed to import database: ' + err.toString());
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="dbexplorer-container" style={{ display: 'flex', height: '100%', background: 'var(--void)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: '12px' }}>
      
      {/* Sidebar for tables */}
      <div style={{ width: '180px', borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border)', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
          SCHEMAS / TABLES
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {Object.keys(tables).length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', padding: '8px', textAlign: 'center' }}>
              No tables created
            </div>
          ) : (
            Object.keys(tables).map(name => (
              <div
                key={name}
                onClick={() => handleTableClick(name)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: activeTable === name ? 'var(--surface-hover)' : 'none',
                  color: activeTable === name ? 'var(--text-primary)' : 'var(--text-secondary)',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🗄</span> {name}
              </div>
            ))
          )}
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '6px' }}>
          <button
            onClick={handleExport}
            disabled={loading}
            className="btn btn-ghost"
            style={{ flex: 1, fontSize: '10px', padding: '4px', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            title="Export database as .db file"
          >
            📥 Export
          </button>
          <label
            className="btn btn-ghost"
            style={{ flex: 1, fontSize: '10px', padding: '4px', textAlign: 'center', cursor: 'pointer', display: 'block', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            title="Import database from .db file"
          >
            📤 Import
            <input
              type="file"
              accept=".db"
              onChange={handleImport}
              style={{ display: 'none' }}
              disabled={loading}
            />
          </label>
        </div>
      </div>

      {/* Main Terminal Editor & Output panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--void)' }}>
        
        {/* SQL Input Area */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>SQL QUERY RUNNER</span>
            <button
              onClick={() => executeSQL(query)}
              disabled={loading}
              className="btn"
              style={{
                background: 'var(--text-primary)',
                color: 'var(--void)',
                fontWeight: 'bold',
                padding: '4px 14px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              RUN QUERY (⚡)
            </button>
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              height: '110px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-code)',
              fontSize: '11px',
              padding: '8px',
              outline: 'none',
              resize: 'none'
            }}
          />
        </div>

        {/* Status / Output Info bar */}
        <div style={{ padding: '6px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: '11px' }}>
          {error ? (
            <span style={{ color: '#ff4b4b' }}>⚠️ {error}</span>
          ) : (
            <span style={{ color: '#00ff88' }}>✓ {statusMessage}</span>
          )}
        </div>

        {/* Result grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px', background: 'var(--abyss)' }}>
          {queryResult ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'var(--font-code)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                  {queryResult.columns.map((col, idx) => (
                    <th key={idx} style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queryResult.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} style={{ borderBottom: '1px solid var(--border)' }}>
                    {row.map((val, valIdx) => (
                      <td key={valIdx} style={{ padding: '8px', color: 'var(--text-primary)' }}>
                        {val === null ? 'NULL' : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
              NO SELECT QUERY EXECUTED
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DBExplorerApp;
