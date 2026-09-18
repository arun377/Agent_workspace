# Implementation Plan: Trajectory-Based Metrics + Agent-Agnostic Evaluation

## Project Context (Read First)

This is an AI Agent Builder platform. Users create LangGraph-based agents through a UI, run them, and evaluate them. The evaluation system has two types:

- **Deterministic Evaluation**: Uses a pre-reviewed dataset (`eval_data.json`). Agent runs against known inputs with expected outputs. Metrics: `correctness`, `tool_correctness`.
- **Non-Deterministic Evaluation**: Runs the agent on ad-hoc inputs at runtime. No expected output needed. Current metrics: `task_completion`, `hallucination`.

**Goal of this plan**: Add trajectory-based metrics (`step_efficiency`, `agent_loop_detection`) to the **non-deterministic evaluation only**, by pulling the agent's execution trace from LangSmith. Keep everything else exactly as it is.

---

## Current Architecture (Existing, DO NOT BREAK)

```
app/
├── api/routes/
│   ├── agent.py          → eval-data CRUD + generate endpoints
│   └── eval.py           → POST /evaluate/deterministic and /evaluate/non-deterministic
├── services/
│   ├── agent_runner.py   → runs agent.py subprocess, returns final answer
│   ├── agent_streamer.py → streams agent.py subprocess events via SSE (for live UI)
│   ├── eval_adaptor.py   → wraps agent_runner into a callable for the evaluator
│   ├── metric_registry.py → builds DeepEval metric objects
│   └── trace_service.py  → fetches LangSmith trace tree (ALREADY WORKS)
├── schemas/
│   └── eval.py           → Pydantic models for eval requests/responses
└── templates/
    └── agent_template.py.jinja  → Jinja template for generated agent scripts

Agent_evaluator/     ← EXTERNAL REPO developed by teammate (installed in .venv: evaluator.generator, evaluator.runner, evaluator.report). DO NOT TOUCH OR RECREATE IN THIS WORKSPACE.
app/services/
├── trace_converter.py ← NEW (LangSmith → DeepEval format)
└── eval_runner.py     ← NEW (Evaluates agent with trajectory attached)
```

### Key File: `app/services/trace_service.py` (DO NOT MODIFY)
Already implemented. Call it like this:
```python
from app.services.trace_service import fetch_langsmith_trace_tree
import datetime

tree = fetch_langsmith_trace_tree(
    agent_name="my_agent",
    start_time=datetime.datetime(2024, 1, 1, 12, 0, 0)
)
# Returns: nested dict with keys: name, run_type, inputs, outputs, children, start_time, end_time, status
# Returns None if LangSmith is not configured or trace not found
```

### Key File: `app/services/agent_runner.py` (DO NOT MODIFY)
Runs agent as subprocess. Returns:
```python
{"status": "success", "result": {"answer": "...", "session_id": "..."}}
# or
{"status": "error", "result": "error message"}
```

### Key File: `app/services/eval_adaptor.py` (MODIFY - see below)
Currently wraps `agent_runner` into a callable. Returns `{"output": ..., "execution_trace": [], "context": []}`.

### Key File: `app/services/metric_registry.py` (MODIFY - see below)
Builds DeepEval metric objects. Two functions: `build_deterministic_metrics()` and `build_non_deterministic_metrics()`.

### Key File: `app/api/routes/eval.py` (MODIFY - see below)
Two route handlers: `evaluate_deterministic` and `evaluate_non_deterministic`.

---

## What DeepEval Needs for Trajectory Metrics

Verified by reading DeepEval source code. Here is the exact contract:

**1. `StepEfficiencyMetric` and `AgentLoopDetectionMetric` read `test_case._trace_dict`.**

```python
# From deepeval/metrics/step_efficiency/step_efficiency.py line 156:
trace_json_str = serialize_to_json(test_case._trace_dict, indent=2)

# From deepeval/metrics/agent_loop_detection/agent_loop_detection.py line 212:
if test_case._trace_dict is None:
    self.score = 0.0
    self.reason = "No trace data found. This metric requires trace data from @observe."
```

**2. `_trace_dict` is a private attribute on `LLMTestCase` (line 425 in llm_test_case.py):**
```python
_trace_dict: Optional[Dict] = PrivateAttr(default=None)
```
Set it directly: `test_case._trace_dict = my_dict`

