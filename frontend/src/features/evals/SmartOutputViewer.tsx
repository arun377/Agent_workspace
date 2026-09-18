import React, { useState, useMemo } from 'react';
import {
  Brain,
  ChevronDown,
  ChevronRight,
  FileText,
  ExternalLink,
  Code,
  Copy,
  Check,
  Eye,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface SmartOutputViewerProps {
  output: string;
  className?: string;
}

interface OutputBlock {
  type: 'thinking' | 'text' | 'tool_call' | 'tool_result' | 'unknown';
  thinking?: string;
  text?: string;
  tool?: string;
  content?: string;
  [key: string]: any;
}

export const SmartOutputViewer: React.FC<SmartOutputViewerProps> = ({
  output,
  className = '',
}) => {
  const [showRaw, setShowRaw] = useState(false);
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Parse structured trace if available
  const parsedData = useMemo(() => {
    if (!output || typeof output !== 'string') {
      return { blocks: null, isStructured: false, text: String(output || '') };
    }

    const trimmed = output.trim();

    // Check if it looks like an array of objects
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        // Attempt standard JSON parse
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
          return { blocks: parsed as OutputBlock[], isStructured: true, text: '' };
        }
      } catch {
        // Try Python dict repr cleanup: replace single quotes with double quotes
        try {
          // Careful replace of python style repr: {'type': ...}
          const sanitized = trimmed
            .replace(/None/g, 'null')
            .replace(/True/g, 'true')
            .replace(/False/g, 'false')
            .replace(/'((?:\\.|[^'\\])*)'/g, (match) => {
              // Convert outer single quotes to double quotes, escaping internal unescaped double quotes
              const inner = match.slice(1, -1);
              return `"${inner.replace(/"/g, '\\"')}"`;
            });

          const parsed = JSON.parse(sanitized);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
            return { blocks: parsed as OutputBlock[], isStructured: true, text: '' };
          }
        } catch {
          // Fall back to plain text
        }
      }
    }

    return { blocks: null, isStructured: false, text: output };
  }, [output]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Extract thinking blocks and text blocks
  const thinkingBlocks = useMemo(() => {
    if (!parsedData.blocks) return [];
    return parsedData.blocks.filter((b) => b.type === 'thinking' || b.thinking);
  }, [parsedData.blocks]);

  const textBlocks = useMemo(() => {
    if (!parsedData.blocks) return [];
    return parsedData.blocks.filter((b) => b.type === 'text' || b.text);
  }, [parsedData.blocks]);

  // Find downloadable links (e.g. [Report.pdf](http://...) or http://...pdf)
  const downloadLinks = useMemo(() => {
    const rawText = parsedData.isStructured
      ? textBlocks.map((b) => b.text || '').join('\n')
      : parsedData.text;

    const links: { name: string; url: string; isPdf: boolean }[] = [];

    // Match markdown links: [Name](URL)
    const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    while ((match = mdLinkRegex.exec(rawText)) !== null) {
      const name = match[1];
      const url = match[2];
      links.push({
        name,
        url,
        isPdf: url.toLowerCase().endsWith('.pdf') || name.toLowerCase().endsWith('.pdf'),
      });
    }

    // Match raw http links ending in .pdf if not already captured
    const rawUrlRegex = /(https?:\/\/[^\s)]+\.pdf)/gi;
    while ((match = rawUrlRegex.exec(rawText)) !== null) {
      const url = match[1];
      if (!links.some((l) => l.url === url)) {
        const filename = url.split('/').pop() || 'Report.pdf';
        links.push({ name: filename, url, isPdf: true });
      }
    }

    return links;
  }, [parsedData, textBlocks]);

  // Clean text content for display
  const mainTextContent = useMemo(() => {
    if (parsedData.isStructured) {
      return textBlocks
        .map((b) => b.text || '')
        .filter(Boolean)
        .join('\n\n');
    }
    return parsedData.text;
  }, [parsedData, textBlocks]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Agent Output & Execution
          </span>
          {parsedData.isStructured && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Structured Trace
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title={showRaw ? 'Show Formatted View' : 'Show Raw Trace'}
          >
            {showRaw ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
            <span>{showRaw ? 'Formatted' : 'Raw Trace'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title="Copy Output"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showRaw ? (
        /* Raw Output JSON / String View */
        <pre className="p-3.5 rounded-xl bg-zinc-900 text-zinc-200 font-mono text-[11px] leading-relaxed overflow-x-auto border border-zinc-800 max-h-72 scrollbar-thin whitespace-pre-wrap break-all">
          {output}
        </pre>
      ) : (
        <div className="space-y-3">
          {/* 1. Internal Thinking & Reasoning Blocks (Collapsible Purple Box) */}
          {thinkingBlocks.length > 0 && (
            <div className="rounded-xl border border-purple-200/80 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-purple-900 dark:text-purple-300 hover:bg-purple-100/40 dark:hover:bg-purple-900/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Agent Reasoning & Thought Process</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-200/60 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                    {thinkingBlocks.length} {thinkingBlocks.length === 1 ? 'step' : 'steps'}
                  </span>
                </div>
                {isThinkingOpen ? (
                  <ChevronDown className="w-4 h-4 text-purple-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-purple-500" />
                )}
              </button>

              {isThinkingOpen && (
                <div className="p-3.5 pt-1 border-t border-purple-100 dark:border-purple-900/30 space-y-2.5 text-xs text-purple-950 dark:text-purple-200/90">
                  {thinkingBlocks.map((block, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white/70 dark:bg-purple-950/40 border border-purple-100/80 dark:border-purple-900/30 font-normal leading-relaxed text-[11.5px]"
                    >
                      <MarkdownRenderer content={block.thinking || JSON.stringify(block)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Downloadable Artifacts Bar (e.g. PDF generation) */}
          {downloadLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-sky-200/80 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20">
              <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Generated Artifacts:
              </span>
              {downloadLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-900 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 shadow-xs hover:bg-sky-50 dark:hover:bg-sky-900/40 transition-colors group"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-500 group-hover:scale-110 transition-transform" />
                  <span>{link.name}</span>
                  <ExternalLink className="w-3 h-3 text-sky-400 opacity-80" />
                </a>
              ))}
            </div>
          )}

          {/* 3. Main Final Output Message (Rendered as Human-Readable Rich Markdown) */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed font-normal">
            {mainTextContent ? (
              <MarkdownRenderer content={mainTextContent} />
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500 italic">No text output provided</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
