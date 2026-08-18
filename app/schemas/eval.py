from pydantic import BaseModel


class EvalMetricResult(BaseModel):
    metric_name: str
    score: float
    threshold: float
    passed: bool
    reason: str | None = None


class EvalCaseResult(BaseModel):
    agent_input: str
    agent_output: str
    metric_results: list[EvalMetricResult]

    @property
    def all_passed(self) -> bool:
        return all(m.passed for m in self.metric_results)


class EvalReportResponse(BaseModel):
    agent_name: str
    results: list[EvalCaseResult]
    all_passed: bool