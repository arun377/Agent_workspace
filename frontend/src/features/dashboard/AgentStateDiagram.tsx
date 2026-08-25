import React from 'react';
import { motion } from 'motion/react';
import { Bot, Wrench, Server } from 'lucide-react';
import { Tool } from '../../types/agent';

interface AgentStateDiagramProps {
  agentName: string;
  tools: Tool[];
  mcpUrls: string[];
  isProcessing: boolean;
}

export const AgentStateDiagram: React.FC<AgentStateDiagramProps> = ({
  agentName,
  tools,
  mcpUrls,
  isProcessing,
}) => {
  // Combined satellites
  const satellites = [
    ...tools.map((t) => ({ type: 'tool' as const, label: t.name })),
    ...mcpUrls.map((url) => ({ type: 'mcp' as const, label: url.split('//').pop() || url })),
  ];

  const numSatellites = satellites.length;
  // If many satellites, scale them down to prevent overlap and fit in space
  const scale = numSatellites > 5 ? (numSatellites > 10 ? 0.6 : 0.75) : 1;
  const radiusPercent = 38; // 38% of container width/height to keep within bounds

  return (
    <div className="relative w-full aspect-square max-h-[500px] min-h-[350px] flex items-center justify-center overflow-visible">
      
      {/* SVG Background for Connecting Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
        {satellites.map((sat, index) => {
          const angle = (index / (numSatellites || 1)) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const x2 = 50 + Math.cos(rad) * radiusPercent;
          const y2 = 50 + Math.sin(rad) * radiusPercent;
          
          return (
            <line
              key={`line-${index}`}
              x1="50%"
              y1="50%"
              x2={`${x2}%`}
              y2={`${y2}%`}
              className="stroke-zinc-300 dark:stroke-zinc-700"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          );
        })}
      </svg>

      {/* Central Agent Node */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20">
        <div className="w-20 h-20 rounded-3xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-2xl relative transition-transform duration-300 hover:scale-105">
          <Bot className="w-10 h-10" />
          {isProcessing && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
          )}
        </div>
        <span className="mt-3 text-sm font-extrabold text-zinc-900 dark:text-zinc-100 px-4 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 shadow-md whitespace-nowrap">
          {agentName}
        </span>
      </div>

      {/* Satellites */}
      {satellites.map((sat, index) => {
        const angle = (index / (numSatellites || 1)) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radiusPercent;
        const y = Math.sin(rad) * radiusPercent;

        return (
          <motion.div
            key={index}
            className="absolute top-1/2 left-1/2 z-10"
            style={{ 
              marginLeft: `${x}%`,
              marginTop: `${y}%`,
            }}
            initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: scale, x: '-50%', y: '-50%' }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 200, damping: 20 }}
          >
             <div className="flex flex-col items-center transition-transform duration-300 hover:scale-110 cursor-pointer origin-center">
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl border-2 relative z-10 ${
                 sat.type === 'tool' 
                  ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200' 
                  : 'bg-emerald-50 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
               }`}>
                 {sat.type === 'tool' ? <Wrench className="w-5 h-5" /> : <Server className="w-5 h-5" />}
               </div>
               
               <span className="mt-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 text-center px-3 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-md whitespace-nowrap">
                 {sat.label}
               </span>
             </div>
          </motion.div>
        );
      })}

      {/* Dynamic Background Effect during processing */}
      {isProcessing && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-200/50 dark:from-zinc-800/50 via-transparent to-transparent animate-pulse z-0" />
      )}
    </div>
  );
};
