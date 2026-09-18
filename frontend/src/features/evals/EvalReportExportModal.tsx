import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Scale,
  Sparkles,
  ExternalLink,
  Code,
  Layers,
} from 'lucide-react';
import { EvalReportResponse } from '../../types/eval';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useToast } from '../../components/ui/Toast';

interface EvalReportExportModalProps {
  report: EvalReportResponse;
  isOpen: boolean;
  onClose: () => void;
}

export const EvalReportExportModal: React.FC<EvalReportExportModalProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  const { showToast } = useToast();
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Compute statistics
  const stats = useMemo(() => {
    let totalMetrics = 0;
    let totalScore = 0;
    let passedCases = 0;

    report.results.forEach((c) => {
      const casePassed = c.metric_results.every((m) => m.passed);
      if (casePassed) passedCases += 1;

      c.metric_results.forEach((m) => {
        totalMetrics += 1;
        totalScore += m.score;
      });
    });

    const failedCases = report.total_cases - passedCases;
    const passRate =
      report.total_cases > 0 ? Math.round((passedCases / report.total_cases) * 100) : 0;
    const avgScore = totalMetrics > 0 ? (totalScore / totalMetrics).toFixed(2) : '0.00';

    return {
      passedCases,
      failedCases,
      passRate,
      avgScore,
      totalMetrics,
    };
  }, [report]);

  const reportDate = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  if (!isOpen) return null;

  // Generate self-contained standalone HTML document with complete styles and progress ribbons
  const generateStandaloneHtml = (): string => {
    const casesHtml = report.results
      .map((c, idx) => {
        const casePassed = c.metric_results.every((m) => m.passed);

        const metricsHtml = c.metric_results
          .map((m) => {
            const scorePercent = Math.min(100, Math.max(0, Math.round(m.score * 100)));
            const targetPercent = Math.min(100, Math.max(0, Math.round(m.threshold * 100)));
            const barColor = m.passed ? '#10b981' : '#f43f5e';
            const badgeBg = m.passed ? '#ecfdf5' : '#fff1f2';
            const badgeText = m.passed ? '#065f46' : '#9f1239';
            const badgeBorder = m.passed ? '#a7f3d0' : '#fecdd3';

            return `
              <div style="background: ${m.passed ? '#f0fdf4' : '#fff1f2'}; border: 1px solid ${m.passed ? '#bbf7d0' : '#fecdd3'}; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 14px; color: #0f172a;">${m.metric_name}</span>
                    <span style="font-size: 10px; font-weight: 800; background: ${badgeBg}; color: ${badgeText}; border: 1px solid ${badgeBorder}; padding: 2px 8px; border-radius: 6px; text-transform: uppercase;">
                      ${m.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <div style="font-size: 13px; font-family: monospace;">
                    <span style="color: #64748b;">Score:</span>
                    <strong style="color: #0f172a; font-size: 15px; margin-left: 4px;">${m.score}</strong>
                    <span style="color: #cbd5e1; margin: 0 6px;">|</span>
                    <span style="color: #64748b;">Threshold:</span>
                    <strong style="color: #334155; margin-left: 4px;">≥ ${m.threshold}</strong>
                  </div>
                </div>

                <!-- PROGRESS RIBBON -->
                <div style="margin: 12px 0 6px 0;">
                  <div style="height: 10px; background: #e2e8f0; border-radius: 9999px; position: relative; overflow: hidden;">
                    <div style="height: 100%; width: ${scorePercent}%; background: ${barColor}; border-radius: 9999px;"></div>
                    <div style="position: absolute; top: 0; bottom: 0; left: ${targetPercent}%; width: 2px; background: #0f172a; opacity: 0.8;" title="Target: ${m.threshold}"></div>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; font-family: monospace; margin-top: 4px;">
                    <span>0.0</span>
                    <span style="font-weight: 600; color: #475569;">Target Threshold: ≥ ${m.threshold} (${targetPercent}%)</span>
                    <span>1.0</span>
                  </div>
                </div>

                <!-- JUDGE REASON CALLOUT -->
                ${
                  m.reason
                    ? `
                  <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 14px; margin-top: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <strong style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #92400e; display: flex; align-items: center; gap: 6px;">
                        ⚖️ Judge Evaluation Reason
                      </strong>
                      <span style="font-size: 9px; font-weight: 700; background: #fde68a; color: #78350f; padding: 2px 6px; border-radius: 4px;">
                        AI Judge Verdict
                      </span>
                    </div>
                    <p style="font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.5; margin: 0;">
                      ${m.reason}
                    </p>
                  </div>
                `
                    : ''
                }
              </div>
            `;
          })
          .join('');

        // Parse output blocks if json
        let thinkingHtml = '';
        let textOutput = c.agent_output;
        try {
          if (c.agent_output.trim().startsWith('[') && c.agent_output.trim().endsWith(']')) {
            const sanitized = c.agent_output
              .replace(/None/g, 'null')
              .replace(/True/g, 'true')
              .replace(/False/g, 'false')
              .replace(/'((?:\\.|[^'\\])*)'/g, (match) => `"${match.slice(1, -1).replace(/"/g, '\\"')}"`);
            const parsed = JSON.parse(sanitized);
            if (Array.isArray(parsed)) {
              const thinking = parsed.find((b) => b.type === 'thinking' || b.thinking);
              const text = parsed.find((b) => b.type === 'text' || b.text);
              if (thinking) {
                thinkingHtml = `
                  <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
                    <div style="font-weight: 700; font-size: 11px; color: #6b21a8; margin-bottom: 4px; text-transform: uppercase;">
                      🧠 Agent Reasoning & Thoughts
                    </div>
                    <div style="font-size: 12px; color: #3b0764; white-space: pre-wrap; line-height: 1.5;">
                      ${thinking.thinking || JSON.stringify(thinking)}
                    </div>
                  </div>
                `;
              }
              if (text) {
                textOutput = text.text || '';
              }
            }
          }
        } catch {}

        return `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px; page-break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-family: monospace; font-size: 12px; font-weight: 800; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; color: #0f172a;">
                  Case #${idx + 1}
                </span>
                <span style="font-size: 11px; font-weight: 700; background: ${casePassed ? '#ecfdf5' : '#fff1f2'}; color: ${casePassed ? '#065f46' : '#9f1239'}; border: 1px solid ${casePassed ? '#a7f3d0' : '#fecdd3'}; padding: 3px 10px; border-radius: 9999px;">
                  ${casePassed ? '✓ All Metrics Passed' : '✗ Metrics Failed'}
                </span>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 6px;">
                Test Input Prompt
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #0f172a; font-weight: 500; line-height: 1.5;">
                ${c.agent_input}
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 8px;">
                Evaluation Metrics & Progress Ribbons (${c.metric_results.length})
              </div>
              ${metricsHtml}
            </div>

            <div>
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 6px;">
                Agent Execution & Output
              </div>
              ${thinkingHtml}
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; font-size: 12.5px; color: #0f172a; line-height: 1.6; white-space: pre-wrap;">
                ${textOutput}
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Evaluation Report - ${report.agent_name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 32px 16px;
    }
    .report-container {
      max-width: 900px;
      margin: 0 auto;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .no-print { display: none !important; }
      .report-container { max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Executive Header -->
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">
              Agent Evaluation Suite Report
            </span>
            <span style="font-family: monospace; font-size: 10px; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
              ${report.evaluation_type}
            </span>
          </div>
          <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">
            Agent: ${report.agent_name}
          </h1>
          <div style="font-size: 12px; color: #64748b;">
            Generated on ${reportDate}
          </div>
        </div>

        <div style="text-align: right;">
          <div style="display: inline-block; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: ${
            report.all_passed ? '#ecfdf5' : '#fff1f2'
          }; color: ${
            report.all_passed ? '#065f46' : '#9f1239'
          }; border: 1.5px solid ${
            report.all_passed ? '#6ee7b7' : '#fca5a5'
          }; padding: 6px 16px; border-radius: 9999px;">
            ${report.all_passed ? '✓ EVALUATION PASSED (100%)' : '⚠ FAILURES DETECTED'}
          </div>
        </div>
      </div>

      <!-- KPI Grid -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Total Cases</div>
          <div style="font-size: 20px; font-weight: 800; font-family: monospace; color: #0f172a;">${report.total_cases}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Pass Rate</div>
          <div style="font-size: 20px; font-weight: 800; font-family: monospace; color: ${
            stats.passRate === 100 ? '#10b981' : '#f43f5e'
          };">${stats.passRate}%</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Avg Score</div>
          <div style="font-size: 20px; font-weight: 800; font-family: monospace; color: #0f172a;">${stats.avgScore} / 1.0</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Metrics Evaluated</div>
          <div style="font-size: 20px; font-weight: 800; font-family: monospace; color: #0f172a;">${stats.totalMetrics}</div>
        </div>
      </div>
    </div>

    <!-- Case Results -->
    <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0;">
      Detailed Case Evaluations & Execution Results
    </h2>
    ${casesHtml}
  </div>
</body>
</html>`;
  };

  const handleDownloadHtml = () => {
    const htmlContent = generateStandaloneHtml();
    const filename = `${report.agent_name}_eval_report_${new Date().toISOString().slice(0, 10)}.html`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Report Downloaded', `Saved ${filename}`, 'success');
  };

  const handlePrint = () => {
    const htmlContent = generateStandaloneHtml();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    } else {
      window.print();
    }
  };

  const handleCopySummary = () => {
    const summaryLines = [
      `# Evaluation Report: ${report.agent_name}`,
      `Date: ${reportDate}`,
      `Type: ${report.evaluation_type}`,
      `Verdict: ${report.all_passed ? 'ALL PASSED (100%)' : 'FAILURES DETECTED'}`,
      `Total Cases: ${report.total_cases} | Pass Rate: ${stats.passRate}% | Average Score: ${stats.avgScore}/1.0`,
      '',
      '## Detailed Cases:',
      ...report.results.map((c, i) => {
        const metricsStr = c.metric_results
          .map((m) => `  - ${m.metric_name}: Score ${m.score} (Threshold ≥ ${m.threshold}) [${m.passed ? 'PASSED' : 'FAILED'}]\n    Reason: "${m.reason || 'N/A'}"`)
          .join('\n');
        return `### Case #${i + 1}\nPrompt: ${c.agent_input}\nMetrics:\n${metricsStr}\n`;
      }),
    ].join('\n');

    navigator.clipboard.writeText(summaryLines);
    setCopiedSummary(true);
    showToast('Copied', 'Evaluation summary copied to clipboard', 'success');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                  Evaluation Report
                </h3>
                <span className="mono text-[10px] px-2 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                  {report.evaluation_type}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-normal">
                {report.agent_name} • {reportDate}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 transition-all shadow-xs active:scale-95"
              title="Print report or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-300 dark:border-zinc-700 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs active:scale-95"
              title="Download standalone offline HTML report"
            >
              <Download className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>Download Report</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
              title="Copy markdown summary"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
              title="Toggle raw JSON"
            >
              <Code className="w-3.5 h-3.5" />
              <span>{showRawJson ? 'Formatted' : 'Raw JSON'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-1"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 space-y-6 scrollbar-thin bg-zinc-50/50 dark:bg-zinc-950/30">
          {showRawJson ? (
            <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-200 font-mono text-xs leading-relaxed overflow-x-auto border border-zinc-800 select-all">
              {JSON.stringify(report, null, 2)}
            </pre>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* 1. Executive Summary Banner */}
              <div
                className={`rounded-3xl border p-6 sm:p-7 shadow-xs ${
                  report.all_passed
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-zinc-900'
                    : 'border-rose-200 dark:border-rose-900/60 bg-white dark:bg-zinc-900'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                      Agent Evaluation Executive Report
                    </span>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
                      {report.agent_name}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Evaluated on {reportDate}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                        report.all_passed
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                      }`}
                    >
                      {report.all_passed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Evaluation Passed (100%)</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          <span>Failures Detected</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* KPI Boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Total Cases
                    </span>
                    <span className="font-mono text-xl font-extrabold text-zinc-900 dark:text-white">
                      {report.total_cases}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Pass Rate
                    </span>
                    <span
                      className={`font-mono text-xl font-extrabold ${
                        stats.passRate === 100
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {stats.passRate}%
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Average Score
                    </span>
                    <span className="font-mono text-xl font-extrabold text-zinc-900 dark:text-white">
                      {stats.avgScore} <span className="text-xs text-zinc-400 font-normal">/ 1.0</span>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Metrics Evaluated
                    </span>
                    <span className="font-mono text-xl font-extrabold text-zinc-900 dark:text-white">
                      {stats.totalMetrics}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Case Results with Progress Ribbons & Judge Reasons */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Test Case Breakdown & Execution
                </h4>

                {report.results.map((c, idx) => {
                  const casePassed = c.metric_results.every((m) => m.passed);

                  return (
                    <div
                      key={idx}
                      className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-7 shadow-xs space-y-5"
                    >
                      {/* Case Header */}
                      <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold px-3 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
                            Case #{idx + 1}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              casePassed
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {casePassed ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Passed All Thresholds</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Failed Threshold</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Test Input */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                          Test Input Prompt
                        </span>
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                          {c.agent_input}
                        </div>
                      </div>

                      {/* Metrics Matrix with Progress Ribbon */}
                      <div className="space-y-3 pt-1">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                          Evaluation Metrics & Score Ribbons ({c.metric_results.length})
                        </span>

                        <div className="grid grid-cols-1 gap-3">
                          {c.metric_results.map((m, mIdx) => {
                            const percentage = Math.min(100, Math.max(0, Math.round(m.score * 100)));
                            const thresholdPercentage = Math.min(
                              100,
                              Math.max(0, Math.round(m.threshold * 100))
                            );

                            return (
                              <div
                                key={mIdx}
                                className={`rounded-2xl p-4 sm:p-5 border transition-all space-y-3.5 ${
                                  m.passed
                                    ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                                    : 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                      {m.metric_name}
                                    </span>
                                    <span
                                      className={`mono text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                        m.passed
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                                      }`}
                                    >
                                      {m.passed ? 'PASSED' : 'FAILED'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs">
                                    <div>
                                      <span className="text-zinc-500">Score:</span>
                                      <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white ml-1">
                                        {m.score}
                                      </span>
                                    </div>
                                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                                    <div className="text-[11px] text-zinc-500">
                                      <span>Threshold:</span>
                                      <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                                        ≥ {m.threshold}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* THE PROGRESS RIBBON */}
                                <div className="space-y-1.5">
                                  <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative shadow-inner">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        m.passed
                                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                          : 'bg-gradient-to-r from-rose-500 to-rose-400'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                    {/* Threshold marker tick */}
                                    <div
                                      className="absolute top-0 bottom-0 w-1 bg-zinc-900 dark:bg-white z-10 opacity-80"
                                      style={{ left: `${thresholdPercentage}%` }}
                                      title={`Target: ${m.threshold}`}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                                    <span>0.0</span>
                                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                                      Target Threshold: ≥ {m.threshold} ({thresholdPercentage}%)
                                    </span>
                                    <span>1.0</span>
                                  </div>
                                </div>

                                {/* JUDGE EVALUATION REASON (Prominent, High-Contrast Callout) */}
                                {m.reason && (
                                  <div className="p-4 rounded-xl bg-amber-500/[0.08] dark:bg-amber-500/10 border border-amber-400/40 dark:border-amber-500/30 space-y-2 shadow-xs">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                                          <Scale className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </div>
                                        <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                                          Judge Evaluation Reason
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
                                        AI Judge Verdict
                                      </span>
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed pl-1">
                                      {m.reason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Agent Output with Markdown */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                          Agent Output
                        </span>
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed">
                          <MarkdownRenderer content={c.agent_output} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 px-6 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between text-xs text-zinc-500">
          <span>
            {report.total_cases} case(s) evaluated • {stats.totalMetrics} metric assessments
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
