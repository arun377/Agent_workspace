import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Sparkles,
  Square,
  RotateCcw,
  Wrench,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Settings,
  Copy,
  Check,
} from 'lucide-react';
import { Tool, AgentStreamEvent } from '../../types/agent';
import { AgentStateDiagram } from '../dashboard/AgentStateDiagram';
import { useAgentStore } from '../../store/useAgentStore';
import { useToast } from '../../components/ui/Toast';

export interface ToolTrace {
  id: string;
  type: 'tool_call' | 'tool_result' | 'status' | 'error';
  tool?: string;
  summary: string;
  input?: any;
  output?: any;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  traces?: ToolTrace[];
  isStreaming?: boolean;
  error?: string;
}

export const AgentRunPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { agents, tools, fetchAgents, fetchTools, runAgent, isLoading } = useAgentStore();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTool, setActiveTool] = useState<string | undefined>(undefined);
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});
  const [sessionId, setSessionId] = useState<string>(() => `session-${Date.now()}`);
  const [hasCopiedPrompt, setHasCopiedPrompt] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load agents and tools if not present
  useEffect(() => {
    if (agents.length === 0) fetchAgents();
    if (tools.length === 0) fetchTools();
  }, [agents.length, tools.length, fetchAgents, fetchTools]);

  // Find target agent by ID or name
  const agent = useMemo(() => {
    return agents.find((a) => a.id === id || a.name === id);
  }, [agents, id]);

  const toolsMap = useMemo(() => {
    return tools.reduce((acc, t) => {
      acc[t.id] = t;
      return acc;
    }, {} as Record<string, Tool>);
  }, [tools]);

  const agentTools = useMemo(() => {
    if (!agent) return [];
    return agent.toolIds.map((tid) => toolsMap[tid]).filter(Boolean);
  }, [agent, toolsMap]);

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const toggleTraceExpansion = (msgId: string) => {
    setExpandedTraces((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleClearHistory = () => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setIsProcessing(false);
    setActiveTool(undefined);
    setSessionId(`session-${Date.now()}`);
    showToast('Session Reset', 'Chat history cleared', 'info');
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setActiveTool(undefined);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  };

  const handleCopyPrompt = () => {
    if (!agent?.systemPrompt) return;
    navigator.clipboard.writeText(agent.systemPrompt);
    setHasCopiedPrompt(true);
    showToast('Prompt Copied', 'Instructions copied to clipboard', 'info');
    setTimeout(() => setHasCopiedPrompt(false), 2000);
  };

  const handleSend = async () => {
    if (!query.trim() || isProcessing || !agent) return;
    const currentQuery = query.trim();
    setQuery('');

    const userMsgId = `user-${Date.now()}`;
    const agentMsgId = `agent-${Date.now()}`;

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: currentQuery,
    };

    const agentMsg: ChatMessage = {
      id: agentMsgId,
      role: 'agent',
      content: '',
      traces: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);
    setIsProcessing(true);
    setActiveTool(undefined);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await runAgent(agent.name, currentQuery, {
        sessionId,
        signal: controller.signal,
        onEvent: (event: AgentStreamEvent) => {
          if (event.type === 'token') {
            const token = event.data?.token || '';
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentMsgId ? { ...m, content: m.content + token } : m
              )
            );
          } else if (event.type === 'tool_call') {
            const toolName = event.data?.tool;
            if (toolName) setActiveTool(toolName);
            const trace: ToolTrace = {
              id: `trace-${Date.now()}-${Math.random()}`,
              type: 'tool_call',
              tool: toolName,
              summary: event.summary || `Calling ${toolName}`,
              input: event.data?.input,
              timestamp: Date.now(),
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentMsgId
                  ? { ...m, traces: [...(m.traces || []), trace] }
                  : m
              )
            );
          } else if (event.type === 'tool_result') {
            setActiveTool(undefined);
            const trace: ToolTrace = {
              id: `trace-${Date.now()}-${Math.random()}`,
              type: 'tool_result',
              tool: event.data?.tool,
              summary: event.summary || `Finished ${event.data?.tool}`,
              output: event.data?.output,
              timestamp: Date.now(),
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentMsgId
                  ? { ...m, traces: [...(m.traces || []), trace] }
                  : m
              )
            );
          } else if (event.type === 'status') {
            const trace: ToolTrace = {
              id: `trace-${Date.now()}-${Math.random()}`,
              type: 'status',
              summary: event.summary || 'Working...',
              timestamp: Date.now(),
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentMsgId
                  ? { ...m, traces: [...(m.traces || []), trace] }
                  : m
              )
            );
          } else if (event.type === 'completed') {
            setActiveTool(undefined);
            const finalAnswer = event.data?.final_answer;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentMsgId
                  ? {
                      ...m,
                      content:
                        finalAnswer !== undefined && finalAnswer !== ''
                          ? finalAnswer
                          : m.content,
                      isStreaming: false,
                    }
                  : m
              )
            );
          } else if (event.type === 'error') {
            setActiveTool(undefined);
            const errorText = event.summary || event.data?.stderr || 'Execution error';
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentMsgId
                  ? {
                      ...m,
                      error: errorText,
                      isStreaming: false,
                    }
                  : m
              )
            );
          }
        },
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                  ...m,
                  content: m.content || 'Execution stopped by user.',
                  isStreaming: false,
                }
              : m
          )
        );
      } else {
        const errorMsg =
          error.message || 'Failed to connect to the agent server. Is the backend running?';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                  ...m,
                  error: errorMsg,
                  isStreaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setIsProcessing(false);
      setActiveTool(undefined);
      abortControllerRef.current = null;
      setMessages((prev) =>
        prev.map((m) => (m.id === agentMsgId ? { ...m, isStreaming: false } : m))
      );
    }
  };

  if (isLoading && !agent) {
    return (
      <div className="h-[calc(100vh-10rem)] flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
          Loading Agent Workspace...
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Synchronizing agent model and connected tools...
        </p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="h-[calc(100vh-10rem)] flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
          <Bot className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          Agent Not Found
        </h3>
        <p className="text-xs text-zinc-500 mt-1 mb-6">
          The requested agent "{id}" could not be located in the workspace.
        </p>
        <button
          type="button"
          onClick={() => navigate('/agents')}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-sm transition-all"
        >
          Back to Agents Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-7xl mx-auto">
      {/* Sleek Minimal Top Navigation Bar */}
      <div className="shrink-0 flex items-center justify-between px-1 py-1 mb-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors shadow-xs"
            title="Back to Agents Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[200px]">
              {agent.name}
            </span>
            <span className="mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {agent.model}
            </span>
            {isProcessing && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-md animate-pulse">
                {activeTool ? `calling ${activeTool}...` : 'processing...'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            title={hasCopiedPrompt ? 'Copied System Prompt' : 'Copy System Prompt'}
          >
            {hasCopiedPrompt ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={isProcessing}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 shadow-xs"
              title="Clear Session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(`/agents/edit/${agent.id}`)}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            title="Edit Agent Configuration"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Canvas: Chat + Architecture Diagram */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden glass-card rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        {/* Left: Chat Interaction Area */}
        <div className="flex-1 min-w-0 flex flex-col h-full bg-zinc-50/40 dark:bg-zinc-950/40 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
                </div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">
                  {agent.name}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                  Send a message to interact with your agent in real-time. Token responses stream live, and tool executions appear below with inspection traces.
                </p>
                <div className="w-full space-y-2 text-left">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block text-center">
                    Quick Prompts
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuery('Hello! Who are you and what tools do you have access to?')}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs hover:border-zinc-400 dark:hover:border-zinc-600 transition-all text-left"
                  >
                    "Hello! Who are you and what tools do you have access to?"
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuery('Give me a brief summary of your role and execution instructions.')}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs hover:border-zinc-400 dark:hover:border-zinc-600 transition-all text-left"
                  >
                    "Give me a brief summary of your role and execution instructions."
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isAgent = msg.role === 'agent';
                const hasTraces = isAgent && msg.traces && msg.traces.length > 0;
                const isExpanded = expandedTraces[msg.id];

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${isAgent ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAgent && (
                      <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Bot className="w-4 h-4 text-white dark:text-zinc-900" />
                      </div>
                    )}

                    <div className="flex flex-col max-w-[85%] min-w-0 space-y-2">
                      {/* Traces Accordion */}
                      {hasTraces && (
                        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 overflow-hidden text-xs shadow-xs">
                          <button
                            type="button"
                            onClick={() => toggleTraceExpansion(msg.id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Wrench className="w-3.5 h-3.5 text-zinc-500" />
                              <span className="font-semibold text-[11px]">
                                Tool Activity ({msg.traces!.length}{' '}
                                {msg.traces!.length === 1 ? 'event' : 'events'})
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2 bg-zinc-50/50 dark:bg-zinc-950/50 max-h-56 overflow-y-auto">
                              {msg.traces!.map((trace) => (
                                <div
                                  key={trace.id}
                                  className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/70 text-[11px] font-mono"
                                >
                                  <div className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
                                    {trace.type === 'tool_call' && (
                                      <span className="text-amber-500">▶ CALL</span>
                                    )}
                                    {trace.type === 'tool_result' && (
                                      <span className="text-emerald-500">✔ RESULT</span>
                                    )}
                                    {trace.type === 'status' && (
                                      <span className="text-blue-500">ℹ STATUS</span>
                                    )}
                                    <span>{trace.summary}</span>
                                  </div>

                                  {trace.input !== undefined && (
                                    <div className="mt-1 text-zinc-500 dark:text-zinc-400 break-all break-words overflow-hidden">
                                      <span className="text-zinc-400 font-semibold">input: </span>
                                      {typeof trace.input === 'object'
                                        ? JSON.stringify(trace.input)
                                        : String(trace.input)}
                                    </div>
                                  )}

                                  {trace.output !== undefined && (
                                    <div className="mt-1 text-zinc-500 dark:text-zinc-400 break-all break-words overflow-hidden">
                                      <span className="text-zinc-400 font-semibold">output: </span>
                                      {typeof trace.output === 'object'
                                        ? JSON.stringify(trace.output)
                                        : String(trace.output)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Bubble */}
                      {(msg.content || !isAgent || (!msg.error && !msg.isStreaming)) && (
                        <div
                          className={`px-4 py-3 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap break-words break-all leading-relaxed ${
                            isAgent
                              ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-tl-sm shadow-xs'
                              : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-tr-sm self-end shadow-xs'
                          }`}
                        >
                          {msg.content}
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-4 ml-1 bg-zinc-900 dark:bg-white animate-pulse align-middle" />
                          )}
                        </div>
                      )}

                      {/* Initial streaming placeholder */}
                      {msg.isStreaming && !msg.content && (
                        <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-tl-sm flex items-center gap-2 text-xs text-zinc-500 shadow-xs">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                          <span>
                            {activeTool ? `Executing ${activeTool}...` : 'Generating response...'}
                          </span>
                        </div>
                      )}

                      {/* Error display */}
                      {msg.error && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                          <div>
                            <p className="font-semibold">Error</p>
                            <p className="mt-0.5 whitespace-pre-wrap font-mono text-[11px]">
                              {msg.error}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isAgent && (
                      <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700 mt-0.5 shadow-xs">
                        <User className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Section */}
          <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
            <div className="relative flex items-center">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask your agent something or test execution..."
                disabled={isProcessing}
                className="w-full pl-4 pr-12 py-3 rounded-xl text-xs sm:text-sm glass-input text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white resize-none disabled:opacity-75 transition-all"
                rows={1}
              />

              {isProcessing ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="absolute right-2 top-2 p-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition-all shadow-xs"
                  title="Stop Generation"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!query.trim()}
                  className="absolute right-2 top-2 p-2 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100 shadow-xs"
                  title="Send Message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-center text-zinc-400 mt-2">
              Press Enter to send, Shift + Enter for a new line
            </p>
          </div>
        </div>

        {/* Right: Agent Architecture - Pure Unobstructed Priority Canvas */}
        <div className="border-l border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 flex flex-col shrink-0 flex-shrink-0 w-[480px] lg:w-[520px] xl:w-[580px] min-w-[440px] h-full relative overflow-hidden">
          {/* Subtle floating badges in top corners */}
          <div className="absolute top-3 left-3.5 z-10 flex items-center gap-1.5 pointer-events-none">
            <span className="mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs backdrop-blur-xs">
              {agent.model}
            </span>
            <span className="mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs backdrop-blur-xs">
              {agentTools.length} {agentTools.length === 1 ? 'Tool' : 'Tools'}
            </span>
          </div>

          <div className="absolute top-3 right-3.5 z-10 flex items-center gap-1.5 pointer-events-none">
            <span
              className={`w-2 h-2 rounded-full ${
                isProcessing ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
              }`}
            />
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {isProcessing ? 'Active' : 'Standby'}
            </span>
          </div>

          {/* Central Interactive Topology Canvas - 100% full vertical height */}
          <div className="flex-1 w-full h-full min-h-0 relative flex items-center justify-center p-2 sm:p-4">
            <AgentStateDiagram
              agentName={agent.name}
              tools={agentTools}
              isProcessing={isProcessing}
              activeToolName={activeTool}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