**3. The exact dict shape DeepEval expects for `_trace_dict`:**
```json
{
  "name": "agent_name",
  "type": "agent",
  "input": {"input": "user query"},
  "output": "final answer text",
  "children": [
    {
      "name": "ChatLiteLLM",
      "type": "llm",
      "input": {"messages": [...]},
      "output": "I will call a tool...",
      "children": []
    },
    {
      "name": "firecrawl_search",
      "type": "tool",
      "input": {"inputParameters": {"query": "renewable energy"}},
      "output": "search result text here",
      "children": []
    }
  ]
}
```

**4. LangSmith returns different field names. We must map them:**

| LangSmith field | DeepEval `_trace_dict` field |
|----------------|------------------------------|
| `run_type`     | `type`                       |
| `inputs`       | `input`                      |
| `outputs`      | `output`                     |
| `name`         | `name` (same)                |
| `children`     | `children` (same)            |
| `status`       | not needed                   |
| `latency_ms`   | not needed                   |

**5. Metrics with `requires_trace = True` (confirmed in source):**
- `StepEfficiencyMetric` — checks if agent took unnecessary steps
- `AgentLoopDetectionMetric` — checks if agent got stuck in loops
- `PlanAdherenceMetric` — checks if agent followed its plan
- `PlanQualityMetric` — checks if agent's plan was good
- `TaskCompletionMetric` — also has `requires_trace = True` but does NOT read `_trace_dict` in its own logic (it just signals it can use it)

**6. Metrics WITHOUT `requires_trace` (no trajectory needed):**
- `HallucinationMetric`
- `GEval` (used for correctness)
- `ToolCorrectnessMetric`

---

## Files to Create

---

### FILE 1: `app/services/trace_converter.py` [NEW]

**Purpose**: Convert LangSmith's trace tree format into DeepEval's `_trace_dict` format.

**Why this is needed**: LangSmith uses `run_type`, `inputs`, `outputs`. DeepEval expects `type`, `input`, `output`.

```python
"""
Converts a LangSmith trace tree (from trace_service.fetch_langsmith_trace_tree)
into the nested dict format expected by DeepEval's _trace_dict private attribute.

LangSmith tree node fields (from trace_service.py):
  - name: str
  - run_type: str  ("chain", "llm", "tool", "retriever")
  - inputs: dict or None
  - outputs: dict or None
  - children: list of child nodes
  - status: str
  - latency_ms: int

DeepEval _trace_dict expected fields (from llm_test_case.py + step_efficiency templates):
  - name: str
  - type: str  ("agent", "llm", "tool", "retriever")
  - input: dict or None
  - output: str or dict or None
  - children: list
"""
from typing import Optional, Dict, Any


# Map LangSmith run_type values to DeepEval type values
_RUN_TYPE_MAP = {
    "chain": "agent",   # LangGraph chain = agent in DeepEval
    "llm": "llm",
    "tool": "tool",
    "retriever": "retriever",
}


def convert_langsmith_tree_to_trace_dict(
    node: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Recursively converts one LangSmith tree node and its children
    into DeepEval _trace_dict format.

    Args:
        node: A dict as returned by fetch_langsmith_trace_tree().
              Contains: name, run_type, inputs, outputs, children, status, etc.

    Returns:
        A dict with keys: name, type, input, output, children
        ready to assign to test_case._trace_dict
    """
    run_type = node.get("run_type", "chain")
    deepeval_type = _RUN_TYPE_MAP.get(run_type, "agent")

    # Extract output as a clean string or dict
    outputs = node.get("outputs")
    if isinstance(outputs, dict):
        # LangSmith wraps outputs — unwrap common patterns
        output_val = (
            outputs.get("output")
            or outputs.get("answer")
            or outputs.get("messages")
            or outputs
        )
    else:
        output_val = outputs

    converted = {
        "name": node.get("name", "unknown"),
        "type": deepeval_type,
        "input": node.get("inputs"),
        "output": output_val,
        "children": [
            convert_langsmith_tree_to_trace_dict(child)
            for child in (node.get("children") or [])
        ],
    }

    # Remove None values to keep the dict clean
    return {k: v for k, v in converted.items() if v is not None or k == "children"}
```

