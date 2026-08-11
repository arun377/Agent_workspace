import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Agent, Tool, CustomToolFormData, AgentStatus } from '../types/agent';
import { INITIAL_AGENTS, INITIAL_TOOLS } from '../data/mockData';

interface AgentState {
  agents: Agent[];
  tools: Tool[];
  // Actions
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
      agents: INITIAL_AGENTS,
      tools: INITIAL_TOOLS,

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
          agents: INITIAL_AGENTS,
          tools: INITIAL_TOOLS,
        });
      },
    }),
    {
      name: 'agent-studio-agents-storage-v2',
    }
  )
);
