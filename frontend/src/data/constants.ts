export const CATEGORIES = [
  'All Categories',
  'Customer Support',
  'Market Research',
  'Engineering',
  'Productivity',
  'Data & Analytics',
  'Content Generation',
];

export interface ModelInfo {
  id: string;
  name: string;
  badge?: string;
  description: string;
  speed: string;
  cost: string;
}

export const AI_MODELS_INFO: Record<string, ModelInfo[]> = {
  "Google Gemini": [
    {
      id: 'gemini/gemini-3.8-flash',
      name: 'Gemini 3.8 Flash',
      badge: 'Reasoning',
      description: 'Next-gen Gemini 3 flagship model with native reasoning, high multimodal intelligence, and fast latency.',
      speed: 'Blazing',
      cost: 'Balanced'
    },
    {
      id: 'gemini/gemini-3.8-live-extended-thinking',
      name: 'Gemini 3.8 Live Extended Thinking',
      badge: 'Extended Thinking',
      description: 'Real-time reasoning model featuring extended thinking tokens for complex multi-step problems and deep logic.',
      speed: 'Fast',
      cost: 'Balanced'
    },
    {
      id: 'gemini/gemini-3.7-flash',
      name: 'Gemini 3.7 Flash',
      badge: 'Thinking / Hybrid',
      description: 'First hybrid reasoning model with dynamically controllable thinking depth and rapid tool orchestration.',
      speed: 'Fast',
      cost: 'Balanced'
    },
    {
      id: 'gemini/gemini-3.1-pro-preview',
      name: 'Gemini 3.1 Pro',
      badge: 'Complex Reasoning',
      description: 'Frontier reasoning model built for intricate multi-step problem solving, math, and code synthesis.',
      speed: 'Balanced',
      cost: 'Premium'
    },
    {
      id: 'gemini/gemini-3.5-flash-lite',
      name: 'Gemini 3.5 Flash-Lite',
      badge: 'Lite',
      description: 'Ultra-lightweight model engineered for minimal latency and maximum cost-efficiency in high-throughput agents.',
      speed: 'Blazing',
      cost: 'Economy'
    },
    {
      id: 'gemini/gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash-Lite',
      badge: 'Lite',
      description: 'High-throughput lightweight model tailored for cost-effective, high-frequency tool executions.',
      speed: 'Blazing',
      cost: 'Economy'
    },
    {
      id: 'gemini/gemma-4-31b-it',
      name: 'Gemma 4 31B IT',
      badge: 'Open Weights',
      description: 'State-of-the-art open weights model for complex reasoning and agentic tasks.',
      speed: 'Fast',
      cost: 'Free'
    }
  ],
  "OpenAI": [
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      badge: 'Flagship',
      description: 'Omni-modal intelligence excels at conversational depth and structured output JSON.',
      speed: 'Fast',
      cost: 'Premium'
    },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Cost-efficient and fast model for lightweight tasks.',
      speed: 'Fast',
      cost: 'Economy'
    }
  ],
  "Groq": [
    {
      id: 'groq/openai/gpt-oss-20b',
      name: 'GPT OSS 20B',
      badge: 'Fast',
      description: 'Efficient open source GPT variant.',
      speed: 'Instant',
      cost: 'Economy'
    },
    {
      id: 'groq/openai/gpt-oss-120b',
      name: 'GPT OSS 120B',
      badge: 'Powerful',
      description: 'High capacity open source GPT model.',
      speed: 'Fast',
      cost: 'Standard'
    },
    {
      id: 'groq/qwen/qwen3.6-27b',
      name: 'Qwen 3.6 27B',
      description: 'Highly capable reasoning model.',
      speed: 'Instant',
      cost: 'Economy'
    },
    {
      id: 'groq/minimaxai/minimax-m2.7',
      name: 'MiniMax M2.7',
      description: 'Advanced local/remote hybrid model.',
      speed: 'Instant',
      cost: 'Economy'
    }
  ],
  "Ollama": [
    {
      id: 'ollama/llama3',
      name: 'Llama 3 (Local)',
      badge: 'Local',
      description: 'Local execution of Llama 3 without data leaving your machine.',
      speed: 'Hardware Dependent',
      cost: 'Free'
    },
    {
      id: 'ollama/mistral',
      name: 'Mistral (Local)',
      description: 'Local execution of the 7B Mistral model.',
      speed: 'Hardware Dependent',
      cost: 'Free'
    }
  ]
};
