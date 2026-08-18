import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from deepeval.dataset import Golden
from deepeval.metrics import TaskCompletionMetric
from deepeval.models import GeminiModel
import os

from app.services.eval_adaptor import make_agent_fn
from app.schemas.eval import EvalReportResponse, EvalCaseResult, EvalMetricResult
from app.services.metric_registry import build_metrics
from evaluator import evaluate_agent
from pydantic import BaseModel

router = APIRouter(prefix="/agents", tags=["evaluation"])


class EvaluateRequest(BaseModel):
    metrics: list[str] = ["task_completion"]

@router.post("/{name}/evaluate", response_model=EvalReportResponse)
def evaluate(name: str,request: EvaluateRequest):
    eval_data_path = Path("generated_agents") / name / "eval_data.json"
    if not eval_data_path.exists():
        raise HTTPException(status_code=404, detail=f"No eval data found for agent '{name}'")

    inputs = json.loads(eval_data_path.read_text())
    goldens = [Golden(input=i) for i in inputs]

    judge_model = GeminiModel(model="gemini-3.5-flash", api_key=os.getenv("GEMINI_API_KEY"))
    metrics = build_metrics(request.metrics, judge_model)

    agent_fn = make_agent_fn(name)
    reports = evaluate_agent(agent_fn=agent_fn, goldens=goldens, metrics=metrics)

    results = [
        EvalCaseResult(
            agent_input=r.agent_input,
            agent_output=r.agent_output if isinstance(r.agent_output, str) else r.agent_output.get("output", str(r.agent_output)),
            metric_results=[
                EvalMetricResult(
                    metric_name=m.metric_name,
                    score=m.score,
                    threshold=m.threshold,
                    passed=m.passed,
                    reason=m.reason,
                )
                for m in r.metric_results
            ],
        )
        for r in reports
    ]

    return EvalReportResponse(
        agent_name=name,
        results=results,
        all_passed=all(r.all_passed for r in results),
    )