import React, { useState } from 'react';
import { api } from './api';
import type { Settings, NotifySettings, NotifyLogEntry } from './types';

export interface NotifyPanelProps {
  settings: Settings;
  whatsappReady: boolean;
  last?: NotifyLogEntry | null;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  addNotice: (type: 'success' | 'error' | 'warning', text: string) => void;
}

const EVENT_LABELS: Array<{ key: keyof NotifySettings; label: string }> = [
  { key: 'runStarted', label: 'Runner starts' },
  { key: 'jobStarted', label: 'Each job starts' },
  { key: 'applied', label: 'Job applied' },
  { key: 'needsYou', label: 'Job needs you (review / captcha)' },
  { key: 'failed', label: 'Job failed' },
  { key: 'runFinished', label: 'Queue finished' }
];

export default function NotifyPanel({
  settings,
  whatsappReady,
  last,
  updateSettings,
  addNotice
}: NotifyPanelProps) {
  const [testing, setTesting] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [logEntries, setLogEntries] = useState<NotifyLogEntry[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);

  const notify = settings.notify || {
    runStarted: true,
    jobStarted: false,
    accountCreated: false,
    applied: true,
    needsYou: true,
    failed: true,
    runFinished: true
  };

  const toggleEvent = (key: keyof NotifySettings, checked: boolean) => {
    updateSettings({
      notify: {
        ...notify,
        [key]: checked
      }
    });
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await api<{ ok: boolean; provider: string; response?: string }>('/api/notify/test', {
        method: 'POST'
      });
      addNotice('success', `Test alert sent via ${res.provider}!`);
    } catch (err: any) {
      addNotice('error', `WhatsApp test failed: ${err.message || 'unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleToggleLog = async () => {
    const next = !showLog;
    setShowLog(next);
    if (next) {
      setLoadingLog(true);
      try {
        const entries = await api<NotifyLogEntry[]>('/api/notify/log');
        setLogEntries(entries || []);
      } catch (err: any) {
        addNotice('error', `Could not load notification log: ${err.message}`);
      } finally {
        setLoadingLog(false);
      }
    }
  };

  return (
    <div
      style={{
        marginTop: 10,
        padding: 10,
        backgroundColor: 'var(--surface-raised)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
        Send WhatsApp messages for:
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        {EVENT_LABELS.map(({ key, label }) => (
          <label key={key} className="checkbox-label" style={{ fontSize: '0.8rem', margin: 0 }}>
            <input
              type="checkbox"
              checked={Boolean(notify[key])}
              onChange={(e) => toggleEvent(key, e.target.checked)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div className="field-group" style={{ flex: 1, minWidth: 120 }}>
          <label htmlFor="s-wa-gap" style={{ fontSize: '0.75rem' }}>Gap between alerts (sec)</label>
          <input
            id="s-wa-gap"
            type="number"
            min={2}
            max={60}
            defaultValue={settings.notifyGapSec ?? 8}
            onBlur={(e) => updateSettings({ notifyGapSec: Number(e.target.value) })}
            style={{ fontSize: '0.8rem', padding: '4px 8px' }}
          />
        </div>
        <div className="field-group" style={{ flex: 1, minWidth: 120 }}>
          <label htmlFor="s-wa-max" style={{ fontSize: '0.75rem' }}>Max alerts / hour</label>
          <input
            id="s-wa-max"
            type="number"
            min={10}
            max={200}
            defaultValue={settings.notifyMaxPerHour ?? 60}
            onBlur={(e) => updateSettings({ notifyMaxPerHour: Number(e.target.value) })}
            style={{ fontSize: '0.8rem', padding: '4px 8px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleTest}
          disabled={testing || !whatsappReady}
          title={!whatsappReady ? 'Set up WhatsApp credentials in server/.env first' : 'Send a test message now'}
        >
          {testing ? 'Sending…' : 'Send test alert'}
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleToggleLog}
        >
          {showLog ? 'Hide alert log' : 'View alert log'}
        </button>
      </div>

      {last && (
        <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Last alert: <strong>{last.event}</strong> via {last.provider} ({last.ok ? 'Sent' : 'Failed'}) at{' '}
          {new Date(last.at).toLocaleTimeString()}
        </div>
      )}

      {showLog && (
        <div
          style={{
            marginTop: 10,
            padding: 8,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            maxHeight: 180,
            overflowY: 'auto'
          }}
        >
          {loadingLog ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading alert log…</div>
          ) : logEntries.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No alerts recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {logEntries.map((log, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '0.75rem',
                    borderBottom: i < logEntries.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    paddingBottom: 4
                  }}
                >
                  <span style={{ fontWeight: 600, color: log.ok ? 'var(--accent-green-text)' : 'var(--accent-red-text)' }}>
                    [{log.ok ? 'OK' : 'ERR'}]
                  </span>{' '}
                  <span>{log.event}</span> via <em>{log.provider}</em>{' '}
                  <span style={{ color: 'var(--text-dim)' }}>({new Date(log.at).toLocaleTimeString()})</span>
                  {log.response && (
                    <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                      {log.response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
