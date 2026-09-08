import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Plus,
  Bot,
  Wrench,
  Sparkles,
  AlertTriangle,
  Play,
  Settings,
  LayoutGrid,
  List,
  Cpu,
  Copy,
  Check,
  X,
  Layers,
  ArrowUpDown,
  MoreVertical,
  Trash2,
  Eye,
} from 'lucide-react';
import { useAgentStore } from '../../store/useAgentStore';
import { Agent, Tool } from '../../types/agent';
import { AgentCard } from './AgentCard';
import { GlassModal } from '../../components/ui/GlassModal';
import { useToast } from '../../components/ui/Toast';

type ViewMode = 'grid' | 'table';
type SortOption = 'updated' | 'name' | 'tools';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    agents,
    tools,
    deleteAgent,
    duplicateAgent,
    fetchAgents,
    fetchTools,
  } = useAgentStore();
  const { showToast } = useToast();

  useEffect(() => {
    fetchAgents();
    fetchTools();
  }, [fetchAgents, fetchTools]);

  // View & Sort State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('updated');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedModel, setSelectedModel] = useState('all');

  // Inspector State (Slide-over drawer)
  const [inspectedAgent, setInspectedAgent] = useState<Agent | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [hasCopiedPrompt, setHasCopiedPrompt] = useState(false);

  // Modal State for Delete Confirmation
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);

  // Menu dropdown for table view rows
  const [tableMenuOpenId, setTableMenuOpenId] = useState<string | null>(null);

  // Close inspector on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsInspectorOpen(false);
        setTableMenuOpenId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Map tools by ID for fast lookup
  const toolsMap = useMemo(() => {
    return tools.reduce((acc, t) => {
      acc[t.id] = t;
      return acc;
    }, {} as Record<string, Tool>);
  }, [tools]);

  // Dynamic categories from agents
  const categories = useMemo(() => {
    const set = new Set<string>();
    agents.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return ['All Categories', ...Array.from(set)];
  }, [agents]);

  // Dynamic models from agents
  const availableModels = useMemo(() => {
    const set = new Set<string>();
    agents.forEach((a) => {
      if (a.model) set.add(a.model);
    });
    return ['all', ...Array.from(set)];
  }, [agents]);

  // Filtered & Sorted Agents
  const processedAgents = useMemo(() => {
    const filtered = agents.filter((agent) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (agent.name || '').toLowerCase().includes(q) ||
        (agent.systemPrompt || '').toLowerCase().includes(q) ||
        (agent.model || '').toLowerCase().includes(q) ||
        (agent.category || '').toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'All Categories' || agent.category === selectedCategory;
      const matchesModel = selectedModel === 'all' || agent.model === selectedModel;

      return matchesSearch && matchesCategory && matchesModel;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'tools') {
        return (b.toolIds?.length || 0) - (a.toolIds?.length || 0);
      }
      // default: 'updated'
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
  }, [agents, searchQuery, selectedCategory, selectedModel, sortBy]);

  // Statistics
  const totalAgents = agents.length;
  const totalTools = tools.length;
  const totalModels = availableModels.filter((m) => m !== 'all').length;

  const handleOpenInspector = (agent: Agent) => {
    setInspectedAgent(agent);
    setIsInspectorOpen(true);
  };

  const handleCopyPrompt = () => {
    if (!inspectedAgent?.systemPrompt) return;
    navigator.clipboard.writeText(inspectedAgent.systemPrompt);
    setHasCopiedPrompt(true);
    showToast('Prompt Copied', 'Instructions copied to clipboard', 'info');
    setTimeout(() => setHasCopiedPrompt(false), 2000);
  };

  const handleDeleteConfirm = () => {
    if (deletingAgent) {
      deleteAgent(deletingAgent.id);
      showToast('Agent Deleted', `Removed "${deletingAgent.name}"`, 'info');
      setDeletingAgent(null);
      if (inspectedAgent?.id === deletingAgent.id) {
        setIsInspectorOpen(false);
        setInspectedAgent(null);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* 1. TOP EXECUTIVE HEADER WITH INLINE METRICS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-2">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>Orchestration Workspace</span>
          </div>
          <div className="flex flex-wrap items-center gap-3.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Agent Hive
            </h1>
            {/* Inline Header Metric Badges */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-800/90 text-zinc-700 dark:text-zinc-300 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800/90 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    {totalAgents}
                  </span>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Agents
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-800/90 text-zinc-700 dark:text-zinc-300 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800/90 flex items-center justify-center shrink-0">
                  <Wrench className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    {totalTools}
                  </span>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Tools
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-800/90 text-zinc-700 dark:text-zinc-300 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800/90 flex items-center justify-center shrink-0">
                  <Cpu className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    {totalModels}
                  </span>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Models
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Build, run, and manage AI agents with live tool execution and MCP server integration.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          <Link
            to="/agents/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create New Agent</span>
          </Link>
        </div>
      </div>

      {/* 2. COMPACT SEARCH & FILTER TOOLBAR */}
      <div className="glass-card rounded-2xl p-2.5 sm:p-3 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents by name, instructions, or model..."
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs glass-input text-zinc-900 dark:text-white placeholder:text-zinc-400 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters & Actions Group */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Model Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
            >
              <option value="all">All Models</option>
              {availableModels.filter((m) => m !== 'all').map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Selector */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:inline" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
            >
              <option value="updated">Recently Updated</option>
              <option value="name">Alphabetical (A-Z)</option>
              <option value="tools">Tool Connections</option>
            </select>
          </div>

          {(searchQuery || selectedCategory !== 'All Categories' || selectedModel !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All Categories');
                setSelectedModel('all');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              Reset
            </button>
          )}

          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 ml-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN AGENT REGISTRY DISPLAY */}
      {processedAgents.length > 0 ? (
        viewMode === 'grid' ? (
          /* GRID VIEW: Responsive 2-3 Column Modern Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {processedAgents.map((agent) => {
                const isSelected = inspectedAgent?.id === agent.id && isInspectorOpen;
                return (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    toolsMap={toolsMap}
                    isSelected={isSelected}
                    onSelect={() => handleOpenInspector(agent)}
                    onInspect={() => handleOpenInspector(agent)}
                    onTest={() => navigate(`/agents/run/${agent.id}`)}
                    onDeleteRequest={(ag) => setDeletingAgent(ag)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          /* TABLE VIEW: Compact, Professional Data Table */
          <div className="glass-card rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Agent Name</th>
                    <th className="py-3.5 px-4">Model</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Tools</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {processedAgents.map((agent) => {
                    const isSelected = inspectedAgent?.id === agent.id && isInspectorOpen;
                    const isMenuOpen = tableMenuOpenId === agent.id;
                    const agentTools = agent.toolIds.map((id) => toolsMap[id]).filter(Boolean);

                    return (
                      <tr
                        key={agent.id}
                        onDoubleClick={() => handleOpenInspector(agent)}
                        title="Double-click to inspect agent"
                        className={`group cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-zinc-100/70 dark:bg-zinc-900/80'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                        }`}
                      >
                        {/* Name & Description */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                              <Bot className="w-4 h-4 text-zinc-900 dark:text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {agent.name}
                              </p>
                              {agent.description && (
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 max-w-xs sm:max-w-md">
                                  {agent.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Model */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                          <span 
                            title={agent.model}
                            className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold max-w-[260px] truncate inline-block align-middle"
                          >
                            {agent.model}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 font-medium">
                          {agent.category || 'General'}
                        </td>

                        {/* Connected Tools */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            {agentTools.slice(0, 3).map((t) => (
                              <span
                                key={t.id}
                                className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300"
                              >
                                {t.name}
                              </span>
                            ))}
                            {agentTools.length > 3 && (
                              <span className="text-[10px] text-zinc-500 font-bold ml-1">
                                +{agentTools.length - 3}
                              </span>
                            )}
                            {agentTools.length === 0 && (
                              <span className="text-zinc-400 text-[11px] italic">None</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/agents/run/${agent.id}`)}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                              title="Run Agent"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span className="hidden sm:inline">Run</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/agents/edit/${agent.id}`)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Edit Agent"
                            >
                              <Settings className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenInspector(agent)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border-transparent'
                              }`}
                              title="Inspect Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setTableMenuOpenId(isMenuOpen ? null : agent.id)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              <AnimatePresence>
                                {isMenuOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-[70]"
                                      onClick={() => setTableMenuOpenId(null)}
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      className="absolute right-0 mt-1 w-44 z-[80] rounded-xl popup-solid p-1.5 shadow-xl text-xs font-medium border border-zinc-200 dark:border-zinc-800"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTableMenuOpenId(null);
                                          duplicateAgent(agent.id);
                                          showToast('Agent Duplicated', `Created copy of ${agent.name}`, 'success');
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Duplicate</span>
                                      </button>
                                      <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTableMenuOpenId(null);
                                          setDeletingAgent(agent);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                      </button>
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-3xl p-12 text-center border border-zinc-200 dark:border-zinc-800 max-w-lg mx-auto my-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">No agents match your criteria</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Try adjusting your search query, category, or model selection to discover agents.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All Categories');
                setSelectedModel('all');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Clear All Filters
            </button>
            <Link
              to="/agents/new"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:scale-105 transition-transform"
            >
              Create New Agent
            </Link>
          </div>
        </motion.div>
      )}

      {/* 4. SLIDE-OVER TELEMETRY INSPECTOR DRAWER */}
      <AnimatePresence>
        {isInspectorOpen && inspectedAgent && (
          <div className="fixed inset-0 z-[100] overflow-hidden">
            {/* Backdrop Blur Layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInspectorOpen(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
            />

            {/* Slide-over Drawer Content */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="w-screen max-w-md bg-white dark:bg-zinc-950 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col"
              >
                {/* Drawer Header */}
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                        Agent Telemetry & Specs
                      </h3>
                      <p className="text-[11px] text-zinc-500">Live configuration inspection</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen(false)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                  {/* Hero Identity Banner */}
                  <div className="flex items-start gap-3.5 pb-5 border-b border-zinc-100 dark:border-zinc-900">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                      <Bot className="w-6 h-6 text-zinc-900 dark:text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-extrabold text-zinc-900 dark:text-white">
                        {inspectedAgent.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="mono text-[10px] text-zinc-500 font-bold uppercase">
                          {inspectedAgent.category || 'General'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {inspectedAgent.description && (
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                        Overview Description
                      </span>
                      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                        {inspectedAgent.description}
                      </p>
                    </div>
                  )}

                  {/* Specifications Grid */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                      Technical Specifications
                    </span>
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                      <div className="p-3 flex items-center justify-between">
                        <span className="text-zinc-500">Language Model</span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-white">
                          {inspectedAgent.model}
                        </span>
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <span className="text-zinc-500">System Instructions</span>
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">
                          {inspectedAgent.systemPrompt?.length || 0} characters
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* System Prompt Box */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        System Instructions
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                      >
                        {hasCopiedPrompt ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-3.5 rounded-xl bg-zinc-900 text-zinc-200 dark:bg-black font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto border border-zinc-800 whitespace-pre-wrap select-text">
                      {inspectedAgent.systemPrompt || '// No system instructions provided'}
                    </div>
                  </div>

                  {/* Attached Tools & MCP Servers */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Attached Tools ({inspectedAgent.toolIds.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {inspectedAgent.toolIds.map((tid) => {
                        const tool = toolsMap[tid];
                        return (
                          <div
                            key={tid}
                            className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                                <Wrench className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="font-bold text-zinc-900 dark:text-white">
                                  {tool?.name || tid}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-mono">
                                  {tool?.type === 'mcp' ? `MCP: ${tool.mcp_server_id || 'server'}` : 'Built-in Tool'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-600 dark:text-zinc-400">
                              Active
                            </span>
                          </div>
                        );
                      })}

                      {inspectedAgent.toolIds.length === 0 && (
                        <p className="text-zinc-400 italic text-center py-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                          No tools or MCP integrations attached.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Drawer Actions */}
                <div className="p-5 border-t border-zinc-100 dark:border-zinc-900 flex items-center gap-3 bg-zinc-50/50 dark:bg-zinc-900/40">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInspectorOpen(false);
                      navigate(`/agents/run/${inspectedAgent.id}`);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Agent</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsInspectorOpen(false);
                      navigate(`/agents/edit/${inspectedAgent.id}`);
                    }}
                    className="py-2.5 px-4 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. DELETE CONFIRMATION MODAL */}
      <GlassModal
        isOpen={!!deletingAgent}
        onClose={() => setDeletingAgent(null)}
        title="Delete Agent Confirmation"
        subtitle="This action will permanently delete the agent."
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="font-medium">
              Are you sure you want to delete <strong className="text-zinc-900 dark:text-white font-bold">{deletingAgent?.name}</strong>? All configurations and prompt templates will be permanently removed.
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
