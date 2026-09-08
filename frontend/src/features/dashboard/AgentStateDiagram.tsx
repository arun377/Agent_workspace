import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Wrench,
  Server,
  Search,
  Globe,
  Terminal,
  Mail,
  Database,
  Calculator,
  CloudSun,
  BookOpen,
  X,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Tool } from '../../types/agent';

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
  Server,
};

interface AgentStateDiagramProps {
  agentName: string;
  tools: Tool[];
  isProcessing: boolean;
  activeToolName?: string;
}

interface SatelliteNode {
  id: string;
  name: string;
  type: 'mcp_cluster' | 'builtin_cluster' | 'tool' | 'mcp';
  iconName?: string;
  tools: Tool[];
  isCluster: boolean;
}

export const AgentStateDiagram: React.FC<AgentStateDiagramProps> = ({
  agentName,
  tools,
  isProcessing,
  activeToolName,
}) => {
  const [selectedCluster, setSelectedCluster] = useState<SatelliteNode | null>(null);

  const isToolActive = (toolName: string) => {
    if (!activeToolName) return false;
    const cleanActive = activeToolName.trim().toLowerCase();
    const cleanTarget = toolName.trim().toLowerCase();
    return cleanTarget === cleanActive || cleanActive.includes(cleanTarget) || cleanTarget.includes(cleanActive);
  };

  // Group tools into satellites:
  // If <= 6 tools: Each tool is its own satellite.
  // If > 6 tools: Group tools by their MCP server, and group built-in tools together.
  const satellites: SatelliteNode[] = useMemo(() => {
    if (tools.length <= 6) {
      return tools.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type === 'mcp' ? 'mcp' : 'tool',
        iconName: t.iconName,
        tools: [t],
        isCluster: false,
      }));
    }

    // Grouping for > 6 tools
    const mcpGroups: Record<string, Tool[]> = {};
    const builtinTools: Tool[] = [];

    tools.forEach((t) => {
      if (t.type === 'mcp' && t.mcp_server_id) {
        if (!mcpGroups[t.mcp_server_id]) {
          mcpGroups[t.mcp_server_id] = [];
        }
        mcpGroups[t.mcp_server_id].push(t);
      } else {
        builtinTools.push(t);
      }
    });

    const nodes: SatelliteNode[] = [];

    // Add MCP server clusters
    Object.entries(mcpGroups).forEach(([serverId, serverTools]) => {
      const formattedName = serverId
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()) + ' MCP';

      nodes.push({
        id: `mcp-${serverId}`,
        name: formattedName,
        type: 'mcp_cluster',
        iconName: 'Server',
        tools: serverTools,
        isCluster: true,
      });
    });

    // Builtin tools cluster or individual
    if (builtinTools.length > 0) {
      if (builtinTools.length <= 2) {
        builtinTools.forEach((t) => {
          nodes.push({
            id: t.id,
            name: t.name,
            type: 'tool',
            iconName: t.iconName,
            tools: [t],
            isCluster: false,
          });
        });
      } else {
        nodes.push({
          id: 'builtin-tools-cluster',
          name: 'Core Built-ins',
          type: 'builtin_cluster',
          iconName: 'Wrench',
          tools: builtinTools,
          isCluster: true,
        });
      }
    }

    return nodes;
  }, [tools]);

  const numSatellites = satellites.length;
  // Scaled radius in coordinate space (-240 to 240) - 165 leaves ample free space between bot and tools
  const orbitRadius = 165;
  // Percentage radius in 1:1 square canvas (165 / 480 * 100) = 34.375%
  const radiusPct = (orbitRadius / 480) * 100;

  const getAngle = (index: number, total: number) => {
    if (total === 1) return 0;
    if (total === 2) return index === 0 ? 180 : 0;
    return (index / (total || 1)) * 360 - 90;
  };

  return (
    <div className="relative w-full h-full min-h-0 flex items-center justify-center select-none p-4 sm:p-6">
      {/* 1:1 Aspect-Ratio Canvas Frame - guaranteed coordinate synchronization */}
      <div className="relative w-full aspect-square max-w-[440px] max-h-full flex items-center justify-center">
        {/* SVG Canvas for Individual Connecting Lines */}
        <svg
          viewBox="-240 -240 480 480"
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0"
        >
          <defs>
            {/* Active Conduit Laser Gradient */}
            <linearGradient id="activeBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
            </linearGradient>

            {/* Idle Line Gradient */}
            <linearGradient id="idleBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#71717a" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#a1a1aa" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Individual Connecting Lines as before (no orbit circles) */}
          {satellites.map((sat, index) => {
            const angle = getAngle(index, numSatellites);
            const rad = (angle * Math.PI) / 180;
            const x2 = Math.cos(rad) * orbitRadius;
            const y2 = Math.sin(rad) * orbitRadius;

            const isNodeActive = sat.tools.some((t) => isToolActive(t.name));

            return (
              <g key={sat.id}>
                {/* Individual Line */}
                <line
                  x1="0"
                  y1="0"
                  x2={x2}
                  y2={y2}
                  stroke={isNodeActive ? 'url(#activeBeam)' : 'currentColor'}
                  strokeWidth={isNodeActive ? 3 : 1.5}
                  strokeDasharray={isNodeActive ? 'none' : '4 4'}
                  className={
                    isNodeActive
                      ? 'transition-all duration-300'
                      : 'text-zinc-300 dark:text-zinc-700 transition-all duration-300'
                  }
                />

                {/* Animated Laser Pulse Particle on Active Tool */}
                {isNodeActive && (
                  <circle r="4" fill="#10b981" className="animate-pulse">
                    <animateMotion
                      path={`M 0 0 L ${x2} ${y2}`}
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Central Agent Orchestrator Core */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20 pointer-events-auto">
          <motion.div
            animate={isProcessing ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 1.8, repeat: isProcessing ? Infinity : 0 }}
            className="relative group cursor-pointer"
          >
            {/* Processing Ambient Glow Aura */}
            {isProcessing && (
              <div className="absolute -inset-2 rounded-2xl bg-emerald-500/25 blur-lg animate-pulse" />
            )}

            <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-2xl relative border-2 border-zinc-700/50 dark:border-white/50 transition-transform group-hover:scale-105">
              <Bot className="w-8 h-8" />

              {/* Live Status Indicator Dot */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isProcessing ? 'bg-emerald-400' : 'bg-zinc-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                    isProcessing ? 'bg-emerald-500' : 'bg-emerald-500'
                  }`}
                />
              </span>
            </div>
          </motion.div>

          {/* Central Agent Label */}
          <div className="mt-1.5 text-center max-w-[150px]">
            <span className="text-[11px] font-black text-zinc-900 dark:text-white px-2.5 py-0.5 rounded-lg bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 shadow-md truncate block">
              {agentName}
            </span>
          </div>
        </div>

        {/* Satellites */}
        {satellites.map((sat, index) => {
          const angle = getAngle(index, numSatellites);
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * radiusPct;
          const y = Math.sin(rad) * radiusPct;

          const isNodeActive = sat.tools.some((t) => isToolActive(t.name));
          const activeChild = sat.tools.find((t) => isToolActive(t.name));
          const IconComp =
            TOOL_ICONS[sat.iconName || ''] || (sat.type === 'mcp_cluster' ? Server : Wrench);

          return (
            <motion.div
              key={sat.id}
              className="absolute z-20 pointer-events-auto"
              style={{
                left: `calc(50% + ${x}%)`,
                top: `calc(50% + ${y}%)`,
              }}
              initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
              animate={{
                opacity: 1,
                scale: isNodeActive ? 1.12 : 1,
                x: '-50%',
                y: '-50%',
              }}
              transition={{ delay: index * 0.03, type: 'spring', stiffness: 220, damping: 20 }}
            >
              <div
                onClick={() => {
                  if (sat.isCluster) {
                    setSelectedCluster(sat);
                  }
                }}
                className={`group flex flex-col items-center cursor-pointer transition-all duration-200 hover:scale-108`}
                title={
                  sat.isCluster
                    ? `Click to view ${sat.tools.length} tools in ${sat.name}`
                    : `${sat.name}: ${sat.tools[0]?.description || 'Tool'}`
                }
              >
                {/* Satellite Icon Node */}
                <div
                  className={`relative w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border-2 transition-all duration-300 ${
                    isNodeActive
                      ? 'bg-emerald-500 text-white border-emerald-300 ring-4 ring-emerald-500/35 shadow-emerald-500/40 animate-pulse'
                      : sat.type === 'mcp_cluster' || sat.type === 'mcp'
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-700/80 hover:border-emerald-500'
                      : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'
                  }`}
                >
                  <IconComp className="w-5 h-5" />

                  {/* Cluster Count Pill Badge */}
                  {sat.isCluster && (
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                      {sat.tools.length}
                    </span>
                  )}

                  {/* Active Tool Pulse Dot */}
                  {isNodeActive && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                    </span>
                  )}
                </div>

                {/* Satellite Text Tag */}
                <div className="mt-1 flex flex-col items-center max-w-[115px]">
                  <span
                    className={`text-[10px] font-bold text-center px-2 py-0.5 rounded-md border shadow-xs truncate max-w-full transition-colors ${
                      isNodeActive
                        ? 'bg-emerald-500 text-white border-emerald-400 font-extrabold shadow-emerald-500/20'
                        : 'text-zinc-800 dark:text-zinc-200 bg-white/95 dark:bg-zinc-900/95 border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-400 dark:group-hover:border-zinc-600'
                    }`}
                  >
                    {sat.name}
                  </span>

                  {isNodeActive && activeChild && (
                    <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5 animate-pulse truncate max-w-[110px]">
                      ● {activeChild.name}
                    </span>
                  )}

                  {sat.isCluster && !isNodeActive && (
                    <span className="text-[8.5px] text-zinc-400 font-medium mt-0.5 flex items-center gap-0.5">
                      <span>{sat.tools.length} tools</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Zero Tools State: Clean Autonomous Display */}
      {tools.length === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 italic bg-white/80 dark:bg-zinc-900/80 px-3 py-1 rounded-full border border-zinc-200/60 dark:border-zinc-800/60">
            Autonomous Reasoning Core • No external tools connected
          </span>
        </div>
      )}

      {/* Interactive Cluster Drawer / Tool Inspection Popover */}
      <AnimatePresence>
        {selectedCluster && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="absolute inset-x-4 bottom-4 top-16 z-40 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-2xl p-4 flex flex-col pointer-events-auto"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm">
                    {selectedCluster.name}
                  </h4>
                  <p className="text-[10px] text-zinc-500">
                    {selectedCluster.tools.length} available tools in this cluster
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCluster(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Popover Scrollable Tool List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
              {selectedCluster.tools.map((tool) => {
                const isActive = isToolActive(tool.name);
                const ToolIcon = TOOL_ICONS[tool.iconName || ''] || Wrench;

                return (
                  <div
                    key={tool.id}
                    className={`p-2.5 rounded-xl border text-xs transition-all ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold truncate">
                        <ToolIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{tool.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive && (
                          <span className="mono text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500 text-white animate-pulse">
                            ACTIVE
                          </span>
                        )}
                        <span className="mono text-[9px] font-semibold text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                          {tool.type || 'TOOL'}
                        </span>
                      </div>
                    </div>
                    {tool.description && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {tool.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Popover Footer Info */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400 shrink-0">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3" />
                Live cluster monitoring
              </span>
              <button
                type="button"
                onClick={() => setSelectedCluster(null)}
                className="font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
