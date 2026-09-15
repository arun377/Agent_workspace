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
  type: 'status' | 'tool_call' | 'tool_result' | 'token' | 'completed' | 'error' | 'step' | string;
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

export interface TraceTokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  [key: string]: any;
}

export interface TraceCost {
  total_cost?: number;
  prompt_cost?: number;
  completion_cost?: number;
  [key: string]: any;
}

export interface TraceTreeNode {
  id: string;
  name: string;
  run_type: 'chain' | 'llm' | 'tool' | 'retriever' | 'prompt' | string;
  status: 'success' | 'error' | string;
  start_time?: string;
  end_time?: string;
  latency_ms?: number;
  tokens?: TraceTokenUsage;
  cost?: TraceCost;
  total_cost?: number;
  inputs?: any;
  outputs?: any;
  error?: string | null;
  metadata?: Record<string, any>;
  children?: TraceTreeNode[];
}

export interface EvalDataItem {
  index: number;
  input: string;
  expected_output: string;
  expected_tools: string[];
  source: 'llm' | 'human';
  reviewed: boolean;
}

export interface EvalDataUpdateRequest {
  input?: string;
  expected_output?: string;
  expected_tools?: string[];
  reviewed?: boolean;
}

export interface EvalDataGenerateRequest {
  num_cases: number;
}

export interface EvalDataGenerateResponse {
  generated_count: number;
  total_count: number;
  file_path: string;
}

