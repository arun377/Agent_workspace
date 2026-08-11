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
    { id: 1, label: '1. Details', icon: Sliders },
    { id: 2, label: '2. Prompt', icon: FileText },
    { id: 3, label: '3. Tools', icon: Wrench },
    { id: 4, label: '4. Test & Review', icon: PlayCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Controls Bar */}
      <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="p-2.5 rounded-2xl glass-input text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 dark:from-cyan-300 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                {isEditing ? `Edit Agent: ${existingAgent?.name}` : 'New Agent Builder'}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                {existingAgent?.status || 'Draft'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Step {currentStep} of 4 — {STEPS[currentStep - 1].label}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold glass-input text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <Save className="w-4 h-4 text-amber-500" />
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('published')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
            <span>Publish Agent</span>
          </button>
        </div>
      </div>

      {/* Steps Navigation Bar */}
      <div className="glass-card rounded-2xl p-2 border border-slate-200/80 dark:border-white/5 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max w-full justify-between px-2">
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
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                      : isCompleted
                      ? 'text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  <span>{step.label}</span>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-1" />}
                </button>

                {step.id < 4 && <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-white/5 min-h-[420px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 1 && <Step1Details form={form} />}
            {currentStep === 2 && <Step2Prompt form={form} />}
            {currentStep === 3 && <Step3Tools form={form} />}
            {currentStep === 4 && <Step4TestReview form={form} />}
          </motion.div>
        </AnimatePresence>

        {/* Wizard Footer Next/Prev Bar */}
        <div className="mt-8 pt-4 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className="px-4 py-2 rounded-xl text-xs font-semibold glass-input text-slate-700 dark:text-slate-300 disabled:opacity-40"
          >
            Back
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSave('published')}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
            >
              <span>Finish & Publish</span>
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
