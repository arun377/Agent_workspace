import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import { Agent, Tool } from '../../types/agent';
import { AgentStateDiagram } from './AgentStateDiagram';
import { useAgentStore } from '../../store/useAgentStore';

interface AgentTestModalProps {
  agent: Agent | null;
  toolsMap: Record<string, Tool>;
  isOpen: boolean;
  onClose: () => void;
}

export const AgentTestModal: React.FC<AgentTestModalProps> = ({
  agent,
  toolsMap,
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; content: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDiagram, setShowDiagram] = useState(true);

  const { runAgent } = useAgentStore();

  // Reset messages when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setQuery('');
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen || !agent) return null;

  const handleSend = async () => {
    if (!query.trim()) return;
    const currentQuery = query;
    const newMessages = [...messages, { role: 'user' as const, content: currentQuery }];
    setMessages(newMessages);
    setQuery('');
    setIsProcessing(true);

    try {
      const response = await runAgent(agent.name, currentQuery);
      setMessages([...newMessages, { role: 'agent' as const, content: response.result }]);
    } catch (error: any) {
      setMessages([...newMessages, { role: 'agent' as const, content: `Error: ${error.message || 'Failed to connect to the agent server. Is the backend running?'}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const agentTools = agent.toolIds.map(id => toolsMap[id]).filter(Boolean);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                  <Bot className="w-5 h-5 text-zinc-900 dark:text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    Sandbox: {agent.name}
                    {isProcessing && <span className="flex h-2 w-2 relative ml-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>}
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono">{agent.model}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDiagram(!showDiagram)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${showDiagram ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'}`}
                >
                  {showDiagram ? 'Hide Diagram' : 'Show Diagram'}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left: Chat Area */}
              <div className="flex-1 flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/50">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                       <Sparkles className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-4" />
                       <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Test Your Agent</h4>
                       <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                         Send a query to see how your agent responds using its configured tools and MCP servers.
                       </p>
                     </div>
                  ) : (
                    messages.map((msg, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'agent' && (
                           <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
                             <Bot className="w-4 h-4 text-white dark:text-zinc-900" />
                           </div>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
                          msg.role === 'user' 
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-tr-sm' 
                            : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-tl-sm'
                        }`}>
                          {msg.content}
                        </div>
                        {msg.role === 'user' && (
                           <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                             <User className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                           </div>
                        )}
                      </motion.div>
                    ))
                  )}
                  {isProcessing && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
                       <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
                         <Bot className="w-4 h-4 text-white dark:text-zinc-900" />
                       </div>
                       <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-tl-sm flex items-center gap-1.5">
                         <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                         <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                         <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                       </div>
                    </motion.div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900">
                  <div className="relative">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Ask your agent something..."
                      className="w-full pl-4 pr-12 py-3 rounded-2xl text-sm glass-input text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white resize-none"
                      rows={1}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!query.trim() || isProcessing}
                      className="absolute right-2 top-2 p-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-zinc-400 mt-2">Press Enter to send, Shift + Enter for new line</p>
                </div>
              </div>

              {/* Right: Diagram Area */}
              <AnimatePresence>
                {showDiagram && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 400, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="border-l border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 overflow-hidden flex flex-col hidden lg:flex"
                  >
                    <div className="p-5 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
                      <h4 className="font-bold text-zinc-900 dark:text-white text-sm">Agent Architecture</h4>
                      <p className="text-[11px] text-zinc-500">Live visualization of context and connections</p>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                      <AgentStateDiagram 
                        agentName={agent.name} 
                        tools={agentTools} 
                        mcpUrls={agent.mcpServers} 
                        isProcessing={isProcessing} 
                      />
                    </div>
                    
                    <div className="p-5 border-t border-zinc-100 dark:border-zinc-900 shrink-0 space-y-4">
                       <div>
                         <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Connected Tools</span>
                         {agentTools.length > 0 ? (
                           <div className="flex flex-wrap gap-1.5">
                             {agentTools.map(t => (
                               <span key={t.id} className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300 font-medium">
                                 {t.name}
                               </span>
                             ))}
                           </div>
                         ) : <span className="text-[10px] text-zinc-400">None</span>}
                       </div>
                       <div>
                         <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">MCP Servers</span>
                         {agent.mcpServers.length > 0 ? (
                           <div className="flex flex-wrap gap-1.5">
                             {agent.mcpServers.map(m => (
                               <span key={m} className="px-2 py-1 rounded border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium truncate max-w-[200px]">
                                 {m}
                               </span>
                             ))}
                           </div>
                         ) : <span className="text-[10px] text-zinc-400">None</span>}
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
