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
      <div className="glass-card rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              Template Variables
            </h4>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            Click variable to append into prompt
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {TEMPLATE_VARIABLES.map((item) => (
            <button
              key={item.tag}
              type="button"
              onClick={() => insertVariable(item.tag)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-bold transition-all shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>{item.tag}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Textarea */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            System Instructions (Prompt) *
          </label>
          <span className="text-[10px] text-zinc-500 font-mono font-semibold">
            {currentPrompt ? currentPrompt.length : 0} characters
          </span>
        </div>

        <textarea
          {...register('systemPrompt')}
          rows={12}
          placeholder="Enter detailed persona, behavioral constraints, and instructions for your agent..."
          className="w-full p-4 rounded-2xl text-xs font-mono glass-input text-zinc-900 dark:text-zinc-100 leading-relaxed border border-zinc-200 dark:border-zinc-800"
        />
        {errors.systemPrompt && (
          <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.systemPrompt.message}</p>
        )}
      </div>

      {/* Preset Prompt Templates */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Prompt Presets
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_PROMPTS.map((preset) => (
            <div
              key={preset.title}
              onClick={() => applyPreset(preset.prompt, preset.title)}
              className="glass-card rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800/70 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer transition-all hover:-translate-y-0.5 group shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 dark:group-hover:text-white transition-colors">
                  {preset.title}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                  {preset.category}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-3 font-mono leading-relaxed">
                {preset.prompt}
              </p>
              <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[10px] text-zinc-700 dark:text-zinc-300 font-bold group-hover:underline flex items-center justify-between">
                <span>Use Preset</span>
                <span>&rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
