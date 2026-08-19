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
      id: 'groq/llama3-70b-8192',
      name: 'Llama 3 70B',
      badge: 'Real-time',
      description: 'Ultra-fast Llama 3 execution running on Groq LPUs.',
      speed: 'Instant',
      cost: 'Economy'
    },
    {
      id: 'groq/mixtral-8x7b-32768',
      name: 'Mixtral 8x7B',
      description: 'Fast Mixture of Experts model optimized for speed.',
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
