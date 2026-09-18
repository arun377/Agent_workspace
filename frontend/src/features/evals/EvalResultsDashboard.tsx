import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  SlidersHorizontal,
  Download,
  Filter,
  BarChart3,
  Bot,
  Layers,
  FlaskConical,
  FileCode,
  FileText,
  Plus,
} from 'lucide-react';
import { EvalReportResponse } from '../../types/eval';
import { EvalCaseResultCard } from './EvalCaseResultCard';
import { EvalReportExportModal } from './EvalReportExportModal';

interface EvalResultsDashboardProps {
  report: EvalReportResponse;
  onRerun: () => void;
  onNewConfig: () => void;
  onAppendMetrics?: () => void;
  onRemoveMetric?: (caseIndex: number, metricName: string) => void;
  onAddMetricToCase?: (caseIndex: number, metricKey: string) => Promise<void> | void;
  isEvaluatingCaseMetric?: boolean;
}

export const EvalResultsDashboard: React.FC<EvalResultsDashboardProps> = ({
  report,
  onRerun,
  onNewConfig,
  onAppendMetrics,
  onRemoveMetric,
  onAddMetricToCase,
  isEvaluatingCaseMetric,
}) => {
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Compute summary stats
  const stats = useMemo(() => {
    let totalMetrics = 0;
    let totalScore = 0;
    let passedCases = 0;

    report.results.forEach((c) => {
      const casePassed = c.metric_results.every((m) => m.passed);
      if (casePassed) passedCases += 1;

      c.metric_results.forEach((m) => {
        totalMetrics += 1;
        totalScore += m.score;
      });
    });

    const failedCases = report.total_cases - passedCases;
    const passRate = report.total_cases > 0
      ? Math.round((passedCases / report.total_cases) * 100)
      : 0;
    const avgScore = totalMetrics > 0
      ? (totalScore / totalMetrics).toFixed(2)
      : '0.00';

    return {
      passedCases,
      failedCases,
      passRate,
      avgScore,
      totalMetrics,
    };
  }, [report]);

  // Filtered cases
  const filteredCases = useMemo(() => {
    return report.results.map((c, index) => ({ c, index })).filter(({ c }) => {
      const casePassed = c.metric_results.every((m) => m.passed);
      if (filter === 'passed') return casePassed;
      if (filter === 'failed') return !casePassed;
      return true;
    });
  }, [report.results, filter]);

  // Export report to JSON file
  const handleExportJSON = () => {
    const filename = `${report.agent_name}_eval_${report.evaluation_type}_${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Executive Summary Banner */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 transition-all ${
          report.all_passed
            ? 'border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-950/20'
            : 'border-rose-200 dark:border-rose-900/60 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-950/40 dark:via-rose-950/20'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  report.all_passed
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200'
                }`}
              >
                {report.all_passed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Evaluation Passed</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Failures Detected</span>
                  </>
                )}
              </span>

              <span className="mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {report.evaluation_type === 'non_deterministic'
                  ? 'Non-Deterministic (Trace)'
                  : 'Deterministic (Golden)'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2 mt-1">
              <span>Agent: {report.agent_name}</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
              {report.all_passed
                ? `All ${report.total_cases} test cases satisfied defined metric thresholds without issues.`
                : `${stats.failedCases} of ${report.total_cases} test cases failed one or more evaluation metrics.`}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {onAppendMetrics && (
              <button
                type="button"
                onClick={onAppendMetrics}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 shadow-xs transition-all active:scale-95"
                title="Append additional metrics to this evaluation report"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Append Metrics</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNewConfig}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-xs transition-all active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
              <span>Configure New Eval</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-xs transition-all active:scale-95"
              title="Export and view formatted evaluation report with progress ribbons"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              <span>Export Report</span>
            </button>

            <button
              type="button"
              onClick={onRerun}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-xs transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-run Eval</span>
            </button>
          </div>
        </div>

        {/* KPI Score Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
          <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Total Test Cases
            </span>
            <span className="font-mono text-lg font-extrabold text-zinc-900 dark:text-white">
              {report.total_cases}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Pass Rate
            </span>
            <span
              className={`font-mono text-lg font-extrabold ${
                stats.passRate === 100
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {stats.passRate}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Average Score
            </span>
            <span className="font-mono text-lg font-extrabold text-zinc-900 dark:text-white">
              {stats.avgScore} <span className="text-xs text-zinc-400 font-normal">/ 1.0</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Metrics Evaluated
            </span>
            <span className="font-mono text-lg font-extrabold text-zinc-900 dark:text-white">
              {stats.totalMetrics}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Results Section Header & Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
            Individual Case Results ({filteredCases.length})
          </h4>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All ({report.total_cases})
          </button>
          <button
            type="button"
            onClick={() => setFilter('passed')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'passed'
                ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-emerald-600'
            }`}
          >
            Passed ({stats.passedCases})
          </button>
          <button
            type="button"
            onClick={() => setFilter('failed')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'failed'
                ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-rose-600'
            }`}
          >
            Failed ({stats.failedCases})
          </button>
        </div>
      </div>

      {/* 3. Rendered Case Results */}
      {filteredCases.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs text-zinc-500">
          No cases match the selected filter ({filter}).
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCases.map(({ c, index }) => (
            <EvalCaseResultCard
              key={index}
              caseResult={c}
              index={index}
              evaluationType={report.evaluation_type}
              onRemoveMetric={onRemoveMetric}
              onAddMetricToCase={onAddMetricToCase}
              isEvaluatingThisCase={isEvaluatingCaseMetric}
            />
          ))}
        </div>
      )}
      {/* Full Evaluation Report Modal (with progress ribbons, judge reasons & HTML export) */}
      <EvalReportExportModal
        report={report}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
};
