import React, { useState } from 'react';
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
  const { tools } = useAgentStore();
  const { showToast } = useToast();

  const selectedToolIds = watch('toolIds') || [];
  const [isCustomToolModalOpen, setIsCustomToolModalOpen] = useState(false);

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

  const handleCustomToolCreated = (newToolId: string) => {
    if (!selectedToolIds.includes(newToolId)) {
      setValue('toolIds', [...selectedToolIds, newToolId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info & Create Custom Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-zinc-700 dark:text-zinc-300" /> Tool Catalog Integration
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 font-normal">
            Enable tools to allow your agent to fetch live data, query SQL databases, or execute custom endpoints.
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

      {/* Selected Count Indicator */}
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
        <span>Available Tools ({tools.length})</span>
        <span className="font-bold text-zinc-800 dark:text-zinc-200">
          {selectedToolIds.length} tool{selectedToolIds.length === 1 ? '' : 's'} attached
        </span>
      </div>

      {/* Tools Grid */}
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

                  {/* Toggle Checkbox Badge */}
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

              {tool.isCustom && (
                <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] mono text-zinc-600 dark:text-zinc-400 font-bold">
                  <span>Custom HTTP Endpoint</span>
                  <span className="text-zinc-900 dark:text-white">{tool.httpMethod || 'POST'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Tool Modal */}
      <CustomToolModal
        isOpen={isCustomToolModalOpen}
        onClose={() => setIsCustomToolModalOpen(false)}
        onToolCreated={handleCustomToolCreated}
      />
    </div>
  );
};
