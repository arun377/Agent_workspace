import { create } from 'zustand';

import { Agent, Tool, AgentStatus, AIModel, AgentStreamEvent, AgentRunOptions } from '../types/agent';

interface AgentState {
  agents: Agent[];
  tools: Tool[];
  isLoading: boolean;
  isToolsLoading: boolean;
  error: string | null;
  // Actions
  fetchAgents: () => Promise<void>;
  fetchTools: () => Promise<void>;
  runAgent: (name: string, inputText: string, options?: AgentRunOptions) => Promise<{ result: string; events: AgentStreamEvent[] }>;
  createAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Agent>;
  updateAgent: (id: string, agent: Partial<Omit<Agent, 'id' | 'createdAt'>>) => Promise<Agent>;
  duplicateAgent: (id: string) => Agent | null;
  deleteAgent: (id: string) => void;
  toggleAgentStatus: (id: string) => void;
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-violet-600 to-fuchsia-600',
];

export const useAgentStore = create<AgentState>()((set, get) => ({
      agents: [],
      tools: [],
      isLoading: false,
      isToolsLoading: false,
      error: null,

      fetchAgents: async () => {
        set({ isLoading: true, error: null });
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
          const response = await fetch(`${baseUrl}/agents/`);
          if (!response.ok) throw new Error('Failed to fetch agents');
          const data = await response.json();
          
          const mappedAgents: Agent[] = data.map((item: any) => {
            const agentName = item.name || item.AGENT_NAME || 'Unknown';
            let rawModel = item.model || item.MODEL_STRING || 'gemini/gemini-2.5-pro';
            // Auto-migrate legacy agents missing the provider prefix
            if (!rawModel.includes('/')) {
              if (rawModel.startsWith('gpt')) rawModel = `openai/${rawModel}`;
              else if (rawModel.includes('llama') || rawModel.includes('mixtral')) rawModel = `groq/${rawModel}`;
              else rawModel = `gemini/${rawModel}`;
            }

            return {
              id: agentName,
              name: agentName,
              description: item.description || '',
              category: item.category || 'Custom',
              status: item.status || 'published',
              model: rawModel,
              systemPrompt: item.prompt || item.PROMPT || '',
              toolIds: item.tools || item.SELECTED_TOOL_IDS || item.TOOL_NAMES || [],
              mcpServers: item.mcp_servers || item.MCP_SERVERS || [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              avatarColor: AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)],
            };
          });

          set({ agents: mappedAgents, isLoading: false });
        } catch (error: any) {
          console.error('Error fetching agents:', error);
          set({ error: error.message, isLoading: false });
        }
      },

      fetchTools: async () => {
        set({ isToolsLoading: true, error: null });
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
          const response = await fetch(`${baseUrl}/tools/`);
          if (!response.ok) throw new Error('Failed to fetch tools');
          const data = await response.json();
          
          // Map backend tools to frontend tools format
          const mappedTools: Tool[] = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description || `Tool: ${item.name}`,
            category: 'utility',
            iconName: item.type === 'mcp' ? 'Server' : 'Wrench',
            type: item.type,
            mcp_server_id: item.mcp_server_id,
          }));

          set({ tools: mappedTools, isToolsLoading: false });
        } catch (error: any) {
          console.error('Error fetching tools:', error);
          set({ error: error.message, isToolsLoading: false });
        }
      },



      createAgent: async (agentData) => {
        set({ isLoading: true, error: null });
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
          
          const payload = {
            name: agentData.name,
            prompt: agentData.systemPrompt,
            model: agentData.model,
            tools: agentData.toolIds,
          };

          const response = await fetch(`${baseUrl}/agents/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) throw new Error('Failed to create agent');
          
          const responseData = await response.json();

          const now = new Date().toISOString();
          const randomGradient = AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];

          const newAgent: Agent = {
            ...agentData,
            id: responseData.name, // The backend responds with name, use it as ID
            name: responseData.name,
            createdAt: now,
            updatedAt: now,
            avatarColor: agentData.avatarColor || randomGradient,
          };

          set((state) => ({
            agents: [newAgent, ...state.agents],
            isLoading: false,
          }));

          return newAgent;
        } catch (error: any) {
          console.error('Error creating agent:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateAgent: async (id, agentData) => {
        set({ isLoading: true, error: null });
        const now = new Date().toISOString();

        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

          const payload: Record<string, any> = {};
          if (agentData.name !== undefined) payload.name = agentData.name;
          if (agentData.systemPrompt !== undefined) payload.prompt = agentData.systemPrompt;
          if (agentData.model !== undefined) payload.model = agentData.model;
          if (agentData.toolIds !== undefined) payload.tools = agentData.toolIds;

          const response = await fetch(`${baseUrl}/agents/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            let errorMsg = 'Failed to update agent';
            try {
              const errData = await response.json();
              if (errData.detail) errorMsg = errData.detail;
            } catch {}
            throw new Error(errorMsg);
          }

          const responseData = await response.json();
          const targetName = responseData.name || agentData.name || id;

          let updatedAgent: Agent | null = null;

          set((state) => {
            const updatedAgents = state.agents.map((ag) => {
              if (ag.id === id) {
                updatedAgent = {
                  ...ag,
                  ...agentData,
                  id: targetName,
                  name: targetName,
                  model: responseData.model || agentData.model || ag.model,
                  systemPrompt: responseData.prompt !== undefined ? responseData.prompt : (agentData.systemPrompt ?? ag.systemPrompt),
                  toolIds: responseData.tools || agentData.toolIds || ag.toolIds,
                  updatedAt: now,
                };
                return updatedAgent;
              }
              return ag;
            });

            if (!updatedAgent) {
              const randomGradient = AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];
              updatedAgent = {
                id: targetName,
                name: targetName,
                description: agentData.description || '',
                category: agentData.category || 'Custom',
                status: agentData.status || 'published',
                model: responseData.model || agentData.model || 'gemini/gemini-2.5-pro',
                systemPrompt: responseData.prompt || agentData.systemPrompt || '',
                toolIds: responseData.tools || agentData.toolIds || [],
                mcpServers: agentData.mcpServers || [],
                createdAt: now,
                updatedAt: now,
                avatarColor: agentData.avatarColor || randomGradient,
              };
              return {
                agents: [updatedAgent, ...state.agents.filter(a => a.id !== id)],
                isLoading: false,
              };
            }

            return { agents: updatedAgents, isLoading: false };
          });

          return updatedAgent!;
        } catch (error: any) {
          console.error('Error updating agent:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      runAgent: async (name: string, inputText: string, options?: AgentRunOptions) => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${baseUrl}/agents/${encodeURIComponent(name)}/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input_text: inputText,
            session_id: options?.sessionId || 'default_session',
          }),
          signal: options?.signal,
        });

        if (!response.ok) {
          let errorMessage = 'Failed to run agent';
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
          } catch {
            errorMessage = `Request failed with status ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        if (!response.body) {
          throw new Error('ReadableStream not supported or empty response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let accumulatedTokens = '';
        let finalAnswer = '';
        let streamError: string | null = null;
        const events: AgentStreamEvent[] = [];

        const handleSseLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) return;

          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            if (!jsonStr) return;

            try {
              const event: AgentStreamEvent = JSON.parse(jsonStr);
              events.push(event);
              options?.onEvent?.(event);

              if (event.type === 'token') {
                const token = event.data?.token || '';
                accumulatedTokens += token;
              } else if (event.type === 'completed') {
                if (event.data?.final_answer !== undefined) {
                  finalAnswer = event.data.final_answer;
                }
              } else if (event.type === 'error') {
                streamError = event.summary || event.data?.stderr || 'Error during agent execution';
              } else if (event.status === 'success' && event.result) {
                const text = typeof event.result === 'string' ? event.result : event.result.answer;
                if (text) finalAnswer = text;
              } else if (event.status === 'error') {
                streamError = event.result || 'Agent execution failed';
              }
            } catch (err) {
              console.warn('Could not parse SSE JSON payload:', trimmed, err);
            }
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              handleSseLine(line);
            }
          }

          if (buffer.trim()) {
            buffer += decoder.decode();
            const lines = buffer.split('\n');
            for (const line of lines) {
              handleSseLine(line);
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (streamError) {
          throw new Error(streamError);
        }

        const result = finalAnswer || accumulatedTokens;
        return {
          result,
          events,
        };
      },

      duplicateAgent: (id) => {
        const target = get().agents.find((a) => a.id === id);
        if (!target) return null;

        const now = new Date().toISOString();
        const newId = `agent-${Date.now()}`;
        const duplicated: Agent = {
          ...target,
          id: newId,
          name: `${target.name} (Copy)`,
          status: 'published',
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          agents: [duplicated, ...state.agents],
        }));

        return duplicated;
      },

      deleteAgent: (id) => {
        set((state) => ({
          agents: state.agents.filter((ag) => ag.id !== id),
        }));
      },

      toggleAgentStatus: (id) => {
        // All agents remain published
      },
}));
