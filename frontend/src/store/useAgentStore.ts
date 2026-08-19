import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Agent, Tool, CustomToolFormData, AgentStatus, AIModel, McpServer } from '../types/agent';

interface AgentState {
  agents: Agent[];
  tools: Tool[];
  mcpServers: McpServer[];
  isLoading: boolean;
  isToolsLoading: boolean;
  isMcpServersLoading: boolean;
  error: string | null;
  // Actions
  fetchAgents: () => Promise<void>;
  fetchTools: () => Promise<void>;
  fetchMcpServers: () => Promise<void>;
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

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agents: [],
      tools: [],
      mcpServers: [],
      isLoading: false,
      isToolsLoading: false,
      isMcpServersLoading: false,
      error: null,

      fetchAgents: async () => {
        set({ isLoading: true, error: null });
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
          const response = await fetch(`${baseUrl}/agents/`);
          if (!response.ok) throw new Error('Failed to fetch agents');
          const data = await response.json();
          
          const mappedAgents: Agent[] = data.map((item: any) => ({
            id: item.AGENT_NAME,
            name: item.AGENT_NAME,
            description: '',
            category: 'Custom',
            status: 'published',
            model: (item.MODEL_STRING || 'gemini-2.5-pro') as AIModel,
            systemPrompt: item.PROMPT || '',
            toolIds: item.TOOL_NAMES || [],
            mcpServers: item.MCP_SERVERS || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            avatarColor: AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)],
          }));

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
            id: item.name,
            name: item.name,
            description: item.description || `Tool: ${item.name}`,
            category: 'utility',
            iconName: 'Wrench',
          }));

          set({ tools: mappedTools, isToolsLoading: false });
        } catch (error: any) {
          console.error('Error fetching tools:', error);
          set({ error: error.message, isToolsLoading: false });
        }
      },

      fetchMcpServers: async () => {
        set({ isMcpServersLoading: true, error: null });
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
          const response = await fetch(`${baseUrl}/tools/mcp_servers`);
          if (!response.ok) throw new Error('Failed to fetch MCP servers');
          const data = await response.json();
          
          set({ mcpServers: data, isMcpServersLoading: false });
        } catch (error: any) {
          console.error('Error fetching MCP servers:', error);
          set({ error: error.message, isMcpServersLoading: false });
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
            mcp_servers: agentData.mcpServers || [],
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

      updateAgent: (id, agentData) => {
        const now = new Date().toISOString();
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
          mcpServers: [],
        });
      },
    }),
    {
      name: 'agent-studio-agents-storage-v2',
      partialize: (state) => ({
        // We only persist agents; tools and mcpServers should be fetched live
        agents: state.agents,
      }),
    }
  )
);
