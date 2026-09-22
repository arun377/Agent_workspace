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

import json
import logging

logger = logging.getLogger(__name__)

from app.services.trace_converter import convert_langsmith_tree_to_trace_dict


def _count_trace_nodes(trace_dict: Optional[dict]) -> int:
    if not trace_dict or not isinstance(trace_dict, dict):
        return 0
    count = 1
    for child in trace_dict.get("children", []):
        count += _count_trace_nodes(child)
    return count


def _serialize_trace_for_input(trace_dict: Optional[dict], user_input: str) -> str:
    """
    Flattens the execution trace tree into a clear, chronological log
    for G-Eval metrics (such as Agent Error Recovery) that evaluate tool errors
    and recovery behaviors.
    """
    lines = [
        f"USER QUERY: {user_input}",
        "",
        "=== EXECUTION TRACE ===",
    ]

    if not trace_dict or not isinstance(trace_dict, dict):
        lines.append("[No execution trace available]")
        return "\n".join(lines)

    step_counter = [0]

    def _walk(node: dict, depth: int = 0):
        step_counter[0] += 1
        indent = "  " * depth
        name = node.get("name", "unknown")
        node_type = str(node.get("type", "unknown")).upper()
        status = node.get("status", "unknown")
        error = node.get("error")

        lines.append(f"{indent}Step {step_counter[0]}: [{node_type}] {name} (Status: {status})")

        inp = node.get("input")
        if inp is not None:
            inp_str = json.dumps(inp) if isinstance(inp, (dict, list)) else str(inp)
            if len(inp_str) > 400:
                inp_str = inp_str[:400] + "... [truncated]"
            lines.append(f"{indent}  Input/Args: {inp_str}")

        if error:
            lines.append(f"{indent}  >>> ERROR / FAILURE: {error} <<<")

        out = node.get("output")
        if out is not None:
            out_str = json.dumps(out) if isinstance(out, (dict, list)) else str(out)
            if "error" in out_str.lower() or "exception" in out_str.lower() or "failed" in out_str.lower():
                lines.append(f"{indent}  Output (contains error message): {out_str[:400]}")
            else:
                if len(out_str) > 300:
                    out_str = out_str[:300] + "... [truncated]"
                lines.append(f"{indent}  Output: {out_str}")

        for child in node.get("children", []):
            if isinstance(child, dict):
                _walk(child, depth + 1)

    _walk(trace_dict, depth=0)
    lines.append("=== END OF EXECUTION TRACE ===")
    return "\n".join(lines)


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
    logger.info(f"[EVAL_RUNNER] Fetching trace trajectory for agent='{agent_name}', start_time={start_time.isoformat() if start_time else None}")
    try:
        from app.services.trace_service import fetch_langsmith_trace_tree
        langsmith_tree = fetch_langsmith_trace_tree(
            agent_name=agent_name,
            start_time=start_time
        )
        if langsmith_tree is None:
            logger.warning(f"[EVAL_RUNNER] No trace tree returned from LangSmith for agent='{agent_name}'")
            return None
        converted = convert_langsmith_tree_to_trace_dict(langsmith_tree)
        node_count = _count_trace_nodes(converted)
        logger.info(f"[EVAL_RUNNER] Converted trace tree for agent='{agent_name}': {node_count} nodes")
        return converted
    except Exception as e:
        logger.error(f"[EVAL_RUNNER] Exception while fetching/converting trace: {e}", exc_info=True)
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
    metric_names = [getattr(m, "name", None) or getattr(m, "__name__", type(m).__name__) for m in metrics]
    logger.info(
        f"[EVAL_RUNNER] Starting evaluation for {len(test_cases)} case(s). "
        f"Metrics: {metric_names}, requires_trace={requires_trace}"
    )

    for case_idx, item in enumerate(test_cases):
        if isinstance(item, dict):
            input_text = item.get("input", "")
            expected_output = item.get("expected_output")
            raw_expected_tools = item.get("expected_tools", [])
        else:
            input_text = getattr(item, "input", "")
            expected_output = getattr(item, "expected_output", None)
            raw_expected_tools = getattr(item, "expected_tools", []) or []

        logger.info(f"[EVAL_RUNNER] >>> Case {case_idx + 1}/{len(test_cases)}: input='{input_text[:80]}' <<<")

        # --- STEP 1: Run the agent (ONCE per test case) ---
        try:
            result = agent_fn(input_text)
        except Exception as e:
            logger.error(f"[EVAL_RUNNER] Agent execution failed for case {case_idx + 1}: {e}", exc_info=True)
            clean_error = str(e).strip()
            # Agent crashed — record execution error in agent_output and explicitly indicate Judge was skipped
            reports.append(EvalReport(
                agent_input=input_text,
                agent_output=f"[AGENT ERROR]: {clean_error}",
                expected_output=expected_output,
                metric_results=[
                    MetricResult(
                        metric_name=getattr(m, "name", None) or getattr(m, "__name__", type(m).__name__),
                        score=0.0,
                        threshold=getattr(m, "threshold", 0.5),
                        passed=False,
                        reason="[NOT EVALUATED] LLM judge was not invoked because the agent crashed during execution. See Agent Output for error details."
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

        logger.info(
            f"[EVAL_RUNNER] Agent execution complete for '{agent_name}'. "
            f"Output length={len(actual_output)}, tool_calls_recorded={len(tool_calls)}, "
            f"start_time={start_time.isoformat() if start_time else 'None'}"
        )

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
                    logger.warning(f"[EVAL_RUNNER] {trace_error}")
            else:
                trace_error = (
                    "agent_fn did not return 'start_time'. "
                    "Ensure eval_adaptor.py includes start_time in the return dict."
                )
                logger.warning(f"[EVAL_RUNNER] {trace_error}")

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
            logger.info(
                f"[EVAL_RUNNER] Attached _trace_dict to test_case: root='{trace_dict.get('name')}', "
                f"total_nodes={_count_trace_nodes(trace_dict)}"
            )
        else:
            logger.info("[EVAL_RUNNER] No _trace_dict attached to test_case (trace_dict is None)")

        # --- STEP 4: Run all metrics against the same test case ---
        metric_results = []
        for metric in metrics:
            metric_needs_trace = getattr(metric, "requires_trace", False)
            metric_name = getattr(metric, "name", None) or getattr(metric, "__name__", type(metric).__name__)

            # Skip trajectory metric if trace unavailable — do not crash
            if metric_needs_trace and trace_dict is None:
                logger.warning(f"[EVAL_RUNNER] Skipping metric '{metric_name}' because trace is unavailable: {trace_error}")
                metric_results.append(MetricResult(
                    metric_name=metric_name,
                    score=0.0,
                    threshold=getattr(metric, "threshold", 0.5),
                    passed=False,
                    reason=f"[SKIPPED] {trace_error}"
                ))
                continue

            # For error recovery, provide a test_case where input contains the full execution trace
            is_error_recovery = "error recovery" in metric_name.lower() or "recovery" in metric_name.lower()
            if is_error_recovery and trace_dict is not None:
                active_test_case = LLMTestCase(
                    input=_serialize_trace_for_input(trace_dict, input_text),
                    actual_output=actual_output,
                    expected_output=expected_output if expected_output else None,
                    tools_called=tools_called,
                    expected_tools=expected_tools,
                    context=valid_contexts,
                )
                active_test_case._trace_dict = trace_dict
                logger.info(f"[EVAL_RUNNER] Injected serialized trace into input for '{metric_name}'")
            else:
                active_test_case = test_case

            logger.info(f"[EVAL_RUNNER] Measuring metric '{metric_name}' (requires_trace={metric_needs_trace})...")
            try:
                metric.measure(active_test_case)
                score_val = float(metric.score) if metric.score is not None else 0.0
                thresh_val = float(metric.threshold) if metric.threshold is not None else 0.5
                passed_val = bool(metric.success if hasattr(metric, "success") and metric.success is not None else score_val >= thresh_val)
                reason_val = getattr(metric, "reason", None)

                logger.info(
                    f"[EVAL_RUNNER] Metric '{metric_name}' finished: "
                    f"score={score_val}, passed={passed_val}, reason='{reason_val}'"
                )

                metric_results.append(MetricResult(
                    metric_name=metric_name,
                    score=score_val,
                    threshold=thresh_val,
                    passed=passed_val,
                    reason=reason_val
                ))
            except Exception as e:
                logger.error(f"[EVAL_RUNNER] Metric measurement failed for '{metric_name}': {e}", exc_info=True)
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
