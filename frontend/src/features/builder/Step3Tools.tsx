import React, { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  Wrench,
  Search,
  Globe,
  Terminal,
  Mail,
  Database,
  Calculator,
  CloudSun,
  BookOpen,
  Plus,
  Check,
  Server,
  Loader2,
} from 'lucide-react';
import { AgentBuilderFormData } from './AgentBuilderPage';
import { useAgentStore } from '../../store/useAgentStore';
import { CustomToolModal } from '../../components/ui/CustomToolModal';
import { useToast } from '../../components/ui/Toast';

interface Step3ToolsProps {
  form: UseFormReturn<AgentBuilderFormData>;
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  Search,
  Globe,
  Terminal,
  Mail,
  Database,
  Calculator,
  CloudSun,
  BookOpen,
  Wrench,
};

export const Step3Tools: React.FC<Step3ToolsProps> = ({ form }) => {
  const { watch, setValue } = form;
  const { tools, mcpServers, fetchTools, fetchMcpServers, isToolsLoading, isMcpServersLoading } = useAgentStore();
  const { showToast } = useToast();

  const selectedToolIds = watch('toolIds') || [];
  const selectedMcpServers = watch('mcpServers') || [];
  const [isCustomToolModalOpen, setIsCustomToolModalOpen] = useState(false);

  useEffect(() => {
    fetchTools();
    fetchMcpServers();
  }, [fetchTools, fetchMcpServers]);

  const toggleTool = (toolId: string, toolName: string) => {
    const isAlreadySelected = selectedToolIds.includes(toolId);
    let nextIds: string[];

    if (isAlreadySelected) {
      nextIds = selectedToolIds.filter((id) => id !== toolId);
      showToast('Tool Detached', `Removed ${toolName} from agent capabilities`, 'info');
    } else {
      nextIds = [...selectedToolIds, toolId];
      showToast('Tool Attached', `Added ${toolName} to agent capabilities`, 'success');
    }

    setValue('toolIds', nextIds);
  };

  const toggleMcpServer = (url: string) => {
    const isAlreadySelected = selectedMcpServers.includes(url);
    let nextServers: string[];

    if (isAlreadySelected) {
      nextServers = selectedMcpServers.filter((s) => s !== url);
      showToast('MCP Server Detached', `Removed ${url}`, 'info');
    } else {
      nextServers = [...selectedMcpServers, url];
      showToast('MCP Server Attached', `Added ${url}`, 'success');
    }

    setValue('mcpServers', nextServers);
  };

  const handleCustomToolCreated = (newToolId: string) => {
    if (!selectedToolIds.includes(newToolId)) {
      setValue('toolIds', [...selectedToolIds, newToolId]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tools Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800/80">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-zinc-700 dark:text-zinc-300" /> Tool Catalog Integration
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 font-normal">
              Enable tools to allow your agent to fetch live data or execute custom logic.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCustomToolModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Custom Tool</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
          <span>Available Tools ({tools.length})</span>
          <span className="font-bold text-zinc-800 dark:text-zinc-200">
            {selectedToolIds.length} tool{selectedToolIds.length === 1 ? '' : 's'} attached
          </span>
        </div>

        {isToolsLoading ? (
          <div className="flex items-center justify-center p-8 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2 text-sm">Loading tools...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => {
              const isSelected = selectedToolIds.includes(tool.id);
              const IconComponent = TOOL_ICONS[tool.iconName] || Wrench;

              return (
                <div
                  key={tool.id}
                  onClick={() => toggleTool(tool.id, tool.name)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-zinc-900 dark:border-white ring-1 ring-zinc-900/10 dark:ring-white/10 bg-zinc-100/60 dark:bg-zinc-800/60 shadow-xs'
                      : 'glass-card border-zinc-200 dark:border-zinc-800/70 hover:border-zinc-400 dark:hover:border-zinc-600'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                              : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>

                        <div>
                          <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 leading-snug">
                            {tool.name}
                          </h4>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            {tool.category}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900'
                            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mt-2 line-clamp-2 font-normal">
                      {tool.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MCP Servers Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800/80">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> MCP Servers
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 font-normal">
              Connect external Model Context Protocol (MCP) servers to extend the agent's context and capabilities.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
          <span>Available MCP Servers ({mcpServers.length})</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-300">
            {selectedMcpServers.length} server{selectedMcpServers.length === 1 ? '' : 's'} attached
          </span>
        </div>

        {isMcpServersLoading ? (
          <div className="flex items-center justify-center p-8 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2 text-sm">Loading MCP servers...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mcpServers.map((server, index) => {
              const isSelected = selectedMcpServers.includes(server.url);

              return (
                <div
                  key={index}
                  onClick={() => toggleMcpServer(server.url)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-600 ring-1 ring-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/10 shadow-xs'
                      : 'glass-card border-zinc-200 dark:border-zinc-800/70 hover:border-emerald-300 dark:hover:border-emerald-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <Server className="w-4 h-4" />
                        </div>

                        <div className="overflow-hidden">
                          <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 leading-snug truncate">
                            {server.url}
                          </h4>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mt-2 line-clamp-2 font-normal">
                      {server.description || 'Model Context Protocol Server endpoint'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CustomToolModal
        isOpen={isCustomToolModalOpen}
        onClose={() => setIsCustomToolModalOpen(false)}
        onToolCreated={handleCustomToolCreated}
      />
    </div>
  );
};
