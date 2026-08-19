import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Agent, Tool, CustomToolFormData, AgentStatus, AIModel } from '../types/agent';

interface AgentState {
  agents: Agent[];
  tools: Tool[];
  isLoading: boolean;
  error: string | null;
  // Actions
  fetchAgents: () => Promise<void>;
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => Agent;
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
      isLoading: false,
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
            model: (item.MODEL_STRING || 'gpt-4o') as AIModel,
            temperature: 0.3,
            systemPrompt: item.PROMPT || '',
            toolIds: item.TOOL_NAMES || [],
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

      addAgent: (agentData) => {
        const now = new Date().toISOString();
        const id = `agent-${Date.now()}`;
        const randomGradient = AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];

        const newAgent: Agent = {
          ...agentData,
          id,
          createdAt: now,
          updatedAt: now,
          avatarColor: agentData.avatarColor || randomGradient,
        };

        set((state) => ({
          agents: [newAgent, ...state.agents],
        }));

        return newAgent;
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
        });
      },
    }),
    {
      name: 'agent-studio-agents-storage-v2',
    }
  )
);
