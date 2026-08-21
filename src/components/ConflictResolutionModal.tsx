/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Concurrency Conflict Resolution Dialog
 * Enables 3-way resolution: Reload Latest, Force Overwrite, or Merge Changes with field-by-field diffing.
 */

import React, { useState, useEffect } from 'react';
import { ConcurrencyConflict, FieldDifference } from '../types';
import { 
  AlertTriangle, 
  RotateCcw, 
  UploadCloud, 
  GitMerge, 
  Check, 
  X, 
  ArrowRight, 
  Clock, 
  User, 
  Layers,
  HelpCircle,
  FileText
} from 'lucide-react';

interface ConflictResolutionModalProps {
  conflict: ConcurrencyConflict<any> | null;
  onClose: () => void;
}

export default function ConflictResolutionModal({ conflict, onClose }: ConflictResolutionModalProps) {
  if (!conflict) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'merge'>('overview');
  // State for field-by-field merge selections: fieldName -> 'local' | 'remote'
  const [fieldChoices, setFieldChoices] = useState<Record<string, 'local' | 'remote'>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize field choices to default 'local' for modified fields
  useEffect(() => {
    if (conflict && conflict.differences) {
      const initial: Record<string, 'local' | 'remote'> = {};
      conflict.differences.forEach(diff => {
        initial[diff.field] = 'local';
      });
      setFieldChoices(initial);
    }
  }, [conflict]);

  const handleChoiceToggle = (field: string, choice: 'local' | 'remote') => {
    setFieldChoices(prev => ({
      ...prev,
      [field]: choice
    }));
  };

  const handleReloadLatest = async () => {
    setIsProcessing(true);
    try {
      await conflict.onReloadLatest();
      onClose();
    } catch (err) {
      console.error('[OCC Modal] Error executing reload latest:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceOverwrite = async () => {
    setIsProcessing(true);
    try {
      await conflict.onForceOverwrite();
      onClose();
    } catch (err) {
      console.error('[OCC Modal] Error executing force overwrite:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmMerge = async () => {
    setIsProcessing(true);
    try {
      // Build merged record
      const mergedRecord = { ...conflict.remoteRecord };
      for (const [field, choice] of Object.entries(fieldChoices)) {
        if (choice === 'local') {
          mergedRecord[field] = conflict.localDraft[field];
        } else {
          mergedRecord[field] = conflict.remoteRecord[field];
        }
      }
      await conflict.onMergeChanges(mergedRecord);
      onClose();
    } catch (err) {
      console.error('[OCC Modal] Error executing merge changes:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderFieldValue = (val: any) => {
    if (val === undefined || val === null || val === '') {
      return <span className="text-gray-400 italic text-xs">Empty / Not Set</span>;
    }
    if (typeof val === 'boolean') {
      return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${val ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{val ? 'True / Yes' : 'False / No'}</span>;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-gray-400 italic text-xs">[] (Empty list)</span>;
      return (
        <ul className="list-disc pl-4 text-xs space-y-0.5 max-h-24 overflow-y-auto">
          {val.map((item, idx) => (
            <li key={idx} className="truncate">
              {typeof item === 'object' ? JSON.stringify(item) : String(item)}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof val === 'object') {
      return (
        <pre className="text-xs bg-gray-50 p-1.5 rounded max-h-24 overflow-auto font-mono text-gray-700">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return <span className="text-xs break-words">{String(val)}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-amber-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 p-5 border-b border-amber-200 flex items-start justify-between">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-lg shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-200 text-amber-900 rounded">
                  {conflict.entityType} Conflict
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  ID: {conflict.entityId}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mt-1">
                Concurrent Modification Detected
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Another user or background process updated <strong>{conflict.entityName || conflict.entityId}</strong> while you were editing.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/60 transition-colors"
            title="Dismiss dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Banner */}
        <div className="grid grid-cols-2 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <div>
              <span className="font-semibold text-slate-700">Your Draft Version:</span>{' '}
              <span className="font-mono px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                v{conflict.localVersion}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="font-semibold text-slate-700">Database Live Version:</span>{' '}
              <span className="font-mono px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                v{conflict.remoteVersion}
              </span>
              {conflict.remoteUpdatedBy && (
                <span className="text-gray-500 ml-1.5">
                  (by {conflict.remoteUpdatedBy})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-200 px-6 pt-3 space-x-4 bg-white">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 text-xs font-semibold transition-all border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Overview & Direct Options</span>
          </button>
          <button
            onClick={() => setActiveTab('merge')}
            className={`pb-2.5 text-xs font-semibold transition-all border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'merge'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Interactive Field-by-Field Merge ({conflict.differences.length} changes)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {activeTab === 'overview' ? (
            <div className="space-y-5">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                <p className="font-semibold flex items-center space-x-1.5 mb-1 text-blue-950">
                  <HelpCircle className="w-4 h-4" />
                  <span>How would you like to resolve this conflict?</span>
                </p>
                To maintain Zero Data Loss and guarantee data integrity across all terminals, please select one of the three options below:
              </div>

              {/* Three Strategic Resolution Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                
                {/* 1. Reload Latest */}
                <div className="border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 rounded-xl p-4 transition-all flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2.5">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">a) Reload Latest</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Discard your local edits and load the latest version saved on the server (v{conflict.remoteVersion}).
                    </p>
                  </div>
                  <button
                    onClick={handleReloadLatest}
                    disabled={isProcessing}
                    className="mt-4 w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reload Latest</span>
                  </button>
                </div>

                {/* 2. Force Overwrite */}
                <div className="border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/30 rounded-xl p-4 transition-all flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2.5">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">b) Force Overwrite</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Overwrite the database with your local draft, advancing version to v{conflict.remoteVersion + 1} with an audit log.
                    </p>
                  </div>
                  <button
                    onClick={handleForceOverwrite}
                    disabled={isProcessing}
                    className="mt-4 w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Force Overwrite</span>
                  </button>
                </div>

                {/* 3. Merge Changes */}
                <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 transition-all flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2.5">
                      <GitMerge className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-indigo-950">c) Merge Changes</h3>
                    <p className="text-xs text-indigo-800/80 mt-1">
                      Select field-by-field which values to keep from your draft vs. the server.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('merge')}
                    className="mt-4 w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Open Merge Tool</span>
                  </button>
                </div>

              </div>

              {/* Differences Table Preview */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Detected Differences ({conflict.differences.length} Fields)
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-gray-600 font-semibold">
                      <tr>
                        <th className="p-2.5 w-1/4">Field</th>
                        <th className="p-2.5 w-3/8 text-blue-900 bg-blue-50/60">Your Draft (v{conflict.localVersion})</th>
                        <th className="p-2.5 w-3/8 text-emerald-900 bg-emerald-50/60">Server Live (v{conflict.remoteVersion})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {conflict.differences.map((diff) => (
                        <tr key={diff.field} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-medium text-gray-900 align-top">
                            {diff.label}
                            <span className="block text-[10px] text-gray-400 font-mono">{diff.field}</span>
                          </td>
                          <td className="p-2.5 text-blue-950 bg-blue-50/20 align-top">
                            {renderFieldValue(diff.localValue)}
                          </td>
                          <td className="p-2.5 text-emerald-950 bg-emerald-50/20 align-top">
                            {renderFieldValue(diff.remoteValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-600">
                Choose which value to preserve for each conflicting field. When you confirm, the merged record will be saved to the database as version <strong>v{conflict.remoteVersion + 1}</strong>.
              </p>

              <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                {conflict.differences.map((diff) => {
                  const currentChoice = fieldChoices[diff.field] || 'local';
                  return (
                    <div key={diff.field} className="border border-gray-200 rounded-xl p-3.5 bg-white shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-xs text-gray-900">
                          {diff.label} <span className="text-gray-400 font-mono text-[10px]">({diff.field})</span>
                        </div>
                        <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded-lg text-xs">
                          <button
                            type="button"
                            onClick={() => handleChoiceToggle(diff.field, 'local')}
                            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                              currentChoice === 'local'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            Keep My Draft
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChoiceToggle(diff.field, 'remote')}
                            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                              currentChoice === 'remote'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            Keep Server Value
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-1.5">
                        <div className={`p-2.5 rounded-lg border text-xs transition-colors ${
                          currentChoice === 'local' ? 'border-blue-300 bg-blue-50/50' : 'border-gray-100 bg-gray-50/50 opacity-60'
                        }`}>
                          <span className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Your Draft:</span>
                          {renderFieldValue(diff.localValue)}
                        </div>
                        <div className={`p-2.5 rounded-lg border text-xs transition-colors ${
                          currentChoice === 'remote' ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-100 bg-gray-50/50 opacity-60'
                        }`}>
                          <span className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Server Live:</span>
                          {renderFieldValue(diff.remoteValue)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ← Back to Options
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMerge}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Merged Version (v{conflict.remoteVersion + 1})</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>Protected by Optimistic Concurrency Engine & Zero Data Loss Protocol</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-200/60 rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
