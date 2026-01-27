'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';

interface LogEntry {
  id: number;
  timestamp: Date;
  level: 'log' | 'warn' | 'error';
  message: string;
  args: any[];
}

export function DebugLogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const logIdRef = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEnabled) return;

    // Store original console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    // Override console.log
    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      const message = args
        .map((arg) => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

      // Filter for Stellar-related logs
      if (
        message.toLowerCase().includes('stellar') ||
        message.toLowerCase().includes('horizon') ||
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('wallet') ||
        message.toLowerCase().includes('balance') ||
        message.toLowerCase().includes('freighter') ||
        message.toLowerCase().includes('passphrase')
      ) {
        setLogs((prev) => {
          const newLog: LogEntry = {
            id: logIdRef.current++,
            timestamp: new Date(),
            level: 'log',
            message,
            args,
          };
          // Keep only last 100 logs
          const updated = [...prev, newLog].slice(-100);
          return updated;
        });
      }
    };

    // Override console.warn
    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      const message = args.map((arg) => String(arg)).join(' ');

      if (
        message.toLowerCase().includes('stellar') ||
        message.toLowerCase().includes('horizon') ||
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('wallet') ||
        message.toLowerCase().includes('balance') ||
        message.toLowerCase().includes('freighter') ||
        message.toLowerCase().includes('passphrase')
      ) {
        setLogs((prev) => {
          const newLog: LogEntry = {
            id: logIdRef.current++,
            timestamp: new Date(),
            level: 'warn',
            message,
            args,
          };
          return [...prev, newLog].slice(-100);
        });
      }
    };

    // Override console.error
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      const message = args.map((arg) => String(arg)).join(' ');

      // Always capture errors, but filter for relevant ones
      if (
        message.toLowerCase().includes('stellar') ||
        message.toLowerCase().includes('horizon') ||
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('wallet') ||
        message.toLowerCase().includes('balance') ||
        message.toLowerCase().includes('freighter') ||
        message.toLowerCase().includes('passphrase') ||
        message.toLowerCase().includes('error')
      ) {
        setLogs((prev) => {
          const newLog: LogEntry = {
            id: logIdRef.current++,
            timestamp: new Date(),
            level: 'error',
            message,
            args,
          };
          return [...prev, newLog].slice(-100);
        });
      }
    };

    // Cleanup: restore original console methods
    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, [isEnabled]);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (isExpanded && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  const getLogBgColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-900/20';
      case 'warn':
        return 'bg-yellow-900/20';
      default:
        return 'bg-gray-900/20';
    }
  };

  if (!isEnabled && logs.length === 0) {
    return (
      <button
        onClick={() => setIsEnabled(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs z-50"
      >
        Enable Debug Logs
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 left-0 z-50 bg-black/90 backdrop-blur-sm border-t border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white text-sm font-medium flex items-center gap-1"
          >
            Debug Logs ({logs.length})
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`text-xs px-2 py-1 rounded ${
              isEnabled
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {isEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="text-xs text-gray-400 hover:text-white px-2 py-1"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Logs Container */}
      {isExpanded && (
        <div className="h-64 overflow-y-auto px-4 py-2 space-y-1">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">
              No logs yet. Logs will appear here when Stellar-related events
              occur.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`text-xs font-mono ${getLogBgColor(
                  log.level
                )} p-2 rounded ${getLogColor(log.level)} break-words`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 flex-shrink-0">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="flex-shrink-0 font-bold">
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="flex-1">{log.message}</span>
                </div>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
