import React, { useState } from 'react';
import {
  Sparkles,
  User,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Edit2,
  Wrench,
  Loader2,
} from 'lucide-react';
import { EvalDataItem } from '../../types/agent';

interface EvalCaseCardProps {
  item: EvalDataItem;
  onToggleReviewed: (index: number, currentReviewed: boolean) => Promise<void>;
  onEdit: (item: EvalDataItem) => void;
  isUpdating?: boolean;
}

export const EvalCaseCard: React.FC<EvalCaseCardProps> = ({
  item,
  onToggleReviewed,
  onEdit,
  isUpdating = false,
}) => {
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const handleCopyInput = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.input);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 1500);
  };

  const handleCopyOutput = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.expected_output);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 1500);
  };

  return (
    <div className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all space-y-3.5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
            #{item.index + 1}
          </span>

          {/* Source Badge (High contrast neutral styling) */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            {item.source === 'llm' ? (
              <>
                <Sparkles className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                <span>LLM Generated</span>
              </>
            ) : (
              <>
                <User className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                <span>Human Authored</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Review Toggle Button (High contrast, clean colors) */}
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onToggleReviewed(item.index, item.reviewed)}
            title="Click to toggle review status"
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
              item.reviewed
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700'
            }`}
          >
            {isUpdating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : item.reviewed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            )}
            <span>{item.reviewed ? 'Reviewed' : 'Needs Review'}</span>
          </button>

          {/* Edit Action Button */}
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Edit Test Case"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Query / Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          <span>Test Input Prompt</span>
          <button
            type="button"
            onClick={handleCopyInput}
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 normal-case tracking-normal text-[11px] transition-colors"
          >
            {copiedInput ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed font-normal whitespace-pre-wrap">
          {item.input}
        </div>
      </div>

      {/* Golden Output */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          <span>Expected Golden Output</span>
          <button
            type="button"
            onClick={handleCopyOutput}
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 normal-case tracking-normal text-[11px] transition-colors"
          >
            {copiedOutput ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed font-normal whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin">
          {item.expected_output || (
            <span className="text-zinc-400 dark:text-zinc-500 italic">No expected output defined</span>
          )}
        </div>
      </div>

      {/* Expected Tools */}
      <div className="space-y-1.5 pt-0.5">
        <span className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Expected Tools ({item.expected_tools?.length || 0})
        </span>
        {item.expected_tools && item.expected_tools.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {item.expected_tools.map((toolName, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono text-[11px]"
              >
                <Wrench className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                {toolName}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">No tools required for this test case</p>
        )}
      </div>
    </div>
  );
};
