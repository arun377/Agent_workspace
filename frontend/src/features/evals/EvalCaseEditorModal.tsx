import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, CheckCircle2, AlertCircle, Wrench, Loader2 } from 'lucide-react';
import { EvalDataItem, EvalDataUpdateRequest } from '../../types/agent';

interface EvalCaseEditorModalProps {
  item: EvalDataItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (index: number, updates: EvalDataUpdateRequest) => Promise<void>;
}

export const EvalCaseEditorModal: React.FC<EvalCaseEditorModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  const [input, setInput] = useState(item.input);
  const [expectedOutput, setExpectedOutput] = useState(item.expected_output);
  const [toolsString, setToolsString] = useState((item.expected_tools || []).join(', '));
  const [reviewed, setReviewed] = useState(item.reviewed);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const parsedTools = toolsString
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await onSave(item.index, {
        input,
        expected_output: expectedOutput,
        expected_tools: parsedTools,
        reviewed,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update test case');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-zinc-950/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              Case #{item.index + 1}
            </span>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Edit Evaluation Test Case
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Test Input Query */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              Test Prompt / User Input *
            </label>
            <textarea
              rows={3}
              required
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Create a PDF report summarizing renewable energy..."
              className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all font-mono"
            />
          </div>

          {/* Expected Output */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              Expected Golden Output
            </label>
            <textarea
              rows={5}
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              placeholder="Target benchmark response expected from the agent..."
              className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all font-mono"
            />
          </div>

          {/* Expected Tools */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                Expected Tools (comma-separated)
              </label>
            </div>
            <input
              type="text"
              value={toolsString}
              onChange={(e) => setToolsString(e.target.value)}
              placeholder="e.g. firecrawl:firecrawl_search, NetworkMCPServer:generate_pdf_report"
              className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all font-mono"
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              Specify the tool function names that must be invoked to pass the test case.
            </p>
          </div>

          {/* Review Status Checkbox */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
                className="w-4 h-4 rounded-md text-zinc-900 focus:ring-zinc-900 dark:focus:ring-white border-zinc-300 dark:border-zinc-700"
              />
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${reviewed ? 'text-emerald-500' : 'text-zinc-400'}`} />
                  Mark as Reviewed & Verified
                </span>
                <p className="text-[11px] text-zinc-500">
                  Reviewed test cases serve as trusted golden ground-truth for evaluation suites.
                </p>
              </div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-sm transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

