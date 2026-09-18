import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Scale,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Target,
  Sparkles,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import { EvalCaseResult, METRIC_DEFINITIONS } from '../../types/eval';
import { SmartOutputViewer } from './SmartOutputViewer';

interface EvalCaseResultCardProps {
  caseResult: EvalCaseResult;
  index: number;
  evaluationType?: 'non_deterministic' | 'deterministic';
  onRemoveMetric?: (caseIndex: number, metricName: string) => void;
  onAddMetricToCase?: (caseIndex: number, metricKey: string) => Promise<void> | void;
  isEvaluatingThisCase?: boolean;
}

export const EvalCaseResultCard: React.FC<EvalCaseResultCardProps> = ({
  caseResult,
  index,
  evaluationType = 'non_deterministic',
  onRemoveMetric,
  onAddMetricToCase,
  isEvaluatingThisCase = false,
}) => {
  const [copiedInput, setCopiedInput] = useState(false);
  const [isExpectedOutputOpen, setIsExpectedOutputOpen] = useState(false);
  const [showMetricMenu, setShowMetricMenu] = useState(false);

  const hasMetrics = caseResult.metric_results.length > 0;
  const allPassed = hasMetrics && caseResult.metric_results.every((m) => m.passed);

  const handleCopyInput = () => {
    navigator.clipboard.writeText(caseResult.agent_input);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 1500);
  };

  const candidateMetrics = Object.values(METRIC_DEFINITIONS).filter((m) =>
    evaluationType === 'deterministic' ? m.evalType === 'deterministic' : m.evalType === 'non_deterministic'
  );

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs space-y-4 p-4 sm:p-5 transition-all">
      {/* 1. Header Bar: Case Index + Overall Verdict */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
            Case #{index + 1}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              !hasMetrics
                ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                : allPassed
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {!hasMetrics ? (
              <span>No Metrics Active</span>
            ) : allPassed ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>All Metrics Passed</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Evaluation Failed</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyInput}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
            title="Copy Test Input"
          >
            {copiedInput ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Copied Prompt</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Prompt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Tested Input Query Prompt */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
          <Target className="w-3.5 h-3.5 text-zinc-500" />
          <span>Test Input Prompt</span>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed">
          {caseResult.agent_input}
        </div>
      </div>

      {/* 3. Metrics Matrix: Score, Gauge, Threshold & LLM Reason */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            Evaluation Metrics ({caseResult.metric_results.length})
          </span>

          {onAddMetricToCase && (
            <div className="relative">
              <button
                type="button"
                disabled={isEvaluatingThisCase}
                onClick={() => setShowMetricMenu(!showMetricMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50"
              >
                {isEvaluatingThisCase ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>{isEvaluatingThisCase ? 'Evaluating...' : '+ Add Metric'}</span>
              </button>

              {showMetricMenu && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-2 z-20 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Evaluate Metric for this Case
                  </div>
                  {candidateMetrics.map((m) => {
                    const alreadyExists = caseResult.metric_results.some(
                      (mr) =>
                        mr.metric_name.toLowerCase() === m.label.toLowerCase() ||
                        mr.metric_name.toLowerCase().includes(m.key.toLowerCase()) ||
                        m.label.toLowerCase().includes(mr.metric_name.toLowerCase())
                    );
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => {
                          setShowMetricMenu(false);
                          onAddMetricToCase(index, m.key);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-white">
                            {m.label}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate max-w-[170px]">
                            {m.description}
                          </div>
                        </div>
                        {alreadyExists ? (
                          <span className="mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            Re-run
                          </span>
                        ) : (
                          <span className="mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                            + Add
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {caseResult.metric_results.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
            No metrics are currently attached to this case. Click <strong>+ Add Metric</strong> above to evaluate one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {caseResult.metric_results.map((metric, mIdx) => {
              const percentage = Math.min(100, Math.max(0, Math.round(metric.score * 100)));
              const thresholdPercentage = Math.min(100, Math.max(0, Math.round(metric.threshold * 100)));

              return (
                <div
                  key={mIdx}
                  className={`rounded-xl p-4 border transition-all space-y-3 ${
                    metric.passed
                      ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10'
                      : 'border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10'
                  }`}
                >
                  {/* Metric Header: Name + Score + Pass Badge + Remove Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {metric.metric_name}
                      </span>
                      <span
                        className={`mono text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          metric.passed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                        }`}
                      >
                        {metric.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500 dark:text-zinc-400 font-normal">Score:</span>
                        <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                          {metric.score}
                        </span>
                      </div>
                      <span className="text-zinc-300 dark:text-zinc-700">|</span>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span>Threshold:</span>
                        <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                          ≥ {metric.threshold}
                        </span>
                      </div>

                      {/* Remove Metric Button */}
                      {onRemoveMetric && (
                        <button
                          type="button"
                          onClick={() => onRemoveMetric(index, metric.metric_name)}
                          className="p-1.5 ml-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title={`Remove "${metric.metric_name}" metric from report`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Score vs Threshold Visual Bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          metric.passed
                            ? 'bg-emerald-500 dark:bg-emerald-400'
                            : 'bg-rose-500 dark:bg-rose-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                      {/* Threshold marker tick */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-zinc-900 dark:bg-white z-10 opacity-70"
                        style={{ left: `${thresholdPercentage}%` }}
                        title={`Threshold: ${metric.threshold}`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>0.0</span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Target: {metric.threshold} ({thresholdPercentage}%)
                      </span>
                      <span>1.0</span>
                    </div>
                  </div>

                  {/* Judge Reasoning Callout */}
                  {metric.reason && (
                    <div className="p-4 rounded-xl bg-amber-500/[0.08] dark:bg-amber-500/10 border border-amber-400/40 dark:border-amber-500/30 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                            <Scale className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                            Judge Evaluation Reason
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
                          AI Judge Verdict
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed pl-1">
                        {metric.reason}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Expected Output (if deterministic mode has golden output) */}
      {caseResult.expected_output && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsExpectedOutputOpen(!isExpectedOutputOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
              <span>Expected Golden Output (Benchmark Target)</span>
            </div>
            {isExpectedOutputOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>

          {isExpectedOutputOpen && (
            <div className="p-3.5 pt-1 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-normal">
              {caseResult.expected_output}
            </div>
          )}
        </div>
      )}

      {/* 5. Actual Output (Parsed with SmartOutputViewer) */}
      <SmartOutputViewer output={caseResult.agent_output} />
    </div>
  );
};
