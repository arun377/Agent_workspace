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
  CheckCircle2,
  Settings,
  Copy,
  Check,
  MessageSquare,
  Activity,
  FlaskConical,
} from 'lucide-react';
import { Tool, AgentStreamEvent, TraceTreeNode } from '../../types/agent';
import { AgentStateDiagram } from '../dashboard/AgentStateDiagram';
import { useAgentStore } from '../../store/useAgentStore';
import { useToast } from '../../components/ui/Toast';
import { TraceViewer } from './TraceViewer';
import { AgentEvalManager } from '../evals/AgentEvalManager';
import { MarkdownRenderer, formatMessageContent } from '../../components/ui/MarkdownRenderer';

export interface ToolTrace {
  id: string;
  type: 'tool_call' | 'tool_result' | 'status' | 'error' | 'step';
  tool?: string;
  summary: string;
  input?: any;
  output?: any;
  timestamp: number;
  completedAt?: number;
  duration?: string;
  status?: 'running' | 'completed' | 'error';
  error?: any;
  step?: any;
}

const safeStringify = (val: any): string => {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
};

const formatToolName = (rawName?: any): string => {
  if (!rawName) return 'tool';
  let str = '';
  if (typeof rawName === 'string') {
    str = rawName;
  } else if (typeof rawName === 'object' && rawName !== null) {
    str = rawName.name || rawName.tool || rawName.summary || rawName.title || '';
    if (!str) {
      try {
        str = JSON.stringify(rawName);
      } catch {
        str = 'tool';
      }
    }
  } else {
    str = String(rawName);
  }
  let clean = str.replace(/`/g, '').trim();
  if (clean.includes(':')) {
    const parts = clean.split(':');
    clean = parts[parts.length - 1].trim();
  }
  return clean || 'tool';
};

const sanitizeMessages = (rawList: any[]): ChatMessage[] => {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((m, idx) => ({
    id: typeof m?.id === 'string' ? m.id : `msg-${idx}-${Date.now()}`,
    role: m?.role === 'agent' ? 'agent' : 'user',
    content: formatMessageContent(m?.content),
    traces: Array.isArray(m?.traces)
      ? m.traces.map((t: any, tIdx: number) => ({
          id: typeof t?.id === 'string' ? t.id : `trace-${tIdx}-${Date.now()}`,
          type: t?.type || 'tool_call',
          tool: typeof t?.tool === 'string' ? t.tool : formatToolName(t?.tool),
          summary:
            typeof t?.summary === 'string'
              ? t.summary
              : `Calling tool: ${formatToolName(t?.tool || t?.summary)}`,
          input: t?.input,
          output: t?.output,
          timestamp: typeof t?.timestamp === 'number' ? t.timestamp : Date.now(),
          completedAt: t?.completedAt,
          duration: typeof t?.duration === 'string' ? t.duration : undefined,
          status: t?.status === 'running' || t?.status === 'error' ? t.status : 'completed',
          error: t?.error,
        }))
      : [],
    isStreaming: false,
    error: m?.error ? (typeof m.error === 'string' ? m.error : safeStringify(m.error)) : undefined,
  }));
};

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
  const { agents, tools, fetchAgents, fetchTools, fetchLatestTrace, runAgent, isLoading } = useAgentStore();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [isLoadingTrace, setIsLoadingTrace] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!id) return [];
    try {
      const saved = sessionStorage.getItem(`agent_chat_session_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.messages)) return sanitizeMessages(parsed.messages);
      }
    } catch {}
    return [];
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTool, setActiveTool] = useState<string | undefined>(undefined);
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});
  const [sessionId, setSessionId] = useState<string>(() => {
    if (!id) return `session-${Date.now()}`;
    try {
      const saved = sessionStorage.getItem(`agent_chat_session_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sessionId) return parsed.sessionId;
      }
    } catch {}
    return `session-${Date.now()}`;
  });
  const [hasCopiedPrompt, setHasCopiedPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'trace' | 'evals'>('chat');
  const [latestTrace, setLatestTrace] = useState<TraceTreeNode | null>(() => {
    if (!id) return null;
    try {
      const saved = sessionStorage.getItem(`agent_chat_session_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.latestTrace) return parsed.latestTrace;
      }
    } catch {}
    return null;
  });

  // Keep session storage synchronized with ongoing chat, session ID, and trace
  useEffect(() => {
    if (!id) return;
    try {
      if (messages.length > 0 || latestTrace) {
        sessionStorage.setItem(
          `agent_chat_session_${id}`,
          JSON.stringify({
            sessionId,
            messages,
            latestTrace,
          })
        );
      }
    } catch (e) {
      console.warn('Failed to save chat session', e);
    }
  }, [id, sessionId, messages, latestTrace]);

  // Handle switching agent ID
  useEffect(() => {
    if (!id) return;
    try {
      const saved = sessionStorage.getItem(`agent_chat_session_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sessionId) setSessionId(parsed.sessionId);
        if (Array.isArray(parsed.messages)) setMessages(sanitizeMessages(parsed.messages));
        if (parsed.latestTrace) setLatestTrace(parsed.latestTrace);
        return;
      }
    } catch {}
    setSessionId(`session-${Date.now()}`);
    setMessages([]);
    setLatestTrace(null);
  }, [id]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  // Scroll only the chat container to bottom on message update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
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

  const handleFetchLatestTrace = async (silent: boolean = false) => {
    if (!agent?.name) return;
    setIsLoadingTrace(true);
    try {
      const trace = await fetchLatestTrace(agent.name);
      if (trace) {
        setLatestTrace(trace);
        if (!silent) {
          showToast('Trace Loaded', 'Latest execution trace retrieved', 'success');
        }
      } else {
        if (!silent) {
          showToast('No Trace Found', 'No recorded trace found for this agent yet', 'info');
        }
      }
    } catch (e: any) {
      console.warn('Failed to fetch trace:', e);
    } finally {
      setIsLoadingTrace(false);
    }
  };

  // Auto-fetch latest trace on initial agent load or when activeTab switches to 'trace'
  useEffect(() => {
    if (agent?.name) {
      if (activeTab === 'trace') {
        handleFetchLatestTrace(true);
      } else if (!latestTrace) {
        fetchLatestTrace(agent.name).then((trace) => {
          if (trace) setLatestTrace(trace);
        });
      }
    }
  }, [agent?.name, activeTab]);

  const handleClearHistory = () => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setIsProcessing(false);
    setActiveTool(undefined);
    setLatestTrace(null);
    setActiveTab('chat');
    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);
    if (id) {
      sessionStorage.removeItem(`agent_chat_session_${id}`);
    }
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
    setActiveTab('chat');

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
          if (event.type === 'trace_tree') {
            if (event.data) {
              setLatestTrace(event.data as TraceTreeNode);
            }
          } else if (event.type === 'step') {
            const stepData = event.data;
            if (stepData?.step_type === 'tool') {
              const toolName = stepData.name;
              const isStart = !stepData.output && !stepData.error;

              if (isStart) {
                setActiveTool(toolName);
                setMessages((prev) =>
                  prev.map((m) => {
                    if (m.id === agentMsgId) {
                      const traces = m.traces || [];
                      const existingIdx = traces.findIndex(
                        (t) => t.tool === toolName && t.status === 'running'
                      );
                      if (existingIdx >= 0) return m;

                      const newTrace: ToolTrace = {
                        id: `tool-${formatToolName(toolName)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        type: 'tool_call',
                        tool: toolName,
                        summary: `Calling tool: ${formatToolName(toolName)}`,
                        status: 'running',
                        input: stepData.input,
                        timestamp: Date.now(),
                      };
                      return { ...m, traces: [...traces, newTrace] };
                    }
                    return m;
                  })
                );
              } else {
                setActiveTool(undefined);
                setMessages((prev) =>
                  prev.map((m) => {
                    if (m.id === agentMsgId) {
                      const traces = m.traces || [];
                      const targetIdx = traces.findIndex(
                        (t) => t.tool === toolName && t.status === 'running'
                      );
                      const isErr = Boolean(stepData.error);
                      if (targetIdx >= 0) {
                        const target = traces[targetIdx];
                        const durationMs = Date.now() - target.timestamp;
                        const duration =
                          durationMs < 1000
                            ? `${durationMs}ms`
                            : `${(durationMs / 1000).toFixed(1)}s`;
                        const updatedTraces = [...traces];
                        updatedTraces[targetIdx] = {
                          ...target,
                          summary: isErr
                            ? `Failed tool: ${formatToolName(toolName)}`
                            : `Finished tool: ${formatToolName(toolName)}`,
                          status: isErr ? 'error' : 'completed',
                          completedAt: Date.now(),
                          duration,
                          output: stepData.output,
                          error: stepData.error,
                        };
                        return { ...m, traces: updatedTraces };
                      } else {
                        const newTrace: ToolTrace = {
                          id: `tool-${formatToolName(toolName)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                          type: 'tool_result',
                          tool: toolName,
                          summary: isErr
                            ? `Failed tool: ${formatToolName(toolName)}`
                            : `Finished tool: ${formatToolName(toolName)}`,
                          status: isErr ? 'error' : 'completed',
                          completedAt: Date.now(),
                          output: stepData.output,
                          error: stepData.error,
                          timestamp: Date.now(),
                        };
                        return { ...m, traces: [...traces, newTrace] };
                      }
                    }
                    return m;
                  })
                );
              }
            }
          } else if (event.type === 'token') {
            const token = event.data?.token || '';
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentMsgId ? { ...m, content: m.content + token } : m
              )
            );
          } else if (event.type === 'tool_call') {
            const toolName = event.data?.tool;
            if (toolName) {
              setActiveTool(toolName);
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id === agentMsgId) {
                    const traces = m.traces || [];
                    const existingIdx = traces.findIndex(
                      (t) => t.tool === toolName && t.status === 'running'
                    );
                    if (existingIdx >= 0) {
                      if (!traces[existingIdx].input && event.data?.input) {
                        const updated = [...traces];
                        updated[existingIdx] = {
                          ...updated[existingIdx],
                          input: event.data.input,
                        };
                        return { ...m, traces: updated };
                      }
                      return m;
                    }
                    const trace: ToolTrace = {
                      id: `tool-${formatToolName(toolName)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      type: 'tool_call',
                      tool: toolName,
                      summary: `Calling tool: ${formatToolName(toolName)}`,
                      status: 'running',
                      input: event.data?.input,
                      timestamp: Date.now(),
                    };
                    return { ...m, traces: [...traces, trace] };
                  }
                  return m;
                })
              );
            }
          } else if (event.type === 'tool_result') {
            const toolName = event.data?.tool;
            setActiveTool(undefined);
            if (toolName) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id === agentMsgId) {
                    const traces = m.traces || [];
                    const targetIdx = traces.findIndex(
                      (t) => t.tool === toolName && t.status === 'running'
                    );
                    if (targetIdx >= 0) {
                      const target = traces[targetIdx];
                      const durationMs = Date.now() - target.timestamp;
                      const duration =
                        durationMs < 1000
                          ? `${durationMs}ms`
                          : `${(durationMs / 1000).toFixed(1)}s`;
                      const updated = [...traces];
                      updated[targetIdx] = {
                        ...target,
                        summary: `Finished tool: ${formatToolName(toolName)}`,
                        status: 'completed',
                        completedAt: Date.now(),
                        duration,
                        output: event.data?.output,
                      };
                      return { ...m, traces: updated };
                    } else {
                      const trace: ToolTrace = {
                        id: `tool-${formatToolName(toolName)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        type: 'tool_result',
                        tool: toolName,
                        summary: `Finished tool: ${formatToolName(toolName)}`,
                        status: 'completed',
                        completedAt: Date.now(),
                        output: event.data?.output,
                        timestamp: Date.now(),
                      };
                      return { ...m, traces: [...traces, trace] };
                    }
                  }
                  return m;
                })
              );
            }
          } else if (event.type === 'completed') {
            setActiveTool(undefined);
            const rawFinal = event.data?.final_answer;
            const finalAnswer = formatMessageContent(rawFinal);
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === agentMsgId) {
                  const cleanedTraces = (m.traces || []).map((t) =>
                    t.status === 'running'
                      ? {
                          ...t,
                          status: 'completed' as const,
                          summary: `Finished tool: ${formatToolName(t.tool)}`,
                        }
                      : t
                  );
                  return {
                    ...m,
                    traces: cleanedTraces,
                    content: finalAnswer || m.content,
                    isStreaming: false,
                  };
                }
                return m;
              })
            );

            // Re-sync latest trace in background
            if (agent?.name) {
              fetchLatestTrace(agent.name).then((trace) => {
                if (trace) setLatestTrace(trace);
              });
              setTimeout(() => {
                fetchLatestTrace(agent.name).then((trace) => {
                  if (trace) setLatestTrace(trace);
                });
              }, 1200);
            }
          } else if (event.type === 'error') {
            setActiveTool(undefined);
            const errorText =
              typeof event.summary === 'string'
                ? event.summary
                : event.data?.stderr
                ? String(event.data.stderr)
                : 'Execution error';
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === agentMsgId) {
                  const cleanedTraces = (m.traces || []).map((t) =>
                    t.status === 'running'
                      ? {
                          ...t,
                          status: 'error' as const,
                          summary: `Failed tool: ${formatToolName(t.tool)}`,
                        }
                      : t
                  );
                  return {
                    ...m,
                    traces: cleanedTraces,
                    error: errorText,
                    isStreaming: false,
                  };
                }
                return m;
              })
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
          error?.message || (typeof error === 'string' ? error : safeStringify(error)) || 'Failed to connect to the agent server. Is the backend running?';
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
    <div className="flex flex-col h-full w-full min-h-0 overflow-hidden">
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

        {/* Center: Tabs for Chat and Trace */}
        <div className="flex items-center p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('trace');
              if (agent?.name) {
                handleFetchLatestTrace(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'trace'
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
            <span>Trace</span>
            {latestTrace ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ) : null}
          </button>

          {/* Evals Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('evals')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'evals'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Evals</span>
          </button>
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
            onClick={() =>
              navigate(`/agents/edit/${agent.id}?returnTo=run`, {
                state: { from: `/agents/run/${agent.name || agent.id}` },
              })
            }
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            title="Edit Agent Configuration"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Canvas: Chat View, Trace View, and Evals View (all kept mounted so state is never lost) */}
      <div className={`flex-1 min-h-0 overflow-hidden glass-card rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs bg-white/70 dark:bg-zinc-900/60 ${activeTab === 'evals' ? 'flex flex-col' : 'hidden'}`}>
        <AgentEvalManager agentName={agent.name} />
      </div>

      <div className={`flex-1 min-h-0 overflow-hidden glass-card rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs ${activeTab === 'trace' ? 'flex flex-col' : 'hidden'}`}>
        <TraceViewer
          trace={latestTrace}
          agentName={agent.name}
          onRefreshTrace={handleFetchLatestTrace}
          isLoadingTrace={isLoadingTrace}
        />
      </div>

      <div className={`flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden glass-card rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs ${activeTab === 'chat' ? '' : 'hidden'}`}>
        {/* Left: Chat Interaction Area */}
        <div className="flex-1 min-w-0 flex flex-col h-full bg-zinc-50/40 dark:bg-zinc-950/40 overflow-hidden">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
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
                      {/* Essential Tool Activity Events (updates one-by-one) */}
                      {hasTraces && (
                        <div className="space-y-1.5 mb-1 w-full">
                          {msg.traces!.map((trace) => {
                            const isRunning = trace.status === 'running';
                            const isError = trace.status === 'error';
                            const isExpanded = expandedTraces[trace.id];
                            const hasPayload =
                              trace.input !== undefined || trace.output !== undefined;

                              return (
                                <motion.div
                                  key={trace.id || `trace-${trace.timestamp}-${Math.random()}`}
                                  initial={{ opacity: 0, y: 5, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                  className={`rounded-xl border transition-all text-xs overflow-hidden ${
                                    isRunning
                                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 shadow-xs'
                                      : isError
                                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60'
                                      : 'bg-white/90 dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs'
                                  }`}
                                >
                                  <div className="flex items-center justify-between px-3 py-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {isRunning ? (
                                        <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
                                      ) : isError ? (
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      )}

                                      <span
                                        className={`font-semibold text-[11px] ${
                                          isRunning
                                            ? 'text-amber-700 dark:text-amber-300'
                                            : isError
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : 'text-zinc-600 dark:text-zinc-300'
                                        }`}
                                      >
                                        {isRunning
                                          ? 'Calling tool:'
                                          : isError
                                          ? 'Failed tool:'
                                          : 'Finished tool:'}
                                      </span>

                                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60 truncate max-w-[220px]">
                                        {formatToolName(trace.tool || trace.summary)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                      {trace.duration && (
                                        <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                                          {trace.duration}
                                        </span>
                                      )}

                                      {hasPayload && (
                                        <button
                                          type="button"
                                          onClick={() => toggleTraceExpansion(trace.id)}
                                          className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                          title={isExpanded ? 'Hide Payload' : 'View Payload'}
                                        >
                                          {isExpanded ? (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          ) : (
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Optional expandable payload */}
                                  {isExpanded && hasPayload && (
                                    <div className="px-3 pb-2.5 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-[10.5px] font-mono space-y-1.5 bg-zinc-50/50 dark:bg-zinc-950/40">
                                      {trace.input !== undefined && (
                                        <div>
                                          <span className="text-zinc-400 font-semibold">input: </span>
                                          <span className="text-zinc-600 dark:text-zinc-300 break-all">
                                            {safeStringify(trace.input)}
                                          </span>
                                        </div>
                                      )}
                                      {trace.output !== undefined && (
                                        <div>
                                          <span className="text-zinc-400 font-semibold">output: </span>
                                          <span className="text-zinc-600 dark:text-zinc-300 break-all">
                                            {safeStringify(trace.output)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        )}

                        {/* Message Bubble */}
                        {(msg.content || !isAgent || (!msg.error && !msg.isStreaming)) && (
                          <div
                            className={`px-4 py-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                              isAgent
                                ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800/80 rounded-tl-sm shadow-xs w-full'
                                : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-tr-sm self-end shadow-xs whitespace-pre-wrap break-words'
                            }`}
                          >
                            {isAgent ? (
                              <div className="relative">
                                <MarkdownRenderer content={msg.content} />
                                {msg.isStreaming && (
                                  <span className="inline-block w-1.5 h-4 ml-1 bg-zinc-900 dark:bg-white animate-pulse align-middle" />
                                )}
                              </div>
                            ) : (
                              <span className="whitespace-pre-wrap">{formatMessageContent(msg.content)}</span>
                            )}
                          </div>
                        )}

                        {/* Initial streaming placeholder */}
                        {msg.isStreaming && !msg.content && (!msg.traces || msg.traces.length === 0) && (
                          <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-tl-sm flex items-center gap-2 text-xs text-zinc-500 shadow-xs">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                            <span>Thinking...</span>
                          </div>
                        )}

                        {/* Error display */}
                        {msg.error && (
                          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                            <div>
                              <p className="font-semibold">Error</p>
                              <p className="mt-0.5 whitespace-pre-wrap font-mono text-[11px]">
                                {typeof msg.error === 'string' ? msg.error : safeStringify(msg.error)}
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
