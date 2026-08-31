import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Code,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { MetaApiLogRecord, MetaApiLogger } from '../../lib/whatsapp/metaApiLogger';

interface MetaApiLogsViewerProps {
  wabaId?: string;
  phoneNumberId?: string;
}

export const MetaApiLogsViewer: React.FC<MetaApiLogsViewerProps> = ({
  wabaId = '987654321098765',
  phoneNumberId = '109283746501234',
}) => {
  const [logs, setLogs] = useState<MetaApiLogRecord[]>([]);
  const [selectedLog, setSelectedLog] = useState<MetaApiLogRecord | null>(null);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchLogs = () => {
    const loaded = MetaApiLogger.getLogs();
    setLogs(loaded);
    if (loaded.length > 0 && !selectedLog) {
      setSelectedLog(loaded[0]);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all Meta Graph API logs?')) {
      MetaApiLogger.clearLogs();
      setLogs([]);
      setSelectedLog(null);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (filterStatus === 'SUCCESS' && !log.isSuccess) return false;
    if (filterStatus === 'ERROR' && log.isSuccess) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inEndpoint = log.endpoint.toLowerCase().includes(q);
      const inAction = log.action.toLowerCase().includes(q);
      const inUrl = log.fullUrl.toLowerCase().includes(q);
      const inBody = JSON.stringify(log.requestBody || {}).toLowerCase().includes(q);
      const inRes = JSON.stringify(log.responseBody || {}).toLowerCase().includes(q);
      return inEndpoint || inAction || inUrl || inBody || inRes;
    }
    return true;
  });

  return (
    <div id="meta-api-logs-inspector" className="flex flex-col h-[750px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl text-slate-200">
      {/* Header Banner */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Meta Graph API Request & Response Inspector</h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE AUDIT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspecting HTTP calls to Meta Cloud API (WABA ID: <span className="font-mono text-slate-300">{wabaId}</span> | Version: <span className="font-mono text-emerald-400">v25.0</span>)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-api-logs"
            onClick={fetchLogs}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            id="btn-clear-api-logs"
            onClick={handleClearLogs}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-rose-500/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-slate-900/90 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-filter-api-logs"
              type="text"
              placeholder="Search endpoints, payloads, response..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          <select
            id="select-filter-action"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500 text-xs"
          >
            <option value="ALL">All Actions</option>
            <option value="FETCH_TEMPLATES">FETCH_TEMPLATES (GET)</option>
            <option value="CREATE_TEMPLATE">CREATE_TEMPLATE (POST)</option>
            <option value="DELETE_TEMPLATE">DELETE_TEMPLATE (DELETE)</option>
            <option value="TEST_SEND">TEST_SEND (POST)</option>
          </select>

          <select
            id="select-filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500 text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success (2xx)</option>
            <option value="ERROR">Error (4xx/5xx)</option>
          </select>
        </div>

        <div className="text-slate-400 text-xs">
          Showing <span className="font-semibold text-slate-200">{filteredLogs.length}</span> of {logs.length} logged calls
        </div>
      </div>

      {/* Main Content Area: Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Request List */}
        <div className="w-5/12 border-r border-slate-800 overflow-y-auto bg-slate-950/50 divide-y divide-slate-800/60">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-medium text-slate-400">No Meta Graph API calls recorded</p>
              <p className="text-xs text-slate-500 mt-1">
                Execute a sync, create a template, or send a test message to inspect HTTP traffic.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isSelected = selectedLog?.id === log.id;
              return (
                <div
                  key={log.id}
                  id={`log-item-${log.id}`}
                  onClick={() => setSelectedLog(log)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-500/10 border-l-4 border-emerald-500'
                      : 'hover:bg-slate-900 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          log.method === 'GET'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : log.method === 'POST'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {log.method}
                      </span>
                      <span className="font-mono text-xs font-medium text-slate-200 truncate max-w-[180px]">
                        {log.endpoint}
                      </span>
                    </div>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        log.isSuccess
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {log.responseStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-slate-400">{log.action}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{log.durationMs}ms</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detailed Request / Response Inspector */}
        <div className="w-7/12 overflow-y-auto bg-slate-900 p-6 flex flex-col gap-6">
          {selectedLog ? (
            <>
              {/* Request Overview Header */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        selectedLog.method === 'GET'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : selectedLog.method === 'POST'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {selectedLog.method}
                    </span>
                    <span className="font-mono text-xs text-slate-300 break-all">{selectedLog.fullUrl}</span>
                  </div>

                  <button
                    id="btn-copy-curl"
                    onClick={() => handleCopy(selectedLog.curlCommand, 'curl')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors border border-slate-700 flex-shrink-0"
                    title="Copy cURL command for terminal"
                  >
                    {copiedField === 'curl' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied cURL!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy cURL</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Status</span>
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        selectedLog.isSuccess ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {selectedLog.isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {selectedLog.responseStatus} {selectedLog.responseStatusText}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Duration</span>
                    <span className="font-mono text-slate-300">{selectedLog.durationMs} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Timestamp</span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {new Date(selectedLog.timestamp).toISOString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Request Headers Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    Request Headers
                  </h4>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                  {Object.entries(selectedLog.requestHeaders).map(([key, val]) => (
                    <div key={key} className="py-0.5 flex">
                      <span className="text-slate-500 w-36 flex-shrink-0">{key}:</span>
                      <span className="text-emerald-400 break-all">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Request Payload (Body) */}
              {selectedLog.requestBody && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-emerald-400" />
                      Request Body (JSON Payload)
                    </h4>
                    <button
                      onClick={() => handleCopy(JSON.stringify(selectedLog.requestBody, null, 2), 'reqBody')}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      {copiedField === 'reqBody' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Body</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto max-h-56">
                    {JSON.stringify(selectedLog.requestBody, null, 2)}
                  </pre>
                </div>
              )}

              {/* Response Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-blue-400" />
                    Meta Response Body (Actual Graph API Output)
                  </h4>
                  <button
                    onClick={() => handleCopy(JSON.stringify(selectedLog.responseBody || {}, null, 2), 'resBody')}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {copiedField === 'resBody' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy Response</span>
                  </button>
                </div>
                <pre
                  className={`bg-slate-950 p-3 rounded-lg border font-mono text-xs overflow-x-auto max-h-72 ${
                    selectedLog.isSuccess
                      ? 'border-slate-800 text-slate-200'
                      : 'border-rose-900/50 text-rose-300'
                  }`}
                >
                  {JSON.stringify(selectedLog.responseBody || { message: 'No body returned' }, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Select a request from the left column to inspect raw payload and response.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