---

### FILE 2: `app/services/eval_runner.py` [NEW]

**Purpose**: The core evaluation runner with trajectory support. Called by `eval.py` route for non-deterministic evaluation. Takes an `agent_fn`, runs it against test cases, fetches LangSmith trajectory ONCE per case (if any metric needs it), attaches it to `test_case._trace_dict`, and measures all metrics against the same test case.

**Critical design rules**:
- Agent runs ONCE per test case
- LangSmith trajectory is fetched ONCE per test case (not once per metric)
- If LangSmith is unavailable, trajectory metrics are SKIPPED with a clear reason (no crash)
- Uses `evaluator.report.EvalReport` and `MetricResult` from the teammate's external `evaluator` package (with local fallback if needed)
- 100% agent-agnostic: accepts any `agent_fn(input_text) -> dict`, whether Jinja-based internal agent or external HTTP API agent

```python
"""
Core evaluation runner with trajectory support.
Agent-agnostic: only requires a callable agent_fn(input_text: str) -> dict.
The dict must have at least: {"output": str}
Optionally: {"start_time": datetime, "agent_name": str, "context": list, "tool_calls": list}
"""
import datetime
from typing import Callable, List, Optional, Any

from deepeval.test_case import LLMTestCase, ToolCall

# Reuse dataclasses from external evaluator package if available
try:
    from evaluator.report import EvalReport, MetricResult
except ImportError:
    from dataclasses import dataclass, field

    @dataclass
    class MetricResult:
        metric_name: str
        score: float
        threshold: float
        passed: bool
        reason: Optional[str] = None

    @dataclass
    class EvalReport:
        agent_input: str
        agent_output: str
        metric_results: List[MetricResult] = field(default_factory=list)
        expected_output: Optional[str] = None

        @property
        def all_passed(self) -> bool:
            return all(m.passed for m in self.metric_results)

from app.services.trace_converter import convert_langsmith_tree_to_trace_dict


def _needs_trace(metrics: list) -> bool:
    """Check if any metric requires trajectory data."""
    return any(getattr(m, "requires_trace", False) for m in metrics)


def _fetch_trace_dict(
    agent_name: str,
    start_time: datetime.datetime,
) -> Optional[dict]:
    """
    Fetch trajectory from LangSmith and convert to DeepEval format.
    Returns None if LangSmith is not configured or trace not found.
    """
    try:
        from app.services.trace_service import fetch_langsmith_trace_tree
        langsmith_tree = fetch_langsmith_trace_tree(
            agent_name=agent_name,
            start_time=start_time
        )
        if langsmith_tree is None:
            return None
        return convert_langsmith_tree_to_trace_dict(langsmith_tree)
    except Exception:
        return None


def evaluate_agent_with_trace(
    agent_fn: Callable[[str], dict],
    test_cases: List[Any],
    metrics: list,
) -> List[EvalReport]:
    """
    Run evaluation for a list of test cases with trajectory support.

    Args:
        agent_fn: Callable that takes input_text (str) and returns a dict with:
                  - "output": str          (required) the agent's answer
                  - "start_time": datetime (optional) when agent run started
                  - "agent_name": str      (optional) for LangSmith lookup
                  - "context": list[str]   (optional) retrieved context chunks
                  - "tool_calls": list     (optional) executed tool calls

        test_cases: List of dicts or items with:
                    - "input": str          (required) the user question
                    - "expected_output": str or None
                    - "expected_tools": list (optional)

        metrics: List of instantiated DeepEval metric objects.
                 Mix of trajectory and non-trajectory metrics is supported.

    Returns:
        List of EvalReport, one per test case.
    """
    reports = []
    requires_trace = _needs_trace(metrics)

    for item in test_cases:
        if isinstance(item, dict):
            input_text = item.get("input", "")
            expected_output = item.get("expected_output")
            raw_expected_tools = item.get("expected_tools", [])
        else:
            input_text = getattr(item, "input", "")
            expected_output = getattr(item, "expected_output", None)
            raw_expected_tools = getattr(item, "expected_tools", []) or []

        # --- STEP 1: Run the agent (ONCE per test case) ---
        try:
            result = agent_fn(input_text)
        except Exception as e:
            # Agent crashed — record all metrics as failed with reason
            reports.append(EvalReport(
                agent_input=input_text,
                agent_output=f"[AGENT ERROR]: {str(e)}",
                expected_output=expected_output,
                metric_results=[
                    MetricResult(
                        metric_name=getattr(m, "__name__", type(m).__name__),
                        score=0.0,
                        threshold=getattr(m, "threshold", 0.5),
                        passed=False,
                        reason=f"Agent execution failed: {str(e)}"
                    )
                    for m in metrics
                ]
            ))
            continue

        actual_output = result.get("output", "") if isinstance(result, dict) else str(result)
        start_time = result.get("start_time") if isinstance(result, dict) else None
        agent_name = result.get("agent_name", "unknown") if isinstance(result, dict) else "unknown"
        raw_context = result.get("context", []) if isinstance(result, dict) else []
        tool_calls = result.get("tool_calls", []) if isinstance(result, dict) else []

        # Defend against HallucinationMetric crashing on empty context
        valid_contexts = [str(c) for c in raw_context if str(c).strip()] if isinstance(raw_context, list) else []
        if not valid_contexts:
            valid_contexts = ["No external tool context was retrieved during execution."]

        # --- STEP 2: Fetch trajectory from LangSmith (ONCE per test case) ---
        trace_dict = None
        trace_error = None

        if requires_trace:
            if start_time is not None:
                trace_dict = _fetch_trace_dict(agent_name, start_time)
                if trace_dict is None:
                    trace_error = (
                        "Trajectory not available. "
                        "Ensure LANGCHAIN_TRACING_V2=true and LANGCHAIN_API_KEY is set in .env."
                    )
            else:
                trace_error = (
                    "agent_fn did not return 'start_time'. "
                    "Ensure eval_adaptor.py includes start_time in the return dict."
                )

        # Clean tool names and build ToolCall objects if needed
        tools_called = [
            ToolCall(
                name=tc.get("name", "").split(":")[-1].strip(),
                input_parameters=tc.get("args") or tc.get("input_parameters") or {}
            )
            for tc in tool_calls
            if isinstance(tc, dict)
        ]

        expected_tools = [
            ToolCall(
                name=(t if isinstance(t, str) else t.get("name", "")).split(":")[-1].strip(),
                input_parameters=t.get("args", {}) if isinstance(t, dict) else {}
            )
            for t in (raw_expected_tools or [])
        ]

        # --- STEP 3: Build LLMTestCase (shared across ALL metrics) ---
        test_case = LLMTestCase(
            input=input_text,
            actual_output=actual_output,
            expected_output=expected_output if expected_output else None,
            tools_called=tools_called,
            expected_tools=expected_tools,
            context=valid_contexts,
        )

        # Attach trajectory to test case ONCE — all metrics share this
        if trace_dict is not None:
            test_case._trace_dict = trace_dict

        # --- STEP 4: Run all metrics against the same test case ---
        metric_results = []
        for metric in metrics:
            metric_needs_trace = getattr(metric, "requires_trace", False)

            # Skip trajectory metric if trace unavailable — do not crash
            if metric_needs_trace and trace_dict is None:
                metric_results.append(MetricResult(
                    metric_name=getattr(metric, "__name__", type(metric).__name__),
                    score=0.0,
                    threshold=getattr(metric, "threshold", 0.5),
                    passed=False,
                    reason=f"[SKIPPED] {trace_error}"
                ))
                continue

            try:
                metric.measure(test_case)
                metric_results.append(MetricResult(
                    metric_name=getattr(metric, "__name__", type(metric).__name__),
                    score=float(metric.score),
                    threshold=float(metric.threshold),
                    passed=bool(metric.success if hasattr(metric, "success") else metric.score >= metric.threshold),
                    reason=getattr(metric, "reason", None)
                ))
            except Exception as e:
                metric_results.append(MetricResult(
                    metric_name=getattr(metric, "__name__", type(metric).__name__),
                    score=0.0,
                    threshold=getattr(metric, "threshold", 0.5),
                    passed=False,
                    reason=f"[ERROR] Metric measurement failed: {str(e)}"
                ))

        reports.append(EvalReport(
            agent_input=input_text,
            agent_output=actual_output,
            expected_output=expected_output,
            metric_results=metric_results
        ))

    return reports
```

