export type EvalType = 'non_deterministic' | 'deterministic';

export type DeterministicMetricKey = 'correctness' | 'tool_correctness';
export type NonDeterministicMetricKey = 'step_efficiency' | 'task_completion' | 'hallucination';

export type MetricKey = DeterministicMetricKey | NonDeterministicMetricKey;

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  description: string;
  defaultThreshold: number;
  evalType: EvalType;
}

export const METRIC_DEFINITIONS: Record<MetricKey, MetricDefinition> = {
  step_efficiency: {
    key: 'step_efficiency',
    label: 'Step Efficiency',
    description: 'Evaluates if the agent completed the task with minimal LLM calls and tools without looping or redundancy.',
    defaultThreshold: 0.5,
    evalType: 'non_deterministic',
  },
  task_completion: {
    key: 'task_completion',
    label: 'Task Completion',
    description: 'Verifies whether the agent fully satisfied all instructions and goals in the user prompt.',
    defaultThreshold: 0.7,
    evalType: 'non_deterministic',
  },
  hallucination: {
    key: 'hallucination',
    label: 'Hallucination Check',
    description: 'Checks if agent statements are factually grounded in context without fabricating information.',
    defaultThreshold: 0.5,
    evalType: 'non_deterministic',
  },
  correctness: {
    key: 'correctness',
    label: 'Output Correctness',
    description: 'Evaluates semantic and factual alignment of the output against the expected golden answer.',
    defaultThreshold: 0.3,
    evalType: 'deterministic',
  },
  tool_correctness: {
    key: 'tool_correctness',
    label: 'Tool Correctness',
    description: 'Validates that the exact tools expected were called with appropriate parameters.',
    defaultThreshold: 0.7,
    evalType: 'deterministic',
  },
};

export interface DeterministicEvalRequest {
  metrics: string[];
}

export interface NonDeterministicEvalRequest {
  inputs: string[];
  metrics: string[];
}

export interface EvalMetricResult {
  metric_name: string;
  score: number;
  threshold: number;
  passed: boolean;
  reason?: string | null;
}

export interface EvalCaseResult {
  agent_input: string;
  agent_output: string;
  expected_output?: string | null;
  metric_results: EvalMetricResult[];
}

export interface EvalReportResponse {
  agent_name: string;
  evaluation_type: EvalType;
  total_cases: number;
  all_passed: boolean;
  results: EvalCaseResult[];
}
