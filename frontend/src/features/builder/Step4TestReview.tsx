import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { motion } from 'motion/react';
import {
  Play,
  CheckCircle2,
  Terminal,
  Bot,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { AgentBuilderFormData } from './AgentBuilderPage';
import { useAgentStore } from '../../store/useAgentStore';
import { TestExecutionStep } from '../../types/agent';

interface Step4TestReviewProps {
  form: UseFormReturn<AgentBuilderFormData>;
}

export const Step4TestReview: React.FC<Step4TestReviewProps> = ({ form }) => {
  const { watch } = form;
  const { tools, runAgent } = useAgentStore();

  const formData = watch();
  const selectedTools = tools.filter((t) => (formData.toolIds || []).includes(t.id));

  // Temporary local state for testing execution
  const [testQuery, setTestQuery] = useState('');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<TestExecutionStep[]>([]);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);

  const runMockTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim() || isRunningTest) return;

    setIsRunningTest(true);
    setExecutionSteps([]);
    setAgentResponse(null);

    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const agentName = formData.name || 'Untitled_Agent';

    try {
      // 1. Prepare and Sync the Agent configuration to backend
      setExecutionSteps([
        {
          id: 'step-1',
          type: 'prompt_prep',
          title: 'Syncing Agent Configuration',
          details: `Saving configuration for ${agentName} to the backend...`,
          timestamp: timeStr,
          status: 'running',
        }
      ]);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
      const syncPayload = {
        name: agentName,
        prompt: formData.systemPrompt || '',
        model: formData.model,
        tools: formData.toolIds || [],
        mcp_servers: formData.mcpServers || [],
      };
      
      const createResp = await fetch(`${baseUrl}/agents/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncPayload),
      });

      if (!createResp.ok) {
        throw new Error('Failed to synchronize agent configuration with the server.');
      }

      setExecutionSteps((prev) => [
        { ...prev[0], status: 'success', details: `Agent ${agentName} synced successfully.` },
        {
          id: 'step-2',
          type: 'llm_thinking',
          title: 'Executing Agent',
          details: `Sending query to ${formData.model} and invoking tools...`,
          timestamp: new Date().toLocaleTimeString(),
          status: 'running',
        }
      ]);

      // 2. Run the actual agent via our store API
      const response = await runAgent(agentName, testQuery);

      setExecutionSteps((prev) => [
        prev[0],
        { ...prev[1], status: 'success', details: 'Agent execution completed successfully.' }
      ]);
      setAgentResponse(response.result || 'No output returned by the agent.');

    } catch (err: any) {
      setExecutionSteps((prev) => [
        ...prev.map(step => step.status === 'running' ? { ...step, status: 'error', details: err.message } : step)
      ]);
      setAgentResponse(`Error: ${err.message}`);
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Summary Card */}
      <div className="glass-card rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-zinc-700 dark:text-zinc-300" /> Configuration Review
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider mb-1">Agent Name</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
              {formData.name || 'Untitled Agent'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider mb-1">Engine Model</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {formData.model}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider mb-1">Attached Tools</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {selectedTools.length} Tools
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider mb-1">MCP Servers</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formData.mcpServers?.length || 0} Servers
            </span>
          </div>
        </div>

        {/* Attached Items Pills */}
        <div className="space-y-2">
          {selectedTools.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-zinc-500 font-semibold mr-1">Bound Tools:</span>
              {selectedTools.map((t) => (
                <span
                  key={t.id}
                  className="px-2.5 py-0.5 rounded-md bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
          
          {(formData.mcpServers?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-zinc-500 font-semibold mr-1">MCP Servers:</span>
              {formData.mcpServers!.map((url) => (
                <span
                  key={url}
                  className="px-2.5 py-0.5 rounded-md bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold"
                >
                  {url}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Test Playground Workspace */}
      <div className="glass-card rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Bot className="w-4 h-4 text-zinc-700 dark:text-zinc-300" /> Interactive Test Sandbox
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-normal">
              Simulate a user query to observe real-time step-by-step execution traces and model response.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            Sandbox Simulator
          </span>
        </div>

        {/* Test Input Form */}
        <form onSubmit={runMockTest} className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Type a test query (e.g. 'How do I reset my password and check recent orders?')"
            className="flex-1 px-4 py-2.5 rounded-xl text-xs glass-input text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800"
          />
          <button
            type="submit"
            disabled={isRunningTest || !testQuery.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-xs transition-all"
          >
            {isRunningTest ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{isRunningTest ? 'Executing...' : 'Run Test'}</span>
          </button>
        </form>

        {/* Execution Trace Timeline */}
        {executionSteps.length > 0 && (
          <div className="mt-4 p-4 rounded-xl popup-solid text-zinc-900 dark:text-zinc-100 space-y-3 font-mono text-xs border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <span className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                <Terminal className="w-3.5 h-3.5 text-zinc-500" /> Execution Trace Logs
              </span>
              <span>Trace ID: {Math.random().toString(36).substring(2, 9)}</span>
            </div>

            <div className="space-y-2.5 pt-1">
              {executionSteps.map((step) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {step.status === 'running' ? (
                      <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-zinc-800 dark:text-zinc-200">{step.title}</p>
                      {step.executionTimeMs && (
                        <span className="text-[10px] text-zinc-400">{step.executionTimeMs}ms</span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{step.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulated Response Box */}
        {agentResponse && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl popup-solid border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 space-y-2"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
              <Bot className="w-4 h-4" /> Agent Output:
            </div>
            <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-zinc-700 dark:text-zinc-300">
              {agentResponse}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