---

## Files to Modify

---

### MODIFY 1: `app/services/eval_adaptor.py`

**What changes and why**: Add `start_time` and `agent_name` to the return dict. The `app/services/eval_runner.py` needs these to fetch the LangSmith trace for that specific agent run.

```python
# app/services/eval_adaptor.py
import datetime
from datetime import timezone
from app.services.agent_runner import run_agent


def make_agent_fn(agent_name: str):
    """
    Returns a callable agent_fn compatible with app/services/eval_runner.py.
    
    The returned function:
    - Records start_time before running the agent (needed for LangSmith lookup)
    - Runs the agent subprocess via agent_runner.run_agent()
    - Returns dict with output, start_time, agent_name, context
    
    This is the INTERNAL agent adapter.
    For external agents, create a similar wrapper that calls the external API.
    """
    def agent_fn(input_text: str) -> dict:
        # Record start time BEFORE running agent — used to find the LangSmith trace
        start_time = datetime.datetime.now(timezone.utc)

        result = run_agent(name=agent_name, input_text=input_text)

        # Raise if agent script failed
        if result.get("status") == "error":
            raise RuntimeError(f"Agent execution failed: {result.get('result')}")

        agent_result = result.get("result", "")

        if isinstance(agent_result, dict):
            output_text = agent_result.get("answer", str(agent_result))
            context = agent_result.get("context", [])
        else:
            output_text = str(agent_result)
            context = []

        return {
            "output": output_text,
            "start_time": start_time,    # NEW: used by runner.py for LangSmith lookup
            "agent_name": agent_name,    # NEW: used by runner.py for LangSmith lookup
            "context": context,
        }

    return agent_fn
```

