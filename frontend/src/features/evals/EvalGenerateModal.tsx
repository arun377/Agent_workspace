import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { EvalDataGenerateResponse } from '../../types/agent';

interface EvalGenerateModalProps {
  agentName: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (numCases: number) => Promise<EvalDataGenerateResponse>;
}

export const EvalGenerateModal: React.FC<EvalGenerateModalProps> = ({
  agentName,
  isOpen,
  onClose,
  onGenerate,
}) => {
  const [numCases, setNumCases] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvalDataGenerateResponse | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await onGenerate(numCases);
      setResult(res);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to generate golden test cases');
    } finally {
      setIsGenerating(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-zinc-950/75 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Generate Golden Test Cases
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">{agentName}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Generated {result.generated_count} new cases! Total dataset now contains {result.total_count} cases.
              </span>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              The LLM synthesizer analyzes this agent's system prompt and registered tools to automatically construct realistic user queries, expected outputs, and required tool calls.
            </p>
          </div>

          {/* Number of cases picker */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Number of Test Cases
              </label>
              <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {numCases}
              </span>
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min={1}
              max={20}
              value={numCases}
              disabled={isGenerating}
              onChange={(e) => setNumCases(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
            />

            {/* Quick Presets */}
            <div className="flex items-center gap-2">
              {[3, 5, 10, 15, 20].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setNumCases(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    numCases === preset
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">Generation Note:</p>
            <p>
              Newly generated cases will be appended to your evaluation dataset with status <span className="font-semibold text-zinc-900 dark:text-zinc-100">Needs Review</span> so you can inspect and approve them.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isGenerating}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-sm transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating {numCases} Goldens...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate {numCases} Cases
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

