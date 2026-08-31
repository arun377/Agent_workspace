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
from evaluator.runner import evaluate_agent

router = APIRouter(prefix="/agents", tags=["eval"])


@router.post("/{name}/evaluate/deterministic", response_model=EvalReportResponse)
def evaluate_deterministic(name: str, request: DeterministicEvalRequest):
    eval_file = Path("generated_agents") / name / "eval_data.json"
    if not eval_file.exists():
        raise HTTPException(status_code=404, detail=f"No eval dataset found for agent '{name}'")

    raw_data = json.loads(eval_file.read_text())

    approved_cases = [
        item for item in raw_data
        if isinstance(item, dict) and item.get("reviewed") is True and item.get("expected_output")
    ]

    if not approved_cases:
        raise HTTPException(
            status_code=400,
            detail="No reviewed test cases found. Please approve cases (reviewed: true) via PATCH before running deterministic evaluation."
        )

    judge_model = get_default_judge_model()
    metrics = build_deterministic_metrics(request.metrics, judge_model)
    agent_fn = make_agent_fn(name)

    # reports is a list[EvalReport]
    reports = evaluate_agent(agent_fn, approved_cases, metrics)

    # Iterate directly over reports (not reports.results)
    results = [
        EvalCaseResult(
            agent_input=c.agent_input,
            agent_output=c.agent_output,
            expected_output=getattr(c, "expected_output", None),
            metric_results=[
                EvalMetricResult(
                    metric_name=m.metric_name,
                    score=m.score,
                    threshold=m.threshold,
                    passed=m.passed,
                    reason=m.reason
                ) for m in c.metric_results
            ]
        ) for c in reports
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
    test_cases = [{"input": inp, "expected_output": None} for inp in request.inputs]

    judge_model = get_default_judge_model()
    metrics = build_non_deterministic_metrics(request.metrics, judge_model)
    agent_fn = make_agent_fn(name)

    # reports is a list[EvalReport]
    reports = evaluate_agent(agent_fn, test_cases, metrics)

    # Iterate directly over reports (not reports.results)
    results = [
        EvalCaseResult(
            agent_input=c.agent_input,
            agent_output=c.agent_output,
            expected_output=None,
            metric_results=[
                EvalMetricResult(
                    metric_name=m.metric_name,
                    score=m.score,
                    threshold=m.threshold,
                    passed=m.passed,
                    reason=m.reason
                ) for m in c.metric_results
            ]
        ) for c in reports
    ]

    return EvalReportResponse(
        agent_name=name,
        evaluation_type="non_deterministic",
        total_cases=len(results),
        all_passed=all(case.all_passed for case in results),
        results=results
    )