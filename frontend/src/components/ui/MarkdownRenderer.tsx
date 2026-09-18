import React, { useMemo, useState } from 'react';
import { ExternalLink, FileText, Music, Image as ImageIcon, Copy, Check } from 'lucide-react';

export interface MarkdownRendererProps {
  content?: any;
  className?: string;
}

/**
 * Safely converts any content (string, array of message blocks, object) into a string
 */
export const formatMessageContent = (content: any): string => {
  if (content === null || content === undefined) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'number' || typeof content === 'boolean') return String(content);

  // Array of blocks, e.g. [{"type": "text", "text": "..."}]
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          return item.text || item.content || item.thinking || '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  // Object with text/answer/result/content
  if (typeof content === 'object') {
    if (content.text) return String(content.text);
    if (content.answer) return String(content.answer);
    if (content.result) return typeof content.result === 'string' ? content.result : JSON.stringify(content.result, null, 2);
    if (content.content) return formatMessageContent(content.content);
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }

  return String(content);
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 text-[11px] font-mono bg-zinc-900/90 border-b border-zinc-800/80 text-zinc-400">
        <span className="font-semibold uppercase tracking-wider text-[10px]">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono overflow-x-auto leading-relaxed scrollbar-thin text-zinc-200 selection:bg-zinc-700">
        {code}
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  // Normalize string content
  const normalizedText = useMemo(() => {
    const raw = formatMessageContent(content);
    if (!raw) return '';

    let text = raw;
    if (text.includes('\\n')) {
      text = text.replace(/\\n/g, '\n');
    }
    if (text.includes('\\t')) {
      text = text.replace(/\\t/g, '  ');
    }
    if (text.includes('\\"')) {
      text = text.replace(/\\"/g, '"');
    }
    return text.trim();
  }, [content]);

  // Helper to parse inline styles: links, inline code, bold, italic, strikethrough, raw URLs
  const renderInline = (text: string): React.ReactNode => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;
    let safetyCounter = 0;
    const maxIterations = 2000;

    const tokenRegex = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*]+)\*|_([^_]+)_|(https?:\/\/[^\s<]+))/;

    while (remaining && safetyCounter++ < maxIterations) {
      const match = tokenRegex.exec(remaining);
      if (!match) {
        parts.push(remaining);
        break;
      }

      const matchIndex = match.index;
      if (matchIndex > 0) {
        parts.push(remaining.substring(0, matchIndex));
      }

      const fullMatch = match[0];
      if (!fullMatch) {
        parts.push(remaining[0]);
        remaining = remaining.substring(1);
        continue;
      }

      if (match[2] && match[3]) {
        // [Label](url) markdown link
        const label = match[2];
        let url = match[3].trim();
        if (url.startsWith('<') && url.endsWith('>')) {
          url = url.slice(1, -1);
        }
        const lowerUrl = url.toLowerCase();
        const isPdf = lowerUrl.endsWith('.pdf') || label.toLowerCase().endsWith('.pdf');
        const isAudio = lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav') || lowerUrl.endsWith('.ogg');
        const isImage = lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.svg') || lowerUrl.endsWith('.webp');

        parts.push(
          <a
            key={keyIdx++}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 underline underline-offset-2 decoration-sky-500/40 hover:decoration-sky-500 transition-colors mx-0.5 cursor-pointer group"
          >
            {isPdf && <FileText className="w-3.5 h-3.5 text-rose-500 inline shrink-0" />}
            {isAudio && <Music className="w-3.5 h-3.5 text-amber-500 inline shrink-0" />}
            {isImage && <ImageIcon className="w-3.5 h-3.5 text-emerald-500 inline shrink-0" />}
            <span>{label}</span>
            <ExternalLink className="w-3 h-3 text-sky-400/80 group-hover:text-sky-400 inline shrink-0" />
          </a>
        );
      } else if (match[4]) {
        // `code`
        parts.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 rounded text-[11.5px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 mx-0.5 font-medium"
          >
            {match[4]}
          </code>
        );
      } else if (match[5] || match[6]) {
        // **bold** or __bold__
        const boldText = match[5] || match[6];
        parts.push(
          <strong key={keyIdx++} className="font-bold text-zinc-900 dark:text-white">
            {boldText}
          </strong>
        );
      } else if (match[7]) {
        // ~~strikethrough~~
        parts.push(
          <del key={keyIdx++} className="line-through text-zinc-500 dark:text-zinc-400">
            {match[7]}
          </del>
        );
      } else if (match[8] || match[9]) {
        // *italic* or _italic_
        const italicText = match[8] || match[9];
        parts.push(
          <em key={keyIdx++} className="italic text-zinc-800 dark:text-zinc-200">
            {italicText}
          </em>
        );
      } else if (match[10]) {
        // Standalone raw URL (https://... or http://...)
        let rawUrl = match[10];
        let trailingPunct = '';
        const punctMatch = rawUrl.match(/[.,;:!?)]+$/);
        if (punctMatch) {
          trailingPunct = punctMatch[0];
          rawUrl = rawUrl.slice(0, -trailingPunct.length);
        }

        const lowerUrl = rawUrl.toLowerCase();
        const isPdf = lowerUrl.endsWith('.pdf');
        const isAudio = lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav') || lowerUrl.endsWith('.ogg');
        const isImage = lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.svg') || lowerUrl.endsWith('.webp');

        parts.push(
          <React.Fragment key={keyIdx++}>
            <a
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 underline underline-offset-2 decoration-sky-500/40 hover:decoration-sky-500 transition-colors mx-0.5 break-all cursor-pointer group"
            >
              {isPdf && <FileText className="w-3.5 h-3.5 text-rose-500 inline shrink-0" />}
              {isAudio && <Music className="w-3.5 h-3.5 text-amber-500 inline shrink-0" />}
              {isImage && <ImageIcon className="w-3.5 h-3.5 text-emerald-500 inline shrink-0" />}
              <span>{rawUrl}</span>
              <ExternalLink className="w-3 h-3 text-sky-400/80 group-hover:text-sky-400 inline shrink-0" />
            </a>
            {trailingPunct}
          </React.Fragment>
        );
      }

      remaining = remaining.substring(matchIndex + fullMatch.length);
    }

    return parts;
  };

  // Block level parser
  const renderedBlocks = useMemo(() => {
    if (!normalizedText) {
      return (
        <span className="text-zinc-400 dark:text-zinc-500 italic text-xs">
          No content
        </span>
      );
    }

    const lines = normalizedText.split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0;
    let blockKey = 0;
    let safetyCounter = 0;
    const maxLineCycles = lines.length * 3 + 100;

    while (i < lines.length && safetyCounter++ < maxLineCycles) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty line
      if (!trimmed) {
        i++;
        continue;
      }

      // Fenced Code Block: ```
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++; // skip closing ```
        blocks.push(
          <CodeBlock
            key={blockKey++}
            code={codeLines.join('\n')}
            language={lang}
          />
        );
        continue;
      }

      // Headers: #, ##, ###, ####
      if (trimmed.startsWith('#')) {
        const match = trimmed.match(/^(#{1,4})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          const text = match[2];
          if (level === 1) {
            blocks.push(
              <h2
                key={blockKey++}
                className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white mt-4 mb-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-800"
              >
                {renderInline(text)}
              </h2>
            );
          } else if (level === 2) {
            blocks.push(
              <h3
                key={blockKey++}
                className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white mt-3.5 mb-1.5"
              >
                {renderInline(text)}
              </h3>
            );
          } else if (level === 3) {
            blocks.push(
              <h4
                key={blockKey++}
                className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-3 mb-1"
              >
                {renderInline(text)}
              </h4>
            );
          } else {
            blocks.push(
              <h5
                key={blockKey++}
                className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-2 mb-1"
              >
                {renderInline(text)}
              </h5>
            );
          }
          i++;
          continue;
        }
      }

      // Horizontal rule: ---, ***, ___
      if (/^([-*_]){3,}$/.test(trimmed)) {
        blocks.push(
          <hr
            key={blockKey++}
            className="my-3 border-zinc-200 dark:border-zinc-800"
          />
        );
        i++;
        continue;
      }

      // Markdown Table: lines starting with |
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines: string[] = [];
        let curIdx = i;
        while (curIdx < lines.length && lines[curIdx].trim().startsWith('|')) {
          tableLines.push(lines[curIdx].trim());
          curIdx++;
        }

        if (tableLines.length >= 2) {
          i = curIdx;
          const parseRow = (rowStr: string) =>
            rowStr
              .slice(1, -1)
              .split('|')
              .map((c) => c.trim());

          const headers = parseRow(tableLines[0]);
          const isDivider = (s: string) => /^[-: ]+$/.test(s);
          const hasDivider = tableLines.length > 1 && parseRow(tableLines[1]).every(isDivider);
          const dataRows = (hasDivider ? tableLines.slice(2) : tableLines.slice(1)).map(parseRow);

          blocks.push(
            <div
              key={blockKey++}
              className="my-3 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto shadow-xs"
            >
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 font-bold border-b border-zinc-200 dark:border-zinc-700">
                  <tr>
                    {headers.map((h, hIdx) => (
                      <th key={hIdx} className="px-3.5 py-2">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2">
                          {renderInline(cell)}
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
      }

      // Unordered list: - or * or +
      if (/^[-*+]\s+/.test(trimmed)) {
        const listItems: string[] = [];
        while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
          i++;
        }
        blocks.push(
          <ul key={blockKey++} className="my-2 space-y-1 pl-5 list-disc text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
            {listItems.map((item, lIdx) => (
              <li key={lIdx}>{renderInline(item)}</li>
            ))}
          </ul>
        );
        continue;
      }

      // Numbered list: 1. 2.
      if (/^\d+\.\s+/.test(trimmed)) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
          i++;
        }
        blocks.push(
          <ol key={blockKey++} className="my-2 space-y-1 pl-5 list-decimal text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
            {listItems.map((item, lIdx) => (
              <li key={lIdx}>{renderInline(item)}</li>
            ))}
          </ol>
        );
        continue;
      }

      // Blockquote: >
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
          i++;
        }
        blocks.push(
          <blockquote
            key={blockKey++}
            className="my-2 pl-3.5 py-1.5 border-l-3 border-zinc-400 dark:border-zinc-600 italic text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 rounded-r-lg"
          >
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx}>{renderInline(ql)}</p>
            ))}
          </blockquote>
        );
        continue;
      }

      // Regular Paragraph
      const paraLines: string[] = [trimmed];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().startsWith('#') &&
        !/^[-*+]\s+/.test(lines[i].trim()) &&
        !/^\d+\.\s+/.test(lines[i].trim()) &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].trim().startsWith('|') &&
        !lines[i].trim().startsWith('>') &&
        !/^([-*_]){3,}$/.test(lines[i].trim())
      ) {
        paraLines.push(lines[i].trim());
        i++;
      }

      blocks.push(
        <p key={blockKey++} className="my-2 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
          {paraLines.map((pLine, plIdx) => (
            <React.Fragment key={plIdx}>
              {plIdx > 0 && <br />}
              {renderInline(pLine)}
            </React.Fragment>
          ))}
        </p>
      );
    }

    return blocks;
  }, [normalizedText]);

  return <div className={`prose-container ${className}`}>{renderedBlocks}</div>;
};
