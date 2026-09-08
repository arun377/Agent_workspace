import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  Search,
  Globe,
  Terminal,
  Mail,
  Database,
  Calculator,
  CloudSun,
  BookOpen,
  Wrench,
  Cpu,
  Play,
  Settings,
  Eye,
} from 'lucide-react';
import { Agent, Tool } from '../../types/agent';
import { useAgentStore } from '../../store/useAgentStore';
import { useToast } from '../../components/ui/Toast';

interface AgentCardProps {
  agent: Agent;
  toolsMap: Record<string, Tool>;
  isSelected?: boolean;
  onSelect?: (agentId: string) => void;
  onInspect?: (agent: Agent) => void;
  onTest?: (agent: Agent) => void;
  onDeleteRequest: (agent: Agent) => void;
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

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  toolsMap,
  isSelected = false,
  onSelect,
  onInspect,
  onTest,
  onDeleteRequest,
}) => {
  const navigate = useNavigate();
  const { duplicateAgent } = useAgentStore();
  const { showToast } = useToast();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    const duplicated = duplicateAgent(agent.id);
    if (duplicated) {
      showToast('Agent Duplicated', `Created copy "${duplicated.name}"`, 'success');
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/agents/edit/${agent.id}`);
  };

  const handleTest = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTest) {
      onTest(agent);
    }
  };

  const handleInspect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInspect) {
      onInspect(agent);
    } else if (onSelect) {
      onSelect(agent.id);
    }
  };

  const handleCardDoubleClick = () => {
    if (onInspect) {
      onInspect(agent);
    } else if (onSelect) {
      onSelect(agent.id);
    }
  };

  const selectedTools = agent.toolIds.map((tid) => toolsMap[tid]).filter(Boolean);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onDoubleClick={handleCardDoubleClick}
      title="Double-click to inspect agent details"
      className={`group relative glass-card rounded-2xl p-5 cursor-pointer flex flex-col justify-between border transition-all duration-200 ${
        isSelected
          ? 'border-zinc-900 dark:border-white ring-2 ring-zinc-900/10 dark:ring-white/15 bg-zinc-50/80 dark:bg-zinc-900/60 shadow-md'
          : 'border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-lg hover:-translate-y-0.5'
      } ${isMenuOpen ? 'z-40 relative' : 'z-10 relative'}`}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3.5">
            {/* Agent Icon Avatar */}
            <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
              <Bot className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-white transition-colors line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  {agent.name}
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="mono text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                  {agent.category || 'General'}
                </span>
              </div>
            </div>
          </div>

          {/* Options Menu */}
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Overflow Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="More Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[70]" onClick={() => setIsMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 mt-1 w-48 z-[80] rounded-xl popup-solid p-1.5 shadow-2xl text-xs font-medium border border-zinc-200 dark:border-zinc-800"
                    >
                      <button
                        type="button"
                        onClick={handleEdit}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                        <span>Edit Configuration</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDuplicate}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                        <span>Duplicate</span>
                      </button>

                      <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onDeleteRequest(agent);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Agent</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Description */}
        {agent.description ? (
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-2 mb-4 leading-relaxed font-normal">
            {agent.description}
          </p>
        ) : (
          <div className="mb-3" />
        )}
      </div>

      {/* Footer Info, Tools & Direct Actions */}
      <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
        {/* Model and Tools Tags */}
        <div className="flex items-center justify-between gap-2">
          {/* Model Tag */}
          <div 
            title={agent.model}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 mono text-[10px] font-bold truncate max-w-[72%] sm:max-w-[76%]"
          >
            <Cpu className="w-3 h-3 text-zinc-500 shrink-0" />
            <span className="truncate">{agent.model}</span>
          </div>

          {/* Active Tools Icons */}
          <div className="flex items-center gap-1 shrink-0">
            {selectedTools.slice(0, 3).map((tool) => {
              const IconComp = TOOL_ICONS[tool.iconName] || Wrench;
              return (
                <div
                  key={tool.id}
                  title={tool.name}
                  className="w-6 h-6 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0 shadow-xs"
                >
                  <IconComp className="w-3.5 h-3.5" />
                </div>
              );
            })}
            {selectedTools.length > 3 && (
              <span className="mono text-[10px] text-zinc-500 font-extrabold px-1">
                +{selectedTools.length - 3}
              </span>
            )}
            {selectedTools.length === 0 && (
              <span className="text-[10px] text-zinc-400 italic">No tools</span>
            )}
          </div>
        </div>

        {/* Direct Action Buttons Row */}
        <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleTest}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 transition-all shadow-xs flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run Agent</span>
          </button>

          <button
            type="button"
            onClick={handleEdit}
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
            title="Edit Agent Configuration"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleInspect}
            className={`p-2 rounded-xl border transition-colors ${
              isSelected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800'
            }`}
            title="Inspect Telemetry & Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

