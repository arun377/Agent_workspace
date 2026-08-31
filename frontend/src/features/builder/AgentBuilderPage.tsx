import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import {
  Save,
  Send,
  ArrowLeft,
  Cpu,
  Check,
  Server,
  Wrench,
  Search,
  ChevronDown,
  Info,
  X
} from 'lucide-react';
import { useAgentStore } from '../../store/useAgentStore';
import { AgentStatus } from '../../types/agent';
import { useToast } from '../../components/ui/Toast';
import { AI_MODELS_INFO } from '../../data/constants';

const agentFormSchema = z.object({
  name: z.string().min(2, 'Agent name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().optional(),
  model: z.string().min(1, 'Please select a model'),
  systemPrompt: z.string().min(10, 'System instructions must be at least 10 characters'),
  toolIds: z.array(z.string()),
  mcpServers: z.array(z.string()).optional(),
});

export type AgentBuilderFormData = z.infer<typeof agentFormSchema>;

function useOutsideAlerter(ref: React.RefObject<HTMLDivElement | null>, onClickOutside: () => void) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, onClickOutside]);
}

export const AgentBuilderPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { agents, createAgent, updateAgent, tools, mcpServers, fetchTools, fetchMcpServers } = useAgentStore();
  const { showToast } = useToast();

  const isEditing = Boolean(id);
  const existingAgent = isEditing ? agents.find((a) => a.id === id) : null;

  useEffect(() => {
    fetchTools();
    fetchMcpServers();
  }, [fetchTools, fetchMcpServers]);

  const form = useForm<AgentBuilderFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: existingAgent?.name || '',
      description: existingAgent?.description || '',
      category: existingAgent?.category || 'Custom',
      model: existingAgent?.model || '',
      systemPrompt:
        existingAgent?.systemPrompt ||
        `You are a specialized AI assistant.\nYour goal is to assist users with query.\nAlways maintain a professional tone.`,
      toolIds: existingAgent?.toolIds || [],
      mcpServers: existingAgent?.mcpServers || [],
    },
  });

  const { register, watch, setValue, handleSubmit, formState: { errors } } = form;

  const currentModel = watch('model');
  const selectedToolIds = watch('toolIds') || [];
  const selectedMcpServers = watch('mcpServers') || [];

  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [modelSearch, setModelSearch] = useState('');
  const [toolSearch, setToolSearch] = useState('');
  const [mcpSearch, setMcpSearch] = useState('');
  
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMcpOpen, setIsMcpOpen] = useState(false);
  
  // Global Tooltip State tracking cursor X position
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const providerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const mcpRef = useRef<HTMLDivElement>(null);
  
  useOutsideAlerter(providerRef, () => setIsProviderOpen(false));
  useOutsideAlerter(modelRef, () => setIsModelOpen(false));
  useOutsideAlerter(toolsRef, () => setIsToolsOpen(false));
  useOutsideAlerter(mcpRef, () => setIsMcpOpen(false));

  useEffect(() => {
    if (currentModel && !selectedProvider) {
      const provider = Object.entries(AI_MODELS_INFO).find(([_, models]) => 
        models.some(m => m.id === currentModel)
      );
      if (provider) setSelectedProvider(provider[0]);
    }
  }, [currentModel, selectedProvider]);

  useEffect(() => {
    if (existingAgent) {
      form.reset({
        name: existingAgent.name,
        description: existingAgent.description,
        category: existingAgent.category,
        model: existingAgent.model,
        systemPrompt: existingAgent.systemPrompt,
        toolIds: existingAgent.toolIds,
        mcpServers: existingAgent.mcpServers,
      });
    }
  }, [existingAgent, form]);

  const onSave = async (statusToSave: AgentStatus) => {
    const values = form.getValues();
    const result = agentFormSchema.safeParse(values);
    if (!result.success) {
      showToast('Validation Failed', 'Please fix form errors before saving.', 'error');
      handleSubmit(() => {})();
      return;
    }

    try {
      if (isEditing && existingAgent) {
        updateAgent(existingAgent.id, {
          ...values,
          description: values.description || '',
          category: values.category || 'Custom',
          status: statusToSave,
        });
        showToast('Success', `${values.name} updated successfully`, 'success');
      } else {
        await createAgent({
          ...values,
          description: values.description || '',
          category: values.category || 'Custom',
          mcpServers: values.mcpServers || [],
          status: statusToSave,
        });
        showToast('Success', `${values.name} created successfully`, 'success');
      }
      navigate('/agents');
    } catch (err) {
      showToast('Error', 'Failed to save the agent. Please try again.', 'error');
    }
  };

  const toggleTool = (toolId: string) => {
    const isSelected = selectedToolIds.includes(toolId);
    setValue('toolIds', isSelected ? selectedToolIds.filter(id => id !== toolId) : [...selectedToolIds, toolId]);
  };

  const toggleMcpServer = (url: string) => {
    const isSelected = selectedMcpServers.includes(url);
    setValue('mcpServers', isSelected ? selectedMcpServers.filter(u => u !== url) : [...selectedMcpServers, url]);
  };
  
  const availableModels = selectedProvider ? AI_MODELS_INFO[selectedProvider] || [] : [];
  const filteredModels = availableModels.filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase()));
  const filteredTools = tools.filter(t => t.name.toLowerCase().includes(toolSearch.toLowerCase()) || t.description.toLowerCase().includes(toolSearch.toLowerCase()));
  const filteredMcp = mcpServers.filter(s => s.url.toLowerCase().includes(mcpSearch.toLowerCase()));

  // Helper for mouse tracking tooltip
  const handleMouseMove = (e: React.MouseEvent, text: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ text, x: e.clientX, y: rect.top - 12 });
  };
  
  const handleMouseLeave = () => setTooltip(null);

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-2rem)] max-w-6xl mx-auto">
        {/* Fixed Top Header */}
        <div className="shrink-0 glass-card rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-30">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/agents')}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {isEditing ? `Edit Agent: ${existingAgent?.name}` : 'Create New Agent'}
              </h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                Configure identity, model, tools, and prompts in one place.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onSave('draft')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Save className="w-3.5 h-3.5 text-amber-500" />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              onClick={() => onSave('published')}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Agent</span>
            </button>
          </div>
        </div>

        {/* Single Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
            <div className="lg:col-span-2 space-y-6">
              {/* Identity & Model Section */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800/80 space-y-5 relative z-20">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">Identity & Engine</h2>
                
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Agent Name *</label>
                  <input
                    {...register('name')}
                    placeholder="e.g. Technical Support Specialist"
                    className="w-full px-4 py-2.5 rounded-xl text-xs glass-input text-zinc-900 dark:text-zinc-100 font-semibold border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  />
                  {errors.name && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Provider Dropdown */}
                  <div ref={providerRef} className="relative z-20">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Model Provider *</label>
                    <button 
                      type="button" 
                      onClick={() => setIsProviderOpen(!isProviderOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs glass-input text-zinc-900 dark:text-zinc-100 font-semibold border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-zinc-400" />
                        <span>{selectedProvider || 'Select Provider'}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    </button>

                    <AnimatePresence>
                      {isProviderOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                          className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl flex flex-col gap-1 z-30"
                        >
                          {Object.keys(AI_MODELS_INFO).map((provider) => (
                            <button
                              key={provider}
                              type="button"
                              onClick={() => {
                                setSelectedProvider(provider);
                                setValue('model', '');
                                setIsProviderOpen(false);
                              }}
                              className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${selectedProvider === provider ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'}`}
                            >
                              {provider}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Model Dropdown */}
                  <div ref={modelRef} className="relative z-10">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Model *</label>
                    <button 
                      type="button" 
                      disabled={!selectedProvider}
                      onClick={() => setIsModelOpen(!isModelOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs glass-input text-zinc-900 dark:text-zinc-100 font-semibold border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                        <span className="truncate">
                          {currentModel ? availableModels.find(m => m.id === currentModel)?.name : (selectedProvider ? 'Select Model' : 'Select Provider First')}
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                    </button>

                    <AnimatePresence>
                      {isModelOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl flex flex-col z-30 overflow-hidden"
                        >
                          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
                              <input
                                type="text"
                                value={modelSearch}
                                onChange={e => setModelSearch(e.target.value)}
                                placeholder="Search models..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              />
                            </div>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-1.5 flex flex-col gap-1 scrollbar-thin">
                            {filteredModels.length > 0 ? filteredModels.map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setValue('model', m.id);
                                  setIsModelOpen(false);
                                  setModelSearch('');
                                  setTooltip(null);
                                }}
                                onMouseMove={(e) => handleMouseMove(e, m.description)}
                                onMouseLeave={handleMouseLeave}
                                className={`flex flex-col px-3 py-2.5 rounded-lg text-left transition-colors ${currentModel === m.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                              >
                                <div className="flex items-center justify-between w-full pointer-events-none">
                                  <span className={`text-xs font-bold ${currentModel === m.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-200'}`}>{m.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    {m.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">{m.badge}</span>}
                                  </div>
                                </div>
                              </button>
                            )) : (
                              <div className="p-3 text-center text-xs text-zinc-500">No models found.</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {errors.model && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.model.message}</p>}
                  </div>
                </div>
              </motion.div>

              {/* Prompt Section */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 relative z-10">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white">System Prompt Instructions</h2>
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono font-semibold">{watch('systemPrompt')?.length || 0} chars</span>
                </div>
                
                <textarea
                  {...register('systemPrompt')}
                  rows={8}
                  placeholder="Enter detailed instructions for your agent..."
                  className="w-full p-4 rounded-xl text-xs font-mono glass-input text-zinc-900 dark:text-zinc-100 leading-relaxed border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all resize-y"
                />
                {errors.systemPrompt && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.systemPrompt.message}</p>}
              </motion.div>
            </div>

            {/* Right Sidebar: Capabilities */}
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800/80 space-y-5 relative z-20">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">Capabilities</h2>
                
                <div className="space-y-6">
                  {/* Tools Combobox */}
                  <div ref={toolsRef} className="relative z-20">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Attached Tools</label>
                    <div 
                      onClick={() => setIsToolsOpen(!isToolsOpen)}
                      className="w-full flex items-center justify-between px-2 py-1.5 min-h-[42px] rounded-xl text-xs glass-input text-zinc-900 dark:text-zinc-100 font-semibold border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-2">
                        {selectedToolIds.length === 0 && (
                          <div className="flex items-center gap-2 px-2 text-zinc-500 py-1">
                            <Wrench className="w-4 h-4 text-zinc-400" />
                            <span>Select Tools...</span>
                          </div>
                        )}
                        {selectedToolIds.map(id => {
                          const tool = tools.find(t => t.id === id);
                          if (!tool) return null;
                          return (
                            <div key={id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">{tool.name}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); toggleTool(id); }} className="ml-0.5 text-zinc-400 hover:text-rose-500 transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0 mx-2" />
                    </div>

                    <AnimatePresence>
                      {isToolsOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl flex flex-col z-30 overflow-hidden"
                        >
                          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
                              <input
                                type="text"
                                value={toolSearch}
                                onChange={e => setToolSearch(e.target.value)}
                                placeholder="Search tools..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              />
                            </div>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-1.5 flex flex-col gap-1 scrollbar-thin">
                            {filteredTools.length > 0 ? filteredTools.map(tool => {
                              const isSelected = selectedToolIds.includes(tool.id);
                              return (
                                <button
                                  key={tool.id}
                                  type="button"
                                  onClick={() => toggleTool(tool.id)}
                                  onMouseMove={(e) => handleMouseMove(e, tool.description)}
                                  onMouseLeave={handleMouseLeave}
                                  className={`flex flex-col px-3 py-2.5 rounded-lg text-left transition-colors ${isSelected ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                                >
                                  <div className="flex items-center justify-between w-full pointer-events-none">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${isSelected ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900' : 'border-zinc-300 dark:border-zinc-600'}`}>
                                        {isSelected && <Check className="w-2.5 h-2.5" />}
                                      </div>
                                      <span className={`text-xs font-bold ${isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-200'}`}>{tool.name}</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            }) : (
                              <div className="p-3 text-center text-xs text-zinc-500">No tools found.</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* MCP Servers Combobox */}
                  <div ref={mcpRef} className="relative z-10 pt-2">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">MCP Servers</label>
                    <div 
                      onClick={() => setIsMcpOpen(!isMcpOpen)}
                      className="w-full flex items-center justify-between px-2 py-1.5 min-h-[42px] rounded-xl text-xs glass-input text-zinc-900 dark:text-zinc-100 font-semibold border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-2">
                        {selectedMcpServers.length === 0 && (
                          <div className="flex items-center gap-2 px-2 text-zinc-500 py-1">
                            <Server className="w-4 h-4 text-emerald-500/70" />
                            <span>Select MCPs...</span>
                          </div>
                        )}
                        {selectedMcpServers.map(url => (
                          <div key={url} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 shadow-sm" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 max-w-[120px] truncate">{url}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); toggleMcpServer(url); }} className="ml-0.5 text-emerald-600/50 hover:text-emerald-600 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0 mx-2" />
                    </div>

                    <AnimatePresence>
                      {isMcpOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl flex flex-col z-30 overflow-hidden"
                        >
                          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
                              <input
                                type="text"
                                value={mcpSearch}
                                onChange={e => setMcpSearch(e.target.value)}
                                placeholder="Search MCPs..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              />
                            </div>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-1.5 flex flex-col gap-1 scrollbar-thin">
                            {filteredMcp.length > 0 ? filteredMcp.map((server, idx) => {
                              const isSelected = selectedMcpServers.includes(server.url);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => toggleMcpServer(server.url)}
                                  onMouseMove={(e) => handleMouseMove(e, server.description || 'MCP Endpoint')}
                                  onMouseLeave={handleMouseLeave}
                                  className={`flex flex-col px-3 py-2.5 rounded-lg text-left transition-colors ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                                >
                                  <div className="flex items-center justify-between w-full pointer-events-none">
                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                                        {isSelected && <Check className="w-2.5 h-2.5" />}
                                      </div>
                                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-200'}`}>{server.url}</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            }) : (
                              <div className="p-3 text-center text-xs text-zinc-500">No MCP servers found.</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Tooltip fixed to screen */}
      <AnimatePresence>
        {tooltip && (
          <motion.div 
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ 
              position: 'fixed', 
              left: tooltip.x, 
              top: tooltip.y, 
              transform: 'translate(-50%, -100%)' 
            }}
            className="pointer-events-none z-[99999] px-3.5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold leading-relaxed rounded-xl shadow-2xl w-max max-w-[240px] text-center"
          >
            {tooltip.text}
            {/* Tooltip Arrow pointing down, centered exactly on mouse cursor */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-[6px] border-transparent border-t-zinc-900 dark:border-t-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
