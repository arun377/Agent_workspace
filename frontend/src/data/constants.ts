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
      id: 'gemini/gemini-1.5-pro-latest',
      name: 'Gemini 1.5 Pro (Latest)',
      badge: 'New',
      description: 'Latest Gemini 1.5 Pro model with high capabilities and multimodal reasoning.',
      speed: 'Fast',
      cost: 'Premium'
    },
    {
      id: 'gemini/gemini-1.5-flash-latest',
      name: 'Gemini 1.5 Flash (Latest)',
      badge: 'New',
      description: 'Latest Gemini 1.5 Flash for maximum speed and efficiency.',
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
    },
    {
      id: 'gemini/gemini-3.5-flash',
      name: 'Gemini 3.5 Flash',
      badge: 'Ultra Fast',
      description: 'Latest lightweight, ultra-low latency model ideal for high-frequency agent workflows.',
      speed: 'Blazing',
      cost: 'Economy'
    },
    {
      id: 'gemini/gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      badge: 'Recommended',
      description: 'Complex reasoning, 2M context window, high multimodal performance.',
      speed: 'Fast',
      cost: 'Balanced'
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