---

### MODIFY 2: `app/services/metric_registry.py`

**What changes and why**: Add `step_efficiency` and `agent_loop_detection` to `build_non_deterministic_metrics()`. Keep all existing metrics exactly as they are.

Replace the entire file with:

```python
import os
from litellm import completion, acompletion
from deepeval.models.base_model import DeepEvalBaseLLM
from deepeval.metrics import (
    TaskCompletionMetric,
    GEval,
    ToolCorrectnessMetric,
    HallucinationMetric,
)
from deepeval.metrics.step_efficiency import StepEfficiencyMetric
from deepeval.metrics.agent_loop_detection import AgentLoopDetectionMetric
from deepeval.test_case import LLMTestCaseParams


class LiteLLMGeneratorModel(DeepEvalBaseLLM):
    def __init__(self, model_string: str = "groq/openai/gpt-oss-120b"):
        self.model_string = model_string

    def load_model(self):
        return self

    def generate(self, prompt: str) -> str:
        response = completion(
            model=self.model_string,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

    async def a_generate(self, prompt: str) -> str:
        response = await acompletion(
            model=self.model_string,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

    def get_model_name(self) -> str:
        return self.model_string


def get_default_judge_model() -> LiteLLMGeneratorModel:
    return LiteLLMGeneratorModel()


def build_deterministic_metrics(metric_names: list[str], judge_model) -> list:
    """
    Build metrics for deterministic evaluation.
    These metrics use expected_output from the eval dataset.
    DO NOT add trajectory-based metrics here.
    """
    available = {
        "correctness": lambda: GEval(
            name="Correctness",
            criteria=(
                "Evaluate whether 'actual_output' is factually consistent with "
                "the core information or intent in 'expected_output'. Minor differences "
                "in tone, formatting, or extra helpful details should not be penalized."
            ),
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.ACTUAL_OUTPUT,
                LLMTestCaseParams.EXPECTED_OUTPUT,
            ],
            threshold=0.3,
            model=judge_model,
        ),
        "tool_correctness": lambda: ToolCorrectnessMetric(
            threshold=0.7,
            model=judge_model
        ),
    }
    return [available[name]() for name in metric_names if name in available]


def build_non_deterministic_metrics(metric_names: list[str], judge_model) -> list:
    """
    Build metrics for non-deterministic (runtime) evaluation.
    
    Metrics marked with requires_trace=True need LangSmith trajectory.
    The runner will fetch the trajectory automatically if needed.
    
    To add a new metric in the future:
    1. Add it to the 'available' dict below.
    2. If it needs trajectory, ensure requires_trace=True is set on the metric object
       (DeepEval sets this internally — you don't need to do it manually).
    3. No other files need to change.
    """
    available = {
        # --- Existing metrics (no trajectory needed) ---
        "task_completion": lambda: TaskCompletionMetric(
            threshold=0.7,
            model=judge_model
        ),
        "hallucination": lambda: HallucinationMetric(
            threshold=0.5,
            model=judge_model
        ),

        # --- NEW: Trajectory-based metrics ---
        # These automatically get trajectory from LangSmith via runner.py
        # Agent runs ONCE. Trajectory is fetched ONCE. Shared with all metrics.
        "step_efficiency": lambda: StepEfficiencyMetric(
            threshold=0.5,
            model=judge_model,
            async_mode=False   # Use sync mode for compatibility with our runner
        ),
        "agent_loop_detection": lambda: AgentLoopDetectionMetric(
            threshold=0.5,
        ),
    }

    metrics = []
    for name in metric_names:
        if name in available:
            metrics.append(available[name]())
        else:
            raise ValueError(
                f"Unknown non-deterministic metric: '{name}'. "
                f"Available: {list(available.keys())}"
            )
    return metrics
```

