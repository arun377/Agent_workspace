import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox,
  Database,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import { EvalDataItem, EvalDataUpdateRequest, EvalDataGenerateResponse } from '../../types/agent';
import { EvalReportResponse } from '../../types/eval';
import { fetchEvalData, generateEvalData, updateEvalCase, runDeterministicEval, runNonDeterministicEval } from './evalApi';
import { EvalCaseCard } from './EvalCaseCard';
import { EvalCaseEditorModal } from './EvalCaseEditorModal';
import { EvalGenerateModal } from './EvalGenerateModal';
import { EvalRunnerPanel } from './EvalRunnerPanel';
import { EvalResultsDashboard } from './EvalResultsDashboard';
import { useToast } from '../../components/ui/Toast';

interface AgentEvalManagerProps {
  agentName: string;
  className?: string;
}

export const AgentEvalManager: React.FC<AgentEvalManagerProps> = ({
  agentName,
  className = '',
}) => {
  const { showToast } = useToast();

  // Sub-Navigation: 'studio' (runner & results) vs 'dataset' (golden cases)
  const [activeSubTab, setActiveSubTab] = useState<'studio' | 'dataset'>(() => {
    try {
      const saved = sessionStorage.getItem(`agent_eval_subtab_${agentName}`);
      if (saved === 'dataset' || saved === 'studio') return saved;
    } catch {}
    return 'studio';
  });

  // Evaluation Studio state
  const [currentReport, setCurrentReport] = useState<EvalReportResponse | null>(() => {
    try {
      const saved = sessionStorage.getItem(`agent_eval_report_${agentName}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [defaultRunnerMode, setDefaultRunnerMode] = useState<'append' | 'replace'>('append');
  const [caseEvaluatingMetric, setCaseEvaluatingMetric] = useState<string | null>(null);

  // Helper to merge newly evaluated metrics into the existing report without losing previous data
  const mergeEvalReports = (existing: EvalReportResponse, incoming: EvalReportResponse): EvalReportResponse => {
    const mergedResults = existing.results.map((r) => ({
      ...r,
      metric_results: [...r.metric_results],
    }));

    incoming.results.forEach((incomingCase) => {
      const normalizedIncomingInput = incomingCase.agent_input.trim().toLowerCase();
      const existingIndex = mergedResults.findIndex(
        (c) => c.agent_input.trim().toLowerCase() === normalizedIncomingInput
      );

      if (existingIndex >= 0) {
        // Merge metric results into existing case
        const existingCase = mergedResults[existingIndex];
        const combinedMetrics = [...existingCase.metric_results];

        incomingCase.metric_results.forEach((newMetric) => {
          const metricIdx = combinedMetrics.findIndex(
            (m) => m.metric_name.trim().toLowerCase() === newMetric.metric_name.trim().toLowerCase()
          );
          if (metricIdx >= 0) {
            combinedMetrics[metricIdx] = newMetric;
          } else {
            combinedMetrics.push(newMetric);
          }
        });

        existingCase.metric_results = combinedMetrics;
        if (incomingCase.agent_output) {
          existingCase.agent_output = incomingCase.agent_output;
        }
      } else {
        // New case, append to results list
        mergedResults.push({
          ...incomingCase,
          metric_results: [...incomingCase.metric_results],
        });
      }
    });

    const allPassed = mergedResults.every((c) =>
      c.metric_results.length === 0 || c.metric_results.every((m) => m.passed)
    );

    return {
      ...existing,
      total_cases: mergedResults.length,
      all_passed: allPassed,
      results: mergedResults,
    };
  };

  const handleRunCompleted = (report: EvalReportResponse, mode: 'append' | 'replace') => {
    if (mode === 'append' && currentReport) {
      const merged = mergeEvalReports(currentReport, report);
      setCurrentReport(merged);
      showToast('Report Updated', `Appended evaluation metrics into report (${merged.total_cases} cases)`, 'success');
    } else {
      setCurrentReport(report);
    }
    setShowConfigForm(false);
  };

  const handleRemoveMetric = (caseIndex: number, metricName: string) => {
    if (!currentReport || !currentReport.results[caseIndex]) return;
    const updatedResults = currentReport.results.map((r, idx) => {
      if (idx !== caseIndex) return r;
      return {
        ...r,
        metric_results: r.metric_results.filter(
          (m) => m.metric_name.trim().toLowerCase() !== metricName.trim().toLowerCase()
        ),
      };
    });

    const allPassed = updatedResults.every((c) =>
      c.metric_results.length === 0 || c.metric_results.every((m) => m.passed)
    );

    const updatedReport: EvalReportResponse = {
      ...currentReport,
      all_passed: allPassed,
      results: updatedResults,
    };

    setCurrentReport(updatedReport);
    showToast('Metric Removed', `Removed ${metricName} from Case #${caseIndex + 1}`, 'info');
  };

  const handleRunMetricForCase = async (caseIndex: number, metricKey: string) => {
    if (!currentReport || !currentReport.results[caseIndex]) return;
    const targetCase = currentReport.results[caseIndex];
    setCaseEvaluatingMetric(`${caseIndex}-${metricKey}`);

    try {
      let report: EvalReportResponse;
      if (currentReport.evaluation_type === 'deterministic') {
        report = await runDeterministicEval(agentName, {
          metrics: [metricKey],
        });
      } else {
        report = await runNonDeterministicEval(agentName, {
          inputs: [targetCase.agent_input],
          metrics: [metricKey],
        });
      }

      const merged = mergeEvalReports(currentReport, report);
      setCurrentReport(merged);
      showToast('Metric Added', `Evaluated ${metricKey} for Case #${caseIndex + 1}`, 'success');
    } catch (err: any) {
      showToast('Evaluation Error', err.message || 'Failed to evaluate metric', 'error');
    } finally {
      setCaseEvaluatingMetric(null);
    }
  };

  // Sync subtab to sessionStorage
  useEffect(() => {
    if (!agentName) return;
    try {
      sessionStorage.setItem(`agent_eval_subtab_${agentName}`, activeSubTab);
    } catch {}
  }, [activeSubTab, agentName]);

  // Sync currentReport to sessionStorage
  useEffect(() => {
    if (!agentName) return;
    try {
      if (currentReport) {
        sessionStorage.setItem(`agent_eval_report_${agentName}`, JSON.stringify(currentReport));
      } else {
        sessionStorage.removeItem(`agent_eval_report_${agentName}`);
      }
    } catch {}
  }, [currentReport, agentName]);

  // Golden Dataset state
  const [items, setItems] = useState<EvalDataItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & In-flight state
  const [editingItem, setEditingItem] = useState<EvalDataItem | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [updatingIndex, setUpdatingIndex] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!agentName) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchEvalData(agentName);
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load evaluation dataset');
    } finally {
      setIsLoading(false);
    }
  }, [agentName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Review Toggle
  const handleToggleReviewed = async (index: number, currentReviewed: boolean) => {
    setUpdatingIndex(index);
    try {
      const updated = await updateEvalCase(agentName, index, {
        reviewed: !currentReviewed,
      });
      setItems((prev) =>
        prev.map((item) => (item.index === index ? updated : item))
      );
      showToast(
        updated.reviewed ? 'Marked Reviewed' : 'Marked Needs Review',
        `Case #${index + 1} updated successfully`,
        'success'
      );
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Could not update review status', 'error');
    } finally {
      setUpdatingIndex(null);
    }
  };

  // Handle Save Case from Editor
  const handleSaveCase = async (index: number, updates: EvalDataUpdateRequest) => {
    const updated = await updateEvalCase(agentName, index, updates);
    setItems((prev) =>
      prev.map((item) => (item.index === index ? updated : item))
    );
    showToast('Saved', `Case #${index + 1} updated successfully`, 'success');
  };

  // Handle Generate
  const handleGenerate = async (numCases: number): Promise<EvalDataGenerateResponse> => {
    const res = await generateEvalData(agentName, numCases);
    await loadData();
    showToast('Goldens Generated', `Added ${res.generated_count} new cases to dataset`, 'success');
    return res;
  };

  // Handle Re-running the evaluation with the same inputs & metrics
  const handleRerun = async () => {
    if (!currentReport) return;
    setDefaultRunnerMode('replace');
    setShowConfigForm(true);
  };

  // Statistics
  const totalCount = items.length;
  const reviewedCount = items.filter((i) => i.reviewed).length;
  const needsReviewCount = items.filter((i) => !i.reviewed).length;
  const llmCount = items.filter((i) => i.source === 'llm').length;

  return (
    <div className={`flex flex-col sm:flex-row h-full overflow-hidden ${className}`}>
      {/* 1. LEFT SIDEBAR PANEL: Sub-Nav, Stats & Quick Actions */}
      <aside className="w-full sm:w-60 md:w-64 shrink-0 border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/80 p-4 flex flex-col justify-between gap-5 overflow-y-auto">
        <div className="space-y-5">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-sm">
              <FlaskConical className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <span>Evaluation Suite</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono truncate">
              {agentName}
            </p>
          </div>

          {/* Sub-Navigation Buttons */}
          <div className="space-y-1.5 p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveSubTab('studio')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'studio'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Evaluate Agent</span>
              </div>
              {currentReport && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Results Available" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('dataset')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'dataset'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5" />
                <span>Golden Dataset</span>
              </div>
              <span className="mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                {totalCount}
              </span>
            </button>
          </div>

          {/* Contextual Metric Cards */}
          {activeSubTab === 'dataset' ? (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Dataset Metrics
              </span>

              {/* Total Cases */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Total Cases
                </span>
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {totalCount}
                </span>
              </div>

              {/* Reviewed */}
              <div className="p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Reviewed</span>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  {reviewedCount}
                </span>
              </div>

              {/* Needs Review */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Needs Review</span>
                </div>
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {needsReviewCount}
                </span>
              </div>

              {/* LLM Generated */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>Synthetic</span>
                </div>
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {llmCount}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Evaluation Highlights
              </span>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                  <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
                  <span>Dual Testing Modes</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                  Run <strong>Non-Deterministic</strong> evals for step-efficiency & task completion, or benchmark against <strong>Golden Datasets</strong>.
                </p>
              </div>

              {currentReport && (
                <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Last Run Status
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Verdict:</span>
                    <span
                      className={`font-bold font-mono text-[11px] ${
                        currentReport.all_passed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {currentReport.all_passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Cases:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">
                      {currentReport.total_cases}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons in Left Panel */}
        <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          {activeSubTab === 'dataset' ? (
            <>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-sm transition-all active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Goldens</span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={loadData}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Dataset</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (currentReport) {
                  if (!showConfigForm) {
                    setDefaultRunnerMode('append');
                  }
                  setShowConfigForm(!showConfigForm);
                }
              }}
              disabled={!currentReport}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showConfigForm ? 'View Results' : 'Configure New Eval'}</span>
            </button>
          )}
        </div>
      </aside>

      {/* 2. RIGHT MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
        {activeSubTab === 'studio' ? (
          /* EVALUATION STUDIO VIEW */
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* If there's an active report and the user hasn't toggled to config form, show Dashboard */}
            {currentReport && !showConfigForm ? (
              <EvalResultsDashboard
                report={currentReport}
                onRerun={handleRerun}
                onNewConfig={() => {
                  setDefaultRunnerMode('replace');
                  setShowConfigForm(true);
                }}
                onAppendMetrics={() => {
                  setDefaultRunnerMode('append');
                  setShowConfigForm(true);
                }}
                onRemoveMetric={handleRemoveMetric}
                onAddMetricToCase={handleRunMetricForCase}
                isEvaluatingCaseMetric={Boolean(caseEvaluatingMetric)}
              />
            ) : (
              <div className="space-y-4">
                {currentReport && (
                  <div className="flex items-center justify-between pb-1">
                    <button
                      type="button"
                      onClick={() => setShowConfigForm(false)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      <span>← Back to Latest Results</span>
                    </button>
                  </div>
                )}
                <EvalRunnerPanel
                  agentName={agentName}
                  reviewedCasesCount={reviewedCount}
                  existingReport={currentReport}
                  defaultMode={defaultRunnerMode}
                  onRunCompleted={handleRunCompleted}
                  onNavigateToDataset={() => setActiveSubTab('dataset')}
                />
              </div>
            )}
          </div>
        ) : (
          /* GOLDEN DATASET VIEW */
          <>
            {isLoading && items.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
                <p className="text-xs text-zinc-500 font-medium">Loading evaluation dataset...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  className="px-3 py-1 rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-center max-w-md mx-auto p-8 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 mb-3">
                  <Inbox className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                  No Evaluation Cases Yet
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed font-normal">
                  Generate realistic evaluation queries and expected tool answers using LLM synthesis to begin testing agent quality.
                </p>
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-sm transition-all hover:scale-105"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate First Goldens</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <EvalCaseCard
                    key={item.index}
                    item={item}
                    isUpdating={updatingIndex === item.index}
                    onToggleReviewed={handleToggleReviewed}
                    onEdit={(target) => setEditingItem(target)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit Modal */}
      {editingItem && (
        <EvalCaseEditorModal
          item={editingItem}
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveCase}
        />
      )}

      {/* Generate Modal */}
      <EvalGenerateModal
        agentName={agentName}
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerate={handleGenerate}
      />
    </div>
  );
};
