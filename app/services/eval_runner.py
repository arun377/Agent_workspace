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
                metric_name = getattr(metric, "name", None) or getattr(metric, "__name__", type(metric).__name__)
                metric_results.append(MetricResult(
                    metric_name=metric_name,
                    score=0.0,
                    threshold=getattr(metric, "threshold", 0.5),
                    passed=False,
                    reason=f"[SKIPPED] {trace_error}"
                ))
                continue

            try:
                metric.measure(test_case)
                metric_name = getattr(metric, "name", None) or getattr(metric, "__name__", type(metric).__name__)
                metric_results.append(MetricResult(
                    metric_name=metric_name,
                    score=float(metric.score),
                    threshold=float(metric.threshold),
                    passed=bool(metric.success if hasattr(metric, "success") else metric.score >= metric.threshold),
                    reason=getattr(metric, "reason", None)
                ))
            except Exception as e:
                metric_name = getattr(metric, "name", None) or getattr(metric, "__name__", type(metric).__name__)
                metric_results.append(MetricResult(
                    metric_name=metric_name,
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
