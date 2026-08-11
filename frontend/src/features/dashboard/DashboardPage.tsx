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
  LayoutGrid,
  List as ListIcon,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useAgentStore } from '../../store/useAgentStore';
import { Agent, AgentStatus, Tool } from '../../types/agent';
import { AgentCard } from './AgentCard';
import { CATEGORIES } from '../../data/mockData';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
            <span className="mono text-slate-800 dark:text-slate-300 font-extrabold">NAVIGATION</span>
            <button
              type="button"
              onClick={() => {
                resetToDefaults();
                showToast('Reset Complete', 'Restored sample agents & tools catalog.', 'info');
              }}
              title="Reset Sample Data"
              className="p-1.5 rounded glass-card text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-[#00F0FF] border border-slate-300 dark:border-white/10 transition-colors text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="glass-card rounded p-4 border border-slate-300 dark:border-white/10">
              <span className="mono block text-slate-800 dark:text-slate-300 mb-1 font-extrabold">TOTAL_AGENTS</span>
              <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {String(totalAgents).padStart(2, '0')}
              </h4>
            </div>

            <div className="glass-card rounded p-4 border border-slate-300 dark:border-white/10">
              <span className="mono block text-emerald-950 dark:text-[#00FF85] mb-1 font-extrabold">LIVE_STATUS</span>
              <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {String(publishedCount).padStart(2, '0')}
              </h4>
            </div>

            <div className="glass-card rounded p-4 border border-slate-300 dark:border-white/10">
              <span className="mono block text-amber-950 dark:text-amber-400 mb-1 font-extrabold">DRAFT_MODELS</span>
              <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {String(draftCount).padStart(2, '0')}
              </h4>
            </div>

            <div className="glass-card rounded p-4 border border-slate-300 dark:border-white/10">
              <span className="mono block text-purple-950 dark:text-purple-400 mb-1 font-extrabold">CORE_TOOLS</span>
              <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {String(totalTools).padStart(2, '0')}
              </h4>
            </div>
          </div>
        </aside>

        {/* CENTER PANE: Main Content & Agent Registry */}
        <main className="lg:col-span-6 space-y-6">
          {/* Hub Banner */}
          <div className="glass-card rounded p-6 border border-slate-300 dark:border-white/10">
            <span className="mono text-cyan-900 dark:text-[#00F0FF] block mb-2 font-extrabold">
              [00_ORCHESTRATION_HUB]
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              Agent Orchestration Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 font-medium leading-relaxed">
              Build, test, and deploy intelligent custom agents equipped with live search tools, python sandboxes, and API connectors.
            </p>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-600 dark:text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Query agent manifest database..."
              className="w-full pl-10 pr-4 py-2.5 rounded text-xs glass-input text-slate-900 dark:text-white font-mono font-bold placeholder:font-sans placeholder:text-slate-600 dark:placeholder:text-slate-400"
            />
          </div>

          {/* Active Registry Header & Filters */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-300 dark:border-white/10 pb-3">
            <span className="mono text-slate-900 dark:text-slate-200 font-extrabold">ACTIVE_REGISTRY</span>

            <div className="flex items-center gap-2">
              {/* Status Filter Pills */}
              <div className="flex items-center bg-slate-200 dark:bg-black/40 p-1 rounded border border-slate-300 dark:border-white/10 text-[10px] mono">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-[#00F0FF] font-extrabold'
                      : 'text-slate-800 dark:text-slate-400 font-bold'
                  }`}
                >
                  ALL
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('published')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    statusFilter === 'published'
                      ? 'bg-emerald-800 text-white dark:bg-white/10 dark:text-[#00FF85] font-extrabold'
                      : 'text-slate-800 dark:text-slate-400 font-bold'
                  }`}
                >
                  PUBLISHED
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('draft')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    statusFilter === 'draft'
                      ? 'bg-amber-800 text-white dark:bg-white/10 dark:text-amber-400 font-extrabold'
                      : 'text-slate-800 dark:text-slate-400 font-bold'
                  }`}
                >
                  DRAFT
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-200 dark:bg-black/40 p-1 rounded border border-slate-300 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded ${viewMode === 'grid' ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-[#00F0FF]' : 'text-slate-600'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded ${viewMode === 'list' ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-[#00F0FF]' : 'text-slate-600'}`}
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Agent Cards / List */}
          {filteredAgents.length > 0 ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  : 'flex flex-col gap-3'
              }
            >
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
              className="glass-card rounded p-8 text-center border border-slate-300 dark:border-white/10 my-4"
            >
              <div className="w-12 h-12 rounded bg-cyan-500/10 text-cyan-700 dark:text-[#00F0FF] flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">NO_MATCHING_ENTITIES</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No agents match the current database query or status filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSelectedCategory('All Categories');
                  setSelectedModel('all');
                }}
                className="mt-4 px-3 py-1.5 rounded text-xs mono font-bold bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200"
              >
                CLEAR_FILTERS
              </button>
            </motion.div>
          )}
        </main>

        {/* RIGHT PANE: Technical Inspector */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="mono text-slate-800 dark:text-slate-300 font-extrabold">INSPECTOR</span>
          </div>

          <div className="glass-card rounded p-5 border border-slate-300 dark:border-white/10 space-y-4">
            <span className="mono text-slate-800 dark:text-slate-300 block border-b border-slate-300 dark:border-white/10 pb-2 font-extrabold">
              SELECTED_ENTITY
            </span>

            {inspectedAgent ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {inspectedAgent.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="mono text-[10px] px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/10 text-cyan-950 dark:text-[#00F0FF] border border-cyan-300 dark:border-cyan-500/20 font-bold">
                      {inspectedAgent.model}
                    </span>
                    <span
                      className={`mono text-[10px] px-2 py-0.5 rounded font-bold ${
                        inspectedAgent.status === 'published'
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-500/15 dark:text-[#00FF85] dark:border-emerald-500/30'
                          : 'bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                      }`}
                    >
                      {inspectedAgent.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-800 dark:text-slate-300 leading-relaxed font-normal">
                  {inspectedAgent.description || 'No description provided.'}
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="mono text-slate-800 dark:text-slate-400 font-bold">CATEGORY</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-200">{inspectedAgent.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="mono text-slate-800 dark:text-slate-400 font-bold">TEMPERATURE</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-slate-200">{inspectedAgent.temperature}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="mono text-slate-800 dark:text-slate-400 font-bold">PROMPT_LENGTH</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-slate-200">{inspectedAgent.systemPrompt.length} chars</span>
                  </div>
                </div>

                {/* Active Tools Section */}
                <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                  <span className="mono text-slate-800 dark:text-slate-400 block mb-2 font-bold">ACTIVE_TOOLS</span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectedAgent.toolIds.map((tid) => {
                      const tool = toolsMap[tid];
                      if (!tool) return null;
                      return (
                        <div
                          key={tid}
                          title={tool.name}
                          className="px-2 py-1 rounded bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-[10px] font-mono font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1"
                        >
                          <Wrench className="w-3 h-3 text-cyan-700 dark:text-[#00F0FF]" />
                          <span>{tool.name}</span>
                        </div>
                      );
                    })}
                    {inspectedAgent.toolIds.length === 0 && (
                      <span className="text-xs text-slate-500 italic">No tools attached</span>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/agents/edit/${inspectedAgent.id}`)}
                    className="w-full py-2 px-3 rounded text-xs font-bold mono bg-cyan-700 hover:bg-cyan-800 dark:bg-[#00F0FF] dark:hover:bg-cyan-400 text-white dark:text-black transition-colors flex items-center justify-center gap-2"
                  >
                    <span>EDIT_AGENT_CONFIG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/agents/edit/${inspectedAgent.id}?step=4`)}
                    className="w-full py-2 px-3 rounded text-xs font-bold mono bg-slate-900 hover:bg-black dark:bg-white/10 dark:hover:bg-white/15 text-white dark:text-slate-200 transition-colors flex items-center justify-center gap-2 border border-slate-900 dark:border-white/10"
                  >
                    <span>LAUNCH_TEST_SANDBOX</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">
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
          <div className="flex items-center gap-3 p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="font-medium">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{deletingAgent?.name}</strong>? All prompt configurations and tool bindings will be removed.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setDeletingAgent(null)}
              className="px-4 py-2 rounded text-xs font-bold mono text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="px-4 py-2 rounded text-xs font-bold mono bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/20"
            >
              DELETE_AGENT
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
