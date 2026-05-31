import React, { useEffect, useState } from 'react';
import { useWindowStore } from '../../../store/windowStore';

interface Metric {
  label: string;
  value: string;
  percent: number;
  color: string;
}

interface ProcessEntry {
  pid: number;
  name: string;
  cpu: string;
  mem: string;
  killable: boolean;
  onKill?: () => void;
}

function getMetrics(): Metric[] {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
  const memUsed = mem ? Math.round(mem.usedJSHeapSize / 1048576) : 48;
  const memTotal = mem ? Math.round(mem.totalJSHeapSize / 1048576) : 256;

  return [
    { label: 'CPU', value: `${Math.floor(Math.random() * 20 + 5)}%`, percent: Math.random() * 20 + 5, color: 'var(--cyan)' },
    { label: 'RAM', value: `${memUsed}MB`, percent: (memUsed / memTotal) * 100, color: 'var(--violet)' },
    { label: 'Network', value: `${(Math.random() * 2).toFixed(1)}MB/s`, percent: Math.random() * 30, color: 'var(--green)' },
    { label: 'GPU', value: `${Math.floor(Math.random() * 15 + 2)}%`, percent: Math.random() * 15 + 2, color: '#ff9f00' },
  ];
}

const CHART_POINTS = 30;

export const SystemMonitorApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const [metrics, setMetrics] = useState<Metric[]>(getMetrics());
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(CHART_POINTS).fill(0));
  const { windows, closeWindow } = useWindowStore();
  const [processes, setProcesses] = useState<ProcessEntry[]>([]);

  useEffect(() => {
    const updateMetricsAndProcesses = () => {
      const m = getMetrics();
      setMetrics(m);
      setCpuHistory((prev) => [...prev.slice(1), m[0].percent]);

      // System processes (non-killable)
      const systemProcs: ProcessEntry[] = [
        { pid: 101, name: 'aura-shell', cpu: `${(Math.random() * 0.4 + 0.1).toFixed(1)}%`, mem: '14MB', killable: false },
        { pid: 102, name: 'window-compositor', cpu: `${(Math.random() * 1.8 + 0.4).toFixed(1)}%`, mem: '38MB', killable: false },
        { pid: 103, name: 'pwa-sw', cpu: '0.0%', mem: '2MB', killable: false },
        { pid: 104, name: 'indexeddb-worker', cpu: '0.1%', mem: '4MB', killable: false }
      ];

      // Window processes (killable)
      const windowProcs: ProcessEntry[] = Object.values(windows).map((win, idx) => {
        let defaultMem = '15';
        let baseCpu = 0.4;
        if (win.appType === 'editor') { defaultMem = '54'; baseCpu = 1.4; }
        else if (win.appType === 'terminal') { defaultMem = '16'; baseCpu = 0.7; }
        else if (win.appType === 'browser') { defaultMem = '72'; baseCpu = 2.4; }
        else if (win.appType === 'sysmonitor') { defaultMem = '12'; baseCpu = 1.8; }
        else if (win.appType === 'ai') { defaultMem = '24'; baseCpu = 0.8; }
        else if (win.appType === 'apiclient') { defaultMem = '16'; baseCpu = 0.3; }
        else if (win.appType === 'dbexplorer') { defaultMem = '32'; baseCpu = 1.1; }

        const dynamicCpu = (baseCpu + Math.random() * 0.4).toFixed(1) + '%';
        const dynamicMem = (parseInt(defaultMem) + Math.floor(Math.random() * 6 - 3)) + 'MB';

        const cleanId = win.id.replace(/[^0-9]/g, '');
        const pidNum = 200 + (parseInt(cleanId) || idx);

        return {
          pid: pidNum,
          name: `${win.title} (${win.id})`,
          cpu: dynamicCpu,
          mem: dynamicMem,
          killable: true,
          onKill: () => closeWindow(win.id)
        };
      });

      setProcesses([...systemProcs, ...windowProcs]);
    };

    updateMetricsAndProcesses();
    const id = setInterval(updateMetricsAndProcesses, 1500);
    return () => clearInterval(id);
  }, [windows, closeWindow]);

  return (
    <div className="sysmon-window">
      {/* Metric Cards */}
      <div className="sysmon-grid">
        {metrics.map((m) => (
          <div key={m.label} className="sysmon-card">
            <div className="sysmon-card-label">{m.label}</div>
            <div
              className="sysmon-value"
              style={{ color: m.color }}
            >
              {m.value}
            </div>
            <div className="sysmon-bar-track">
              <div
                className="sysmon-bar-fill"
                style={{
                  width: `${m.percent}%`,
                  background: m.color,
                  boxShadow: `0 0 8px ${m.color}`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* CPU Chart */}
      <div className="sysmon-chart">
        <div className="chart-title">CPU History — Last {CHART_POINTS * 1.5}s</div>
        <div className="chart-bars">
          {cpuHistory.map((val, i) => (
            <div
              key={i}
              className="chart-bar"
              style={{
                height: `${Math.max(val, 2)}%`,
                background: val > 70 ? 'var(--red)' : val > 40 ? 'var(--yellow)' : 'var(--cyan)',
                opacity: 0.4 + (i / CHART_POINTS) * 0.6,
              }}
            />
          ))}
        </div>
      </div>

      {/* Process List */}
      <div className="sysmon-chart">
        <div className="chart-title">Running Processes</div>
        <div className="process-list">
          <div
            style={{
              display: 'flex', gap: 10, padding: '4px 8px', fontSize: 10,
              color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1,
              borderBottom: '1px solid var(--border)', marginBottom: 4,
            }}
          >
            <span style={{ flex: 1 }}>Name</span>
            <span style={{ minWidth: 30 }}>PID</span>
            <span style={{ minWidth: 50, textAlign: 'right' }}>CPU</span>
            <span style={{ minWidth: 50, textAlign: 'right' }}>MEM</span>
            <span style={{ minWidth: 65, textAlign: 'center' }}>ACTION</span>
          </div>
          {processes.map((p) => (
            <div key={p.pid} className="process-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px' }}>
              <span className="process-name" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                {p.name}
              </span>
              <span className="process-pid" style={{ minWidth: 30, fontFamily: 'var(--font-code)', fontSize: 10, color: 'var(--text-muted)' }}>{p.pid}</span>
              <span className="process-cpu" style={{ minWidth: 50, textAlign: 'right' }}>{p.cpu}</span>
              <span className="process-mem" style={{ minWidth: 50, textAlign: 'right' }}>{p.mem}</span>
              <span style={{ minWidth: 65, display: 'flex', justifyContent: 'center' }}>
                {p.killable ? (
                  <button
                    onClick={() => p.onKill && p.onKill()}
                    className="btn btn-ghost"
                    style={{
                      padding: '2px 6px',
                      fontSize: '9px',
                      color: 'var(--red)',
                      border: '1px solid var(--border)',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      background: 'none'
                    }}
                  >
                    End Task
                  </button>
                ) : (
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>System</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="sysmon-chart">
        <div className="chart-title">System Info</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'OS', value: 'DEV AURA OS v1.0.0' },
            { label: 'Kernel', value: 'WebKernel/wasm32' },
            { label: 'Runtime', value: 'React 19 + Vite 6' },
            { label: 'Display', value: `${window.innerWidth}×${window.innerHeight}` },
            { label: 'Platform', value: navigator.platform },
            { label: 'Uptime', value: `${Math.floor(performance.now() / 60000)}m` },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', gap: 8, fontSize: 11, padding: '4px 0' }}>
              <span style={{ color: 'var(--text-muted)', minWidth: 60 }}>{item.label}</span>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-code)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemMonitorApp;
