import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sliders,
  FileText,
  Wrench,
  PlayCircle,
  Save,
  Send,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAgentStore } from '../../store/useAgentStore';
import { AgentStatus } from '../../types/agent';
import { Step1Details } from './Step1Details';
import { Step2Prompt } from './Step2Prompt';
import { Step3Tools } from './Step3Tools';
import { Step4TestReview } from './Step4TestReview';
import { useToast } from '../../components/ui/Toast';

const agentFormSchema = z.object({
  name: z.string().min(2, 'Agent name must be at least 2 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  category: z.string().min(1, 'Please select a category'),
  model: z.enum([
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gpt-4o',
    'claude-3-5-sonnet',
    'deepseek-r1',
  ]),
  temperature: z.number().min(0).max(1),
  systemPrompt: z.string().min(10, 'System instructions must be at least 10 characters'),
  toolIds: z.array(z.string()),
});

export type AgentBuilderFormData = z.infer<typeof agentFormSchema>;

export const AgentBuilderPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { agents, addAgent, updateAgent } = useAgentStore();
  const { showToast } = useToast();

  const isEditing = Boolean(id);
  const existingAgent = isEditing ? agents.find((a) => a.id === id) : null;

  const [currentStep, setCurrentStep] = useState<number>(1);

  const form = useForm<AgentBuilderFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: existingAgent?.name || '',
      description: existingAgent?.description || '',
      category: existingAgent?.category || 'Customer Support',
      model: existingAgent?.model || 'gemini-2.5-flash',
      temperature: existingAgent?.temperature ?? 0.3,
      systemPrompt:
        existingAgent?.systemPrompt ||
        `You are a specialized AI assistant.\nYour goal is to assist users with query: {{user_query}}.\nAlways maintain a professional tone.`,
      toolIds: existingAgent?.toolIds || ['tool-duckduckgo'],
    },
  });

  // Populate if existing agent loaded
  useEffect(() => {
    if (existingAgent) {
      form.reset({
        name: existingAgent.name,
        description: existingAgent.description,
        category: existingAgent.category,
        model: existingAgent.model,
        temperature: existingAgent.temperature,
        systemPrompt: existingAgent.systemPrompt,
        toolIds: existingAgent.toolIds,
      });
    }
  }, [existingAgent, form]);

  const handleSave = (statusToSave: AgentStatus) => {
    const values = form.getValues();

    // Trigger validation
    const result = agentFormSchema.safeParse(values);
    if (!result.success) {
      showToast('Validation Failed', 'Please fix form errors before saving.', 'error');
      // Highlight errors by triggering submit
      form.handleSubmit(() => {})();
      return;
    }

    if (isEditing && existingAgent) {
      updateAgent(existingAgent.id, {
        ...values,
        status: statusToSave,
      });
      showToast('Agent Saved', `Updated "${values.name}" as ${statusToSave}.`, 'success');
    } else {
      addAgent({
        ...values,
        status: statusToSave,
      });
      showToast('Agent Created!', `Created "${values.name}" (${statusToSave}).`, 'success');
    }

    navigate('/agents');
  };

  const STEPS = [
    { id: 1, label: 'Identity & Model', icon: Sliders },
    { id: 2, label: 'Prompt Instructions', icon: FileText },
    { id: 3, label: 'Tools Integration', icon: Wrench },
    { id: 4, label: 'Sandbox & Review', icon: PlayCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Controls Bar */}
      <div className="glass-card rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {isEditing ? `Edit Agent: ${existingAgent?.name}` : 'New Agent Builder'}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {existingAgent?.status?.toUpperCase() || 'DRAFT'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Step {currentStep} of 4 — {STEPS[currentStep - 1].label}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-amber-500" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('published')}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Agent</span>
          </button>
        </div>
      </div>

      {/* Steps Navigation Bar */}
      <div className="glass-card rounded-2xl p-1.5 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max w-full justify-between px-1">
          {STEPS.map((step) => {
            const IconComp = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                      : isCompleted
                      ? 'text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                      : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{step.label}</span>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-1" />}
                </button>

                {step.id < 4 && <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="glass-card rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800/80 min-h-[420px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {currentStep === 1 && <Step1Details form={form} />}
            {currentStep === 2 && <Step2Prompt form={form} />}
            {currentStep === 3 && <Step3Tools form={form} />}
            {currentStep === 4 && <Step4TestReview form={form} />}
          </motion.div>
        </AnimatePresence>

        {/* Wizard Footer Next/Prev Bar */}
        <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 disabled:opacity-30 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Back
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-xs transition-colors"
            >
              <span>Next Step</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSave('published')}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
            >
              <span>Finish & Publish</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