---

### MODIFY 3: `app/api/routes/eval.py`

**What changes and why**: The route currently imports from `evaluator.runner` (which doesn't exist yet — creating it in FILE 3). The return mapping logic needs to handle the new `EvalReport` and `MetricResult` dataclasses from the runner. The existing deterministic route stays exactly the same.

```python
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

from app.schemas.eval import (
    DeterministicEvalRequest,
    NonDeterministicEvalRequest,
    EvalReportResponse,
    EvalCaseResult,
    EvalMetricResult,
)
from app.services.eval_adaptor import make_agent_fn
from app.services.metric_registry import (
    build_deterministic_metrics,
    build_non_deterministic_metrics,
    get_default_judge_model
)
from app.services.eval_runner import evaluate_agent_with_trace

router = APIRouter(prefix="/agents", tags=["eval"])


@router.post("/{name}/evaluate/deterministic", response_model=EvalReportResponse)
def evaluate_deterministic(name: str, request: DeterministicEvalRequest):
    """
    Deterministic evaluation: runs agent against reviewed test cases from eval_data.json.
    Uses expected_output for comparison. Metrics: correctness, tool_correctness.
    Only test cases with reviewed=True and a non-empty expected_output are used.
    Trajectory is NOT used in deterministic evaluation.
    """
    eval_file = Path("generated_agents") / name / "eval_data.json"
    if not eval_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No eval dataset found for agent '{name}'"
        )

    raw_data = json.loads(eval_file.read_text())
    approved_cases = [
        item for item in raw_data
        if isinstance(item, dict)
        and item.get("reviewed") is True
        and item.get("expected_output")
    ]

    if not approved_cases:
        raise HTTPException(
            status_code=400,
            detail=(
                "No reviewed test cases found. "
                "Please approve cases (reviewed: true) via PATCH before running deterministic evaluation."
            )
        )

    judge_model = get_default_judge_model()
    metrics = build_deterministic_metrics(request.metrics, judge_model)
    agent_fn = make_agent_fn(name)

    reports = evaluate_agent_with_trace(agent_fn, approved_cases, metrics)

    results = [
        EvalCaseResult(
            agent_input=r.agent_input,
            agent_output=r.agent_output,
            expected_output=r.expected_output,
            metric_results=[
                EvalMetricResult(
                    metric_name=m.metric_name,
                    score=m.score,
                    threshold=m.threshold,
                    passed=m.passed,
                    reason=m.reason
                )
                for m in r.metric_results
            ]
        )
        for r in reports
    ]

    return EvalReportResponse(
        agent_name=name,
        evaluation_type="deterministic",
        total_cases=len(results),
        all_passed=all(case.all_passed for case in results),
        results=results
    )


@router.post("/{name}/evaluate/non-deterministic", response_model=EvalReportResponse)
def evaluate_non_deterministic(name: str, request: NonDeterministicEvalRequest):
    """
    Non-deterministic evaluation: runs agent live on ad-hoc inputs.
    No expected_output needed. Metrics: task_completion, hallucination,
    step_efficiency (trajectory-based), agent_loop_detection (trajectory-based).
    
    For trajectory-based metrics to work:
    - LANGCHAIN_TRACING_V2=true must be set in .env
    - LANGCHAIN_API_KEY must be set in .env
    If not configured, trajectory metrics are skipped with a clear reason (no crash).
    """
    test_cases = [
        {"input": inp, "expected_output": None}
        for inp in request.inputs
    ]

    judge_model = get_default_judge_model()
    metrics = build_non_deterministic_metrics(request.metrics, judge_model)
    agent_fn = make_agent_fn(name)

    reports = evaluate_agent_with_trace(agent_fn, test_cases, metrics)

    results = [
        EvalCaseResult(
            agent_input=r.agent_input,
            agent_output=r.agent_output,
            expected_output=None,
            metric_results=[
                EvalMetricResult(
                    metric_name=m.metric_name,
                    score=m.score,
                    threshold=m.threshold,
                    passed=m.passed,
                    reason=m.reason
                )
                for m in r.metric_results
            ]
        )
        for r in reports
    ]

    return EvalReportResponse(
        agent_name=name,
        evaluation_type="non_deterministic",
        total_cases=len(results),
        all_passed=all(case.all_passed for case in results),
        results=results
    )
```

---

## Files That Do NOT Change

| File | Why untouched |
|------|---------------|
| `Agent_evaluator/*` | External package (`evaluator.generator`, `evaluator.runner`, `evaluator.report`) developed by a teammate, already installed in `.venv`. 100% untouched. DO NOT create any `evaluator/` directory in `Agent_workspace`. |
| `app/api/routes/agent.py` | 100% untouched. Eval-data CRUD routes and golden generation routes remain unchanged. |
| `app/services/agent_runner.py` | Trajectory comes from LangSmith, not stdout |
| `app/services/agent_streamer.py` | Not involved in evaluation |
| `app/services/trace_service.py` | Already correct and working |
| `app/schemas/eval.py` | Schemas already support all fields |
| `app/templates/agent_template.py.jinja` | Agent code is unchanged |

---

## Final File Tree After Implementation

```
app/services/
├── trace_converter.py             ← NEW (LangSmith → DeepEval format)
├── eval_runner.py                 ← NEW (core evaluation loop with trajectory)
├── eval_adaptor.py                ← MODIFIED (add start_time, agent_name to return)
└── metric_registry.py             ← MODIFIED (add step_efficiency, agent_loop_detection)

app/api/routes/
└── eval.py                        ← MODIFIED (uses evaluate_agent_with_trace for non-deterministic)
```

---

## How One Request Flows End-to-End

```
POST /agents/my_agent/evaluate/non-deterministic
Body: {"inputs": ["What is renewable energy?"], "metrics": ["task_completion", "step_efficiency"]}

  1. eval.py handler
     ├── Builds metrics: [TaskCompletionMetric, StepEfficiencyMetric]
     ├── Gets agent_fn = make_agent_fn("my_agent")
     └── Calls evaluate_agent_with_trace(agent_fn, test_cases=[{"input": "What is renewable energy?"}], metrics)

  2. eval_runner.py :: evaluate_agent_with_trace()
     For test case "What is renewable energy?":
     │
     ├── STEP 1: start_time = 2024-01-01T12:00:00Z (recorded before run)
     │          result = agent_fn("What is renewable energy?")
     │          → subprocess runs agent.py
     │          → actual_output = "Renewable energy comes from natural sources..."
     │
     ├── STEP 2: requires_trace = True (StepEfficiencyMetric has requires_trace=True)
     │          → fetch_langsmith_trace_tree("my_agent", start_time=2024-01-01T12:00:00Z)
     │          → convert_langsmith_tree_to_trace_dict(langsmith_tree)
     │          → trace_dict = {"name": "LangGraph", "type": "agent", "input": {...}, "children": [...]}
     │
     ├── STEP 3: test_case = LLMTestCase(
     │              input="What is renewable energy?",
     │              actual_output="Renewable energy comes from natural sources..."
     │          )
     │          test_case._trace_dict = trace_dict   ← attached ONCE
     │
     ├── STEP 4a: TaskCompletionMetric.measure(test_case) → score: 0.9, passed: True
     └── STEP 4b: StepEfficiencyMetric.measure(test_case) → reads _trace_dict → score: 0.75, passed: True

  3. eval.py maps EvalReport → EvalCaseResult → EvalReportResponse
  4. Returns JSON to frontend
```

---

## Future: External Agent Support

This is NOT part of the current implementation. Document it here for future reference.

### When to use external agent support
When evaluating an agent that is NOT built with our Jinja template — for example:
- An agent built by another team on a different server
- An agent written in a different language
- An agent exposed as an HTTP API

### How to plug in an external agent

The `app/services/eval_runner.py` only needs an `agent_fn(input_text) -> dict`. You create a wrapper for the external agent:

```python
# Future: external_adaptor.py (not built yet)
import requests
import datetime
from datetime import timezone

def make_external_agent_fn(api_url: str, langsmith_project: str = None):
    """
    Creates agent_fn for an external agent exposed as an HTTP API.
    The external agent must accept {"query": str} and return {"answer": str}.
    """
    def agent_fn(input_text: str) -> dict:
        start_time = datetime.datetime.now(timezone.utc)
        response = requests.post(api_url, json={"query": input_text}, timeout=60)
        response.raise_for_status()
        data = response.json()
        return {
            "output": data.get("answer", ""),
            "start_time": start_time,
            "agent_name": langsmith_project or "external_agent",
            # Optional: "trace_id": data.get("trace_id") for direct trace lookup
        }
    return agent_fn
```

### Three scenarios for external agent trajectory

**Scenario A: External agent uses the same LangSmith project**
```python
# runner.py already handles this — fetch_langsmith_trace_tree uses project + timestamp
agent_fn = make_external_agent_fn(
    api_url="http://external-api/run",
    langsmith_project="shared-langsmith-project"
)
```

**Scenario B: External agent provides its own trace_id**
```python
# Future enhancement to runner.py:
# If result contains "trace_id", use client.list_runs(trace_id=result["trace_id"])
# instead of searching by timestamp
result = agent_fn(input_text)
if result.get("trace_id"):
    trace_dict = fetch_trace_by_id(result["trace_id"])
```

**Scenario C: External agent has no LangSmith**
```python
# runner.py already handles this gracefully:
# trace_dict = None → trajectory metrics are SKIPPED with reason
# Non-trajectory metrics (hallucination, task_completion) still run normally
```

### What needs to be built for external agent support (future)
1. `app/services/external_adaptor.py` — HTTP wrapper for external agents
2. Minor update to `runner.py` — add `trace_id` direct lookup (Scenario B)
3. New API route (optional) — `POST /external/evaluate` that accepts an `api_url` instead of `name`

---

## Verification Steps After Implementation

Run these to confirm everything works:

```bash
# 1. Verify imports work (eval services created in app/services/, external evaluator intact)
python -c "from app.services.eval_runner import evaluate_agent_with_trace; print('OK')"
python -c "from evaluator.generator import generate_goldens; print('OK')"
python -c "from app.services.trace_converter import convert_langsmith_tree_to_trace_dict; print('OK')"

# 2. Start the server
uvicorn app.main:app --reload

# 3. Test non-deterministic with trajectory metrics
curl -X POST http://localhost:8000/agents/{name}/evaluate/non-deterministic \
  -H "Content-Type: application/json" \
  -d '{"inputs": ["your test query"], "metrics": ["task_completion", "hallucination", "step_efficiency"]}'

# 4. Verify deterministic still works (existing metrics unchanged)
curl -X POST http://localhost:8000/agents/{name}/evaluate/deterministic \
  -H "Content-Type: application/json" \
  -d '{"metrics": ["correctness"]}'
```

### Expected behavior when LangSmith IS configured
- `task_completion` → runs, gives score
- `hallucination` → runs, gives score
- `step_efficiency` → fetches trajectory from LangSmith, gives score

### Expected behavior when LangSmith is NOT configured
- `task_completion` → runs, gives score
- `hallucination` → runs, gives score
- `step_efficiency` → returns score 0.0 with reason "[SKIPPED] Trajectory not available. Ensure LANGCHAIN_TRACING_V2=true..."