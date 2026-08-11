import { Tool, Agent } from '../types/agent';

export const INITIAL_TOOLS: Tool[] = [
  {
    id: 'tool-duckduckgo',
    name: 'DuckDuckGo Web Search',
    description: 'Searches the live web for real-time information, news, and facts without tracking.',
    category: 'search',
    iconName: 'Search',
  },
  {
    id: 'tool-scraper',
    name: 'Web Content Scraper',
    description: 'Extracts clean Markdown and structured text from HTML webpage URLs.',
    category: 'scraping',
    iconName: 'Globe',
  },
  {
    id: 'tool-code-interpreter',
    name: 'Python Code Sandbox',
    description: 'Executes Python 3 scripts in a secure isolated sandbox for data analysis & math.',
    category: 'utility',
    iconName: 'Terminal',
  },
  {
    id: 'tool-gmail-connector',
    name: 'Gmail Workspace Sync',
    description: 'Drafts, searches, and reads emails directly via Google Workspace integration.',
    category: 'communication',
    iconName: 'Mail',
  },
  {
    id: 'tool-sql-executor',
    name: 'PostgreSQL Query Runner',
    description: 'Queries read-only SQL databases and formats structured result tables.',
    category: 'data',
    iconName: 'Database',
  },
  {
    id: 'tool-calculator',
    name: 'Scientific Math Engine',
    description: 'Evaluates complex numerical expressions, matrix math, and symbolic calculations.',
    category: 'utility',
    iconName: 'Calculator',
  },
  {
    id: 'tool-weather',
    name: 'OpenWeather Forecast',
    description: 'Fetches real-time temperature, atmospheric data, and 7-day global weather forecasts.',
    category: 'utility',
    iconName: 'CloudSun',
  },
  {
    id: 'tool-wikipedia',
    name: 'Wikipedia Knowledge Lookup',
    description: 'Retrieves article summaries, references, and structured entities from Wikipedia.',
    category: 'search',
    iconName: 'BookOpen',
  },
];

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: 'Customer Support Intelligence',
    description: 'Automated 24/7 technical support agent capable of checking docs and executing SQL queries.',
    category: 'Customer Support',
    status: 'published',
    model: 'gemini-2.5-pro',
    temperature: 0.3,
    maxTokens: 2048,
    systemPrompt: `You are a polite, expert Customer Support Agent for Agent Studio platform.
Your primary role is to assist users with technical inquiries, account configuration, and troubleshooting.

Variables available:
- User Query: {{user_query}}
- Customer Account ID: {{context}}

Always format response in clean Markdown with actionable steps.`,
    toolIds: ['tool-duckduckgo', 'tool-sql-executor', 'tool-gmail-connector'],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    avatarColor: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'agent-2',
    name: 'Market Intelligence & Competitor Analyst',
    description: 'Scrapes financial filings, industry news, and web trends to generate concise executive briefings.',
    category: 'Market Research',
    status: 'published',
    model: 'gemini-2.5-flash',
    temperature: 0.5,
    maxTokens: 4096,
    systemPrompt: `You are an elite Market Research Analyst.
Your goal is to aggregate real-time market data, scrape company landing pages, and analyze trends.

Input query: {{user_query}}
Context date: {{current_date}}

Provide bullet points highlighting Key Findings, Threats, and Strategic Opportunities.`,
    toolIds: ['tool-duckduckgo', 'tool-scraper', 'tool-wikipedia'],
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    avatarColor: 'from-purple-500 to-pink-600',
  },
  {
    id: 'agent-3',
    name: 'Full-Stack Code Reviewer & Auditor',
    description: 'Analyzes pull requests, runs static code execution, and suggests security & performance improvements.',
    category: 'Engineering',
    status: 'draft',
    model: 'claude-3-5-sonnet',
    temperature: 0.2,
    maxTokens: 4096,
    systemPrompt: `You are a Principal Software Engineer conducting code reviews.
Analyze the provided code snippets or user query: {{user_query}}.

Look for:
1. Security vulnerabilities
2. Performance bottlenecks
3. Type safety violations

Use the Python Code Sandbox when mathematical calculations or static analysis scripts are needed.`,
    toolIds: ['tool-code-interpreter', 'tool-duckduckgo'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    avatarColor: 'from-emerald-500 to-teal-600',
  },
];

export const CATEGORIES = [
  'All Categories',
  'Customer Support',
  'Market Research',
  'Engineering',
  'Productivity',
  'Data & Analytics',
  'Content Generation',
];

export const AI_MODELS_INFO = [
  {
    id: 'gemini-2.5-pro' as const,
    name: 'Gemini 2.5 Pro',
    provider: 'Google AI',
    badge: 'Recommended',
    description: 'Complex reasoning, 2M context window, high multimodal performance.',
    speed: 'Fast (1.1s avg)',
    cost: 'Balanced',
    recommendedTemp: 0.4,
  },
  {
    id: 'gemini-2.5-flash' as const,
    name: 'Gemini 2.5 Flash',
    provider: 'Google AI',
    badge: 'Ultra Fast',
    description: 'Lightweight, ultra-low latency model ideal for high-frequency agent workflows.',
    speed: 'Blazing (300ms avg)',
    cost: 'Economy',
    recommendedTemp: 0.5,
  },
  {
    id: 'gemini-2.0-flash' as const,
    name: 'Gemini 2.0 Flash',
    provider: 'Google AI',
    badge: 'Real-time',
    description: 'Next-gen real-time speed with native agent tool calling capabilities.',
    speed: 'Instant (200ms avg)',
    cost: 'Economy',
    recommendedTemp: 0.3,
  },
  {
    id: 'gpt-4o' as const,
    name: 'GPT-4o',
    provider: 'OpenAI',
    badge: 'Flagship',
    description: 'Omni-modal intelligence excels at conversational depth and structured output JSON.',
    speed: 'Fast (1.5s avg)',
    cost: 'Premium',
    recommendedTemp: 0.7,
  },
  {
    id: 'claude-3-5-sonnet' as const,
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    badge: 'Coding Specialist',
    description: 'State-of-the-art coding, logic reasoning, and architectural decision making.',
    speed: 'Fast (1.4s avg)',
    cost: 'Premium',
    recommendedTemp: 0.2,
  },
  {
    id: 'deepseek-r1' as const,
    name: 'DeepSeek R1',
    provider: 'DeepSeek AI',
    badge: 'Reasoning Engine',
    description: 'Chain-of-thought mathematical reasoning and step-by-step logic solver.',
    speed: 'Moderate (2.1s avg)',
    cost: 'Open Weights',
    recommendedTemp: 0.6,
  },
];
