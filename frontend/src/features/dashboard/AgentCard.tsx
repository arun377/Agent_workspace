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
      className={`group relative glass-card glass-card-hover rounded p-4 cursor-pointer flex flex-col justify-between border transition-all ${
        isSelected
          ? 'border-cyan-500 dark:border-[#00F0FF] ring-2 ring-cyan-500/40 bg-cyan-500/5'
          : 'border-slate-300 dark:border-white/10 hover:border-cyan-600 dark:hover:border-[#00F0FF]'
      } shadow-xs hover:shadow-md ${
        isMenuOpen ? 'z-[60] relative ring-2 ring-cyan-600 dark:ring-[#00F0FF]' : 'z-10 relative'
      }`}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            {/* Agent Icon */}
            <div className="w-10 h-10 rounded bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 flex items-center justify-center shrink-0 group-hover:border-cyan-600 dark:group-hover:border-[#00F0FF] transition-colors">
              <Bot className="w-5 h-5 text-cyan-700 dark:text-[#00F0FF]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white group-hover:text-[#00F0FF] transition-colors line-clamp-1">
                  {agent.name}
                </h3>
                {isSelected && (
                  <span className="mono text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-[#00F0FF] border border-[#00F0FF]/40 font-bold">
                    ● SELECTED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="mono text-[10px] text-slate-400 font-bold">
                  {agent.category}
                </span>
                <span className="mono text-[10px] text-slate-400 font-bold">
                  T:{agent.temperature}
                </span>
              </div>
            </div>
          </div>

          {/* Status Pill & Options */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span
              className={`mono text-[10px] px-2 py-0.5 rounded font-extrabold ${
                agent.status === 'published'
                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-500/10 dark:text-[#00FF85] dark:border-emerald-500/30'
                  : 'bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
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
                className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
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
                      className="absolute right-0 mt-1 w-44 z-[80] rounded popup-solid p-1 shadow-2xl border border-slate-300 dark:border-white/10 text-xs font-semibold mono"
                    >
                      <button
                        type="button"
                        onClick={handleEdit}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00F0FF]" />
                        <span>EDIT_CONFIG</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDuplicate}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>DUPLICATE</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleStatus}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>{agent.status === 'published' ? 'UNPUBLISH' : 'PUBLISH'}</span>
                      </button>

                      <div className="my-1 border-t border-slate-200 dark:border-white/10" />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onDeleteRequest(agent);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>DELETE</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-800 dark:text-slate-300 line-clamp-2 mt-1 mb-3 leading-relaxed font-normal">
          {agent.description || 'No description provided.'}
        </p>
      </div>

      {/* Footer Info & Tools Badges */}
      <div className="pt-2.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
        {/* Model Badge */}
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-100 text-cyan-950 border border-cyan-300 dark:bg-cyan-500/10 dark:text-[#00F0FF] dark:border-cyan-500/20 mono text-[10px] font-bold">
          <Cpu className="w-3 h-3 text-cyan-800 dark:text-[#00F0FF]" />
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
                className="w-5 h-5 rounded bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-800 dark:text-slate-300 text-[10px] shrink-0"
              >
                <IconComp className="w-3 h-3 text-cyan-800 dark:text-[#00F0FF]" />
              </div>
            );
          })}
          {selectedTools.length > 4 && (
            <span className="mono text-[9px] text-slate-700 dark:text-slate-400 font-extrabold">
              +{selectedTools.length - 4}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
