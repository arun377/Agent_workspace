import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox,
  Layers,
} from 'lucide-react';
import { EvalDataItem, EvalDataUpdateRequest, EvalDataGenerateResponse } from '../../types/agent';
import { fetchEvalData, generateEvalData, updateEvalCase } from './evalApi';
import { EvalCaseCard } from './EvalCaseCard';
import { EvalCaseEditorModal } from './EvalCaseEditorModal';
import { EvalGenerateModal } from './EvalGenerateModal';
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

  // Statistics
  const totalCount = items.length;
  const reviewedCount = items.filter((i) => i.reviewed).length;
  const needsReviewCount = items.filter((i) => !i.reviewed).length;
  const llmCount = items.filter((i) => i.source === 'llm').length;

  return (
    <div className={`flex flex-col sm:flex-row h-full overflow-hidden ${className}`}>
      {/* 1. LEFT SIDEBAR PANEL: Stats & Quick Actions (Zero top clutter) */}
      <aside className="w-full sm:w-56 md:w-60 shrink-0 border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/80 p-4 flex flex-col justify-between gap-5 overflow-y-auto">
        <div className="space-y-4">
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

          {/* Clean High-Contrast Metric Cards */}
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
                <span>Synthetic (LLM)</span>
              </div>
              <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {llmCount}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons in Left Panel */}
        <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
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
        </div>
      </aside>

      {/* 2. RIGHT MAIN CONTENT AREA: Direct Dataset View (Starts right at the top!) */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
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
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
              Generate realistic evaluation queries and expected tool answers using LLM synthesis to begin testing agent quality.
            </p>
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-sm transition-all hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              Generate First Goldens
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
      </main>

      {/* Edit Modal (Portaled to document.body, z-[9999]) */}
      {editingItem && (
        <EvalCaseEditorModal
          item={editingItem}
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveCase}
        />
      )}

      {/* Generate Modal (Portaled to document.body, z-[9999]) */}
      <EvalGenerateModal
        agentName={agentName}
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerate={handleGenerate}
      />
    </div>
  );
};
