import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  Check,
  ChevronRight,
  Database,
} from 'lucide-react';
import {
  EvalType,
  METRIC_DEFINITIONS,
  DeterministicMetricKey,
  NonDeterministicMetricKey,
  EvalReportResponse,
} from '../../types/eval';
import { runDeterministicEval, runNonDeterministicEval } from './evalApi';
import { useToast } from '../../components/ui/Toast';

interface EvalRunnerPanelProps {
  agentName: string;
  reviewedCasesCount: number;
  existingReport?: EvalReportResponse | null;
  onRunCompleted: (report: EvalReportResponse, mode: 'append' | 'replace') => void;
  onNavigateToDataset?: () => void;
  defaultMode?: 'append' | 'replace';
}

const PRESET_QUERIES = [
  'Explain the difference between supervised and unsupervised machine learning briefly, provide the same in a pdf file',
  'What are the core capabilities and tools you have access to? Provide a brief summary.',
  'Analyze recent AI breakthroughs and generate an executive summary report with key takeaways.',
];

export const EvalRunnerPanel: React.FC<EvalRunnerPanelProps> = ({
  agentName,
  reviewedCasesCount,
  existingReport,
  onRunCompleted,
  onNavigateToDataset,
  defaultMode,
}) => {
  const { showToast } = useToast();

  const [runMode, setRunMode] = useState<'append' | 'replace'>(() => {
    if (defaultMode) return defaultMode;
    return existingReport ? 'append' : 'replace';
  });

  const [evalType, setEvalType] = useState<EvalType>(() => {
    try {
      const saved = sessionStorage.getItem(`agent_eval_type_${agentName}`);
      if (saved === 'deterministic' || saved === 'non_deterministic') return saved;
    } catch {}
    return 'non_deterministic';
  });

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem(`agent_eval_metrics_${agentName}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['step_efficiency', 'task_completion'];
  });

  const [inputs, setInputs] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem(`agent_eval_inputs_${agentName}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      'Explain the difference between supervised and unsupervised machine learning briefly, provide the same in a pdf file',
    ];
  });

  // Sync runner settings to sessionStorage
  useEffect(() => {
    if (!agentName) return;
    try {
      sessionStorage.setItem(`agent_eval_type_${agentName}`, evalType);
      sessionStorage.setItem(`agent_eval_metrics_${agentName}`, JSON.stringify(selectedMetrics));
      sessionStorage.setItem(`agent_eval_inputs_${agentName}`, JSON.stringify(inputs));
    } catch {}
  }, [evalType, selectedMetrics, inputs, agentName]);

  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Timer while running
  useEffect(() => {
    let timer: any;
    if (isRunning) {
      setElapsedTime(0);
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning]);

  // When evalType changes, adjust default metrics
  const handleTypeChange = (newType: EvalType) => {
    setEvalType(newType);
    setError(null);
    if (newType === 'non_deterministic') {
      setSelectedMetrics(['step_efficiency', 'task_completion']);
    } else {
      setSelectedMetrics(['correctness', 'tool_correctness']);
    }
  };

  const toggleMetric = (key: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleAddInput = () => {
    setInputs((prev) => [...prev, '']);
  };

  const handleUpdateInput = (idx: number, val: string) => {
    setInputs((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleRemoveInput = (idx: number) => {
    setInputs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleApplyPreset = (query: string) => {
    if (inputs.length === 1 && !inputs[0].trim()) {
      setInputs([query]);
    } else {
      setInputs((prev) => [...prev, query]);
    }
  };

  const handleExecute = async () => {
    setError(null);

    if (selectedMetrics.length === 0) {
      setError('Please select at least one evaluation metric.');
      return;
    }

    if (evalType === 'non_deterministic') {
      const cleanInputs = inputs.map((i) => i.trim()).filter(Boolean);
      if (cleanInputs.length === 0) {
        setError('Please provide at least one query input for non-deterministic evaluation.');
        return;
      }

      setIsRunning(true);
      try {
        const report = await runNonDeterministicEval(agentName, {
          inputs: cleanInputs,
          metrics: selectedMetrics,
        });
        showToast(
          report.all_passed ? 'Evaluation Passed' : 'Evaluation Completed',
          `Ran ${report.total_cases} case(s) across ${selectedMetrics.length} metric(s)`,
          report.all_passed ? 'success' : 'info'
        );
        onRunCompleted(report, runMode);
      } catch (err: any) {
        setError(err.message || 'Evaluation run failed');
        showToast('Evaluation Error', err.message || 'Execution failed', 'error');
      } finally {
        setIsRunning(false);
      }
    } else {
      // Deterministic
      if (reviewedCasesCount === 0) {
        setError(
          'Deterministic evaluation requires at least one reviewed golden case in the dataset. Please switch to "Golden Dataset" to review cases first.'
        );
        return;
      }

      setIsRunning(true);
      try {
        const report = await runDeterministicEval(agentName, {
          metrics: selectedMetrics,
        });
        showToast(
          report.all_passed ? 'Benchmark Passed' : 'Benchmark Completed',
          `Ran ${report.total_cases} reviewed case(s) against golden dataset`,
          report.all_passed ? 'success' : 'info'
        );
        onRunCompleted(report, runMode);
      } catch (err: any) {
        setError(err.message || 'Deterministic benchmark run failed');
        showToast('Evaluation Error', err.message || 'Benchmark run failed', 'error');
      } finally {
        setIsRunning(false);
      }
    }
  };

  const evaluatedMetricsInReport = useMemo(() => {
    if (!existingReport) return new Set<string>();
    const set = new Set<string>();
    existingReport.results.forEach((r) => {
      r.metric_results.forEach((m) => {
        set.add(m.metric_name.toLowerCase());
      });
    });
    return set;
  }, [existingReport]);

  const availableMetrics = Object.values(METRIC_DEFINITIONS).filter(
    (m) => m.evalType === evalType
  );

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs space-y-6">
      {/* 0. Merging Mode Selector (Append vs Replace) */}
      {existingReport && (
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider block">
                  Evaluation Run Mode
                </span>
                <span className="mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                  {runMode === 'append' ? 'Append Mode Active' : 'Fresh Run Mode Active'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                {runMode === 'append'
                  ? `New metric evaluations will be appended to your active report (${existingReport.total_cases} existing test cases). Previous metrics are preserved.`
                  : 'Starting a fresh report will overwrite the existing report.'}
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-900/60 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setRunMode('append')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  runMode === 'append'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Append to Report
              </button>
              <button
                type="button"
                onClick={() => setRunMode('replace')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  runMode === 'replace'
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Fresh Report
              </button>
            </div>
          </div>

          {runMode === 'append' && existingReport.results.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-200/60 dark:border-blue-900/40 text-xs">
              <span className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                Report has <strong>{existingReport.results.length}</strong> test case{existingReport.results.length === 1 ? '' : 's'}.
              </span>
              <button
                type="button"
                onClick={() => {
                  setInputs(existingReport.results.map((r) => r.agent_input));
                  showToast('Queries Loaded', `Copied ${existingReport.results.length} test queries from current report`, 'info');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-900 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors shadow-xs"
              >
                Use Existing Test Queries ({existingReport.results.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* 1. Evaluation Type Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          1. Select Evaluation Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => handleTypeChange('non_deterministic')}
            className={`p-4 rounded-xl border text-left transition-all relative ${
              evalType === 'non_deterministic'
                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800/80 shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs text-zinc-900 dark:text-white">
                Non-Deterministic (Trace & Agent Quality)
              </span>
              {evalType === 'non_deterministic' && (
                <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white" />
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              Evaluates execution traces, step efficiency, tool usage, and task satisfaction using LLM-as-a-judge on ad-hoc prompts.
            </p>
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={() => handleTypeChange('deterministic')}
            className={`p-4 rounded-xl border text-left transition-all relative ${
              evalType === 'deterministic'
                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800/80 shadow-xs'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs text-zinc-900 dark:text-white">
                Deterministic (Golden Dataset Benchmark)
              </span>
              {evalType === 'deterministic' && (
                <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white" />
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              Benchmarks output against pre-approved golden answers in the dataset ({reviewedCasesCount} reviewed case{reviewedCasesCount === 1 ? '' : 's'} available).
            </p>
          </button>
        </div>
      </div>

      {/* 2. Sub-type Metrics Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            2. Choose Sub-Type Metrics
          </label>
          <span className="text-[11px] text-zinc-500">
            {selectedMetrics.length} selected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {availableMetrics.map((m) => {
            const isSelected = selectedMetrics.includes(m.key);
            const isEvaluated = Array.from(evaluatedMetricsInReport).some(
              (em: string) =>
                em === m.label.toLowerCase() ||
                em.includes(m.key.toLowerCase()) ||
                m.label.toLowerCase().includes(em)
            );

            return (
              <div
                key={m.key}
                onClick={() => !isRunning && toggleMetric(m.key)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/60 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                } ${isRunning ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-zinc-900 dark:text-white">
                    {m.label}
                  </span>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed mb-2 line-clamp-2">
                  {m.description}
                </p>
                <div className="flex items-center justify-between gap-1">
                  <span className="mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    Threshold ≥ {m.defaultThreshold}
                  </span>
                  {runMode === 'append' && existingReport && (
                    isEvaluated ? (
                      <span className="mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        ✓ In Report
                      </span>
                    ) : (
                      <span className="mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        + New Metric
                      </span>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Inputs Configuration (Contextual) */}
      <div className="space-y-3 pt-1">
        {evalType === 'non_deterministic' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                3. Test Query Inputs ({inputs.length})
              </label>

              <button
                type="button"
                disabled={isRunning}
                onClick={handleAddInput}
                className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Query</span>
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-zinc-400" />
                Quick Presets:
              </span>
              {PRESET_QUERIES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isRunning}
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors truncate max-w-xs"
                  title={preset}
                >
                  Preset #{idx + 1}
                </button>
              ))}
            </div>

            {/* Input fields */}
            <div className="space-y-2.5">
              {inputs.map((query, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="pt-2 px-2 text-xs font-mono font-bold text-zinc-400">
                    #{idx + 1}
                  </div>
                  <textarea
                    rows={2}
                    disabled={isRunning}
                    value={query}
                    onChange={(e) => handleUpdateInput(idx, e.target.value)}
                    placeholder="Enter prompt query to test agent behavior, tool calls, and step efficiency..."
                    className="flex-1 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white resize-y font-normal"
                  />
                  {inputs.length > 1 && (
                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => handleRemoveInput(idx)}
                      className="p-2 text-zinc-400 hover:text-rose-500 rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors"
                      title="Remove input"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Deterministic Input Notice */
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                <Database className="w-4 h-4 text-zinc-500" />
                <span>Benchmark Dataset Status</span>
              </div>
              <span
                className={`mono text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  reviewedCasesCount > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}
              >
                {reviewedCasesCount} Reviewed Cases Ready
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              Deterministic evaluation benchmarks the agent by running all reviewed test cases that have verified golden outputs in the agent's dataset file.
            </p>
            {reviewedCasesCount === 0 && onNavigateToDataset && (
              <button
                type="button"
                onClick={onNavigateToDataset}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1"
              >
                <span>Switch to Golden Dataset tab to review & approve cases</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Error message if any */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5. Trigger Execution Button */}
      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {isRunning && (
            <div className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Evaluating agent traces ({elapsedTime}s)...</span>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={isRunning || (evalType === 'deterministic' && reviewedCasesCount === 0)}
          onClick={handleExecute}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-sm transition-all active:scale-95 disabled:opacity-40"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Running Evaluation...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {runMode === 'append' && existingReport
                  ? `Run & Append to Report (${selectedMetrics.length} metric${selectedMetrics.length === 1 ? '' : 's'})`
                  : `Run ${evalType === 'non_deterministic' ? 'Non-Deterministic' : 'Deterministic'} Eval`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
