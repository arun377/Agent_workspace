import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Sparkles, Plus, BookOpen } from 'lucide-react';
import { AgentBuilderFormData } from './AgentBuilderPage';
import { useToast } from '../../components/ui/Toast';

interface Step2PromptProps {
  form: UseFormReturn<AgentBuilderFormData>;
}

const TEMPLATE_VARIABLES = [
  { tag: '{{user_query}}', desc: 'The input message sent by the end user' },
  { tag: '{{context}}', desc: 'Additional customer metadata or state' },
  { tag: '{{current_date}}', desc: 'Real-time ISO timestamp' },
  { tag: '{{user_name}}', desc: 'Authenticated customer username' },
];

const PRESET_PROMPTS = [
  {
    title: 'Customer Technical Support',
    category: 'Support',
    prompt: `You are an expert technical support specialist for Agent Studio.
Your role is to diagnose technical issues, inspect system logs, and query customer database records when necessary.

Variables available:
- User Inquiry: {{user_query}}
- Customer Context: {{context}}

Guidelines:
1. Always maintain a helpful, professional tone.
2. If tools are required, invoke DuckDuckGo Search or SQL Query Runner.
3. Provide step-by-step resolution instructions in clear Markdown.`,
  },
  {
    title: 'Market Research & Competitor Auditor',
    category: 'Research',
    prompt: `You are an elite Market Research Analyst.
Your task is to analyze competitive positioning, scrape website landings, and summarize industry news.

Input: {{user_query}}
Timestamp: {{current_date}}

Format your output into 3 sections:
- Executive Summary
- Key Market Trends
- Strategic Recommendations`,
  },
  {
    title: 'Code Security & Logic Auditor',
    category: 'Engineering',
    prompt: `You are a Senior Principal Security Engineer.
Audit the provided code snippets or engineering query: {{user_query}}.

Use Python Code Sandbox tool to verify syntax or perform static calculations. Highlight any memory leaks, OWASP top 10 risks, or type bugs.`,
  },
];

export const Step2Prompt: React.FC<Step2PromptProps> = ({ form }) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const { showToast } = useToast();

  const currentPrompt = watch('systemPrompt');

  const insertVariable = (variableTag: string) => {
    setValue('systemPrompt', `${currentPrompt || ''} ${variableTag}`);
    showToast('Variable Inserted', `Added ${variableTag} to system prompt.`, 'info');
  };

  const applyPreset = (presetText: string, title: string) => {
    setValue('systemPrompt', presetText);
    showToast('Preset Loaded', `Applied "${title}" prompt template.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Variable Chips Helper Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Template Variables
            </h4>
          </div>
          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-medium">
            Click chip to insert into prompt
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {TEMPLATE_VARIABLES.map((item) => (
            <button
              key={item.tag}
              type="button"
              onClick={() => insertVariable(item.tag)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold transition-all hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{item.tag}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Textarea */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            System Instructions (Prompt) *
          </label>
          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-semibold">
            {currentPrompt ? currentPrompt.length : 0} characters
          </span>
        </div>

        <textarea
          {...register('systemPrompt')}
          rows={12}
          placeholder="Enter detailed persona, behavioral constraints, and instructions for your agent..."
          className="w-full p-4 rounded-2xl text-xs font-mono glass-input text-slate-900 dark:text-slate-100 leading-relaxed shadow-xs"
        />
        {errors.systemPrompt && (
          <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.systemPrompt.message}</p>
        )}
      </div>

      {/* Preset Prompt Templates */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Quick Start Prompt Presets
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_PROMPTS.map((preset) => (
            <div
              key={preset.title}
              onClick={() => applyPreset(preset.prompt, preset.title)}
              className="glass-card rounded-2xl p-4 border border-slate-200 dark:border-white/5 hover:border-cyan-600/50 cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">
                  {preset.title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-transparent">
                  {preset.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-3 font-mono leading-relaxed">
                {preset.prompt}
              </p>
              <div className="mt-2 text-[10px] text-cyan-700 dark:text-cyan-400 font-bold group-hover:underline">
                Use Preset &rarr;
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
