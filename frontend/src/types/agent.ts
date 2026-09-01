export type AgentStatus = 'draft' | 'published';

export type AIModel = string;

export type ToolCategory = 'search' | 'scraping' | 'utility' | 'data' | 'communication' | 'custom';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  iconName: string; // Lucide icon identifier
  isCustom?: boolean;
  endpointUrl?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  schema?: string;
}

export interface McpServer {
  url: string;
  description?: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  status: AgentStatus;
  model: AIModel;
  maxTokens?: number;
  systemPrompt: string;
  toolIds: string[];
  mcpServers?: string[]; // Array of server URLs
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  avatarColor?: string; // Gradient accent class
}

export interface CustomToolFormData {
  name: string;
  description: string;
  category: ToolCategory;
  endpointUrl: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  schema: string;
}

export interface TestExecutionStep {
  id: string;
  type: 'prompt_prep' | 'tool_invocation' | 'tool_response' | 'llm_thinking' | 'final_output';
  title: string;
  details: string;
  timestamp: string;
  status: 'pending' | 'running' | 'success' | 'error';
  executionTimeMs?: number;
}
