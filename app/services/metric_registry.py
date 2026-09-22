import os
from litellm import completion, acompletion
from deepeval.models.base_model import DeepEvalBaseLLM
from deepeval.metrics import TaskCompletionMetric, GEval , ToolCorrectnessMetric, HallucinationMetric
from deepeval.metrics.step_efficiency import StepEfficiencyMetric
from deepeval.metrics.plan_adherence import PlanAdherenceMetric
from deepeval.metrics.plan_quality import PlanQualityMetric
from deepeval.test_case import LLMTestCaseParams


class LiteLLMGeneratorModel(DeepEvalBaseLLM):
    def __init__(self, model_string: str = "gemini/gemini-3.5-flash-lite"):
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
    available = {
        "correctness": lambda: GEval(
            name="Correctness",
            criteria="Evaluate whether 'actual_output' is factually consistent with the core information or intent in 'expected_output'. Minor differences in tone, formatting, or extra helpful details should not be penalized.",
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


def _build_error_recovery_metric(judge_model) -> GEval:
    m = GEval(
        name="Agent Error Recovery",
        criteria=(
            "Evaluate how well the AI agent recovers from tool failures, syntax errors, or denied access. "
            "The agent must detect the error, read the message, and actively change its approach instead of "
            "ignoring it, guessing, or looping."
        ),
        evaluation_steps=[
            "Scan the LangSmith execution trace in 'input' for any error messages returned by tools or code execution.",
            "If NO errors occurred, award a score of 1.0.",
            "If an error occurred, examine the agent's immediate next action.",
            "Award 0.0 if the agent crashes, ignores the error, or repeats the exact same failing action.",
            "Award 0.5 if the agent stops using tools and just guesses the answer using its internal memory.",
            "Award 1.0 if the agent reads the error and tries a valid fix (e.g., rewrites the code, uses a different tool, or clearly explains the failure to the user).",
        ],
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
        ],
        threshold=0.5,
        model=judge_model,
        async_mode=False,
    )
    m.requires_trace = True
    return m


def build_non_deterministic_metrics(metric_names: list[str], judge_model) -> list:
    available = {
        "task_completion": lambda: TaskCompletionMetric(threshold=0.7, model=judge_model),
        "hallucination": lambda: HallucinationMetric(threshold=0.5, model=judge_model),
        "step_efficiency": lambda: StepEfficiencyMetric(
            threshold=0.5,
            model=judge_model,
            async_mode=False,
        ),
        "plan_adherence": lambda: PlanAdherenceMetric(
            threshold=0.5,
            model=judge_model,
            async_mode=False,
        ),
        "plan_quality": lambda: PlanQualityMetric(
            threshold=0.5,
            model=judge_model,
            async_mode=False,
        ),
        "error_recovery": lambda: _build_error_recovery_metric(judge_model),
    }
    metrics = []
    for name in metric_names:
        if name in available:
            metrics.append(available[name]())
        else:
            raise ValueError(f"Unknown non-deterministic metric: {name}")
    return metrics