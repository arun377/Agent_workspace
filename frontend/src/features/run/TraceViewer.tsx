import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  DollarSign,
  Copy,
  Check,
  Search,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  FileCode,
  Terminal,
  Layers,
  Wrench,
  Bot,
  Compass,
  Code2,
  Eye,
  User,
  ExternalLink,
  Download,
  FileText,
} from 'lucide-react';
import { TraceTreeNode } from '../../types/agent';

interface TraceViewerProps {
  trace: TraceTreeNode | null;
  agentName?: string;
}

// Helpers for run-type badges
const getRunTypeBadge = (runType: string) => {
  const type = (runType || 'chain').toLowerCase();
  switch (type) {
    case 'llm':
    case 'chat_model':
      return {
        label: 'LLM',
        bg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
        icon: <Bot className="w-3 h-3" />,
      };
    case 'tool':
      return {
        label: 'Tool',
        bg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        icon: <Wrench className="w-3 h-3" />,
      };
    case 'retriever':
      return {
        label: 'Retriever',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        icon: <Compass className="w-3 h-3" />,
      };
    case 'chain':
    default:
      return {
        label: 'Chain',
        bg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        icon: <Layers className="w-3 h-3" />,
      };
  }
};

const formatDuration = (ms?: number | null) => {
  if (ms === undefined || ms === null) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

// Format timestamps into localized user timezone (e.g. Sep 14, 2026, 11:04:49.223 PM)
const formatTimestamp = (isoString?: string | null) => {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

// Format USD costs matching official LangSmith
const formatCost = (val?: number | null) => {
  if (val === undefined || val === null) return null;
  if (val === 0) return '$0.00';
  if (val < 0.0001) return `<$0.0001`;
  if (val < 0.01) return `$${val.toFixed(5)}`;
  return `$${val.toFixed(4)}`;
};

// Flatten helper for search / navigation
const getAllNodeIds = (node: TraceTreeNode): string[] => {
  let ids = [node.id];
  if (node.children) {
    for (const child of node.children) {
      ids = ids.concat(getAllNodeIds(child));
    }
  }
  return ids;
};

// Calculate total metrics across root and tree accurately without double-counting
const calculateMetrics = (node: TraceTreeNode) => {
  const hasRootTokens = node.tokens?.total_tokens !== undefined && node.tokens.total_tokens > 0;
  let totalPromptTokens = node.tokens?.prompt_tokens ?? 0;
  let totalCompletionTokens = node.tokens?.completion_tokens ?? 0;
  let totalTokens = node.tokens?.total_tokens ?? 0;
  let totalCost = node.total_cost ?? node.cost?.total_cost ?? 0;

  if (!hasRootTokens) {
    totalPromptTokens = 0;
    totalCompletionTokens = 0;
    totalTokens = 0;
    totalCost = 0;

    const sumLlmLeaves = (n: TraceTreeNode) => {
      const isLlm = (n.run_type || '').toLowerCase() === 'llm';
      if (isLlm && n.tokens) {
        totalPromptTokens += n.tokens.prompt_tokens || 0;
        totalCompletionTokens += n.tokens.completion_tokens || 0;
        totalTokens += n.tokens.total_tokens || ((n.tokens.prompt_tokens || 0) + (n.tokens.completion_tokens || 0));
        const costVal = n.total_cost ?? n.cost?.total_cost ?? 0;
        totalCost += costVal;
      }
      if (n.children) {
        n.children.forEach(sumLlmLeaves);
      }
    };
    sumLlmLeaves(node);
  }

  return {
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens,
    totalCost: totalCost || (node.total_cost ?? node.cost?.total_cost ?? 0),
    totalLatencyMs: node.latency_ms ?? 0,
  };
};

// Deep extractor for tool outputs, artifacts, and nested structures
const extractTextContent = (data: any): string | null => {
  if (data === null || data === undefined) return null;
  if (typeof data === 'string') return data;
  if (typeof data === 'number' || typeof data === 'boolean') return String(data);

  // 1. Tool artifact with structured_content (e.g. MCP tools, gitdiagram, etc.)
  if (data?.artifact?.structured_content?.result) {
    return extractTextContent(data.artifact.structured_content.result);
  }
  if (data?.artifact?.result) {
    return extractTextContent(data.artifact.result);
  }
  if (typeof data?.artifact === 'string') {
    return data.artifact;
  }

  // 2. content array (e.g. [{"type": "text", "text": "..."}])
  if (Array.isArray(data?.content)) {
    const textPieces = data.content
      .map((c: any) => (typeof c === 'string' ? c : c?.text || c?.content || ''))
      .filter(Boolean);
    if (textPieces.length > 0) return textPieces.join('\n\n');
  }
  if (typeof data?.content === 'string') {
    return data.content;
  }

  // 3. direct output or result
  if (data?.output !== undefined) {
    const res = extractTextContent(data.output);
    if (res) return res;
  }
  if (data?.result !== undefined) {
    const res = extractTextContent(data.result);
    if (res) return res;
  }
  if (data?.text !== undefined) {
    const res = extractTextContent(data.text);
    if (res) return res;
  }

  // 4. LangGraph messages output: {"messages": [...]}
  if (Array.isArray(data?.messages) && data.messages.length > 0) {
    const lastMsg = data.messages[data.messages.length - 1];
    const content = lastMsg?.content || lastMsg?.kwargs?.content;
    if (content) return extractTextContent(content);
  }

  return null;
};

// Helper to render inline formatting: bold, inline code, and links
const renderInlineMarkdown = (text: string) => {
  // Tokenize bold (**text**), inline code (`code`), markdown links ([text](url)), and raw URLs
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\)]+\)|https?:\/\/[^\s]+)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={i} className="font-bold text-zinc-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px] text-pink-600 dark:text-pink-400 font-medium">
          {part.slice(1, -1)}
        </code>
      );
    }
    // Markdown link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\)]+)\)$/);
    if (linkMatch) {
      const isFileLink = linkMatch[2].endsWith('.pdf') || linkMatch[2].endsWith('.html');
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 font-semibold hover:underline ${
            isFileLink
              ? 'text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20'
              : 'text-blue-600 dark:text-blue-400'
          }`}
        >
          {isFileLink ? <Download className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
          <span>{linkMatch[1]}</span>
        </a>
      );
    }
    // Standalone raw URL
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline break-all inline-flex items-center gap-1 font-mono text-[11px]"
        >
          <span>{part}</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

// Rich Markdown Formatter Component with Tables, Code Blocks, Headings, and Lists
const FormattedMarkdownText: React.FC<{ content: string }> = ({ content }) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  if (!content) return <span className="text-zinc-400 italic">No content</span>;

  // 1. Separate code blocks from normal markdown text
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs sm:text-[13px] leading-relaxed break-words text-zinc-800 dark:text-zinc-200">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).split('\n');
          const language = lines[0].trim() || 'text';
          const code = lines.slice(1).join('\n').trim() || lines.join('\n').trim();

          return (
            <div key={idx} className="my-2.5 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-inner">
              <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
                <span className="font-semibold uppercase text-[10px] text-zinc-300">{language}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    setCopiedCodeIdx(idx);
                    setTimeout(() => setCopiedCodeIdx(null), 1800);
                  }}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  {copiedCodeIdx === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCodeIdx === idx ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 text-xs font-mono text-zinc-100 overflow-x-auto leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // 2. Parse regular markdown: tables, headers, lists, hr, and paragraphs
        const rawLines = part.split('\n');
        const renderedBlocks: React.ReactNode[] = [];
        let i = 0;

        while (i < rawLines.length) {
          const line = rawLines[i];
          const trimmed = line.trim();

          // A. Table detection: line contains '|' and next line is separator like '|---|'
          if (trimmed.includes('|') && i + 1 < rawLines.length && rawLines[i + 1].trim().includes('|-')) {
            const tableLines: string[] = [trimmed];
            i += 2; // Skip header and separator
            while (i < rawLines.length && rawLines[i].trim().includes('|')) {
              tableLines.push(rawLines[i].trim());
              i++;
            }

            const headerCols = tableLines[0].split('|').map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
            const rowData = tableLines.slice(1).map(r => r.split('|').map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1));

            renderedBlocks.push(
              <div key={`table-${i}`} className="overflow-x-auto my-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                  <thead className="bg-zinc-100/90 dark:bg-zinc-800/90">
                    <tr>
                      {headerCols.map((h, hi) => (
                        <th key={hi} className="px-3 py-2 text-left font-bold text-zinc-800 dark:text-zinc-200">
                          {renderInlineMarkdown(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900/40">
                    {rowData.map((row, ri) => (
                      <tr key={ri} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                            {renderInlineMarkdown(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            continue;
          }

          // B. Empty line
          if (!trimmed) {
            renderedBlocks.push(<div key={`empty-${i}`} className="h-1.5" />);
            i++;
            continue;
          }

          // C. Horizontal rule
          if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            renderedBlocks.push(<hr key={`hr-${i}`} className="my-3 border-zinc-200 dark:border-zinc-800" />);
            i++;
            continue;
          }

          // D. Headings
          if (trimmed.startsWith('#### ')) {
            renderedBlocks.push(<h6 key={`h6-${i}`} className="font-bold text-xs pt-1 text-zinc-900 dark:text-white">{renderInlineMarkdown(trimmed.slice(5))}</h6>);
            i++;
            continue;
          }
          if (trimmed.startsWith('### ')) {
            renderedBlocks.push(<h5 key={`h5-${i}`} className="font-bold text-sm pt-1.5 text-zinc-900 dark:text-white">{renderInlineMarkdown(trimmed.slice(4))}</h5>);
            i++;
            continue;
          }
          if (trimmed.startsWith('## ')) {
            renderedBlocks.push(<h4 key={`h4-${i}`} className="font-extrabold text-sm pt-2 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-1">{renderInlineMarkdown(trimmed.slice(3))}</h4>);
            i++;
            continue;
          }
          if (trimmed.startsWith('# ')) {
            renderedBlocks.push(<h3 key={`h3-${i}`} className="font-extrabold text-base pt-2 text-zinc-900 dark:text-white">{renderInlineMarkdown(trimmed.slice(2))}</h3>);
            i++;
            continue;
          }

          // E. Blockquotes
          if (trimmed.startsWith('> ')) {
            renderedBlocks.push(
              <blockquote key={`quote-${i}`} className="border-l-2 border-blue-500 pl-3 italic text-zinc-600 dark:text-zinc-400 my-1.5">
                {renderInlineMarkdown(trimmed.slice(2))}
              </blockquote>
            );
            i++;
            continue;
          }

          // F. Bullet lists
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            renderedBlocks.push(
              <div key={`bullet-${i}`} className="flex items-start gap-2 pl-2">
                <span className="text-zinc-400 mt-0.5">•</span>
                <span className="flex-1">{renderInlineMarkdown(trimmed.slice(2))}</span>
              </div>
            );
            i++;
            continue;
          }

          // G. Numbered lists
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            renderedBlocks.push(
              <div key={`num-${i}`} className="flex items-start gap-2 pl-2">
                <span className="text-zinc-400 font-mono text-[11px] mt-0.5">{numMatch[1]}.</span>
                <span className="flex-1">{renderInlineMarkdown(numMatch[2])}</span>
              </div>
            );
            i++;
            continue;
          }

          // H. Standard paragraph
          renderedBlocks.push(
            <p key={`p-${i}`} className="leading-relaxed">
              {renderInlineMarkdown(trimmed)}
            </p>
          );
          i++;
        }

        return <div key={idx} className="space-y-1">{renderedBlocks}</div>;
      })}
    </div>
  );
};

// Message Extractor Helper for LangChain & LangGraph payloads
interface ParsedMessage {
  role: 'system' | 'human' | 'ai' | 'tool' | 'generic';
  content: string;
  name?: string;
  tool_calls?: Array<{ name: string; args: any; id?: string }>;
}

const safeJsonParse = (str: any) => {
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

const resolveMessageRole = (typeOrId: any): ParsedMessage['role'] => {
  const s = String(typeOrId || '').toLowerCase();
  if (s.includes('human') || s.includes('user')) return 'human';
  if (s.includes('system')) return 'system';
  if (s.includes('tool') || s.includes('function')) return 'tool';
  if (s.includes('ai') || s.includes('assistant') || s.includes('chatmodel')) return 'ai';
  return 'generic';
};

const extractMessagesFromPayload = (payload: any): ParsedMessage[] | null => {
  if (!payload || typeof payload !== 'object') return null;

  // 1. LLM Result: outputs.generations
  if (Array.isArray(payload.generations)) {
    const list: ParsedMessage[] = [];
    payload.generations.forEach((genGroup: any) => {
      const group = Array.isArray(genGroup) ? genGroup : [genGroup];
      group.forEach((gen: any) => {
        const msg = gen.message || {};
        const kwargs = msg.kwargs || msg;

        const typeId = Array.isArray(msg.id) ? msg.id[msg.id.length - 1] : (msg.type || msg.role || kwargs.type || kwargs.role || 'ai');
        const role = resolveMessageRole(typeId);

        let toolCalls = kwargs.tool_calls || gen.tool_calls || [];
        if (!toolCalls.length && kwargs.additional_kwargs?.tool_calls) {
          toolCalls = kwargs.additional_kwargs.tool_calls.map((tc: any) => ({
            name: tc.function?.name || tc.name,
            args: typeof tc.function?.arguments === 'string' ? safeJsonParse(tc.function.arguments) : (tc.function?.arguments || tc.args || {}),
            id: tc.id,
          }));
        }

        list.push({
          role: role === 'generic' ? 'ai' : role,
          content: typeof kwargs.content === 'string' ? kwargs.content : (gen.text || ''),
          tool_calls: toolCalls,
        });
      });
    });
    if (list.length > 0) return list;
  }

  // 2. Chat messages list: inputs.messages or outputs.messages or payload array
  const rawMsgs = payload.messages || payload.output || (Array.isArray(payload) ? payload : null);
  if (Array.isArray(rawMsgs) && rawMsgs.length > 0) {
    // Flatten in case of nested arrays like [[SystemMessage, HumanMessage]]
    const msgs = Array.isArray(rawMsgs[0]) ? rawMsgs.flat() : rawMsgs;
    const list: ParsedMessage[] = [];

    msgs.forEach((item: any) => {
      if (!item) return;

      const kwargs = item.kwargs || item;
      const typeId = Array.isArray(item.id)
        ? item.id[item.id.length - 1]
        : (item.type || item.role || kwargs.type || kwargs.role || '');

      const role = resolveMessageRole(typeId);

      let content = typeof kwargs.content === 'string'
        ? kwargs.content
        : (kwargs.content ? (typeof kwargs.content === 'object' ? JSON.stringify(kwargs.content) : String(kwargs.content)) : (kwargs.text || ''));

      // If content is empty but there's a tool output/artifact
      if (!content && kwargs.artifact) {
        content = extractTextContent(kwargs.artifact) || '';
      }

      let toolCalls = kwargs.tool_calls || [];
      if (!toolCalls.length && kwargs.additional_kwargs?.tool_calls) {
        toolCalls = kwargs.additional_kwargs.tool_calls.map((tc: any) => ({
          name: tc.function?.name || tc.name,
          args: typeof tc.function?.arguments === 'string' ? safeJsonParse(tc.function.arguments) : (tc.function?.arguments || tc.args || {}),
          id: tc.id,
        }));
      }

      list.push({
        role,
        content,
        name: kwargs.name || item.name,
        tool_calls: toolCalls,
      });
    });

    if (list.length > 0) return list;
  }

  return null;
};

// Render Role Badge Helper
const renderRoleBadge = (role: string, toolName?: string) => {
  switch (role) {
    case 'human':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <User className="w-3 h-3" />
          Human
        </span>
      );
    case 'system':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
          <Layers className="w-3 h-3" />
          System
        </span>
      );
    case 'tool':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Wrench className="w-3 h-3" />
          {toolName ? `Tool: ${toolName}` : 'Tool'}
        </span>
      );
    case 'ai':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <Bot className="w-3 h-3" />
          AI
        </span>
      );
  }
};

export const TraceViewer: React.FC<TraceViewerProps> = ({ trace, agentName }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => trace?.id || '');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'inputs' | 'outputs' | 'metadata' | 'error'>('inputs');
  const [inputViewMode, setInputViewMode] = useState<'markdown' | 'json'>('markdown');
  const [outputViewMode, setOutputViewMode] = useState<'markdown' | 'json'>('markdown');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Default selection when trace loads
  React.useEffect(() => {
    if (trace && (!selectedNodeId || selectedNodeId === '')) {
      setSelectedNodeId(trace.id);
    }
  }, [trace, selectedNodeId]);

  // Find currently selected node
  const selectedNode = useMemo(() => {
    if (!trace) return null;
    const findNode = (n: TraceTreeNode): TraceTreeNode | null => {
      if (n.id === selectedNodeId) return n;
      if (n.children) {
        for (const child of n.children) {
          const res = findNode(child);
          if (res) return res;
        }
      }
      return null;
    };
    return findNode(trace) || trace;
  }, [trace, selectedNodeId]);

  const metrics = useMemo(() => {
    if (!trace) return null;
    return calculateMetrics(trace);
  }, [trace]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpandAll = () => setCollapsedNodes({});
  const handleCollapseAll = () => {
    if (!trace) return;
    const allIds = getAllNodeIds(trace);
    const collapsed: Record<string, boolean> = {};
    allIds.forEach(id => { collapsed[id] = true; });
    setCollapsedNodes(collapsed);
  };

  if (!trace) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white/40 dark:bg-zinc-950/40">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-3 text-zinc-400">
          <Clock className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Trace Data Available</h4>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          Run a query in the Chat tab. Once the agent execution completes, the full hierarchical trace tree will appear here.
        </p>
      </div>
    );
  }

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TraceTreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = !!collapsedNodes[node.id];
    const isSelected = selectedNode?.id === node.id;
    const badge = getRunTypeBadge(node.run_type);
    const duration = formatDuration(node.latency_ms);
    const isError = node.status === 'error';
    const costFormatted = formatCost(node.total_cost ?? node.cost?.total_cost);

    // Filter check
    const matchesSearch = !searchQuery.trim() ||
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.run_type.toLowerCase().includes(searchQuery.toLowerCase());

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => setSelectedNodeId(node.id)}
          style={{ paddingLeft: `${depth * 18 + 10}px` }}
          className={`group relative flex items-center justify-between py-1.5 pr-2.5 my-0.5 rounded-lg text-xs cursor-pointer transition-all ${
            isSelected
              ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-900 dark:text-blue-100 font-semibold border border-blue-500/30'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border border-transparent'
          } ${!matchesSearch ? 'opacity-30' : ''}`}
        >
          {/* Left: Expander + Badge + Name */}
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleCollapse(node.id, e)}
                className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4 inline-block" />
            )}

            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.bg}`}>
              {badge.icon}
              {badge.label}
            </span>

            <span className="truncate font-medium text-xs text-zinc-900 dark:text-zinc-100" title={node.name}>
              {node.name}
            </span>
          </div>

          {/* Right: Duration, Tokens, Cost, Status */}
          <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
            {duration && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60">
                {duration}
              </span>
            )}
            {costFormatted && (
              <span className="hidden xl:inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {costFormatted}
              </span>
            )}
            {node.tokens?.total_tokens ? (
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300">
                {node.tokens.total_tokens.toLocaleString()} tok
              </span>
            ) : null}
            {isError ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && !isCollapsed && (
          <div className="relative">
            {/* Hierarchy vertical line guide */}
            <div
              className="absolute left-0 top-0 bottom-2 w-px bg-zinc-200 dark:bg-zinc-800"
              style={{ left: `${depth * 18 + 18}px` }}
            />
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const selectedBadge = selectedNode ? getRunTypeBadge(selectedNode.run_type) : getRunTypeBadge('chain');
  const selectedCostFormatted = selectedNode ? formatCost(selectedNode.total_cost ?? selectedNode.cost?.total_cost) : null;
  const metricsCostFormatted = formatCost(metrics?.totalCost);

  // Parse messages from inputs & outputs
  const parsedInputMessages = useMemo(() => {
    return selectedNode?.inputs ? extractMessagesFromPayload(selectedNode.inputs) : null;
  }, [selectedNode?.inputs]);

  const parsedOutputMessages = useMemo(() => {
    return selectedNode?.outputs ? extractMessagesFromPayload(selectedNode.outputs) : null;
  }, [selectedNode?.outputs]);

  // Extract text output for tool runs
  const extractedToolOutput = useMemo(() => {
    if (!selectedNode?.outputs) return null;
    return extractTextContent(selectedNode.outputs);
  }, [selectedNode?.outputs]);

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden bg-white/70 dark:bg-zinc-950/70 backdrop-blur-sm">
      {/* 1. LEFT PANE: Hierarchical Run Tree */}
      <div className="w-full md:w-80 lg:w-96 shrink-0 flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
        {/* Top Summary Bar */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
              {trace.name || agentName || 'Execution Trace'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Completed
            </span>
          </div>

          <div className="flex items-center gap-1 text-zinc-400">
            <button
              type="button"
              onClick={handleExpandAll}
              className="p-1 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded"
              title="Expand All"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="p-1 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded"
              title="Collapse All"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Global Metrics Strip: Latency, Rolled-up Tokens, USD Cost */}
        <div className="px-3 py-2 bg-zinc-100/60 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
          <span className="flex items-center gap-1" title="Total Execution Latency">
            <Clock className="w-3 h-3 text-zinc-400" />
            {formatDuration(metrics?.totalLatencyMs) || '0ms'}
          </span>
          <span className="flex items-center gap-1" title="Aggregated Total Tokens">
            <Coins className="w-3 h-3 text-zinc-400" />
            {metrics?.totalTokens ? metrics.totalTokens.toLocaleString() : '0'} tokens
          </span>
          {metricsCostFormatted && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold" title="Total Cost in USD">
              <DollarSign className="w-3 h-3 text-emerald-500" />
              {metricsCostFormatted}
            </span>
          )}
        </div>

        {/* Search Filter */}
        <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter trace nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Scrollable Tree Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {renderTreeNode(trace, 0)}
        </div>
      </div>

      {/* 2. RIGHT PANE: Detailed Step Inspector */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
        {selectedNode ? (
          <>
            {/* Inspector Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/40 dark:bg-zinc-900/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border ${selectedBadge.bg}`}>
                  {selectedBadge.icon}
                  {selectedBadge.label}
                </span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                  {selectedNode.name}
                </h3>
              </div>

              {/* Quick Metrics Bar: Duration, Tokens, USD Cost, Run ID */}
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                {selectedNode.latency_ms !== undefined && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" title="Step Latency">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    {formatDuration(selectedNode.latency_ms)}
                  </span>
                )}
                {selectedNode.tokens?.total_tokens ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" title="Step Total Tokens">
                    <Coins className="w-3 h-3 text-zinc-400" />
                    {selectedNode.tokens.total_tokens.toLocaleString()} tok
                  </span>
                ) : null}
                {selectedCostFormatted && (
                  <span className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold" title="Step Cost in USD">
                    <DollarSign className="w-3 h-3 text-emerald-500" />
                    {selectedCostFormatted}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleCopy(selectedNode.id, 'nodeId')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  title="Copy Run ID"
                >
                  {copiedKey === 'nodeId' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[10px]">{selectedNode.id.slice(0, 8)}</span>
                </button>
              </div>
            </div>

            {/* Token & Cost Details Strip */}
            {(selectedNode.tokens && (selectedNode.tokens.prompt_tokens || selectedNode.tokens.completion_tokens)) || selectedNode.cost ? (
              <div className="px-4 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200/80 dark:border-zinc-800/80 flex flex-wrap items-center gap-4 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                {selectedNode.tokens && (
                  <>
                    <span>Prompt: <strong className="text-zinc-900 dark:text-zinc-200">{(selectedNode.tokens.prompt_tokens || 0).toLocaleString()}</strong></span>
                    <span>Completion: <strong className="text-zinc-900 dark:text-zinc-200">{(selectedNode.tokens.completion_tokens || 0).toLocaleString()}</strong></span>
                    <span>Total: <strong className="text-zinc-900 dark:text-zinc-200">{(selectedNode.tokens.total_tokens || 0).toLocaleString()}</strong></span>
                  </>
                )}
                {selectedNode.cost?.prompt_cost !== undefined && (
                  <span className="border-l border-zinc-300 dark:border-zinc-700 pl-3">
                    Input Cost: <strong className="text-emerald-600 dark:text-emerald-400">{formatCost(selectedNode.cost.prompt_cost)}</strong>
                  </span>
                )}
                {selectedNode.cost?.completion_cost !== undefined && (
                  <span>
                    Output Cost: <strong className="text-emerald-600 dark:text-emerald-400">{formatCost(selectedNode.cost.completion_cost)}</strong>
                  </span>
                )}
              </div>
            ) : null}

            {/* Inspector Navigation Tabs */}
            <div className="flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10">
              {(['inputs', 'outputs', 'metadata', 'error'] as const).map((tab) => {
                if (tab === 'error' && !selectedNode.error && selectedNode.status !== 'error') return null;
                const active = activeInspectorTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveInspectorTab(tab)}
                    className={`px-3.5 py-2 text-xs font-semibold capitalize border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                      active
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                        : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {tab === 'inputs' && <Terminal className="w-3.5 h-3.5" />}
                    {tab === 'outputs' && <FileCode className="w-3.5 h-3.5" />}
                    {tab === 'metadata' && <Layers className="w-3.5 h-3.5" />}
                    {tab === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* 1. INPUTS TAB */}
              {activeInspectorTab === 'inputs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                      Invocation Inputs
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Markdown / JSON View Toggle */}
                      <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setInputViewMode('markdown')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            inputViewMode === 'markdown'
                              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          <span>Markdown</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputViewMode('json')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            inputViewMode === 'json'
                              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                          }`}
                        >
                          <Code2 className="w-3 h-3" />
                          <span>JSON</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(JSON.stringify(selectedNode.inputs, null, 2), 'inputs')}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 ml-1"
                        title="Copy raw JSON"
                      >
                        {copiedKey === 'inputs' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                  </div>

                  {inputViewMode === 'markdown' ? (
                    parsedInputMessages && parsedInputMessages.length > 0 ? (
                      /* Formatted Message Cards with explicit Human, System, AI, Tool badges */
                      <div className="space-y-3">
                        {parsedInputMessages.map((m, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 overflow-hidden shadow-xs"
                          >
                            <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-100/70 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
                              <div className="flex items-center gap-2">
                                {renderRoleBadge(m.role, m.name)}
                                <span className="text-[11px] text-zinc-400 font-mono">#{idx + 1}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy(m.content, `msg-${idx}`)}
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                title="Copy message text"
                              >
                                {copiedKey === `msg-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>

                            <div className="p-3.5">
                              <FormattedMarkdownText content={m.content} />

                              {/* Tool Calls within message if present */}
                              {m.tool_calls && m.tool_calls.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                    Tool Calls Invoked ({m.tool_calls.length})
                                  </span>
                                  {m.tool_calls.map((tc, tcIdx) => (
                                    <div key={tcIdx} className="p-2.5 rounded-lg bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 text-xs">
                                      <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 mb-1">
                                        <Wrench className="w-3.5 h-3.5" />
                                        <span>{tc.name}</span>
                                      </div>
                                      <pre className="text-[11px] font-mono bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
                                        {JSON.stringify(tc.args, null, 2)}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : selectedNode.inputs && typeof selectedNode.inputs === 'object' ? (
                      /* Tool / Generic Parameter Cards with Markdown for long text/markdown fields */
                      <div className="space-y-3">
                        {Object.entries(selectedNode.inputs).map(([k, v]) => (
                          <div key={k} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
                              <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">{k}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">{typeof v}</span>
                            </div>
                            {typeof v === 'string' ? (
                              <FormattedMarkdownText content={v} />
                            ) : (
                              <pre className="p-2 rounded bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto">
                                {JSON.stringify(v, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <FormattedMarkdownText content={String(selectedNode.inputs ?? 'No inputs recorded')} />
                      </div>
                    )
                  ) : (
                    /* JSON View */
                    <pre className="p-3.5 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800 leading-relaxed shadow-inner">
                      {JSON.stringify(selectedNode.inputs, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* 2. OUTPUTS TAB */}
              {activeInspectorTab === 'outputs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                      Invocation Outputs
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Markdown / JSON View Toggle */}
                      <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setOutputViewMode('markdown')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            outputViewMode === 'markdown'
                              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          <span>Markdown</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOutputViewMode('json')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                            outputViewMode === 'json'
                              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                          }`}
                        >
                          <Code2 className="w-3 h-3" />
                          <span>JSON</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(JSON.stringify(selectedNode.outputs, null, 2), 'outputs')}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 ml-1"
                        title="Copy raw JSON"
                      >
                        {copiedKey === 'outputs' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                  </div>

                  {outputViewMode === 'markdown' ? (
                    // Priority 1: If it's a Tool node or contains an extracted markdown text artifact
                    selectedNode.run_type === 'tool' && extractedToolOutput ? (
                      <div className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                            <Wrench className="w-3.5 h-3.5" />
                            Tool Result ({selectedNode.name})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(extractedToolOutput, 'tool-out')}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs flex items-center gap-1"
                          >
                            {copiedKey === 'tool-out' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            Copy Markdown
                          </button>
                        </div>
                        <FormattedMarkdownText content={extractedToolOutput} />
                      </div>
                    ) : parsedOutputMessages && parsedOutputMessages.length > 0 ? (
                      // Priority 2: Parsed Message cards (with role badges for AI, Tool, Human)
                      <div className="space-y-3">
                        {parsedOutputMessages.map((m, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 overflow-hidden shadow-xs"
                          >
                            <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-100/70 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
                              <div className="flex items-center gap-2">
                                {renderRoleBadge(m.role, m.name)}
                                <span className="text-[11px] text-zinc-400 font-mono">#{idx + 1}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy(m.content, `out-${idx}`)}
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                              >
                                {copiedKey === `out-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>

                            <div className="p-3.5">
                              <FormattedMarkdownText content={m.content} />

                              {/* Tool calls if emitted by LLM */}
                              {m.tool_calls && m.tool_calls.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                    Tool Calls Made ({m.tool_calls.length})
                                  </span>
                                  {m.tool_calls.map((tc, tcIdx) => (
                                    <div key={tcIdx} className="p-2.5 rounded-lg bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 text-xs">
                                      <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 mb-1">
                                        <Wrench className="w-3.5 h-3.5" />
                                        <span>{tc.name}</span>
                                      </div>
                                      <pre className="text-[11px] font-mono bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
                                        {JSON.stringify(tc.args, null, 2)}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : extractedToolOutput ? (
                      // Priority 3: Extracted text content from generic outputs
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                        <FormattedMarkdownText content={extractedToolOutput} />
                      </div>
                    ) : selectedNode.outputs && typeof selectedNode.outputs === 'object' ? (
                      // Priority 4: Generic Output Field Cards
                      <div className="space-y-2">
                        {Object.entries(selectedNode.outputs).map(([k, v]) => {
                          const textVal = extractTextContent(v);
                          return (
                            <div key={k} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                              <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5 pb-1 border-b border-zinc-200/60 dark:border-zinc-800/60">{k}</span>
                              {textVal ? (
                                <FormattedMarkdownText content={textVal} />
                              ) : typeof v === 'string' ? (
                                <FormattedMarkdownText content={v} />
                              ) : (
                                <pre className="p-2 rounded bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto">
                                  {JSON.stringify(v, null, 2)}
                                </pre>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <FormattedMarkdownText content={String(selectedNode.outputs ?? 'No outputs recorded')} />
                      </div>
                    )
                  ) : (
                    /* JSON View */
                    <pre className="p-3.5 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800 leading-relaxed shadow-inner">
                      {JSON.stringify(selectedNode.outputs, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* 3. METADATA TAB */}
              {activeInspectorTab === 'metadata' && (
                <div className="space-y-4">
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block">
                    Execution Timing & Parameters
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] text-zinc-400 block font-semibold">Start Time (Local)</span>
                      <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200">{formatTimestamp(selectedNode.start_time)}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] text-zinc-400 block font-semibold">End Time (Local)</span>
                      <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200">{formatTimestamp(selectedNode.end_time)}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] text-zinc-400 block font-semibold">Latency / Duration</span>
                      <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200">{formatDuration(selectedNode.latency_ms) || 'N/A'}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] text-zinc-400 block font-semibold">Status</span>
                      <span className={`text-xs font-mono font-bold ${selectedNode.status === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {selectedNode.status}
                      </span>
                    </div>

                    {selectedCostFormatted && (
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                        <span className="text-[10px] text-zinc-400 block font-semibold">Step Cost (USD)</span>
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedCostFormatted}</span>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] text-zinc-400 block font-semibold">Run Type</span>
                      <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200">{selectedNode.run_type}</span>
                    </div>
                  </div>

                  {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">Raw Metadata & Parameters</span>
                      <pre className="p-3 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800 leading-relaxed shadow-inner">
                        {JSON.stringify(selectedNode.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* 4. ERROR TAB */}
              {activeInspectorTab === 'error' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0 flex-1">
                      <h4 className="text-xs font-bold">Execution Failed</h4>
                      <p className="text-xs font-mono break-all whitespace-pre-wrap">
                        {selectedNode.error || 'An error occurred during this step.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-zinc-400">
            Select a step from the tree to view its inspection details.
          </div>
        )}
      </div>
    </div>
  );
};
