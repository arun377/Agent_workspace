export type AgentStatus = 'published';

export type AIModel = string;

export type ToolCategory = 'search' | 'scraping' | 'utility' | 'data' | 'communication' | 'custom';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  iconName: string; // Lucide icon identifier
  type?: 'builtin' | 'mcp';
  mcp_server_id?: string | null;
  isCustom?: boolean;
  endpointUrl?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  schema?: string;
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

export interface AgentStreamEvent {
  type: 'status' | 'tool_call' | 'tool_result' | 'token' | 'completed' | 'error' | string;
  summary?: string;
  data?: {
    tool?: string;
    input?: any;
    output?: any;
    token?: string;
    final_answer?: string;
    session_id?: string;
    stderr?: string;
    [key: string]: any;
  };
  result?: any;
  status?: string;
  [key: string]: any;
}

export interface AgentRunOptions {
  sessionId?: string;
  onEvent?: (event: AgentStreamEvent) => void;
  signal?: AbortSignal;
}
