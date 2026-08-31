from pydantic import BaseModel, Field
from typing import Literal, Optional

# --- Test Data Management Schemas ---
class EvalDataItem(BaseModel):
    index: int
    input: str
    expected_output: str
    source: Literal["llm", "human"]
    reviewed: bool

class EvalDataUpdateRequest(BaseModel):
    input: Optional[str] = None
    expected_output: Optional[str] = None
    reviewed: Optional[bool] = None
    model_config = {"extra": "forbid"}

class EvalDataGenerateRequest(BaseModel):
    num_cases: int = Field(default=5, ge=1, le=20)
    model_config = {"extra": "forbid"}

class EvalDataGenerateResponse(BaseModel):
    generated_count: int
    total_count: int
    file_path: str

# --- Evaluation Request & Response Schemas ---
class DeterministicEvalRequest(BaseModel):
    metrics: list[str] = ["correctness"]
    model_config = {"extra": "forbid"}

class NonDeterministicEvalRequest(BaseModel):
    inputs: list[str] = Field(
        ..., 
        description="Ad-hoc user queries to test agent behavior and tool usage",
        min_length=1
    )
    metrics: list[str] = ["task_completion"]
    model_config = {"extra": "forbid"}

class EvalMetricResult(BaseModel):
    metric_name: str
    score: float
    threshold: float
    passed: bool
    reason: str | None = None

class EvalCaseResult(BaseModel):
    agent_input: str
    agent_output: str
    expected_output: str | None = None
    metric_results: list[EvalMetricResult]

    @property
    def all_passed(self) -> bool:
        return all(m.passed for m in self.metric_results)

class EvalReportResponse(BaseModel):
    agent_name: str
    evaluation_type: Literal["deterministic", "non_deterministic"]
    total_cases: int
    all_passed: bool
    results: list[EvalCaseResult]