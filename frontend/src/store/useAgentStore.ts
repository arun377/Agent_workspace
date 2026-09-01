import { create } from 'zustand';

import { Agent, Tool, CustomToolFormData, AgentStatus, AIModel } from '../types/agent';

interface AgentState {
  agents: Agent[];
  tools: Tool[];
  isLoading: boolean;
  isToolsLoading: boolean;
  error: string | null;
  // Actions
  fetchAgents: () => Promise<void>;
  fetchTools: () => Promise<void>;
  runAgent: (name: string, inputText: string) => Promise<any>;
  createAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Agent>;
  updateAgent: (id: string, agent: Partial<Omit<Agent, 'id' | 'createdAt'>>) => void;
  duplicateAgent: (id: string) => Agent | null;
  deleteAgent: (id: string) => void;
  toggleAgentStatus: (id: string) => void;
  createCustomTool: (data: CustomToolFormData) => Tool;
  resetToDefaults: () => void;
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
            let rawModel = item.MODEL_STRING || 'gemini/gemini-2.5-pro';
            // Auto-migrate legacy agents missing the provider prefix
            if (!rawModel.includes('/')) {
              if (rawModel.startsWith('gpt')) rawModel = `openai/${rawModel}`;
              else if (rawModel.includes('llama') || rawModel.includes('mixtral')) rawModel = `groq/${rawModel}`;
              else rawModel = `gemini/${rawModel}`;
            }

            return {
              id: item.AGENT_NAME,
              name: item.AGENT_NAME,
              description: '',
              category: 'Custom',
              status: 'published',
              model: rawModel,
              systemPrompt: item.PROMPT || '',
              toolIds: item.SELECTED_TOOL_IDS || item.TOOL_NAMES || [],
              mcpServers: item.MCP_SERVERS || [],
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
          
          const selectedToolObjects = agentData.toolIds.map(id => get().tools.find(t => t.id === id)).filter(Boolean);
          const computedMcpServers = Array.from(new Set(selectedToolObjects.filter(t => t?.type === 'mcp' && t.mcp_server_id).map(t => t?.mcp_server_id as string)));

          const payload = {
            name: agentData.name,
            prompt: agentData.systemPrompt,
            model: agentData.model,
            tools: agentData.toolIds,
            mcp_servers: computedMcpServers,
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
        const now = new Date().toISOString();
        
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
          
          if (agentData.name) {
            // Optional: update the backend if it's a full update
            const selectedToolObjects = agentData.toolIds?.map(id => get().tools.find(t => t.id === id)).filter(Boolean) || [];
            const computedMcpServers = Array.from(new Set(selectedToolObjects.filter(t => t?.type === 'mcp' && t.mcp_server_id).map(t => t?.mcp_server_id as string)));

            const payload = {
              prompt: agentData.systemPrompt || '',
              model: agentData.model || '',
              tools: agentData.toolIds || [],
              mcp_servers: computedMcpServers,
            };
            
            await fetch(`${baseUrl}/agents/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          }
        } catch (error) {
          console.error('Error updating agent on backend:', error);
        }

        set((state) => ({
          agents: state.agents.map((ag) =>
            ag.id === id
              ? {
                  ...ag,
                  ...agentData,
                  updatedAt: now,
                }
              : ag
          ),
        }));
      },

      runAgent: async (name: string, inputText: string) => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${baseUrl}/agents/${encodeURIComponent(name)}/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: name, input_text: inputText }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to run agent');
        }
        
        return response.json();
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
          status: 'draft',
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
        const now = new Date().toISOString();
        set((state) => ({
          agents: state.agents.map((ag) => {
            if (ag.id === id) {
              const newStatus: AgentStatus = ag.status === 'published' ? 'draft' : 'published';
              return { ...ag, status: newStatus, updatedAt: now };
            }
            return ag;
          }),
        }));
      },

      createCustomTool: (data) => {
        const newToolId = `tool-custom-${Date.now()}`;
        const newTool: Tool = {
          id: newToolId,
          name: data.name,
          description: data.description,
          category: data.category || 'custom',
          iconName: 'Wrench',
          isCustom: true,
          endpointUrl: data.endpointUrl,
          httpMethod: data.httpMethod,
          schema: data.schema,
        };

        set((state) => ({
          tools: [...state.tools, newTool],
        }));

        return newTool;
      },

      resetToDefaults: () => {
        set({
          agents: [],
          tools: [],
        });
      },
}));
