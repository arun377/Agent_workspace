import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Plus,
  Bot,
  CheckCircle2,
  FileCode,
  Wrench,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  Play,
  Settings,
} from 'lucide-react';
import { useAgentStore } from '../../store/useAgentStore';
import { Agent, AgentStatus, Tool } from '../../types/agent';
import { AgentCard } from './AgentCard';
import { GlassModal } from '../../components/ui/GlassModal';
import { useToast } from '../../components/ui/Toast';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { agents, tools, deleteAgent, resetToDefaults } = useAgentStore();
  const { showToast } = useToast();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AgentStatus>('all');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedModel, setSelectedModel] = useState('all');

  // Inspector Selected Agent State
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents[0]?.id || null);

  // Modal State for Delete Confirmation
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);

  // Map tools by ID for fast lookup
  const toolsMap = useMemo(() => {
    return tools.reduce((acc, t) => {
      acc[t.id] = t;
      return acc;
    }, {} as Record<string, Tool>);
  }, [tools]);

  // Filtered & Searched Agents
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.model.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      const matchesCategory = selectedCategory === 'All Categories' || agent.category === selectedCategory;
      const matchesModel = selectedModel === 'all' || agent.model === selectedModel;

      return matchesSearch && matchesStatus && matchesCategory && matchesModel;
    });
  }, [agents, searchQuery, statusFilter, selectedCategory, selectedModel]);

  // Currently inspected agent object
  const inspectedAgent = useMemo(() => {
    const foundInFiltered = filteredAgents.find((a) => a.id === selectedAgentId);
    if (foundInFiltered) return foundInFiltered;
    return filteredAgents[0] || agents.find((a) => a.id === selectedAgentId) || agents[0] || null;
  }, [agents, selectedAgentId, filteredAgents]);

  // Statistics
  const totalAgents = agents.length;
  const publishedCount = agents.filter((a) => a.status === 'published').length;
  const draftCount = agents.filter((a) => a.status === 'draft').length;
  const totalTools = tools.length;

  const handleDeleteConfirm = () => {
    if (deletingAgent) {
      deleteAgent(deletingAgent.id);
      showToast('Agent Deleted', `Removed "${deletingAgent.name}"`, 'info');
      setDeletingAgent(null);
      if (selectedAgentId === deletingAgent.id) {
        setSelectedAgentId(agents.find((a) => a.id !== deletingAgent.id)?.id || null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Layout Grid: Left Nav | Center Content | Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANE: Navigation & Metric Summaries */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Overview</span>
            <button
              type="button"
              onClick={() => {
                resetToDefaults();
                showToast('Reset Complete', 'Restored sample agents & tools catalog.', 'info');
              }}
              title="Reset Sample Data"
              className="p-1.5 rounded-lg glass-card text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 transition-colors text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="glass-card rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80">
              <span className="text-[11px] font-semibold text-zinc-500 block mb-1">Total Agents</span>
              <h4 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {String(totalAgents).padStart(2, '0')}
              </h4>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">Live / Published</span>
              <h4 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {String(publishedCount).padStart(2, '0')}
              </h4>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block mb-1">Draft Models</span>
              <h4 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {String(draftCount).padStart(2, '0')}
              </h4>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80">
              <span className="text-[11px] font-semibold text-zinc-500 block mb-1">Active Tools</span>
              <h4 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {String(totalTools).padStart(2, '0')}
              </h4>
            </div>
          </div>
        </aside>

        {/* CENTER PANE: Main Content & Agent Registry */}
        <main className="lg:col-span-6 space-y-6">
          {/* Hub Banner */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800/80">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold mb-3">
              <Sparkles className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />
              <span>Studio Workspace</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight mb-2">
              Agent Orchestration Hub
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Build, test, and deploy intelligent custom agents equipped with live search tools, python sandboxes, and API connectors.
            </p>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents by name, description, or model..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs glass-input text-zinc-900 dark:text-white placeholder:text-zinc-400 border border-zinc-200 dark:border-zinc-800"
            />
          </div>

          {/* Active Registry Header & Filters */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Agents Registry</span>

            <div className="flex items-center gap-2">
              {/* Status Filter Pills */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('published')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    statusFilter === 'published'
                      ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                  }`}
                >
                  Published
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('draft')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    statusFilter === 'draft'
                      ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                  }`}
                >
                  Draft
                </button>
              </div>
            </div>
          </div>

          {/* Agent Cards List */}
          {filteredAgents.length > 0 ? (
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {filteredAgents.map((agent) => {
                  const isInspected = inspectedAgent?.id === agent.id;
                  return (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      toolsMap={toolsMap}
                      isSelected={isInspected}
                      onSelect={(id) => setSelectedAgentId(id)}
                      onDeleteRequest={(ag) => setDeletingAgent(ag)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            /* Empty Filter State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-2xl p-8 text-center border border-zinc-200 dark:border-zinc-800 my-4"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No agents found</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                No agents match the current search query or status filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSelectedCategory('All Categories');
                  setSelectedModel('all');
                }}
                className="mt-4 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 transition-colors"
              >
                Clear Filters
              </button>
            </motion.div>
          )}
        </main>

        {/* RIGHT PANE: Technical Inspector */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Inspector</span>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Selected Agent
            </span>

            {inspectedAgent ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {inspectedAgent.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="mono text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 font-bold">
                      {inspectedAgent.model}
                    </span>
                    <span
                      className={`mono text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        inspectedAgent.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                      }`}
                    >
                      {inspectedAgent.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                  {inspectedAgent.description || 'No description provided.'}
                </p>

                <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">Category</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{inspectedAgent.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">Temperature</span>
                    <span className="mono font-semibold text-zinc-800 dark:text-zinc-200">{inspectedAgent.temperature}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">System Prompt</span>
                    <span className="mono font-semibold text-zinc-800 dark:text-zinc-200">{inspectedAgent.systemPrompt.length} chars</span>
                  </div>
                </div>

                {/* Active Tools Section */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Attached Tools</span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectedAgent.toolIds.map((tid) => {
                      const tool = toolsMap[tid];
                      if (!tool) return null;
                      return (
                        <div
                          key={tid}
                          title={tool.name}
                          className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-xs"
                        >
                          <Wrench className="w-3 h-3 text-zinc-500" />
                          <span>{tool.name}</span>
                        </div>
                      );
                    })}
                    {inspectedAgent.toolIds.length === 0 && (
                      <span className="text-xs text-zinc-400 italic">No tools attached</span>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/agents/edit/${inspectedAgent.id}`)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Edit Configuration</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/agents/edit/${inspectedAgent.id}?step=4`)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-700"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Launch Sandbox Test</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Select an agent from the registry to view technical specifications, tool attachments, and deployment logs.
              </p>
            )}
          </div>
        </aside>

      </div>

      {/* Delete Confirmation Modal */}
      <GlassModal
        isOpen={!!deletingAgent}
        onClose={() => setDeletingAgent(null)}
        title="Delete Agent Confirmation"
        subtitle="This action cannot be undone."
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="font-medium">
              Are you sure you want to delete <strong className="text-zinc-900 dark:text-white font-bold">{deletingAgent?.name}</strong>? All prompt configurations and tool bindings will be removed.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setDeletingAgent(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors"
            >
              Delete Agent
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
