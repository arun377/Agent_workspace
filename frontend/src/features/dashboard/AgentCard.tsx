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
  Sparkles,
} from 'lucide-react';
import { Agent, Tool } from '../../types/agent';
import { useAgentStore } from '../../store/useAgentStore';
import { useToast } from '../../components/ui/Toast';

interface AgentCardProps {
  agent: Agent;
  toolsMap: Record<string, Tool>;
  isSelected?: boolean;
  onSelect?: (agentId: string) => void;
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
  onDeleteRequest,
}) => {
  const navigate = useNavigate();
  const { duplicateAgent, toggleAgentStatus } = useAgentStore();
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

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    toggleAgentStatus(agent.id);
    const newStatus = agent.status === 'published' ? 'Draft' : 'Published';
    showToast('Status Updated', `Agent "${agent.name}" set to ${newStatus}`, 'info');
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/agents/edit/${agent.id}`);
  };

  const handleCardClick = () => {
    if (onSelect) {
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
      onClick={handleCardClick}
      className={`group relative glass-card glass-card-hover rounded-2xl p-5 cursor-pointer flex flex-col justify-between border transition-all ${
        isSelected
          ? 'border-zinc-900 dark:border-white ring-1 ring-zinc-900/10 dark:ring-white/10 bg-zinc-100/50 dark:bg-white/5'
          : 'border-zinc-200 dark:border-zinc-800/50 hover:border-zinc-400 dark:hover:border-zinc-600'
      } shadow-sm hover:shadow-md ${
        isMenuOpen ? 'z-[60] relative border-zinc-900 dark:border-white' : 'z-10 relative'
      }`}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3.5">
            {/* Agent Icon */}
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-zinc-400 dark:group-hover:border-zinc-600 transition-colors shadow-sm">
              <Bot className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-zinc-900 dark:text-white transition-colors line-clamp-1">
                  {agent.name}
                </h3>
                {isSelected && (
                  <span className="mono text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold">
                    SELECTED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="mono text-[10px] text-zinc-500 font-bold">
                  {agent.category}
                </span>
                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span className="mono text-[10px] text-zinc-500 font-bold">
                  T:{agent.temperature}
                </span>
              </div>
            </div>
          </div>

          {/* Status Pill & Options */}
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span
              className={`mono text-[9px] px-2 py-1 rounded-md font-extrabold tracking-wider ${
                agent.status === 'published'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                  : 'bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
              }`}
            >
              {agent.status.toUpperCase()}
            </span>

            {/* Overflow Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
                      className="absolute right-0 mt-1 w-44 z-[80] rounded-xl popup-solid p-1.5 shadow-2xl text-xs font-medium border border-zinc-200 dark:border-zinc-800"
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

                      <button
                        type="button"
                        onClick={handleToggleStatus}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>{agent.status === 'published' ? 'Unpublish' : 'Publish'}</span>
                      </button>

                      <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onDeleteRequest(agent);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-medium"
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
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-2 mb-4 leading-relaxed font-normal">
          {agent.description || 'No description provided.'}
        </p>
      </div>

      {/* Footer Info & Tools Badges */}
      <div className="pt-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
        {/* Model Badge */}
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 mono text-[10px] font-bold">
          <Cpu className="w-3 h-3" />
          <span>{agent.model}</span>
        </div>

        {/* Active Tools Icons */}
        <div className="flex items-center gap-1">
          {selectedTools.slice(0, 4).map((tool) => {
            const IconComp = TOOL_ICONS[tool.iconName] || Wrench;
            return (
              <div
                key={tool.id}
                title={tool.name}
                className="w-6 h-6 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0 shadow-sm"
              >
                <IconComp className="w-3.5 h-3.5" />
              </div>
            );
          })}
          {selectedTools.length > 4 && (
            <span className="mono text-[10px] text-zinc-500 font-extrabold ml-1">
              +{selectedTools.length - 4}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
